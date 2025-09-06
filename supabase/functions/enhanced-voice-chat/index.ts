import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface UserSettings {
  preferred_ai_model: 'openai' | 'yandex';
  interaction_mode: 'text' | 'voice';
  voice_settings: any;
  ai_settings: any;
}

async function callOpenAIWithTools(messages: AIMessage[], settings: UserSettings, userId: string, authToken?: string): Promise<string> {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    console.log('Sending request to OpenAI with tools support');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: settings.ai_settings?.openai_model || 'gpt-4o-mini',
        messages: messages,
        temperature: settings.ai_settings?.temperature || 0.7,
        max_tokens: settings.ai_settings?.max_tokens || 1000,
        tools: [
          {
            type: "function",
            function: {
              name: "get_tasks",
              description: "Получить список задач пользователя",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["active", "completed", "all"],
                    description: "Статус задач для получения"
                  }
                }
              }
            }
          },
          {
            type: "function", 
            function: {
              name: "create_task",
              description: "Создать новую задачу",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Название задачи"
                  },
                  description: {
                    type: "string",
                    description: "Описание задачи"
                  },
                  priority: {
                    type: "string",
                    enum: ["low", "medium", "high"],
                    description: "Приоритет задачи"
                  }
                },
                required: ["title", "description"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "get_clients",
              description: "Получить список клиентов",
              parameters: {
                type: "object",
                properties: {
                  status: {
                    type: "string",
                    enum: ["active", "all"],
                    description: "Статус клиентов"
                  }
                }
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
                  project_description: {
                    type: "string",
                    description: "Описание проекта для сметы"
                  },
                  client_name: {
                    type: "string", 
                    description: "Имя клиента (опционально)"
                  },
                  area: {
                    type: "number",
                    description: "Площадь объекта в кв.м"
                  },
                  services: {
                    type: "array",
                    items: { type: "string" },
                    description: "Список услуг для расчета"
                  }
                },
                required: ["project_description"]
              }
            }
          },
          {
            type: "function",
            function: {
              name: "delegate_to_assistant",
              description: "Делегировать задачу специализированному AI-ассистенту",
              parameters: {
                type: "object",
                properties: {
                  assistant_name: {
                    type: "string",
                    enum: ["сметчик", "аналитик", "конкурентный-анализ"],
                    description: "Имя AI-ассистента"
                  },
                  task_description: {
                    type: "string",
                    description: "Описание задачи для ассистента"
                  },
                  additional_data: {
                    type: "object",
                    description: "Дополнительные данные для ассистента"
                  }
                },
                required: ["assistant_name", "task_description"]
              }
            }
          }
        ],
        tool_choice: "auto"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('OpenAI response received');

    // Проверяем, есть ли вызовы функций
    const message = data.choices[0]?.message;
    if (message?.tool_calls) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);
      
      console.log('Function call detected:', functionName, functionArgs);
      
      // Выполняем функцию
      const functionResult = await executeFunction(functionName, functionArgs, userId, authToken);
      
      // Отправляем результат обратно в OpenAI для финального ответа
      const finalMessages = [
        ...messages,
        message,
        {
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(functionResult)
        }
      ];

      const finalResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: settings.ai_settings?.openai_model || 'gpt-4o-mini',
          messages: finalMessages,
          temperature: settings.ai_settings?.temperature || 0.7,
          max_tokens: settings.ai_settings?.max_tokens || 1000,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        throw new Error(`OpenAI final API error: ${finalResponse.status} - ${errorText}`);
      }

      const finalData = await finalResponse.json();
      return finalData.choices?.[0]?.message?.content || 'Функция выполнена, но ответ не получен';
    }
    
    return message?.content || 'Извините, не удалось получить ответ';
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    throw new Error(`Ошибка вызова OpenAI: ${error.message}`);
  }
}

async function executeFunction(functionName: string, args: any, userId: string, userToken?: string): Promise<any> {
  console.log(`Executing function: ${functionName} with args:`, args);
  
  switch (functionName) {
    case 'get_tasks':
      return await getTasks(userId, args.status || 'all');
    
    case 'create_task':
      return await createTask(userId, args);
      
    case 'get_clients':
      return await getClients(userId, args.status || 'all');

    case 'create_estimate':
      return await createEstimateViaAI(userId, args, userToken);
      
    case 'delegate_to_assistant':
      return await delegateToAssistant(userId, args, userToken);
      
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

async function getTasks(userId: string, status: string) {
  try {
    let query = supabase.from('tasks').select('*').eq('user_id', userId);
    
    if (status === 'active') {
      query = query.neq('status', 'completed');
    } else if (status === 'completed') {
      query = query.eq('status', 'completed');
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(10);
    
    if (error) throw error;
    
    return {
      success: true,
      count: data?.length || 0,
      tasks: data || []
    };
  } catch (error) {
    console.error('Error getting tasks:', error);
    return { success: false, error: error.message };
  }
}

async function createTask(userId: string, taskData: any) {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority || 'medium',
        status: 'pending',
        category: 'general'
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      success: true,
      task: data
    };
  } catch (error) {
    console.error('Error creating task:', error);
    return { success: false, error: error.message };
  }
}

async function getClients(userId: string, status: string) {
  try {
    let query = supabase.from('clients').select('*').eq('user_id', userId);
    
    if (status === 'active') {
      query = query.neq('conversion_stage', 'Завершен');
    }
    
    const { data, error } = await query.order('created_at', { ascending: false }).limit(10);
    
    if (error) throw error;
    
    return {
      success: true,
      count: data?.length || 0,
      clients: data || []
    };
  } catch (error) {
    console.error('Error getting clients:', error);
    return { success: false, error: error.message };
  }
}

// Создание сметы через AI-Сметчика
async function createEstimateViaAI(userId: string, args: any, userToken?: string) {
  try {
    console.log('Creating estimate via AI-Estimator:', args);
    
    // Получаем пользовательский токен для аутентификации
    const authToken = userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const { data, error } = await supabase.functions.invoke('ai-estimator', {
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
        Authorization: `Bearer ${authToken}`
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

// Делегирование к другим AI-ассистентам
async function delegateToAssistant(userId: string, args: any, userToken?: string) {
  try {
    console.log('Delegating to assistant:', args);
    
    // Получаем пользовательский токен для аутентификации
    const authToken = userToken || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const { data, error } = await supabase.functions.invoke('assistant-router', {
      body: {
        assistant_name: args.assistant_name,
        task_description: args.task_description,
        additional_data: args.additional_data || {}
      },
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });

    if (error) throw error;
    
    if (data && data.success) {
      return {
        success: true,
        message: `✅ Задача делегирована ассистенту "${args.assistant_name}": ${JSON.stringify(data.result)}`
      };
    } else {
      return {
        success: false,
        message: `❌ Ошибка делегирования: ${data?.error || 'Неизвестная ошибка'}`
      };
    }
  } catch (error) {
    console.error('Error in delegateToAssistant:', error);
    return {
      success: false,
      message: `❌ Ошибка при делегировании: ${error.message}`
    };
  }
}

async function getUserSettings(userId: string): Promise<UserSettings> {
  const { data, error } = await supabase
    .from('profiles')
    .select('preferred_ai_model, interaction_mode, voice_settings, ai_settings')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return {
      preferred_ai_model: 'openai',
      interaction_mode: 'text',
      voice_settings: {},
      ai_settings: {}
    };
  }

  return {
    preferred_ai_model: data.preferred_ai_model || 'openai',
    interaction_mode: data.interaction_mode || 'text',
    voice_settings: data.voice_settings || {},
    ai_settings: data.ai_settings || {}
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { message, conversation_history = [] } = await req.json();

    if (!message) {
      throw new Error('Message is required');
    }

    // Получаем настройки пользователя
    const userSettings = await getUserSettings(user.id);

    const systemPrompt = `Вы - умный голосовой помощник руководителя ландшафтной строительной компании. 
Вы понимаете контекст разговора и помогаете управлять бизнесом.

ОСНОВНЫЕ ФУНКЦИИ:
- Управление CRM: создание и поиск клиентов, задач, аналитика
- Создание смет через AI-Сметчика (указывайте: описание проекта, площадь, клиента, виды работ)
- Делегирование задач специализированным ИИ-помощникам
- Анализ данных и составление отчетов

СПЕЦИАЛИЗИРОВАННЫЕ АССИСТЕНТЫ:
- Сметчик: создание смет, расчет материалов, ценообразование
- Аналитик: анализ клиентов, продаж, воронки (использует данные CRM)
- Конкурентный анализ: анализ конкурентов и рынка

СОЗДАНИЕ СМЕТ:
Когда пользователь просит создать смету, используйте функцию create_estimate:
- Обязательно укажите project_description (описание проекта)
- Если известна площадь - добавьте area в кв.м
- Если назван клиент - укажите client_name
- Если названы виды работ - добавьте services как массив

ПРИМЕРЫ КОМАНД:
- "Создай смету на газон 100 кв.м для клиента Иванова" → create_estimate
- "Покажи мои задачи" → get_tasks
- "Какие клиенты в работе" → get_clients
- "Проанализируй продажи" → delegate_to_assistant(аналитик)

ВАЖНО: 
- Определяйте о чем идет речь и какая функция нужна
- При создании клиентов указывайте источник лида
- Собирайте всю доступную информацию из разговора
- Если нужны дополнительные данные - спрашивайте пользователя

Отвечайте конкретно и по делу. Задавайте уточняющие вопросы если нужно.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    // Вызываем OpenAI с поддержкой функций для работы с базой данных
    const aiResponse = await callOpenAIWithTools(messages, userSettings, user.id, token);

    // Сохраняем историю команд
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: user.id,
        transcript: message,
        status: 'completed',
        execution_result: { response: aiResponse, model: 'n8n-workflow' }
      });

    return new Response(JSON.stringify({
      response: aiResponse,
      model_used: 'n8n-workflow',
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