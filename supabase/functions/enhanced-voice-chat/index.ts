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

interface ConversationContext {
  currentTask?: string;
  pendingQuestions?: string[];
  waitingForInfo?: boolean;
  taskData?: any;
  activeAssistant?: string;
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
            description: "Создать нового клиента в CRM системе с указанием источника лида",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Имя клиента" },
                phone: { type: "string", description: "Телефон клиента" },
                email: { type: "string", description: "Email клиента" },
                address: { type: "string", description: "Адрес клиента" },
                services: { type: "array", items: { type: "string" }, description: "Список услуг" },
                budget: { type: "number", description: "Бюджет" },
                notes: { type: "string", description: "Заметки о клиенте" },
                lead_source: { type: "string", description: "Источник лида: звонок, сайт, соцсети, реклама, рекомендация, авито" },
                lead_source_details: { type: "string", description: "Детали источника лида" },
                conversion_stage: { type: "string", description: "Стадия: new, qualified, proposal, negotiation, closed" },
                lead_quality_score: { type: "number", description: "Оценка качества лида от 1 до 10" }
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
    // Обогащаем данные информацией из CRM для контекста
    const enrichedData = await enrichTaskWithCRMData(taskDescription, additionalData, userId);
    
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        task: taskDescription,
        data: enrichedData,
        user_id: userId,
        conversation_mode: true // Указываем что это диалоговый режим
      }
    });

    if (error) {
      throw error;
    }

    // Если ответ содержит вопросы, возвращаем их для уточнения
    if (data?.needs_clarification) {
      return `${assistantName} запрашивает уточнения:\n\n${data.questions}\n\nПожалуйста, предоставьте дополнительную информацию.`;
    }

    return data?.response || `Результат от ${assistantName}: ${JSON.stringify(data)}`;
  } catch (error) {
    console.error(`Error delegating to ${assistantName}:`, error);
    return `Ошибка при обращении к ассистенту ${assistantName}: ${error.message}`;
  }
}

// Обогащение данных задачи информацией из CRM
async function enrichTaskWithCRMData(taskDescription: string, additionalData: any, userId: string): Promise<any> {
  const enrichedData = { ...additionalData };
  
  // Ищем упоминания клиентов в задаче
  const clientMentions = await findClientMentions(taskDescription, userId);
  if (clientMentions.length > 0) {
    enrichedData.mentioned_clients = clientMentions;
  }
  
  // Добавляем контекст материалов и услуг
  const servicesContext = await getServicesContext(userId);
  const materialsContext = await getMaterialsContext(userId);
  
  enrichedData.available_services = servicesContext;
  enrichedData.available_materials = materialsContext;
  
  return enrichedData;
}

// Поиск упоминаний клиентов в тексте
async function findClientMentions(text: string, userId: string): Promise<any[]> {
  try {
    const { data: clients, error } = await supabase
      .from('clients')
      .select('id, name, phone, address, services, budget, notes')
      .eq('user_id', userId);

    if (error || !clients) return [];

    const mentions = [];
    const textLower = text.toLowerCase();

    for (const client of clients) {
      const nameParts = client.name.toLowerCase().split(' ');
      const hasNameMatch = nameParts.some(part => 
        part.length > 2 && textLower.includes(part)
      );
      
      if (hasNameMatch) {
        mentions.push({
          id: client.id,
          name: client.name,
          phone: client.phone,
          address: client.address,
          services: client.services,
          budget: client.budget,
          notes: client.notes
        });
      }
    }

    return mentions;
  } catch (error) {
    console.error('Error finding client mentions:', error);
    return [];
  }
}

// Получение контекста услуг
async function getServicesContext(userId: string): Promise<any[]> {
  try {
    const { data: services, error } = await supabase
      .from('services')
      .select('name, category, unit, price')
      .eq('user_id', userId)
      .limit(20);

    return services || [];
  } catch (error) {
    console.error('Error getting services context:', error);
    return [];
  }
}

// Получение контекста материалов
async function getMaterialsContext(userId: string): Promise<any[]> {
  try {
    const { data: materials, error } = await supabase
      .from('materials')
      .select('name, category, unit, price')
      .eq('user_id', userId)
      .limit(20);

    return materials || [];
  } catch (error) {
    console.error('Error getting materials context:', error);
    return [];
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
        status: 'new',
        // Новые поля для источников лидов
        lead_source: clientData.lead_source || 'voice_assistant',
        lead_source_details: { 
          voice_command: true,
          details: clientData.lead_source_details || 'Добавлено через голосового помощника'
        },
        conversion_stage: clientData.conversion_stage || 'new',
        lead_quality_score: clientData.lead_quality_score || 5
      })
      .select()
      .single();

    if (error) throw error;

    return `Клиент "${clientData.name}" успешно создан в CRM с ID: ${data.id}. Источник лида: ${clientData.lead_source || 'голосовой помощник'}`;
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

    const systemPrompt = `Вы - умный голосовой помощник руководителя строительной компании. 
Вы понимаете контекст разговора и помогаете управлять бизнесом.

ОСНОВНЫЕ ФУНКЦИИ:
- Управление CRM: создание и поиск клиентов с указанием источников лидов
- Делегирование задач специализированным ИИ-помощникам
- Анализ данных и составление отчетов

СПЕЦИАЛИЗИРОВАННЫЕ АССИСТЕНТЫ:
- Сметчик: создание смет, расчет материалов (запрашивает: клиент, объект, география, виды работ)
- Аналитик: анализ клиентов, продаж, воронки (использует данные CRM)
- Конкурентный анализ: анализ конкурентов и рынка

ВАЖНО: 
- Определяйте о чем идет речь и какой ассистент нужен
- При создании клиентов указывайте источник лида (звонок, сайт, соцсети, реклама, рекомендация, авито)
- Собирайте всю доступную информацию из разговора
- Если ассистент запрашивает дополнительные данные - передавайте их пользователю

Отвечайте конкретно и по делу. Задавайте уточняющие вопросы если нужно.`;

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