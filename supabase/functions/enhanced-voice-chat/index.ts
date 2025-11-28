import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface UserSettings {
  preferred_ai_model: 'openai' | 'yandex';
  interaction_mode: 'text' | 'voice';
  voice_settings: any;
  ai_settings: any;
  advanced_features?: {
    enable_function_calling: boolean;
    enable_memory: boolean;
    auto_save_conversations: boolean;
    privacy_mode: boolean;
  };
}

async function callOpenAIWithTools(messages: AIMessage[], settings: UserSettings, userId: string, authToken?: string, enableStreaming?: boolean): Promise<string | ReadableStream> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    console.log('Sending request to OpenAI with tools support');

    // Tools available to the assistant
    const tools = [
      {
        type: "function",
        function: {
          name: "get_client_info",
          description: "Получить информацию о клиенте и его задачах",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента для поиска" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_client",
          description: "Создать нового клиента",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Имя клиента" },
              phone: { type: "string", description: "Телефон клиента" },
              email: { type: "string", description: "Email клиента" },
              lead_source: { type: "string", enum: ["сайт", "звонок", "соцсети", "рекомендация", "реклама"], description: "Источник лида" },
              notes: { type: "string", description: "Примечания о клиенте" }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_estimate",
          description: "Создать смету через AI-Сметчика",
          parameters: {
            type: "object",
            properties: {
              project_description: { type: "string", description: "Описание проекта для сметы" },
              client_name: { type: "string", description: "Имя клиента (опционально)" },
              area: { type: "number", description: "Площадь объекта в кв.м" },
              services: { type: "array", items: { type: "string" }, description: "Список услуг для расчета" }
            },
            required: ["project_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_consultant_analytics",
          description: "Получить статистику и аналитику работы ИИ-консультанта",
          parameters: {
            type: "object",
            properties: {
              period: { type: "string", enum: ["today", "week", "month", "all"], description: "Период для анализа" },
              metric: { type: "string", enum: ["count", "questions", "types", "all"], description: "Тип метрики: count - количество обращений, questions - частые вопросы, types - типы вопросов, all - все данные" }
            },
            required: ["period"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_task",
          description: "Создать задачу (встреча, звонок и т.п.)",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Заголовок задачи" },
              description: { type: "string", description: "Описание задачи" },
              due_date: { type: "string", description: "Дата/время выполнения в ISO-формате (например, 2025-09-15T13:00:00+05:00)" },
              client_name: { type: "string", description: "Имя клиента для привязки (опционально)" }
            },
            required: ["title", "due_date"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "complete_task",
          description: "Отметить задачу как выполненную",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID задачи" },
              task_title: { type: "string", description: "Название задачи для поиска" },
              client_name: { type: "string", description: "Имя клиента (для более точного поиска)" }
            }
          }
        }
      }
,
      {
        type: "function",
        function: {
          name: "get_tasks",
          description: "Получить список задач пользователя с фильтрами (все, на сегодня, просроченные, по статусу)",
          parameters: {
            type: "object",
            properties: {
              scope: { type: "string", enum: ["all", "today", "overdue", "by_status"], description: "Область выборки" },
              status: { type: "string", enum: ["pending", "in-progress", "completed", "overdue"], description: "Фильтр по статусу, если scope=by_status" },
              limit: { type: "number", description: "Лимит кол-ва записей (по умолчанию 20)" },
              include_details: { type: "boolean", description: "Включать подробности (описание)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_tasks_stats",
          description: "Получить статистику задач: всего, на сегодня, просроченные, по статусам",
          parameters: { type: "object", properties: {} }
        }
      },
      {
        type: "function",
        function: {
          name: "get_clients",
          description: "Получить список клиентов с фильтрами (по статусу или этапу)",
          parameters: {
            type: "object",
            properties: {
              status: { type: "string", description: "Статус клиента из поля status (new, active, и т.п.)" },
              conversion_stage: { type: "string", description: "Этап конверсии клиента" },
              limit: { type: "number", description: "Лимит кол-ва записей (по умолчанию 20)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_technical_specification",
          description: "Создать техническое задание для строительных работ через AI-Технолога",
          parameters: {
            type: "object",
            properties: {
              object_description: { type: "string", description: "Подробное описание объекта и требуемых работ" },
              client_name: { type: "string", description: "Имя клиента" },
              object_address: { type: "string", description: "Адрес объекта" }
            },
            required: ["object_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_technical_specifications",
          description: "Найти технические задания по клиенту или названию",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента для поиска ТЗ" },
              title: { type: "string", description: "Название ТЗ для поиска" },
              limit: { type: "number", description: "Максимальное количество результатов (по умолчанию 10)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_estimate_from_technical_spec",
          description: "Создать смету на основе технического задания",
          parameters: {
            type: "object",
            properties: {
              technical_spec_id: { type: "string", description: "ID технического задания" },
              client_name: { type: "string", description: "Имя клиента (если не указан ID)" },
              spec_title: { type: "string", description: "Название ТЗ (если не указан ID)" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_proposal",
          description: "Создать коммерческое предложение для клиента через AI-менеджера КП",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента" },
              estimate_id: { type: "string", description: "ID сметы для включения в КП (опционально)" },
              title: { type: "string", description: "Название коммерческого предложения" },
              template_name: { type: "string", description: "Название шаблона бланка для КП (опционально)" },
              send_immediately: { type: "boolean", description: "Отправить сразу после создания" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "send_proposal",
          description: "Отправить коммерческое предложение клиенту по email или мессенджеру",
          parameters: {
            type: "object",
            properties: {
              proposal_id: { type: "string", description: "ID коммерческого предложения" },
              client_name: { type: "string", description: "Имя клиента (если не указан ID)" },
              send_method: { type: "string", enum: ["email", "whatsapp", "telegram"], description: "Способ отправки" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "search_services_in_nomenclature",
          description: "Поиск услуг в номенклатуре CRM по ключевым словам для добавления в смету",
          parameters: {
            type: "object",
            properties: {
              search_query: { type: "string", description: "Поисковый запрос (например, 'доставка песка', 'доставка самосвалом')" },
              limit: { type: "number", description: "Максимальное количество результатов (по умолчанию 5)" }
            },
            required: ["search_query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_items_to_estimate",
          description: "Добавить позиции в смету на основе найденных услуг из номенклатуры",
          parameters: {
            type: "object",
            properties: {
              estimate_id: { type: "string", description: "ID сметы для добавления позиций" },
              client_name: { type: "string", description: "Имя клиента (если не указан ID сметы)" },
              services: { 
                type: "array", 
                items: {
                  type: "object",
                  properties: {
                    service_id: { type: "string", description: "ID услуги из номенклатуры" },
                    service_name: { type: "string", description: "Название услуги" },
                    quantity: { type: "number", description: "Количество" },
                    unit_price: { type: "number", description: "Цена за единицу" }
                  }
                },
                description: "Массив услуг для добавления в смету" 
              }
            },
            required: ["services"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delegate_to_ai_assistant",
          description: "Делегировать задачу специализированному AI-ассистенту (сметчик, аналитик, поставщик, технический специалист, менеджер КП)",
          parameters: {
            type: "object",
            properties: {
              assistant_name: { 
                type: "string",
                enum: ["сметчик", "estimator", "аналитик", "analyst", "конкурентный-анализ", "competitor-analysis"],
                description: "Имя AI-ассистента для делегирования" 
              },
              task_description: { type: "string", description: "Описание задачи для ассистента" },
              additional_data: { type: "object", description: "Дополнительные данные для ассистента (клиент, площадь, услуги и т.д.)" }
            },
            required: ["assistant_name", "task_description"]
          }
        }
      },
      // МОДУЛЬ 1: Расширенное управление клиентами
      {
        type: "function",
        function: {
          name: "update_client",
          description: "Обновить данные клиента (телефон, email, адрес, заметки, бюджет, статус)",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента для поиска" },
              phone: { type: "string", description: "Новый телефон" },
              email: { type: "string", description: "Новый email" },
              address: { type: "string", description: "Новый адрес" },
              budget: { type: "number", description: "Новый бюджет" },
              status: { type: "string", description: "Новый статус" },
              notes: { type: "string", description: "Новые заметки" },
              conversion_stage: { type: "string", description: "Новый этап работы" }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "archive_client",
          description: "Архивировать клиента с указанием причины и периода",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента" },
              reason_type: { 
                type: "string", 
                enum: ["not_ready", "no_budget", "competitor", "other"],
                description: "Тип причины архивации" 
              },
              reason_comment: { type: "string", description: "Комментарий к причине" },
              archive_period: { type: "number", description: "Период архивации в днях" }
            },
            required: ["client_name", "reason_type", "archive_period"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_client_history",
          description: "Получить историю взаимодействий с клиентом",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента" },
              interaction_type: { 
                type: "string",
                enum: ["call", "meeting", "email", "message"],
                description: "Тип взаимодействия для фильтрации" 
              }
            },
            required: ["client_name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "add_client_comment",
          description: "Добавить комментарий к клиенту",
          parameters: {
            type: "object",
            properties: {
              client_name: { type: "string", description: "Имя клиента" },
              comment: { type: "string", description: "Текст комментария" },
              comment_type: { 
                type: "string",
                enum: ["note", "important", "warning"],
                description: "Тип комментария" 
              }
            },
            required: ["client_name", "comment"]
          }
        }
      },
      // МОДУЛЬ 2: Управление подрядчиками
      {
        type: "function",
        function: {
          name: "create_contractor",
          description: "Создать нового подрядчика",
          parameters: {
            type: "object",
            properties: {
              company_name: { type: "string", description: "Название компании" },
              phone: { type: "string", description: "Телефон" },
              specialization: { 
                type: "array",
                items: { type: "string" },
                description: "Специализации подрядчика" 
              },
              experience_years: { type: "number", description: "Опыт работы в годах" },
              description: { type: "string", description: "Описание" }
            },
            required: ["company_name", "specialization"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_contractors",
          description: "Получить список подрядчиков с фильтрами",
          parameters: {
            type: "object",
            properties: {
              specialization: { type: "string", description: "Фильтр по специализации" },
              verified_only: { type: "boolean", description: "Только проверенные" },
              rating_min: { type: "number", description: "Минимальный рейтинг" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "assign_contractor_to_project",
          description: "Назначить подрядчика на проект",
          parameters: {
            type: "object",
            properties: {
              contractor_name: { type: "string", description: "Название компании подрядчика" },
              client_name: { type: "string", description: "Имя клиента/название проекта" },
              role: { type: "string", description: "Роль на проекте" },
              notes: { type: "string", description: "Заметки" }
            },
            required: ["contractor_name", "client_name"]
          }
        }
      },
      // МОДУЛЬ 3: Управление поставщиками
      {
        type: "function",
        function: {
          name: "create_supplier",
          description: "Создать нового поставщика",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Название поставщика" },
              categories: { 
                type: "array",
                items: { type: "string" },
                description: "Категории материалов" 
              },
              contact_person: { type: "string", description: "Контактное лицо" },
              phone: { type: "string", description: "Телефон" },
              email: { type: "string", description: "Email" },
              location: { type: "string", description: "Местоположение" }
            },
            required: ["name", "categories"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_suppliers",
          description: "Получить список поставщиков с фильтрами",
          parameters: {
            type: "object",
            properties: {
              categories: { 
                type: "array",
                items: { type: "string" },
                description: "Фильтр по категориям" 
              },
              status: { 
                type: "string",
                enum: ["active", "inactive"],
                description: "Статус поставщика" 
              },
              rating_min: { type: "number", description: "Минимальный рейтинг" }
            }
          }
        }
      },
      // МОДУЛЬ 4: Расширенное управление задачами
      {
        type: "function",
        function: {
          name: "update_task",
          description: "Обновить задачу",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID задачи" },
              task_title: { type: "string", description: "Название задачи для поиска" },
              title: { type: "string", description: "Новое название" },
              description: { type: "string", description: "Новое описание" },
              due_date: { type: "string", description: "Новая дата выполнения" },
              priority: { 
                type: "string",
                enum: ["low", "medium", "high"],
                description: "Новый приоритет" 
              },
              status: { 
                type: "string",
                enum: ["pending", "in-progress", "completed"],
                description: "Новый статус" 
              },
              assignee: { type: "string", description: "Новый исполнитель" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delete_task",
          description: "Удалить задачу",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID задачи" },
              task_title: { type: "string", description: "Название задачи для поиска" }
            }
          }
        }
      },
      // МОДУЛЬ 6: Аналитика
      {
        type: "function",
        function: {
          name: "get_dashboard_stats",
          description: "Получить общую статистику дашборда (клиенты, задачи, сметы)",
          parameters: {
            type: "object",
            properties: {
              period: { 
                type: "string",
                enum: ["today", "week", "month", "year"],
                description: "Период для статистики" 
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_sales_funnel",
          description: "Получить данные воронки продаж",
          parameters: {
            type: "object",
            properties: {
              period: { 
                type: "string",
                enum: ["week", "month", "quarter"],
                description: "Период анализа" 
              }
            }
          }
        }
      },
      // МОДУЛЬ 7: Быстрые команды
      {
        type: "function",
        function: {
          name: "daily_summary",
          description: "Получить ежедневную сводку (задачи на сегодня, новые клиенты, дедлайны)",
          parameters: {
            type: "object",
            properties: {}
          }
        }
      },
      {
        type: "function",
        function: {
          name: "quick_search",
          description: "Быстрый поиск по всем сущностям CRM",
          parameters: {
            type: "object",
            properties: {
              query: { type: "string", description: "Поисковый запрос" },
              search_in: { 
                type: "array",
                items: { 
                  type: "string",
                  enum: ["clients", "tasks", "estimates", "proposals", "contractors", "suppliers"]
                },
                description: "Где искать (по умолчанию везде)" 
              }
            },
            required: ["query"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "call_n8n_workflow",
          description: "Вызвать workflow n8n для выполнения автоматизированных задач, обработки данных или интеграции с внешними сервисами",
          parameters: {
            type: "object",
            properties: {
              message: { type: "string", description: "Сообщение или данные для отправки в n8n workflow" },
              workflow_context: { type: "string", description: "Контекст или тип задачи для workflow" },
              additional_data: { type: "object", description: "Дополнительные данные для обработки в n8n" }
            },
            required: ["message"]
          }
        }
      }
    ];

    let runningMessages: any[] = [...messages];

    // Проверяем настройки функций пользователя
    const enableFunctionCalling = settings?.advanced_features?.enable_function_calling !== false;
    console.log(`Function calling enabled: ${enableFunctionCalling}`);

    // Сокращаем максимальное количество итераций для быстроты
    for (let depth = 0; depth < 5; depth++) { // safety cap to avoid loops
      const configuredModel = (settings?.ai_settings?.openai_model as string) || 'gpt-4o-mini';
      console.log(`Using configured AI model: ${configuredModel}`);
      
      // Определяем тип модели для правильных параметров API
      const isNewModel = configuredModel.includes('gpt-5') || 
                        configuredModel.includes('gpt-4.1') || 
                        configuredModel.includes('o3') || 
                        configuredModel.includes('o4');
      
      const payload: any = {
        model: configuredModel, // use the actual configured model
        messages: runningMessages
      };

      // Добавляем tools только если включены функции
      if (enableFunctionCalling) {
        payload.tools = tools;
        payload.tool_choice = 'auto';
      }
      
      // Добавляем поддержку streaming только если включена и нет tool calls в предыдущих сообщениях
      if (enableStreaming && depth === 0) {
        payload.stream = true;
      }
      
      if (isNewModel) {
        payload.max_completion_tokens = settings?.ai_settings?.max_tokens || 1000;
      } else {
        payload.temperature = settings?.ai_settings?.temperature ?? 0.7;
        payload.max_tokens = settings?.ai_settings?.max_tokens || 1000;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      // Если включен streaming и это первый depth, возвращаем поток
      if (enableStreaming && depth === 0 && payload.stream) {
        console.log('Returning streaming response');
        return createStreamingResponse(response);
      }

      const data = await response.json();
      console.log('OpenAI response received');
      const assistantMessage = data.choices?.[0]?.message;

      if (!assistantMessage) {
        return 'Извините, не удалось получить ответ';
      }

      // Always push the assistant message
      runningMessages.push(assistantMessage);

      const toolCalls = assistantMessage.tool_calls || [];
      if (toolCalls.length > 0) {
        console.log(`Tool calls detected: ${toolCalls.map((t: any) => t.function?.name).join(', ')}`);
        // Execute each tool call and append its tool result message
        for (const toolCall of toolCalls) {
          const functionName = toolCall.function.name;
          let functionArgs: any = {};
          try {
            functionArgs = JSON.parse(toolCall.function.arguments || '{}');
          } catch (e) {
            console.warn('Failed to parse tool args:', e);
          }
          const functionResult = await executeFunction(functionName, functionArgs, userId, authToken);
          runningMessages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(functionResult ?? {})
          });
        }
        // Continue loop to let the model incorporate tool results
        continue;
      }

      // No tool calls => final content
      return assistantMessage.content || 'Готово';
    }

    return 'Готово';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`Ошибка вызова OpenAI: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
  }
}

// Функция для создания потокового ответа
function createStreamingResponse(openaiResponse: Response): ReadableStream {
  const reader = openaiResponse.body?.getReader();
  
  if (!reader) {
    throw new Error('No response body');
  }

  return new ReadableStream({
    async start(controller) {
      const decoder = new TextDecoder();
      let buffer = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            // Отправляем финальный chunk с окончанием
            const finalChunk = JSON.stringify({ 
              type: 'done',
              content: '' 
            }) + '\n';
            controller.enqueue(new TextEncoder().encode(finalChunk));
            controller.close();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                continue;
              }

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                
                if (content) {
                  // Отправляем только контент, обернутый в простой JSON
                  const chunk = JSON.stringify({ 
                    type: 'content',
                    content: content 
                  }) + '\n';
                  controller.enqueue(new TextEncoder().encode(chunk));
                }
              } catch (e) {
                console.warn('Failed to parse streaming chunk:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        controller.error(error);
      }
    }
  });
}

async function executeFunction(functionName: string, args: any, userId: string, userToken?: string): Promise<any> {
  console.log(`Executing function: ${functionName} with args:`, args);
  
  switch (functionName) {
    case 'get_client_info':
      return await getClientInfo(userId, args);

    case 'create_client':
      return await createNewClient(userId, args);

    case 'create_estimate':
      return await createEstimateViaAI(userId, args, userToken);

    case 'create_estimate_from_technical_spec':
      return await createEstimateFromTechSpec(userId, args, userToken);

    case 'create_task':
      return await createTask(userId, args);

    case 'complete_task':
      return await completeTask(userId, args);

    case 'get_tasks':
      return await getTasks(userId, args);

    case 'get_tasks_stats':
      return await getTasksStats(userId);

    case 'get_clients':
      return await getClients(userId, args);

    case 'create_technical_specification':
      return await createTechnicalSpecification(userId, args, userToken);

    case 'get_technical_specifications':
      return await getTechnicalSpecifications(userId, args);
      
    case 'create_proposal':
      return await createProposalViaAI(userId, args, userToken);
      
    case 'send_proposal':
      return await sendProposalViaAI(userId, args, userToken);
    
    case 'get_consultant_analytics':
      return await getConsultantAnalytics(userId, args);
    
    case 'search_services_in_nomenclature':
      return await searchServicesInNomenclature(userId, args);
    
    case 'add_items_to_estimate':
      return await addItemsToEstimate(userId, args);
    
    case 'delegate_to_ai_assistant':
      return await delegateToAIAssistant(userId, args, userToken);
    
    // МОДУЛЬ 1: Расширенное управление клиентами
    case 'update_client':
      return await updateClient(userId, args);
    
    case 'archive_client':
      return await archiveClient(userId, args);
    
    case 'get_client_history':
      return await getClientHistory(userId, args);
    
    case 'add_client_comment':
      return await addClientComment(userId, args);
    
    // МОДУЛЬ 2: Управление подрядчиками
    case 'create_contractor':
      return await createContractor(userId, args);
    
    case 'get_contractors':
      return await getContractors(userId, args);
    
    case 'assign_contractor_to_project':
      return await assignContractorToProject(userId, args);
    
    // МОДУЛЬ 3: Управление поставщиками
    case 'create_supplier':
      return await createSupplier(userId, args);
    
    case 'get_suppliers':
      return await getSuppliers(userId, args);
    
    // МОДУЛЬ 4: Расширенное управление задачами
    case 'update_task':
      return await updateTask(userId, args);
    
    case 'delete_task':
      return await deleteTask(userId, args);
    
    // МОДУЛЬ 6: Аналитика
    case 'get_dashboard_stats':
      return await getDashboardStats(userId, args);
    
    case 'get_sales_funnel':
      return await getSalesFunnel(userId, args);
    
    // МОДУЛЬ 7: Быстрые команды
    case 'daily_summary':
      return await getDailySummary(userId);
    
    case 'quick_search':
      return await quickSearch(userId, args);
    
    case 'call_n8n_workflow':
      return await callN8nWorkflow(userId, args);
      
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

// Делегирование задачи AI-ассистенту
async function delegateToAIAssistant(userId: string, args: any, userToken?: string) {
  console.log('Delegating to AI assistant:', args);
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: result, error } = await supabaseAdmin.functions.invoke('assistant-router', {
      body: {
        assistant_name: args.assistant_name,
        task_description: args.task_description,
        additional_data: args.additional_data || {},
        context: {
          user_id: userId
        }
      },
      headers: {
        Authorization: `Bearer ${userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) {
      console.error('Error calling assistant-router:', error);
      return {
        success: false,
        message: `❌ Ошибка делегирования: ${error.message}`
      };
    }

    console.log('Delegation result:', result);

    if (!result.success) {
      return {
        success: false,
        message: result.error || `❌ Ошибка выполнения задачи AI-помощником "${args.assistant_name}"`
      };
    }

    return {
      success: true,
      result: result.result,
      message: `✅ Задача делегирована AI-помощнику "${args.assistant_name}"\n\n${JSON.stringify(result.result, null, 2)}`
    };
  } catch (error) {
    console.error('Error in delegateToAIAssistant:', error);
    return {
      success: false,
      message: `❌ Ошибка делегирования: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Вызов n8n workflow через webhook
async function callN8nWorkflow(userId: string, args: any) {
  console.log('Calling n8n workflow:', args);
  try {
    const N8N_WEBHOOK_URL = 'https://mybotteleg.ru/webhook-test/8db96187-b4b0-4292-a4db-31ab1fca81cf';
    
    const payload = {
      user_id: userId,
      message: args.message,
      workflow_context: args.workflow_context || 'general',
      additional_data: args.additional_data || {},
      timestamp: new Date().toISOString()
    };

    console.log('Sending to n8n webhook:', payload);

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      return {
        success: false,
        message: `❌ Ошибка вызова n8n workflow: ${response.status} ${errorText}`
      };
    }

    const result = await response.json();
    console.log('n8n workflow result:', result);

    return {
      success: true,
      result: result,
      message: `✅ n8n workflow выполнен успешно\n\n${JSON.stringify(result, null, 2)}`
    };
  } catch (error) {
    console.error('Error calling n8n workflow:', error);
    return {
      success: false,
      message: `❌ Ошибка вызова n8n workflow: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 1: Расширенное управление клиентами

// Обновление данных клиента
async function updateClient(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск клиента
    const { data: client } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден`
      };
    }

    // Формируем объект обновления
    const updates: any = { updated_at: new Date().toISOString() };
    if (args.phone) updates.phone = args.phone;
    if (args.email) updates.email = args.email;
    if (args.address) updates.address = args.address;
    if (args.budget) updates.budget = args.budget;
    if (args.status) updates.status = args.status;
    if (args.notes) updates.notes = args.notes;
    if (args.conversion_stage) updates.conversion_stage = args.conversion_stage;

    const { data, error } = await supabaseAdmin
      .from('applications')
      .update(updates)
      .eq('id', client.id)
      .select()
      .single();

    if (error) throw error;

    const updatedFields = Object.keys(updates).filter(k => k !== 'updated_at').join(', ');
    return {
      success: true,
      client: data,
      message: `✅ Данные клиента "${client.name}" обновлены (${updatedFields})`
    };
  } catch (error) {
    console.error('Error updating client:', error);
    return {
      success: false,
      message: `❌ Ошибка обновления: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Архивация клиента
async function archiveClient(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск клиента
    const { data: client } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден`
      };
    }

    // Вычисляем дату восстановления
    const restoreDate = new Date();
    restoreDate.setDate(restoreDate.getDate() + args.archive_period);

    // Создаем запись архивации
    const { data, error } = await supabaseAdmin
      .from('client_archives')
      .insert({
        user_id: userId,
        client_id: client.id,
        archive_reason_type: args.reason_type,
        archive_reason_comment: args.reason_comment || '',
        archive_period: args.archive_period,
        restore_at: restoreDate.toISOString(),
        reminder_type: 'before_restore'
      })
      .select()
      .single();

    if (error) throw error;

    // Обновляем статус клиента
    await supabaseAdmin
      .from('applications')
      .update({ 
        is_archived: true,
        archived_until: restoreDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', client.id);

    return {
      success: true,
      archive: data,
      message: `✅ Клиент "${client.name}" архивирован на ${args.archive_period} дней. Восстановление: ${restoreDate.toLocaleDateString('ru-RU')}`
    };
  } catch (error) {
    console.error('Error archiving client:', error);
    return {
      success: false,
      message: `❌ Ошибка архивации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// История взаимодействий с клиентом
async function getClientHistory(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск клиента
    const { data: client } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден`
      };
    }

    // Получаем историю взаимодействий
    let query = supabaseAdmin
      .from('client_interactions')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', client.id);

    if (args.interaction_type) {
      query = query.eq('interaction_type', args.interaction_type);
    }

    const { data: interactions, error } = await query
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!interactions || interactions.length === 0) {
      return {
        success: true,
        interactions: [],
        message: `ℹ️ История взаимодействий с "${client.name}" пуста`
      };
    }

    const list = interactions
      .map((int: any, idx: number) => 
        `${idx + 1}. ${int.interaction_type} (${new Date(int.created_at).toLocaleDateString('ru-RU')}) - ${int.subject || 'Без темы'}`
      )
      .join('\n');

    return {
      success: true,
      interactions,
      message: `📋 История взаимодействий с "${client.name}" (${interactions.length}):\n\n${list}`
    };
  } catch (error) {
    console.error('Error getting client history:', error);
    return {
      success: false,
      message: `❌ Ошибка получения истории: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Добавление комментария к клиенту
async function addClientComment(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск клиента
    const { data: client } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден`
      };
    }

    // Получаем имя пользователя
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle();

    // Создаем комментарий
    const { data, error } = await supabaseAdmin
      .from('client_comments')
      .insert({
        user_id: userId,
        client_id: client.id,
        content: args.comment,
        comment_type: args.comment_type || 'note',
        author_name: profile?.full_name || 'Пользователь'
      })
      .select()
      .single();

    if (error) throw error;

    const typeEmoji = {
      note: '📝',
      important: '⚠️',
      warning: '🚨'
    };

    return {
      success: true,
      comment: data,
      message: `✅ ${typeEmoji[args.comment_type || 'note']} Комментарий добавлен к клиенту "${client.name}"`
    };
  } catch (error) {
    console.error('Error adding client comment:', error);
    return {
      success: false,
      message: `❌ Ошибка добавления комментария: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 2: Управление подрядчиками

// Создание подрядчика
async function createContractor(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Проверка, не существует ли уже
    const { data: existing } = await supabaseAdmin
      .from('contractor_profiles')
      .select('id, company_name')
      .eq('user_id', userId)
      .ilike('company_name', args.company_name)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `❌ Подрядчик "${existing.company_name}" уже существует`
      };
    }

    const { data, error } = await supabaseAdmin
      .from('contractor_profiles')
      .insert({
        user_id: userId,
        company_name: args.company_name,
        phone: args.phone,
        specialization: args.specialization,
        experience_years: args.experience_years,
        description: args.description
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      contractor: data,
      message: `✅ Подрядчик "${args.company_name}" создан. Специализация: ${args.specialization.join(', ')}`
    };
  } catch (error) {
    console.error('Error creating contractor:', error);
    return {
      success: false,
      message: `❌ Ошибка создания подрядчика: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Получение списка подрядчиков
async function getContractors(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('contractor_profiles')
      .select('*')
      .eq('user_id', userId);

    if (args.specialization) {
      query = query.contains('specialization', [args.specialization]);
    }

    if (args.verified_only) {
      query = query.eq('verified', true);
    }

    if (args.rating_min) {
      query = query.gte('rating', args.rating_min);
    }

    const { data: contractors, error } = await query
      .order('rating', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!contractors || contractors.length === 0) {
      return {
        success: true,
        contractors: [],
        message: '❌ Подрядчики не найдены по заданным фильтрам'
      };
    }

    const list = contractors
      .map((c: any, idx: number) => 
        `${idx + 1}. ${c.company_name}\n   Специализация: ${c.specialization.join(', ')}\n   Рейтинг: ${c.rating || 0}★\n   Опыт: ${c.experience_years || 0} лет`
      )
      .join('\n\n');

    return {
      success: true,
      contractors,
      message: `🏗️ Найдено подрядчиков: ${contractors.length}\n\n${list}`
    };
  } catch (error) {
    console.error('Error getting contractors:', error);
    return {
      success: false,
      message: `❌ Ошибка получения подрядчиков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Назначение подрядчика на проект
async function assignContractorToProject(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск подрядчика
    const { data: contractor } = await supabaseAdmin
      .from('contractor_profiles')
      .select('id, user_id, company_name')
      .eq('user_id', userId)
      .ilike('company_name', `%${args.contractor_name}%`)
      .maybeSingle();

    if (!contractor) {
      return {
        success: false,
        message: `❌ Подрядчик "${args.contractor_name}" не найден`
      };
    }

    // Поиск клиента/проекта
    const { data: client } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .maybeSingle();

    if (!client) {
      return {
        success: false,
        message: `❌ Клиент/проект "${args.client_name}" не найден`
      };
    }

    // Создаем назначение
    const { data, error } = await supabaseAdmin
      .from('project_assignments')
      .insert({
        project_id: client.id,
        worker_id: contractor.user_id,
        assigned_by: userId,
        role_on_project: args.role || 'contractor',
        notes: args.notes
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      assignment: data,
      message: `✅ Подрядчик "${contractor.company_name}" назначен на проект "${client.name}"`
    };
  } catch (error) {
    console.error('Error assigning contractor:', error);
    return {
      success: false,
      message: `❌ Ошибка назначения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 3: Управление поставщиками

// Создание поставщика
async function createSupplier(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Проверка, не существует ли уже
    const { data: existing } = await supabaseAdmin
      .from('suppliers')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', args.name)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        message: `❌ Поставщик "${existing.name}" уже существует`
      };
    }

    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .insert({
        user_id: userId,
        name: args.name,
        categories: args.categories,
        contact_person: args.contact_person,
        phone: args.phone,
        email: args.email,
        location: args.location,
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      supplier: data,
      message: `✅ Поставщик "${args.name}" создан. Категории: ${args.categories.join(', ')}`
    };
  } catch (error) {
    console.error('Error creating supplier:', error);
    return {
      success: false,
      message: `❌ Ошибка создания поставщика: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Получение списка поставщиков
async function getSuppliers(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('suppliers')
      .select('*')
      .eq('user_id', userId);

    if (args.categories && args.categories.length > 0) {
      query = query.overlaps('categories', args.categories);
    }

    if (args.status) {
      query = query.eq('status', args.status);
    }

    if (args.rating_min) {
      query = query.gte('rating', args.rating_min);
    }

    const { data: suppliers, error } = await query
      .order('rating', { ascending: false })
      .limit(20);

    if (error) throw error;

    if (!suppliers || suppliers.length === 0) {
      return {
        success: true,
        suppliers: [],
        message: '❌ Поставщики не найдены по заданным фильтрам'
      };
    }

    const list = suppliers
      .map((s: any, idx: number) => 
        `${idx + 1}. ${s.name}\n   Категории: ${s.categories.join(', ')}\n   Рейтинг: ${s.rating || 0}★\n   Телефон: ${s.phone || 'не указан'}`
      )
      .join('\n\n');

    return {
      success: true,
      suppliers,
      message: `🚚 Найдено поставщиков: ${suppliers.length}\n\n${list}`
    };
  } catch (error) {
    console.error('Error getting suppliers:', error);
    return {
      success: false,
      message: `❌ Ошибка получения поставщиков: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 4: Расширенное управление задачами

// Обновление задачи
async function updateTask(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск задачи
    let task = null;
    if (args.task_id) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('id', args.task_id)
        .eq('user_id', userId)
        .maybeSingle();
      task = data;
    } else if (args.task_title) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${args.task_title}%`)
        .order('created_at', { ascending: false })
        .maybeSingle();
      task = data;
    }

    if (!task) {
      return {
        success: false,
        message: `❌ Задача не найдена`
      };
    }

    // Формируем объект обновления
    const updates: any = { updated_at: new Date().toISOString() };
    if (args.title) updates.title = args.title;
    if (args.description) updates.description = args.description;
    if (args.due_date) updates.due_date = args.due_date;
    if (args.priority) updates.priority = args.priority;
    if (args.status) updates.status = args.status;
    if (args.assignee) updates.assignee = args.assignee;

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update(updates)
      .eq('id', task.id)
      .select()
      .single();

    if (error) throw error;

    const updatedFields = Object.keys(updates).filter(k => k !== 'updated_at').join(', ');
    return {
      success: true,
      task: data,
      message: `✅ Задача "${task.title}" обновлена (${updatedFields})`
    };
  } catch (error) {
    console.error('Error updating task:', error);
    return {
      success: false,
      message: `❌ Ошибка обновления задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Удаление задачи
async function deleteTask(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Поиск задачи
    let task = null;
    if (args.task_id) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('id', args.task_id)
        .eq('user_id', userId)
        .maybeSingle();
      task = data;
    } else if (args.task_title) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${args.task_title}%`)
        .order('created_at', { ascending: false })
        .maybeSingle();
      task = data;
    }

    if (!task) {
      return {
        success: false,
        message: `❌ Задача не найдена`
      };
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .delete()
      .eq('id', task.id);

    if (error) throw error;

    return {
      success: true,
      message: `✅ Задача "${task.title}" удалена`
    };
  } catch (error) {
    console.error('Error deleting task:', error);
    return {
      success: false,
      message: `❌ Ошибка удаления задачи: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 6: Аналитика

// Общая статистика дашборда
async function getDashboardStats(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const period = args.period || 'week';
    
    // Определяем дату начала периода
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    // Получаем статистику клиентов
    const { data: clients } = await supabaseAdmin
      .from('applications')
      .select('id, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    const totalClients = clients?.length || 0;
    const newClients = clients?.filter((c: any) => c.status === 'new').length || 0;

    // Получаем статистику задач
    const { data: tasks } = await supabaseAdmin
      .from('tasks')
      .select('id, status, due_date')
      .eq('user_id', userId);

    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t: any) => t.status === 'completed').length || 0;
    const overdueTasks = tasks?.filter((t: any) => {
      if (!t.due_date || t.status === 'completed') return false;
      return new Date(t.due_date) < new Date();
    }).length || 0;

    // Получаем статистику смет
    const { data: estimates } = await supabaseAdmin
      .from('estimates')
      .select('id, status, total_amount, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    const totalEstimates = estimates?.length || 0;
    const approvedEstimates = estimates?.filter((e: any) => e.status === 'approved').length || 0;
    const totalEstimatesAmount = estimates?.reduce((sum: number, e: any) => sum + Number(e.total_amount || 0), 0) || 0;

    // Получаем статистику КП
    const { data: proposals } = await supabaseAdmin
      .from('proposals')
      .select('id, status, amount, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    const totalProposals = proposals?.length || 0;
    const sentProposals = proposals?.filter((p: any) => p.status === 'sent' || p.status === 'viewed').length || 0;

    const periodName = {
      today: 'сегодня',
      week: 'за неделю',
      month: 'за месяц',
      year: 'за год'
    }[period];

    const message = `📊 Статистика ${periodName}:

👥 КЛИЕНТЫ:
• Всего: ${totalClients}
• Новых: ${newClients}

✅ ЗАДАЧИ:
• Всего: ${totalTasks}
• Выполнено: ${completedTasks}
• Просрочено: ${overdueTasks}

💰 СМЕТЫ:
• Создано: ${totalEstimates}
• Согласовано: ${approvedEstimates}
• Сумма: ${Math.round(totalEstimatesAmount).toLocaleString('ru-RU')} ₽

📄 КП:
• Создано: ${totalProposals}
• Отправлено: ${sentProposals}`;

    return {
      success: true,
      stats: {
        clients: { total: totalClients, new: newClients },
        tasks: { total: totalTasks, completed: completedTasks, overdue: overdueTasks },
        estimates: { total: totalEstimates, approved: approvedEstimates, amount: totalEstimatesAmount },
        proposals: { total: totalProposals, sent: sentProposals }
      },
      message
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      success: false,
      message: `❌ Ошибка получения статистики: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Воронка продаж
async function getSalesFunnel(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const period = args.period || 'month';
    
    let startDate = new Date();
    switch (period) {
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
    }

    // Получаем всех клиентов за период
    const { data: clients } = await supabaseAdmin
      .from('applications')
      .select('id, conversion_stage, status, created_at')
      .eq('user_id', userId)
      .gte('created_at', startDate.toISOString());

    if (!clients || clients.length === 0) {
      return {
        success: true,
        funnel: [],
        message: '❌ Нет данных за выбранный период'
      };
    }

    // Подсчет по этапам
    const stages: Record<string, number> = {};
    clients.forEach((c: any) => {
      const stage = c.conversion_stage || 'Неизвестно';
      stages[stage] = (stages[stage] || 0) + 1;
    });

    const funnelData = Object.entries(stages)
      .sort((a, b) => b[1] - a[1])
      .map(([stage, count]) => ({
        stage,
        count,
        percentage: Math.round((count / clients.length) * 100)
      }));

    const message = `📈 Воронка продаж (${period}):\n\n` +
      funnelData.map(item => 
        `${item.stage}: ${item.count} (${item.percentage}%)`
      ).join('\n') +
      `\n\n💡 Всего клиентов в воронке: ${clients.length}`;

    return {
      success: true,
      funnel: funnelData,
      total: clients.length,
      message
    };
  } catch (error) {
    console.error('Error getting sales funnel:', error);
    return {
      success: false,
      message: `❌ Ошибка получения воронки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// МОДУЛЬ 7: Быстрые команды

// Ежедневная сводка
async function getDailySummary(userId: string) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Задачи на сегодня
    const { data: todayTasks } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', today.toISOString())
      .lt('due_date', tomorrow.toISOString())
      .neq('status', 'completed');

    // Новые клиенты за сегодня
    const { data: newClients } = await supabaseAdmin
      .from('applications')
      .select('id, name')
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    // Дедлайны на завтра
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    const { data: tomorrowDeadlines } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .gte('due_date', tomorrow.toISOString())
      .lt('due_date', dayAfterTomorrow.toISOString())
      .neq('status', 'completed');

    const tasksCount = todayTasks?.length || 0;
    const clientsCount = newClients?.length || 0;
    const deadlinesCount = tomorrowDeadlines?.length || 0;

    let message = `🌅 Сводка на ${today.toLocaleDateString('ru-RU')}:\n\n`;
    
    message += `✅ ЗАДАЧИ НА СЕГОДНЯ: ${tasksCount}\n`;
    if (tasksCount > 0) {
      message += todayTasks!.slice(0, 5).map((t: any) => 
        `  • ${t.title} (${t.priority})`
      ).join('\n');
      if (tasksCount > 5) message += `\n  ... и еще ${tasksCount - 5}`;
    }

    message += `\n\n👥 НОВЫЕ КЛИЕНТЫ: ${clientsCount}\n`;
    if (clientsCount > 0) {
      message += newClients!.slice(0, 3).map((c: any) => `  • ${c.name}`).join('\n');
      if (clientsCount > 3) message += `\n  ... и еще ${clientsCount - 3}`;
    }

    message += `\n\n⏰ ДЕДЛАЙНЫ ЗАВТРА: ${deadlinesCount}\n`;
    if (deadlinesCount > 0) {
      message += tomorrowDeadlines!.slice(0, 3).map((t: any) => `  • ${t.title}`).join('\n');
      if (deadlinesCount > 3) message += `\n  ... и еще ${deadlinesCount - 3}`;
    }

    return {
      success: true,
      summary: {
        today_tasks: todayTasks,
        new_clients: newClients,
        tomorrow_deadlines: tomorrowDeadlines
      },
      message
    };
  } catch (error) {
    console.error('Error getting daily summary:', error);
    return {
      success: false,
      message: `❌ Ошибка получения сводки: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Быстрый поиск
async function quickSearch(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const query = args.query.toLowerCase();
    const searchIn = args.search_in || ['clients', 'tasks', 'estimates', 'proposals', 'contractors', 'suppliers'];
    const results: any = {
      clients: [],
      tasks: [],
      estimates: [],
      proposals: [],
      contractors: [],
      suppliers: []
    };

    // Поиск клиентов
    if (searchIn.includes('clients')) {
      const { data } = await supabaseAdmin
        .from('applications')
        .select('id, name, phone, status')
        .eq('user_id', userId)
        .or(`name.ilike.%${query}%,phone.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(5);
      results.clients = data || [];
    }

    // Поиск задач
    if (searchIn.includes('tasks')) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('id, title, status, due_date')
        .eq('user_id', userId)
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);
      results.tasks = data || [];
    }

    // Поиск смет
    if (searchIn.includes('estimates')) {
      const { data } = await supabaseAdmin
        .from('estimates')
        .select('id, title, status, total_amount')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(5);
      results.estimates = data || [];
    }

    // Поиск КП
    if (searchIn.includes('proposals')) {
      const { data } = await supabaseAdmin
        .from('proposals')
        .select('id, title, status, amount')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(5);
      results.proposals = data || [];
    }

    // Поиск подрядчиков
    if (searchIn.includes('contractors')) {
      const { data } = await supabaseAdmin
        .from('contractor_profiles')
        .select('id, company_name, specialization, rating')
        .eq('user_id', userId)
        .ilike('company_name', `%${query}%`)
        .limit(5);
      results.contractors = data || [];
    }

    // Поиск поставщиков
    if (searchIn.includes('suppliers')) {
      const { data } = await supabaseAdmin
        .from('suppliers')
        .select('id, name, categories, status')
        .eq('user_id', userId)
        .ilike('name', `%${query}%`)
        .limit(5);
      results.suppliers = data || [];
    }

    // Формируем сообщение
    const totalFound = Object.values(results).reduce((sum: number, arr: any) => sum + arr.length, 0);

    if (totalFound === 0) {
      return {
        success: true,
        results,
        message: `❌ По запросу "${args.query}" ничего не найдено`
      };
    }

    let message = `🔍 Результаты поиска по "${args.query}":\n\n`;

    if (results.clients.length > 0) {
      message += `👥 КЛИЕНТЫ (${results.clients.length}):\n`;
      message += results.clients.map((c: any) => `  • ${c.name} - ${c.status}`).join('\n') + '\n\n';
    }

    if (results.tasks.length > 0) {
      message += `✅ ЗАДАЧИ (${results.tasks.length}):\n`;
      message += results.tasks.map((t: any) => `  • ${t.title} - ${t.status}`).join('\n') + '\n\n';
    }

    if (results.estimates.length > 0) {
      message += `💰 СМЕТЫ (${results.estimates.length}):\n`;
      message += results.estimates.map((e: any) => `  • ${e.title} - ${e.status}`).join('\n') + '\n\n';
    }

    if (results.proposals.length > 0) {
      message += `📄 КП (${results.proposals.length}):\n`;
      message += results.proposals.map((p: any) => `  • ${p.title} - ${p.status}`).join('\n') + '\n\n';
    }

    if (results.contractors.length > 0) {
      message += `🏗️ ПОДРЯДЧИКИ (${results.contractors.length}):\n`;
      message += results.contractors.map((c: any) => `  • ${c.company_name} - ${c.rating || 0}★`).join('\n') + '\n\n';
    }

    if (results.suppliers.length > 0) {
      message += `🚚 ПОСТАВЩИКИ (${results.suppliers.length}):\n`;
      message += results.suppliers.map((s: any) => `  • ${s.name}`).join('\n');
    }

    return {
      success: true,
      results,
      total_found: totalFound,
      message: message.trim()
    };
  } catch (error) {
    console.error('Error in quick search:', error);
    return {
      success: false,
      message: `❌ Ошибка поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Получение аналитики ИИ-консультанта
async function getConsultantAnalytics(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const period = args.period || 'week';
    const metric = args.metric || 'all';
    
    // Определяем дату начала периода
    let startDate = new Date();
    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
    }

    // Запрос истории консультаций
    const { data: consultations, error } = await supabaseAdmin
      .from('voice_command_history')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())
      .or('actions->0->>type.eq.consultation,execution_result->>response_type.not.is.null');

    if (error) throw error;

    const consultationData = consultations || [];
    const totalCount = consultationData.length;

    // Анализ типов вопросов
    const questionTypes: Record<string, number> = {};
    const frequentQuestions: Record<string, number> = {};

    consultationData.forEach((item) => {
      // Подсчет типов вопросов
      const questionType = item.execution_result?.response_type || 
                          item.actions?.[0]?.question_type || 
                          'general';
      questionTypes[questionType] = (questionTypes[questionType] || 0) + 1;

      // Подсчет частоты вопросов (первые 100 символов)
      const question = item.transcript?.substring(0, 100) || '';
      if (question) {
        frequentQuestions[question] = (frequentQuestions[question] || 0) + 1;
      }
    });

    // Топ-10 частых вопросов
    const topQuestions = Object.entries(frequentQuestions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([q, count]) => ({ question: q, count }));

    // Формируем сообщение в зависимости от метрики
    let message = `📊 Статистика ИИ-консультанта за ${
      period === 'today' ? 'сегодня' :
      period === 'week' ? 'неделю' :
      period === 'month' ? 'месяц' : 'все время'
    }:\n\n`;

    if (metric === 'count' || metric === 'all') {
      message += `📈 Всего обращений: ${totalCount}\n\n`;
    }

    if (metric === 'types' || metric === 'all') {
      message += `📋 По типам вопросов:\n`;
      Object.entries(questionTypes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          const typeNames: Record<string, string> = {
            'pricing': '💰 Цены',
            'materials': '🧱 Материалы',
            'services': '🛠️ Услуги',
            'timing': '⏱️ Сроки',
            'process': '📝 Процессы',
            'general': '❓ Общие'
          };
          message += `  ${typeNames[type] || type}: ${count} (${Math.round(count / totalCount * 100)}%)\n`;
        });
      message += '\n';
    }

    if (metric === 'questions' || metric === 'all') {
      message += `🔥 Топ-10 частых вопросов:\n`;
      topQuestions.forEach((item, idx) => {
        message += `${idx + 1}. ${item.question}... (${item.count} раз)\n`;
      });
    }

    return {
      success: true,
      message,
      analytics: {
        total_count: totalCount,
        question_types: questionTypes,
        top_questions: topQuestions,
        period
      }
    };
  } catch (error) {
    console.error('Error getting consultant analytics:', error);
    return {
      success: false,
      error: (error as Error).message,
      message: `❌ Ошибка получения аналитики: ${(error as Error).message}`
    };
  }
}

async function createCrmClient(userId: string, clientData: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Idempotency: if client with same phone already exists for this user — reuse it
    let existing = null as any;
    if (clientData.phone) {
      const { data: foundByPhone } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('phone', clientData.phone)
        .maybeSingle();
      existing = foundByPhone;
    }
    if (!existing && clientData.email) {
      const { data: foundByEmail } = await supabaseAdmin
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('email', clientData.email)
        .maybeSingle();
      existing = foundByEmail;
    }

    if (existing) {
      // Optionally enrich notes
      if (clientData.notes) {
        await supabaseAdmin
          .from('applications')
          .update({ notes: `${existing.notes || ''}\n${clientData.notes}`.trim() })
          .eq('id', existing.id);
      }
      return {
        success: true,
        client: existing,
        message: `ℹ️ Клиент с таким контактным данными уже существует: "${existing.name}" (ID: ${existing.id}). Использую существующую запись.`
      };
    }

    const { data, error } = await supabaseAdmin
      .from('applications')
      .insert({
        user_id: userId,
        name: clientData.name,
        phone: clientData.phone || '',
        email: clientData.email || '',
        lead_source: clientData.lead_source || 'unknown',
        notes: clientData.notes || '',
        conversion_stage: 'Первый звонок'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      client: data,
      message: `✅ Клиент "${clientData.name}" создан! ID: ${data.id}`
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Создание сметы через AI-Сметчика
async function createEstimateViaAI(userId: string, args: any, userToken?: string) {
  try {
    console.log('Creating estimate via AI-Estimator:', args);
    
    // Создаем клиент Supabase с service role key для вызова функций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Ищем существующее техническое задание для этого клиента
    let technicalSpecification = null;
    if (args.client_name) {
      const { data: existingSpecs } = await supabaseAdmin
        .from('technical_specifications')
        .select('*')
        .eq('user_id', userId)
        .eq('client_name', args.client_name)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingSpecs && existingSpecs.length > 0) {
        technicalSpecification = existingSpecs[0];
        console.log('Found existing technical specification for estimate:', technicalSpecification.id);
      }
    }
    
    // Формируем запрос с учетом технического задания
    const requestBody: any = {
      conversation_mode: true,
      action: args.project_description,
      data: {
        object_description: args.project_description,
        area: args.area,
        planned_services: args.services,
        mentioned_clients: args.client_name ? [{ name: args.client_name }] : []
      }
    };
    
    // Если есть техническое задание, передаем его подробности
    if (technicalSpecification) {
      requestBody.technical_specification = {
        id: technicalSpecification.id,
        work_scope: technicalSpecification.work_scope,
        materials_spec: technicalSpecification.materials_spec,
        object_description: technicalSpecification.object_description,
        client_name: technicalSpecification.client_name,
        object_address: technicalSpecification.object_address
      };
      requestBody.action = `Создать смету на основе технического задания: ${technicalSpecification.work_scope}`;
    }
    
    const { data, error } = await supabaseAdmin.functions.invoke('ai-estimator', {
      body: requestBody,
      headers: {
        Authorization: `Bearer ${userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;
    
    if (data && data.success) {
      return {
        success: true,
        message: `✅ Смета создана через AI-Сметчика!\n\n${data.response}`,
        estimate_id: data.estimate_id,
        total_amount: data.total_amount
      };
    } else if (data && (data.needs_technical_task || data.action_needed === 'create_technical_task')) {
      return {
        success: false,
        needs_technical_task: true,
        message: `⚠️ Для создания сметы нужно техническое задание.\n\nПредлагаю:\n1️⃣ Обратиться к AI Technical Specialist для создания подробного ТЗ\n2️⃣ Указать точные объемы работ и материалы\n3️⃣ После получения ТЗ - повторно создать смету\n\nХотите создать техническое задание через AI Technical Specialist?`
      };
    } else {
      return {
        success: false,
        message: `❌ Ошибка создания сметы: ${data?.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error in createEstimateViaAI:', error);
    
    // Проверяем, если ошибка связана с отсутствием ТЗ
    const errorMsg = error instanceof Error ? error.message : '';
    if (errorMsg.includes('техническое задание') || errorMsg.includes('technical specification')) {
      return {
        success: false,
        message: `⚠️ Для создания сметы нужно техническое задание.\n\nПредлагаю:\n1️⃣ Обратиться к AI Technical Specialist для создания подробного ТЗ\n2️⃣ Указать точные объемы работ и материалы\n3️⃣ После получения ТЗ - повторно создать смету\n\nХотите создать техническое задание через AI Technical Specialist?`
      };
    }
    
    return {
      success: false,
      message: `❌ Ошибка при обращении к AI-Сметчику: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Получение информации о клиенте
async function getClientInfo(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Split the client_name into parts for flexible search
    const nameParts = args.client_name.trim().split(/\s+/);
    
    // Try different search strategies
    let clients: any[] = [];
    
    // Strategy 1: Exact match
    let { data: exactClients } = await supabaseAdmin
      .from('applications')
      .select('id, name, phone, email, lead_source, created_at, notes, conversion_stage')
      .eq('user_id', userId)
      .ilike('name', args.client_name);
    
    if (exactClients && exactClients.length > 0) {
      clients = exactClients;
    } else {
      // Strategy 2: Search for any part of the name
      for (const part of nameParts) {
        if (part.length > 1) { // Only search for parts longer than 1 character
          const { data: partialClients } = await supabaseAdmin
            .from('applications')
            .select('id, name, phone, email, lead_source, created_at, notes, conversion_stage')
            .eq('user_id', userId)
            .ilike('name', `%${part}%`);
          
          if (partialClients) {
            clients = clients.concat(partialClients);
          }
        }
      }
      
      // Remove duplicates
      clients = clients.filter((client, index, self) => 
        index === self.findIndex(c => c.id === client.id)
      );
    }

    if (!clients || clients.length === 0) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден`
      };
    }

    // If multiple clients found, ask for clarification
    if (clients.length > 1) {
      return {
        success: true,
        multiple_matches: true,
        clients: clients,
        message: `⚠️ Найдено несколько клиентов с похожими именами. Уточните, о ком идет речь:\n` + 
          clients.map((client, index) => `${index + 1}. ${client.name} (${client.phone})`).join('\n')
      };
    }

    const client = clients[0];

    // Получаем задачи клиента
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, title, description, status, due_date, created_at, priority')
      .eq('user_id', userId)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // Получаем сметы клиента
    const { data: estimates, error: estimatesError } = await supabaseAdmin
      .from('estimates')
      .select('id, title, status, total_amount, created_at')
      .eq('user_id', userId)
      .eq('client_id', client.id)
      .order('created_at', { ascending: false });

    if (estimatesError) throw estimatesError;

    return {
      success: true,
      client: client,
      tasks: tasks || [],
      estimates: estimates || [],
      message: `ℹ️ Информация о клиенте "${client.name}":\n` +
        `📞 Телефон: ${client.phone}\n` +
        `📧 Email: ${client.email || 'не указан'}\n` +
        `📊 Этап: ${client.conversion_stage}\n` +
        `📝 Заметки: ${client.notes || 'нет'}\n` +
        `📋 Задач: ${tasks?.length || 0}\n` +
        `💰 Смет: ${estimates?.length || 0}`
    };
  } catch (error) {
    console.error('Error getting client info:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Завершение задачи
async function completeTask(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let task = null;

    // Если передан ID задачи
    if (args.task_id) {
      const { data } = await supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('id', args.task_id)
        .eq('user_id', userId)
        .maybeSingle();
      task = data;
    } else if (args.task_title) {
      // Поиск по названию задачи
      let query = supabaseAdmin
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .ilike('title', `%${args.task_title}%`);

      // Если указан клиент, добавляем фильтр
      if (args.client_name) {
        const { data: client } = await supabaseAdmin
          .from('applications')
          .select('id')
          .eq('user_id', userId)
          .ilike('name', `%${args.client_name}%`)
          .maybeSingle();
        
        if (client) {
          query = query.eq('client_id', client.id);
        }
      }

      const { data } = await query
        .order('created_at', { ascending: false })
        .maybeSingle();
      task = data;
    }

    if (!task) {
      return {
        success: false,
        message: `❌ Задача не найдена`
      };
    }

    if (task.status === 'completed') {
      return {
        success: true,
        message: `ℹ️ Задача "${task.title}" уже выполнена`
      };
    }

    // Обновляем статус задачи
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', task.id)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      task: data,
      message: `✅ Задача "${task.title}" отмечена как выполненная`
    };
  } catch (error) {
    console.error('Error completing task:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Создание задач
async function createTask(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Resolve client_id by name if provided
    let client_id: string | null = null;
    if (args.client_name) {
      const { data: client } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', args.client_name)
        .order('created_at', { ascending: false })
        .maybeSingle();
      client_id = client?.id ?? null;
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .insert({
        user_id: userId,
        title: args.title,
        description: args.description || null,
        due_date: args.due_date || null,
        client_id: client_id,
        status: 'pending',
        priority: 'medium',
        category: 'meeting'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      task: data,
      message: `✅ Задача создана: "${data.title}" на ${data.due_date || 'указанную дату'}`
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Получение задач с фильтрами
async function getTasks(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const todayStr = new Date().toISOString().split('T')[0];
    const limit = Math.max(1, Math.min(Number(args?.limit) || 20, 100));
    const scope = args?.scope || 'all';
    const status = args?.status as string | undefined;

    let query = supabaseAdmin
      .from('tasks')
      .select('id, title, status, priority, due_date, category')
      .eq('user_id', userId);

    if (scope === 'today') {
      // Включаем задачи с due_date <= сегодня (не только точно сегодня)
      query = query.lte('due_date', todayStr).neq('status', 'completed');
    } else if (scope === 'overdue') {
      query = query.lt('due_date', todayStr).neq('status', 'completed');
    } else if (scope === 'by_status' && status) {
      if (status === 'overdue') {
        query = query.lt('due_date', todayStr).neq('status', 'completed');
      } else {
        query = query.eq('status', status);
      }
    }

    const { data, error } = await query
      .order('due_date', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    const tasks = data || [];

    const titleMap: Record<string, string> = {
      all: 'все задачи',
      today: 'задачи на сегодня',
      overdue: 'просроченные задачи',
      by_status: `задачи со статусом "${status || ''}"`
    };

    const header = titleMap[scope] || 'задачи';
    
    // Для задач на сегодня - краткий ответ с предложением действий
    if (scope === 'today') {
      if (tasks.length === 0) {
        return { 
          success: true, 
          tasks, 
          message: "На сегодня у вас нет запланированных задач. Хотите создать новую задачу?" 
        };
      }
      
      if (tasks.length === 1) {
        const task = tasks[0];
        return { 
          success: true, 
          tasks, 
          message: `На сегодня у вас одна задача: "${task.title}". Хотите узнать подробности или поручить её AI-помощнику?` 
        };
      }
      
      const tasksList = tasks.map(t => `• ${t.title}`).join('\n');
      return { 
        success: true, 
        tasks, 
        message: `На сегодня у вас ${tasks.length} задачи:\n${tasksList}\n\nХотите узнать подробности по какой-то задаче?` 
      };
    }
    
    // Для других случаев - подробный ответ
    const list = tasks
      .map((t) => `• ${t.title} — ${t.status}, приоритет: ${t.priority}${t.due_date ? `, срок: ${t.due_date}` : ''}`)
      .join('\n');

    const message = tasks.length
      ? `Нашёл ${tasks.length} (${header}):\n${list}`
      : `Задачи (${header}) не найдены`;

    return { success: true, tasks, message };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Статистика задач
async function getTasksStats(userId: string) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const todayStr = new Date().toISOString().split('T')[0];

    const totalQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId);
    const todayQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('due_date', todayStr).neq('status', 'completed');
    const overdueQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).lt('due_date', todayStr).neq('status', 'completed');
    const pendingQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending');
    const inProgressQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'in-progress');
    const completedQ = supabaseAdmin.from('tasks').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed');

    const [total, today, overdue, pending, inProgress, completed] = await Promise.all([
      totalQ, todayQ, overdueQ, pendingQ, inProgressQ, completedQ
    ]);

    const message = `Статистика задач:\n` +
      `• Всего: ${total.count ?? 0}\n` +
      `• На сегодня: ${today.count ?? 0}\n` +
      `• Просроченные: ${overdue.count ?? 0}\n` +
      `• По статусам — ожидание: ${pending.count ?? 0}, в работе: ${inProgress.count ?? 0}, выполнено: ${completed.count ?? 0}`;

    return {
      success: true,
      stats: {
        total: total.count ?? 0,
        today: today.count ?? 0,
        overdue: overdue.count ?? 0,
        by_status: {
          pending: pending.count ?? 0,
          in_progress: inProgress.count ?? 0,
          completed: completed.count ?? 0
        }
      },
      message
    };
  } catch (error) {
    console.error('Error getting tasks stats:', error);
    return { success: false, error: (error as Error).message };
  }
}

// Получение списка клиентов
async function getClients(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const limit = Math.max(1, Math.min(Number(args?.limit) || 20, 100));
    let query = supabaseAdmin
      .from('clients')
      .select('id, name, phone, email, status, conversion_stage, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (args?.status) {
      query = query.eq('status', args.status);
    }
    if (args?.conversion_stage) {
      query = query.eq('conversion_stage', args.conversion_stage);
    }

    const { data, error } = await query;
    if (error) throw error;

    const clients = data || [];
    const list = clients
      .map((c) => `• ${c.name}${c.phone ? ` (${c.phone})` : ''} — статус: ${c.status}, этап: ${c.conversion_stage}`)
      .join('\n');

    const message = clients.length
      ? `Найдено клиентов: ${clients.length}\n${list}`
      : 'Клиенты не найдены';

    return { success: true, clients, message };
  } catch (error) {
    console.error('Error getting clients:', error);
    return { success: false, error: (error as Error).message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('enhanced-voice-chat: Starting request processing...');
    
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Create Supabase client and authenticate user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const { data: { user }, error } = await supabaseClient.auth.getUser(token);
    
    if (error || !user) {
      throw new Error('Invalid authorization');
    }
    
    console.log('enhanced-voice-chat: User authenticated:', user.id);

    const requestBody = await req.json();
    
    const { message, conversation_history = [] } = requestBody;

    if (!message) {
      console.error('enhanced-voice-chat: Message is required');
      throw new Error('Message is required');
    }

    console.log('enhanced-voice-chat: Message received:', message.substring(0, 100));

    console.log('enhanced-voice-chat: Getting user settings...');
    // Получаем настройки пользователя
    const userSettings = await getUserSettings(user.id);

    // Проверяем настройку потоковой передачи
    const enableStreaming = userSettings?.ai_settings?.enable_streaming === true;
    console.log('enhanced-voice-chat: Streaming enabled:', enableStreaming);

    // Получаем текущую дату для правильного расчета дат
    const currentDate = new Date();
    const currentDateStr = currentDate.toISOString().split('T')[0];
    const currentDayName = currentDate.toLocaleDateString('ru-RU', { weekday: 'long' });
    
    const systemPrompt = `Вы - умный голосовой помощник руководителя ландшафтной строительной компании. 
Вы понимаете контекст разговора и помогаете управлять бизнесом.

ТЕКУЩАЯ ДАТА: ${currentDateStr} (${currentDayName})

СТИЛЬ ОБЩЕНИЯ:
- Отвечайте КРАТКО и по существу на заданный вопрос
- Не перегружайте ответ лишними деталями (статус, приоритет) если их не спрашивали
- После краткого ответа предлагайте конкретные действия
- Задавайте уточняющие вопросы для лучшего понимания потребностей  
- Предлагайте использование AI-помощников (сметчик, техспециалист и т.д.)
- Используйте фразы типа "Хотите поручить...", "Хотите узнать подробности...", "Предлагаю..."

ПРИМЕРЫ ПРАВИЛЬНЫХ ОТВЕТОВ:
- На вопрос "какие задачи на сегодня?": "На сегодня у вас одна задача: посчитать заезд на завод Тюменьмолоко. Хотите поручить её AI-сметчику?"
- На вопрос "сколько задач?": "У вас 3 задачи на сегодня. Хотите их список или подробности по какой-то?"

ОСНОВНЫЕ ФУНКЦИИ:

УПРАВЛЕНИЕ КЛИЕНТАМИ:
- get_client_info - получить информацию о клиенте и его задачах
- create_client - создать нового клиента (имя, телефон, email, источник лида)
- get_clients - список клиентов с фильтрами (status, conversion_stage, limit)
- update_client - обновить данные клиента (телефон, email, адрес, бюджет, статус, заметки, этап)
- archive_client - архивировать клиента (причина, комментарий, период)
- get_client_history - история взаимодействий с клиентом (тип: call/meeting/email/message)
- add_client_comment - добавить комментарий к клиенту (note/important/warning)

УПРАВЛЕНИЕ ЗАДАЧАМИ:
- create_task - создать задачу (заголовок, описание, дата выполнения, клиент)
- get_tasks - список задач (scope: all/today/overdue/by_status, status, limit)
- get_tasks_stats - статистика задач (всего, сегодня, просроченные, по статусам)
- update_task - обновить задачу (название, описание, дата, приоритет, статус, исполнитель)
- delete_task - удалить задачу (ID или название)
- complete_task - завершить задачу (ID или название, имя клиента)

УПРАВЛЕНИЕ ПОДРЯДЧИКАМИ:
- create_contractor - создать подрядчика (название, телефон, специализации, опыт, описание)
- get_contractors - список подрядчиков (специализация, только проверенные, мин. рейтинг)
- assign_contractor_to_project - назначить подрядчика на проект (подрядчик, клиент, роль, заметки)

УПРАВЛЕНИЕ ПОСТАВЩИКАМИ:
- create_supplier - создать поставщика (название, категории, контакт, телефон, email, место)
- get_suppliers - список поставщиков (категории, статус, мин. рейтинг)

СМЕТЫ И ТЕХЗАДАНИЯ:
- create_estimate - создать смету через AI-Сметчика (описание проекта, площадь, клиент, услуги)
- create_technical_specification - создать ТЗ (описание объекта, клиент, адрес)
- get_technical_specifications - найти ТЗ (client_name, title, limit)
- create_estimate_from_technical_spec - создать смету из ТЗ (ID ТЗ, имя клиента или название ТЗ)
- search_services_in_nomenclature - поиск услуг в номенклатуре
- add_items_to_estimate - добавить позиции в смету

КОММЕРЧЕСКИЕ ПРЕДЛОЖЕНИЯ:
- create_proposal - создать КП (клиент, ID сметы, название, шаблон, отправить сразу)
- send_proposal - отправить КП (ID КП, имя клиента, способ: email/whatsapp/telegram)

АНАЛИТИКА И ОТЧЕТЫ:
- get_dashboard_stats - общая статистика (клиенты, задачи, сметы, КП) за период (today/week/month/year)
- get_sales_funnel - воронка продаж за период (week/month/quarter)
- get_consultant_analytics - статистика ИИ-консультанта (period, metric: count/questions/types/all)

ДЕЛЕГИРОВАНИЕ AI-ПОМОЩНИКАМ:
- delegate_to_ai_assistant - делегировать задачу специализированному AI-ассистенту
  Доступные ассистенты: сметчик, аналитик, конкурентный-анализ
  Примеры: "поручи сметчику расчет на 100 кв.м", "делегируй аналитику продаж аналитику"

БЫСТРЫЕ КОМАНДЫ:
- daily_summary - ежедневная сводка (задачи на сегодня, новые клиенты, дедлайны)
- quick_search - быстрый поиск по всем сущностям CRM (клиенты, задачи, сметы, КП, подрядчики, поставщики)

N8N АВТОМАТИЗАЦИЯ:
- call_n8n_workflow - вызвать автоматизированный workflow n8n для обработки данных, интеграции с внешними сервисами или выполнения сложных задач
  Используется для: автоматизации бизнес-процессов, интеграции с внешними API, обработки данных, отправки уведомлений и других задач автоматизации
  Примеры: "отправь данные в n8n", "обработай заказ через n8n", "запусти автоматизацию для клиента"

АНАЛИТИКА ИИ-КОНСУЛЬТАНТА:
- Статистика обращений через get_consultant_analytics (period: today/week/month/all, metric: count/questions/types/all)
- ПРИМЕРЫ ЗАПРОСОВ: "сколько обращений к консультанту за неделю?", "какие самые частые вопросы к консультанту?", "покажи статистику по типам вопросов консультанта"
- Возвращает: количество обращений, топ-10 частых вопросов, распределение по типам (цены, материалы, услуги, сроки, процессы)

ВАЖНО - СВЯЗКА С КЛИЕНТАМИ И ТЗ:
• При запросе создания ТЗ или сметы для клиента: СНАЧАЛА ищи клиента через get_client_info
• Если клиент НЕ НАЙДЕН - предлагай создать через create_client
• При поиске ТЗ используй get_technical_specifications по имени клиента или названию
• Для создания сметы из ТЗ используй create_estimate_from_technical_spec - AI-сметчик автоматически заполнит все поля

НЕ ПРОСТО ПЕРЕЧИСЛЯЙТЕ ДАННЫЕ - ПРЕДЛАГАЙТЕ ДЕЙСТВИЯ И ЗАДАВАЙТЕ УТОЧНЯЮЩИЕ ВОПРОСЫ!`;

    // История разговора
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt }
    ];

    // Добавляем предыдущую историю
    conversation_history.forEach((msg: any) => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Добавляем текущее сообщение
    messages.push({
      role: 'user',
      content: message
    });

    console.log('enhanced-voice-chat: Calling OpenAI with tools...');
    // Вызываем OpenAI с поддержкой функций для работы с базой данных
    const aiResponse = await callOpenAIWithTools(messages, userSettings, user.id, token, enableStreaming);

    console.log('enhanced-voice-chat: OpenAI response received');
    
    // Автосохранение диалогов (если включено и не режим приватности)
    if (userSettings?.advanced_features?.auto_save_conversations !== false && !userSettings?.advanced_features?.privacy_mode) {
      try {
        await saveConversationHistory(user.id, message, typeof aiResponse === 'string' ? aiResponse : 'streaming_response');
      } catch (error) {
        console.warn('Failed to save conversation history:', error);
      }
    }
    
    // Если ответ - это поток, возвращаем потоковый ответ
    if (aiResponse instanceof ReadableStream) {
      console.log('enhanced-voice-chat: Returning streaming response');
      return new Response(aiResponse, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
      });
    }
    
    // Иначе возвращаем обычный JSON ответ
    console.log('enhanced-voice-chat: Returning standard response');
    return new Response(JSON.stringify({
      response: aiResponse,
      model_used: 'enhanced-voice-chat',
      interaction_mode: userSettings.interaction_mode,
      settings_applied: {
        function_calling: userSettings?.advanced_features?.enable_function_calling !== false,
        auto_save: userSettings?.advanced_features?.auto_save_conversations !== false,
        privacy_mode: userSettings?.advanced_features?.privacy_mode || false
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-voice-chat:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Неизвестная ошибка',
      response: `Извините, произошла ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper functions remain the same...
async function getUserSettings(userId: string): Promise<UserSettings> {
  const defaultSettings: UserSettings = {
    preferred_ai_model: 'openai',
    interaction_mode: 'text',
    voice_settings: {},
    ai_settings: {}
  };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .from('ai_assistant_settings')
      .select('settings')
      .eq('user_id', userId)
      .eq('assistant_type', 'voice_assistant')
      .maybeSingle();

    if (error || !data) {
      return defaultSettings;
    }

    return { ...defaultSettings, ...data.settings };
  } catch (error) {
    console.error('Error fetching user settings:', error);
    return defaultSettings;
  }
}

// Получение технических заданий
async function getTechnicalSpecifications(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabaseAdmin
      .from('technical_specifications')
      .select('id, title, client_name, object_address, status, created_at')
      .eq('user_id', userId);

    // Фильтрация по имени клиента
    if (args.client_name) {
      query = query.ilike('client_name', `%${args.client_name}%`);
    }

    // Фильтрация по названию ТЗ
    if (args.title) {
      query = query.ilike('title', `%${args.title}%`);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(args.limit || 10);

    if (error) throw error;

    const specifications = data || [];

    if (specifications.length === 0) {
      const searchTerm = args.client_name || args.title || '';
      return {
        success: true,
        specifications: [],
        message: searchTerm ? 
          `❌ Технические задания для "${searchTerm}" не найдены` :
          'У вас пока нет технических заданий'
      };
    }

    const list = specifications
      .map((spec) => `• ${spec.title} (${spec.client_name}) - ${spec.status}`)
      .join('\n');

    const message = `Найдено ${specifications.length} технических заданий:\n${list}\n\nХотите создать смету на основе какого-то ТЗ?`;

    return {
      success: true,
      specifications,
      message
    };
  } catch (error) {
    console.error('Error getting technical specifications:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Функция для сохранения истории разговоров
async function saveConversationHistory(userId: string, userMessage: string, aiResponse: string) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabaseAdmin
      .from('voice_command_history')
      .insert({
        user_id: userId,
        command: userMessage,
        response: aiResponse,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('Error saving conversation history:', error);
    } else {
      console.log('Conversation history saved successfully');
    }
  } catch (error) {
    console.error('Error in saveConversationHistory:', error);
  }
}

// Создание или обновление технического задания через AI-Технолога
async function createTechnicalSpecification(userId: string, args: any, userToken?: string) {
  try {
    console.log('Creating/updating technical specification via AI-Technical-Specialist:', args);
    
    // Создаем клиент Supabase с service role key для вызова функций
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // Проверяем, есть ли уже существующее ТЗ для этого клиента и объекта
    let existingSpec = null;
    if (args.client_name) {
      const { data: existingSpecs } = await supabaseAdmin
        .from('technical_specifications')
        .select('*')
        .eq('user_id', userId)
        .eq('client_name', args.client_name)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (existingSpecs && existingSpecs.length > 0) {
        existingSpec = existingSpecs[0];
        console.log('Found existing specification:', existingSpec.id);
      }
    }
    
    const { data, error } = await supabaseAdmin.functions.invoke('ai-technical-specialist', {
      body: {
        object_description: args.object_description,
        client_name: args.client_name,
        object_address: args.object_address,
        existing_spec_id: existingSpec?.id, // Передаем ID существующего ТЗ
        update_mode: !!existingSpec // Флаг что это обновление
      },
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    });

    if (error) {
      console.error('Error calling ai-technical-specialist:', error);
      return { 
        success: false, 
        error: 'Ошибка при вызове AI-Технолога',
        details: error.message 
      };
    }

    console.log('Technical specification processed successfully:', data);
    
    const action = existingSpec ? 'обновлено' : 'создано';
    return {
      success: true,
      specification: data.specification,
      message: `✅ Техническое задание ${action} для клиента ${args.client_name}`,
      updated: !!existingSpec
    };
  } catch (error) {
    console.error('Error in createTechnicalSpecification:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Создание нового клиента
async function createNewClient(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Проверим, не существует ли уже клиент с таким именем
    const { data: existingClient } = await supabaseAdmin
      .from('clients')
      .select('id, name')
      .eq('user_id', userId)
      .ilike('name', `%${args.name}%`)
      .single();

    if (existingClient) {
      return {
        success: false,
        message: `Клиент "${existingClient.name}" уже существует в системе`
      };
    }

    // Создаем нового клиента
    const clientData = {
      user_id: userId,
      name: args.name || 'Новый клиент',
      phone: args.phone || '',
      email: args.email || null,
      address: args.address || null,
      services: args.services || [],
      status: 'new',
      notes: args.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert(clientData)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      client: data,
      message: `✅ Клиент "${data.name}" успешно создан. Теперь можно создать для него техническое задание или смету.`
    };
  } catch (error) {
    console.error('Error creating client:', error);
    return { 
      success: false, 
      error: (error as Error).message 
    };
  }
}

// Поиск услуг в номенклатуре
async function searchServicesInNomenclature(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const searchQuery = args.search_query.toLowerCase();
    const limit = args.limit || 5;

    console.log('Searching services:', searchQuery);

    // Поиск по названию и категории
    const { data: services, error } = await supabaseAdmin
      .from('services')
      .select('id, name, category, unit, price, description')
      .eq('user_id', userId)
      .or(`name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)
      .limit(limit);

    if (error) throw error;

    if (!services || services.length === 0) {
      return {
        success: false,
        message: `❌ Услуги по запросу "${args.search_query}" не найдены в номенклатуре.\n\nПопробуйте:\n• Изменить формулировку\n• Проверить номенклатуру в CRM`
      };
    }

    // Форматируем результаты для пользователя
    const formattedServices = services.map((service, index) => 
      `${index + 1}. ${service.name}\n   Категория: ${service.category}\n   Цена: ${service.price} руб/${service.unit}\n   ID: ${service.id}`
    ).join('\n\n');

    return {
      success: true,
      services: services,
      message: `✅ Найдено услуг: ${services.length}\n\n${formattedServices}\n\n💡 Хотите добавить какую-то из этих позиций в смету?`
    };
  } catch (error) {
    console.error('Error searching services:', error);
    return {
      success: false,
      message: `❌ Ошибка поиска: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Добавление позиций в смету
async function addItemsToEstimate(userId: string, args: any) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let estimateId = args.estimate_id;

    // Если ID сметы не указан, ищем по имени клиента
    if (!estimateId && args.client_name) {
      const { data: estimates } = await supabaseAdmin
        .from('estimates')
        .select('id, title')
        .eq('user_id', userId)
        .ilike('title', `%${args.client_name}%`)
        .order('created_at', { ascending: false })
        .limit(1);

      if (estimates && estimates.length > 0) {
        estimateId = estimates[0].id;
      } else {
        return {
          success: false,
          message: `❌ Смета для клиента "${args.client_name}" не найдена`
        };
      }
    }

    if (!estimateId) {
      return {
        success: false,
        message: `❌ Не указана смета для добавления позиций`
      };
    }

    // Проверяем, что смета существует
    const { data: estimate, error: estimateError } = await supabaseAdmin
      .from('estimates')
      .select('id, title, total_amount')
      .eq('id', estimateId)
      .eq('user_id', userId)
      .single();

    if (estimateError || !estimate) {
      return {
        success: false,
        message: `❌ Смета с ID ${estimateId} не найдена`
      };
    }

    // Добавляем позиции
    const itemsToAdd = args.services.map((service: any) => ({
      estimate_id: estimateId,
      material_id: service.service_id,
      quantity: service.quantity || 1,
      unit_price: service.unit_price,
      total: (service.quantity || 1) * service.unit_price
    }));

    const { data: newItems, error: itemsError } = await supabaseAdmin
      .from('estimate_items')
      .insert(itemsToAdd)
      .select();

    if (itemsError) throw itemsError;

    // Пересчитываем общую сумму сметы
    const { data: allItems } = await supabaseAdmin
      .from('estimate_items')
      .select('total')
      .eq('estimate_id', estimateId);

    const newTotalAmount = allItems?.reduce((sum, item) => sum + parseFloat(item.total), 0) || 0;

    // Обновляем общую сумму
    await supabaseAdmin
      .from('estimates')
      .update({ total_amount: newTotalAmount })
      .eq('id', estimateId);

    const addedServices = args.services.map((s: any) => 
      `• ${s.service_name}: ${s.quantity || 1} x ${s.unit_price} руб = ${(s.quantity || 1) * s.unit_price} руб`
    ).join('\n');

    return {
      success: true,
      estimate_id: estimateId,
      items_added: newItems?.length || 0,
      new_total: newTotalAmount,
      message: `✅ Добавлено позиций в смету "${estimate.title}": ${newItems?.length || 0}\n\n${addedServices}\n\n💰 Новая общая сумма: ${newTotalAmount.toFixed(2)} руб`
    };
  } catch (error) {
    console.error('Error adding items to estimate:', error);
    return {
      success: false,
      message: `❌ Ошибка добавления позиций: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Создание сметы из технического задания
async function createEstimateFromTechSpec(userId: string, args: any, userToken: string) {
  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let techSpec;

    // Если указан ID, ищем по ID
    if (args.technical_spec_id) {
      const { data, error } = await supabaseAdmin
        .from('technical_specifications')
        .select('*')
        .eq('id', args.technical_spec_id)
        .eq('user_id', userId)
        .single();
      
      if (error || !data) {
        return {
          success: false,
          message: `Техническое задание с ID ${args.technical_spec_id} не найдено`
        };
      }
      techSpec = data;
    } 
    // Иначе ищем по имени клиента или названию ТЗ
    else {
      let query = supabaseAdmin
        .from('technical_specifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (args.client_name) {
        query = query.ilike('client_name', `%${args.client_name}%`);
      }
      if (args.spec_title) {
        query = query.ilike('title', `%${args.spec_title}%`);
      }

      const { data, error } = await query.limit(1);
      
      if (error) {
        console.error('Error fetching tech spec:', error);
        return {
          success: false,
          message: 'Ошибка при поиске технического задания'
        };
      }
      
      if (!data || data.length === 0) {
        return {
          success: false,
          message: args.client_name 
            ? `Техническое задание для клиента "${args.client_name}" не найдено`
            : `Техническое задание "${args.spec_title}" не найдено`
        };
      }
      techSpec = data[0];
    }

    // Вызываем AI-сметчик для создания сметы
    console.log('Calling ai-estimator with tech spec:', techSpec.id);
    
    const estimatorResponse = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-estimator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          action: 'create_estimate_from_spec',
          data: {
            technical_specification_id: techSpec.id
          }
        })
      }
    );

    if (!estimatorResponse.ok) {
      const errorText = await estimatorResponse.text();
      console.error('AI-estimator error:', errorText);
      throw new Error(`AI-сметчик вернул ошибку: ${estimatorResponse.status}`);
    }

    const result = await estimatorResponse.json();

    if (result.success) {
      return {
        success: true,
        estimate: result.estimate,
        message: `✅ Смета "${result.estimate?.title || 'Новая смета'}" успешно создана на основе ТЗ "${techSpec.title}".\n` +
                 `Клиент: ${techSpec.client_name}\n` +
                 `Позиций в смете: ${result.estimate?.items?.length || 0}\n` +
                 `Общая сумма: ${result.estimate?.total_amount || 0} руб.`
      };
    } else {
      return {
        success: false,
        message: `Не удалось создать смету: ${result.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error creating estimate from tech spec:', error);
    return { 
      success: false, 
      error: (error as Error).message,
      message: `Ошибка при создании сметы из ТЗ: ${(error as Error).message}`
    };
  }
}

// Создание коммерческого предложения через AI-менеджера КП
async function createProposalViaAI(userId: string, args: any, userToken?: string) {
  try {
    console.log('Creating proposal via AI Proposal Manager:', args);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Находим клиента
    const { data: clients } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('user_id', userId)
      .ilike('name', `%${args.client_name}%`)
      .limit(1);

    if (!clients || clients.length === 0) {
      return {
        success: false,
        message: `❌ Клиент "${args.client_name}" не найден. Сначала создайте клиента.`
      };
    }

    const client = clients[0];

    // Находим смету если указана
    let estimateId = args.estimate_id;
    if (!estimateId && args.client_name) {
      const { data: estimates } = await supabaseAdmin
        .from('estimates')
        .select('*')
        .eq('user_id', userId)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (estimates && estimates.length > 0) {
        estimateId = estimates[0].id;
      }
    }

    // Вызываем AI-менеджера КП для создания предложения
    const { data, error } = await supabaseAdmin.functions.invoke('ai-proposal-manager', {
      body: {
        action: 'create_proposal',
        data: {
          client_id: client.id,
          estimate_id: estimateId,
          title: args.title || `КП для ${client.name}`,
          template_name: args.template_name
        }
      },
      headers: {
        Authorization: `Bearer ${userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;

    if (data && data.success) {
      let message = `✅ Коммерческое предложение "${args.title || 'КП для ' + client.name}" создано!\n\nID: ${data.proposal_id}`;
      
      // Если нужно отправить сразу
      if (args.send_immediately) {
        const sendResult = await sendProposalViaAI(userId, {
          proposal_id: data.proposal_id,
          client_name: args.client_name,
          send_method: 'email'
        }, userToken);
        
        if (sendResult.success) {
          message += `\n\n${sendResult.message}`;
        }
      }
      
      return {
        success: true,
        message,
        proposal_id: data.proposal_id
      };
    } else {
      return {
        success: false,
        message: `❌ Ошибка создания КП: ${data?.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error in createProposalViaAI:', error);
    return {
      success: false,
      message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Отправка коммерческого предложения
async function sendProposalViaAI(userId: string, args: any, userToken?: string) {
  try {
    console.log('Sending proposal via AI Proposal Manager:', args);
    
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let proposalId = args.proposal_id;

    // Если не указан ID, ищем по имени клиента
    if (!proposalId && args.client_name) {
      const { data: clients } = await supabaseAdmin
        .from('clients')
        .select('id')
        .eq('user_id', userId)
        .ilike('name', `%${args.client_name}%`)
        .limit(1);

      if (clients && clients.length > 0) {
        const { data: proposals } = await supabaseAdmin
          .from('proposals')
          .select('id')
          .eq('user_id', userId)
          .eq('client_id', clients[0].id)
          .eq('status', 'draft')
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (proposals && proposals.length > 0) {
          proposalId = proposals[0].id;
        }
      }
    }

    if (!proposalId) {
      return {
        success: false,
        message: '❌ Коммерческое предложение не найдено.'
      };
    }

    // Вызываем AI-менеджера КП для отправки
    const { data, error } = await supabaseAdmin.functions.invoke('ai-proposal-manager', {
      body: {
        action: 'send_proposal',
        data: {
          proposal_id: proposalId,
          send_options: {
            method: args.send_method || 'email'
          }
        }
      },
      headers: {
        Authorization: `Bearer ${userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;

    if (data && data.success) {
      const sendMethod = args.send_method === 'whatsapp' ? 'WhatsApp' : 
                        args.send_method === 'telegram' ? 'Telegram' : 'Email';
      return {
        success: true,
        message: `✅ КП отправлено клиенту через ${sendMethod}!\n\nАдрес: ${data.sent_to}\nВремя отправки: ${new Date(data.sent_at).toLocaleString('ru-RU')}`
      };
    } else {
      return {
        success: false,
        message: `❌ Ошибка отправки КП: ${data?.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error in sendProposalViaAI:', error);
    return {
      success: false,
      message: `❌ Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}
