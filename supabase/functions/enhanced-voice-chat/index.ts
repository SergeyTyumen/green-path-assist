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

// Global variable to store current user ID
let currentUserId: string = '';

function getUserIdFromContext(): string {
  return currentUserId;
}

async function callOpenAI(messages: AIMessage[], settings: UserSettings): Promise<string> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const model = settings.ai_settings?.openai_model || 'gpt-4o-mini';
  const temperature = settings.ai_settings?.temperature || 0.7;
  const max_tokens = settings.ai_settings?.max_tokens || 1000;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens,
      tools: [
        {
          type: "function",
          function: {
            name: "getClientsData",
            description: "Получить список всех клиентов пользователя",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "getTasksData", 
            description: "Получить список всех задач пользователя",
            parameters: {
              type: "object",
              properties: {},
              required: []
            }
          }
        },
        {
          type: "function",
          function: {
            name: "createCRMClient",
            description: "Создать нового клиента в CRM системе",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Имя клиента" },
                phone: { type: "string", description: "Телефон клиента" },
                email: { type: "string", description: "Email клиента" },
                address: { type: "string", description: "Адрес клиента" },
                services: { type: "array", items: { type: "string" }, description: "Список услуг" },
                budget: { type: "number", description: "Бюджет" },
                notes: { type: "string", description: "Заметки о клиенте" }
              },
              required: ["name", "phone"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "delegateToAssistant",
            description: "Делегировать задачу другому ИИ-ассистенту",
            parameters: {
              type: "object",
              properties: {
                assistant_name: { type: "string", description: "Имя ассистента (сметчик, аналитик, конкурентный-анализ)" },
                task_description: { type: "string", description: "Описание задачи для ассистента" },
                additional_data: { type: "object", description: "Дополнительные данные для ассистента" }
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
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  const message = data.choices[0].message;

  // Если есть вызовы функций, выполняем их
  if (message.tool_calls && message.tool_calls.length > 0) {
    let functionResults = [];
    
    for (const toolCall of message.tool_calls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments || '{}');
      
      let result = '';
      
      switch (functionName) {
        case 'getClientsData':
          result = await getClientsData(getUserIdFromContext());
          break;
        case 'getTasksData':
          result = await getTasksData(getUserIdFromContext());
          break;
        case 'createCRMClient':
          result = await createCRMClient(functionArgs, getUserIdFromContext());
          break;
        case 'delegateToAssistant':
          result = await delegateToAssistant(
            functionArgs.assistant_name, 
            functionArgs.task_description, 
            functionArgs.additional_data || {}, 
            getUserIdFromContext()
          );
          break;
        default:
          result = `Функция ${functionName} не найдена`;
      }
      
      functionResults.push(result);
    }
    
    return functionResults.join('\n\n');
  }
  
  return message.content || 'Ошибка получения ответа от OpenAI';
}

async function callYandexGPT(messages: AIMessage[], settings: UserSettings): Promise<string> {
  const yandexApiKey = Deno.env.get('YANDEX_API_KEY');
  const yandexFolderId = Deno.env.get('YANDEX_FOLDER_ID');
  
  if (!yandexApiKey || !yandexFolderId) {
    throw new Error('YandexGPT API credentials not configured');
  }

  const model = settings.ai_settings?.yandex_model || 'yandexgpt';
  const temperature = settings.ai_settings?.temperature || 0.7;
  const maxTokens = settings.ai_settings?.max_tokens || 1000;

  // Преобразуем сообщения в формат YandexGPT
  const yandexMessages = messages.map(msg => ({
    role: msg.role === 'system' ? 'system' : msg.role === 'user' ? 'user' : 'assistant',
    text: msg.content
  }));

  const response = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${yandexApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      modelUri: `gpt://${yandexFolderId}/${model}`,
      completionOptions: {
        stream: false,
        temperature,
        maxTokens
      },
      messages: yandexMessages
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`YandexGPT API error: ${error}`);
  }

  const data = await response.json();
  return data.result?.alternatives?.[0]?.message?.text || 'Ошибка получения ответа от YandexGPT';
}

// CRM Data Retrieval Functions
async function getClientsData(userId: string): Promise<string> {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, phone, email, status, services, notes')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!clients || clients.length === 0) {
      return 'У вас пока нет клиентов в системе.';
    }

    const clientsList = clients.map(client => 
      `• ${client.name} (${client.phone}) - статус: ${client.status}${client.services?.length ? ', услуги: ' + client.services.join(', ') : ''}`
    ).join('\n');

    return `Ваши клиенты (${clients.length}):\n${clientsList}`;
  } catch (error) {
    console.error('Error fetching clients:', error);
    return 'Произошла ошибка при получении данных о клиентах.';
  }
}

async function getTasksData(userId: string): Promise<string> {
  try {
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, title, status, priority, due_date, category, assignee')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (!tasks || tasks.length === 0) {
      return 'У вас пока нет задач в системе.';
    }

    const tasksList = tasks.map(task => 
      `• ${task.title} - статус: ${task.status}, приоритет: ${task.priority}${task.due_date ? ', срок: ' + task.due_date : ''}${task.assignee ? ', исполнитель: ' + task.assignee : ''}`
    ).join('\n');

    return `Ваши задачи (${tasks.length}):\n${tasksList}`;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return 'Произошла ошибка при получении данных о задачах.';
  }
}

async function delegateToAssistant(assistantName: string, taskDescription: string, additionalData: any, userId: string): Promise<string> {
  let functionName = '';
  
  switch (assistantName.toLowerCase()) {
    case 'сметчик':
    case 'estimator':
      functionName = 'ai-estimator';
      break;
    case 'аналитик':
    case 'analyst':
      functionName = 'ai-analyst';
      break;
    case 'конкурентный-анализ':
    case 'competitor-analysis':
      functionName = 'competitor-analysis';
      break;
    default:
      return `Ассистент "${assistantName}" не найден. Доступные ассистенты: сметчик, аналитик, конкурентный-анализ`;
  }

  try {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        task: taskDescription,
        data: additionalData,
        user_id: userId
      }
    });

    if (error) {
      throw error;
    }

    return `Результат от ${assistantName}: ${JSON.stringify(data)}`;
  } catch (error) {
    console.error(`Error delegating to ${assistantName}:`, error);
    return `Ошибка при обращении к ассистенту ${assistantName}: ${error.message}`;
  }
}

async function createCRMClient(clientData: any, userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert({
        user_id: userId,
        name: clientData.name,
        phone: clientData.phone,
        email: clientData.email || null,
        address: clientData.address || null,
        services: clientData.services || [],
        budget: clientData.budget || null,
        notes: clientData.notes || null,
        status: 'new'
      })
      .select()
      .single();

    if (error) throw error;

    return `Клиент "${clientData.name}" успешно создан в CRM с ID: ${data.id}`;
  } catch (error) {
    console.error('Error creating client:', error);
    return `Ошибка при создании клиента: ${error.message}`;
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

    // Устанавливаем пользователя в контекст
    currentUserId = user.id;

    // Получаем настройки пользователя
    const userSettings = await getUserSettings(user.id);

    const systemPrompt = `Вы - голосовой помощник руководителя строительной компании. 
Вы помогаете управлять CRM системой, создавать клиентов, задачи, анализировать данные.
Вы можете делегировать сложные задачи специализированным ассистентам:
- Сметчик: для расчета стоимости работ и материалов
- Аналитик: для анализа данных по клиентам и проектам  
- Конкурентный анализ: для анализа конкурентов

Отвечайте кратко и по делу. Используйте функции для выполнения действий в CRM.`;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    let aiResponse: string;

    // Выбираем модель AI на основе настроек пользователя
    if (userSettings.preferred_ai_model === 'yandex') {
      aiResponse = await callYandexGPT(messages, userSettings);
    } else {
      aiResponse = await callOpenAI(messages, userSettings);
    }

    // Сохраняем историю команд
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: user.id,
        transcript: message,
        status: 'completed',
        execution_result: { response: aiResponse, model: userSettings.preferred_ai_model }
      });

    return new Response(JSON.stringify({
      response: aiResponse,
      model_used: userSettings.preferred_ai_model,
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