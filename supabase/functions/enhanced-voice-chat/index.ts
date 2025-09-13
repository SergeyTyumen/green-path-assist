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
      }
    ];

    let runningMessages: any[] = [...messages];

    // Сокращаем максимальное количество итераций для быстроты
    for (let depth = 0; depth < 5; depth++) { // safety cap to avoid loops
      const configuredModel = (settings?.ai_settings?.openai_model as string) || 'gpt-4o-mini';
      const isNewModel = configuredModel.startsWith('gpt-5') || configuredModel.startsWith('gpt-4.1') || configuredModel.startsWith('o3') || configuredModel.startsWith('o4');
      
      const payload: any = {
        model: isNewModel ? 'gpt-4o-mini' : configuredModel, // use legacy-compatible model for tool calls
        messages: runningMessages,
        tools,
        tool_choice: 'auto'
      };
      
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
    throw new Error(`Ошибка вызова OpenAI: ${error.message}`);
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
      return await createCrmClient(userId, args);

    case 'create_estimate':
      return await createEstimateViaAI(userId, args, userToken);

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
      
    default:
      return { error: `Unknown function: ${functionName}` };
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
        .from('clients')
        .select('*')
        .eq('user_id', userId)
        .eq('phone', clientData.phone)
        .maybeSingle();
      existing = foundByPhone;
    }
    if (!existing && clientData.email) {
      const { data: foundByEmail } = await supabaseAdmin
        .from('clients')
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
          .from('clients')
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
      .from('clients')
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
    
    const { data, error } = await supabaseAdmin.functions.invoke('ai-estimator', {
      body: {
        conversation_mode: true,
        action: args.project_description,
        data: {
          object_description: args.project_description,
          area: args.area,
          planned_services: args.services,
          mentioned_clients: args.client_name ? [{ name: args.client_name }] : []
        }
      },
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
    } else {
      return {
        success: false,
        message: `❌ Ошибка создания сметы: ${data?.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error in createEstimateViaAI:', error);
    return {
      success: false,
      message: `❌ Ошибка при обращении к AI-Сметчику: ${error.message}`
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
    let clients = [];
    
    // Strategy 1: Exact match
    let { data: exactClients } = await supabaseAdmin
      .from('clients')
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
            .from('clients')
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
          .from('clients')
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
- Поиск информации о клиентах через get_client_info (имя клиента)
- Список клиентов через get_clients (фильтры: status, conversion_stage, limit)
- Список задач через get_tasks (scope: all/today/overdue/by_status, status, limit)
- Статистика задач через get_tasks_stats (всего, сегодня, просроченные, по статусам)
- Создание клиентов через create_client (имя, телефон, email, источник лида)
- Создание смет через AI-Сметчика (указывайте: описание проекта, площадь, клиента, виды работ)
- Создание задач через create_task (заголовок, описание, дата выполнения)
- Завершение задач через complete_task (название задачи или ID)

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
      interaction_mode: userSettings.interaction_mode
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in enhanced-voice-chat:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      response: `Извините, произошла ошибка: ${error.message}`
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
    console.warn('Error fetching user settings:', error);
    return defaultSettings;
  }
}
