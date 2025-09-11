import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Инициализируем Supabase клиент для работы с базой данных
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Функции для работы с CRM
async function createCRMClient(data: any, userId: string) {
  console.log('Creating client:', data);
  const { data: result, error } = await supabase
    .from('clients')
    .insert({
      user_id: userId,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      address: data.address || null,
      services: data.services || [],
      budget: data.budget || null,
      project_area: data.project_area || null,
      notes: data.notes || null,
      status: 'new'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    throw error;
  }
  return result;
}

async function createTask(data: any, userId: string) {
  console.log('Creating task:', data);
  const { data: result, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: data.title,
      description: data.description || null,
              assignee: data.assignee || null,
              ai_agent: data.ai_agent || null,
      status: 'pending',
      priority: data.priority || 'medium',
      category: data.category || 'other',
      due_date: data.due_date || null,
      client_id: data.client_id || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating task:', error);
    throw error;
  }
  return result;
}

async function createMaterial(data: any, userId: string) {
  console.log('Creating material:', data);
  const { data: result, error } = await supabase
    .from('materials')
    .insert({
      user_id: userId,
      name: data.name,
      category: data.category,
      unit: data.unit,
      price: data.price,
      stock: data.stock || 0,
      min_stock: data.min_stock || 0,
      supplier: data.supplier || null
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating material:', error);
    throw error;
  }
  return result;
}

async function createSupplier(data: any, userId: string) {
  console.log('Creating supplier:', data);
  const { data: result, error } = await supabase
    .from('suppliers')
    .insert({
      user_id: userId,
      name: data.name,
      phone: data.phone || null,
      email: data.email || null,
      location: data.location || null,
      categories: data.categories || [],
      delivery_time: data.delivery_time || null,
      rating: data.rating || 0.0,
      status: 'active'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating supplier:', error);
    throw error;
  }
  return result;
}

// Поиск клиента по имени или телефону
async function findClient(query: any, userId: string) {
  console.log('Searching for client:', query);
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId)
    .or(`name.ilike.%${query.name || ''}%,phone.ilike.%${query.phone || ''}%`);
  
  if (error) throw error;
  return data[0]; // возвращаем первое совпадение
}

// Обновление статуса задачи
async function updateTaskStatus(taskId: string, status: string, userId: string) {
  console.log('Updating task status:', { taskId, status });
  const { data, error } = await supabase
    .from('tasks')
    .update({ 
      status,
      updated_at: new Date().toISOString()
    })
    .eq('id', taskId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Поиск задач клиента
async function findClientTasks(clientId: string, userId: string) {
  console.log('Finding tasks for client:', clientId);
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('client_id', clientId);
  
  if (error) throw error;
  return data;
}

// Обновление клиента с добавлением комментария
async function updateClientWithComment(clientId: string, comment: string, userId: string) {
  console.log('Updating client with comment:', { clientId, comment });
  
  // Получаем текущие заметки
  const { data: client, error: fetchError } = await supabase
    .from('clients')
    .select('notes')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();
  
  if (fetchError) throw fetchError;
  
  // Добавляем новый комментарий с датой
  const timestamp = new Date().toLocaleString('ru-RU');
  const newNote = `[${timestamp}] ${comment}`;
  const updatedNotes = client.notes 
    ? `${client.notes}\n\n${newNote}` 
    : newNote;
  
  const { data, error } = await supabase
    .from('clients')
    .update({ 
      notes: updatedNotes,
      last_contact: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', clientId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Получение данных для аналитики
async function getClientsData(userId: string) {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
}

async function getTasksData(userId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
}

async function getMaterialsData(userId: string) {
  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data;
}

// Функции для работы с историей голосовых команд
async function createCommandHistory(data: any, userId: string) {
  console.log('Creating command history:', data);
  const { data: result, error } = await supabase
    .from('voice_command_history')
    .insert({
      user_id: userId,
      voice_text: data.voice_text || null,
      transcript: data.transcript,
      actions: data.actions || [],
      parsed_entities: data.parsed_entities || {},
      execution_result: data.execution_result || {},
      status: data.status || 'success'
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating command history:', error);
    throw error;
  }
  return result;
}

async function updateCommandHistory(historyId: string, updates: any, userId: string) {
  console.log('Updating command history:', { historyId, updates });
  const { data: result, error } = await supabase
    .from('voice_command_history')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', historyId)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating command history:', error);
    throw error;
  }
  return result;
}

async function getCommandHistory(userId: string, limit = 10) {
  const { data, error } = await supabase
    .from('voice_command_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// Функция создания сметы через AI-Сметчика
async function createEstimateViaAI(data: any, userId: string) {
  console.log('Creating estimate via AI:', data);
  try {
    const { data: result, error } = await supabase.functions.invoke('ai-estimator', {
      body: {
        conversation_mode: true,
        action: data.project_description,
        data: {
          object_description: data.project_description,
          area: data.area,
          planned_services: data.services,
          special_requirements: data.special_requirements,
          mentioned_clients: data.client_name ? [{ name: data.client_name }] : []
        }
      },
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error creating estimate via AI:', error);
    throw error;
  }
}

// Функция делегирования к AI-ассистентам
async function delegateToAIAssistant(data: any, userId: string) {
  console.log('Delegating to AI assistant:', data);
  try {
    const { data: result, error } = await supabase.functions.invoke('assistant-router', {
      body: {
        assistant_name: data.assistant_name,
        task_description: data.task_description,
        additional_data: data.additional_data || {}
      },
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;
    return result;
  } catch (error) {
    console.error('Error delegating to AI assistant:', error);
    throw error;
  }
}

// Функция для парсинга сложных команд
function parseComplexCommand(message: string) {
  const entities = {
    names: [],
    phones: [],
    addresses: [],
    services: [],
    deadlines: [],
    ai_agents: []
  };

  // Парсим имена (простой подход)
  const nameMatches = message.match(/(?:клиент[а-я]*\s+|завед[а-я]*\s+)([А-Я][а-я]+(?:\s+[А-Я][а-я]+)?)/gi);
  if (nameMatches) {
    entities.names = nameMatches.map(m => m.replace(/^.*?\s+/, '').trim());
  }

  // Парсим телефоны
  const phoneMatches = message.match(/(?:\+?7|8)[\s\-\(\)]?\d{3}[\s\-\(\)]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g);
  if (phoneMatches) {
    entities.phones = phoneMatches.map(p => p.replace(/[\s\-\(\)]/g, ''));
  }

  // Парсим адреса (ключевые слова)
  const addressMatches = message.match(/(?:участок|адрес|улиц[а-я]*|проспект|переулок)\s+([А-Я][а-я]+(?:\s+\d+)?)/gi);
  if (addressMatches) {
    entities.addresses = addressMatches.map(m => m.replace(/^.*?\s+/, '').trim());
  }

  // Парсим услуги
  const serviceKeywords = ['футбольное поле', 'газон', 'автополив', 'ландшафт', 'дизайн', 'озеленение'];
  entities.services = serviceKeywords.filter(service => 
    message.toLowerCase().includes(service)
  );

  // Парсим дедлайны
  const deadlineMatches = message.match(/(?:до|к)\s+(понедельник|вторник|среда|четверг|пятница|суббота|воскресенье|завтра|послезавтра)/gi);
  if (deadlineMatches) {
    entities.deadlines = deadlineMatches.map(m => m.toLowerCase());
  }

  // Парсим упоминания ИИ-агентов
  const agentKeywords = {
    'поставщик': 'AI-Поставки',
    'подрядчик': 'AI-Подрядчик', 
    'смет': 'AI-Сметчик',
    'кп': 'AI-КП-менеджер',
    'консультация': 'AI-Консультант'
  };

  Object.entries(agentKeywords).forEach(([keyword, agent]) => {
    if (message.toLowerCase().includes(keyword)) {
      entities.ai_agents.push(agent);
    }
  });

  return entities;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = "general" } = await req.json();
    
    // Handle simple history request
    if (message === 'get_command_history') {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('Authorization header missing');
      }
      
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        throw new Error('Invalid token or user not found');
      }
      
      const history = await getCommandHistory(user.id, 10);
      return new Response(JSON.stringify({ history }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Получаем токен пользователя из заголовков
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization header missing');
    }

    // Извлекаем user_id из JWT токена
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Invalid token or user not found');
    }

    const userId = user.id;

    // Определяем доступные функции для ИИ
    const tools = [
      {
        type: "function",
        function: {
          name: "create_client",
          description: "Создать нового клиента в CRM системе",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Полное имя клиента" },
              phone: { type: "string", description: "Номер телефона клиента" },
              email: { type: "string", description: "Email клиента (опционально)" },
              address: { type: "string", description: "Адрес или местоположение объекта" },
              services: { 
                type: "array", 
                items: { type: "string" },
                description: "Список требуемых услуг" 
              },
              budget: { type: "number", description: "Примерный бюджет проекта" },
              project_area: { type: "number", description: "Площадь проекта в кв.м" },
              notes: { type: "string", description: "Дополнительные заметки" }
            },
            required: ["name", "phone"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "find_client",
          description: "Найти существующего клиента по имени или телефону",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Имя клиента для поиска" },
              phone: { type: "string", description: "Телефон клиента для поиска" }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_client_with_comment",
          description: "Обновить клиента с добавлением комментария/заметки",
          parameters: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "ID клиента" },
              comment: { type: "string", description: "Комментарий для добавления" }
            },
            required: ["client_id", "comment"]
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
              title: { type: "string", description: "Название задачи" },
              description: { type: "string", description: "Описание задачи" },
              assignee: { type: "string", description: "Исполнитель задачи" },
              ai_agent: { 
                type: "string", 
                enum: ["AI-Сметчик", "AI-Поставки", "AI-Подрядчик", "AI-КП-менеджер", "AI-Консультант"],
                description: "ИИ-агент ответственный за задачу" 
              },
              priority: { 
                type: "string", 
                enum: ["low", "medium", "high"],
                description: "Приоритет задачи" 
              },
              category: { 
                type: "string",
                enum: ["design", "installation", "maintenance", "sales", "other"],
                description: "Категория задачи" 
              },
              due_date: { type: "string", description: "Срок выполнения (YYYY-MM-DD)" },
              client_id: { type: "string", description: "ID клиента (если известен)" }
            },
            required: ["title"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "update_task_status",
          description: "Обновить статус задачи",
          parameters: {
            type: "object",
            properties: {
              task_id: { type: "string", description: "ID задачи" },
              status: { 
                type: "string", 
                enum: ["pending", "in-progress", "completed", "overdue"],
                description: "Новый статус задачи" 
              }
            },
            required: ["task_id", "status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "find_client_tasks",
          description: "Найти все задачи конкретного клиента",
          parameters: {
            type: "object",
            properties: {
              client_id: { type: "string", description: "ID клиента" }
            },
            required: ["client_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_all_tasks",
          description: "Получить все задачи пользователя (активные, выполненные, просроченные)",
          parameters: {
            type: "object",
            properties: {
              status_filter: { 
                type: "string", 
                enum: ["all", "pending", "in-progress", "completed", "overdue"],
                description: "Фильтр по статусу задач (опционально)"
              },
              due_date_filter: {
                type: "string",
                description: "Фильтр по дате выполнения в формате YYYY-MM-DD (опционально)"
              }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_material",
          description: "Добавить новый материал в каталог",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Название материала" },
              category: { type: "string", description: "Категория материала" },
              unit: { type: "string", description: "Единица измерения" },
              price: { type: "number", description: "Цена за единицу" },
              stock: { type: "number", description: "Количество на складе" },
              min_stock: { type: "number", description: "Минимальный остаток" },
              supplier: { type: "string", description: "Поставщик" }
            },
            required: ["name", "category", "unit", "price"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_supplier",
          description: "Добавить нового поставщика",
          parameters: {
            type: "object",
            properties: {
              name: { type: "string", description: "Название компании-поставщика" },
              phone: { type: "string", description: "Телефон поставщика" },
              email: { type: "string", description: "Email поставщика" },
              location: { type: "string", description: "Местоположение поставщика" },
              categories: { 
                type: "array",
                items: { type: "string" },
                description: "Категории товаров/услуг поставщика" 
              },
              delivery_time: { type: "string", description: "Время доставки" },
              rating: { type: "number", description: "Рейтинг поставщика (0-5)" }
            },
            required: ["name"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "create_estimate",
          description: "Создать смету через AI-Сметчика с помощью голосовой команды",
          parameters: {
            type: "object",
            properties: {
              project_description: { type: "string", description: "Описание проекта для сметы" },
              client_name: { type: "string", description: "Имя клиента (опционально)" },
              services: { 
                type: "array",
                items: { type: "string" },
                description: "Список услуг для расчета" 
              },
              area: { type: "number", description: "Площадь объекта в кв.м" },
              special_requirements: { type: "string", description: "Особые требования к проекту" }
            },
            required: ["project_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "delegate_to_ai_assistant",
          description: "Делегировать задачу специализированному AI-ассистенту",
          parameters: {
            type: "object",
            properties: {
              assistant_name: { 
                type: "string",
                enum: ["сметчик", "аналитик", "поставщик", "подрядчик", "кп-менеджер"],
                description: "Имя AI-ассистента" 
              },
              task_description: { type: "string", description: "Описание задачи для ассистента" },
              additional_data: { type: "object", description: "Дополнительные данные для ассистента" }
            },
            required: ["assistant_name", "task_description"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_analytics",
          description: "Получить аналитические данные по CRM",
          parameters: {
            type: "object",
            properties: {
              type: { 
                type: "string",
                enum: ["clients", "tasks", "materials", "overview"],
                description: "Тип аналитики" 
              }
            },
            required: ["type"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "parse_complex_command",
          description: "Парсить сложную голосовую команду и извлечь сущности",
          parameters: {
            type: "object",
            properties: {
              command_text: { type: "string", description: "Текст команды для парсинга" }
            },
            required: ["command_text"]
          }
        }
      },
      {
        type: "function", 
        function: {
          name: "create_command_history",
          description: "Создать запись в истории голосовых команд",
          parameters: {
            type: "object",
            properties: {
              voice_text: { type: "string", description: "Оригинальный голосовой текст" },
              transcript: { type: "string", description: "Расшифрованный текст" },
              actions: { type: "array", description: "Список выполненных действий" },
              parsed_entities: { type: "object", description: "Извлеченные сущности" },
              execution_result: { type: "object", description: "Результат выполнения" }
            },
            required: ["transcript"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "calculate_estimate",
          description: "Рассчитать расход материалов через AI-Сметчик",
          parameters: {
            type: "object",
            properties: {
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    service: { type: "string", description: "Название услуги" },
                    quantity: { type: "number", description: "Количество" },
                    unit: { type: "string", description: "Единица измерения" }
                  },
                  required: ["service", "quantity", "unit"]
                },
                description: "Массив услуг для расчёта"
              },
              task_id: { type: "string", description: "ID задачи для сохранения результата" }
            },
            required: ["services"]
          }
        }
      }
    ];

  // Функция расчёта материалов через AI-Сметчик
  async function calculateEstimate(services: any[], userId: string, taskId?: string) {
    console.log('Calling AI-Estimator for services:', services);
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-estimator', {
        body: {
          action: 'calculate_materials',
          services,
          taskId
        }
      });

      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Error calling AI-Estimator:', error);
      return { success: false, error: error.message };
    }
  }

  // Делегирование задачи ИИ-агенту
  async function delegateToAgent(task: string, assignee: string, userId: string, clientId?: string) {
    console.log(`Delegating to ${assignee}: ${task}`);
    
    try {
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: task,
          description: `Задача делегирована голосовым ассистентом`,
          category: 'delegation',
          priority: 'medium',
          status: 'pending',
          client_id: clientId,
          ai_agent: assignee
        })
        .select()
        .single();

      if (error) throw error;
      
      return { success: true, task: newTask };
    } catch (error) {
      console.error('Error delegating task:', error);
      return { success: false, error: error.message };
    }
  }

const systemPrompt = `Ты — голосовой ассистент руководителя ландшафтной CRM-системы. Твоя задача: анализировать голосовые команды, извлекать намерения и сущности (имя, номер, услуга, срок, адрес) и запускать нужные Edge Functions. Ты не задаёшь вопросов. Ты сразу действуешь:

АЛГОРИТМ:
1. Распознать и извлечь данные (имя клиента, номер, что нужно)
2. Если клиента нет — создать (create_client)
3. Сформировать заявку (create_task или create_project)
4. Разбить на подзадачи
5. Делегировать их нужным ИИ-агентам (через ai_agent: "AI-Сметчик", "AI-Поставки", "AI-КП")
6. Если сказано "позвонить", "отправить", "сделай до пятницы" — учти дедлайн и способ связи
7. Возвращай детальный лог выполненных действий

ПАРСИНГ СУЩНОСТЕЙ:
- Имена: Сергей, Иванов, клиент с Малькова
- Телефоны: 89393709999, +7-930-123-45-67  
- Адреса: Решетникова, Малькова, Березняки
- Услуги: футбольное поле, газон, автополив
- Сроки: до пятницы, завтра, к четвергу
- Материалы: щебень, песок, рулонный газон

ДЕЛЕГИРОВАНИЕ ИИ-АГЕНТАМ:
- "найти поставщиков" → ai_agent: "AI-Поставки"
- "подобрать подрядчиков" → ai_agent: "AI-Подрядчик"  
- "рассчитать смету" → ai_agent: "AI-Сметчик"
- "отправить КП" → ai_agent: "AI-КП-менеджер"
- "консультация клиента" → ai_agent: "AI-Консультант"

ОБРАБОТКА СЛОЖНЫХ КОМАНД:
Если команда содержит несколько действий, выполняй их последовательно:
1. Создай/найди клиента
2. Создай основную задачу/проект с обязательной привязкой к клиенту
3. Создай подзадачи для ИИ-агентов
4. Обнови статус существующих задач при необходимости
5. Ответь на аналитические вопросы

ВАЖНЫЕ ПРАВИЛА РАБОТЫ С ЗАДАЧАМИ:
- При создании задачи ВСЕГДА ищи клиента по имени с помощью find_client
- Если клиент найден, обязательно указывай client_id в create_task
- При закрытии/завершении задач используй update_task_status с соответствующим статусом
- Для поиска задач клиента используй find_client_tasks

КОНТЕКСТ УПРАВЛЕНИЯ ЗАДАЧАМИ:
- "закрой задачу" / "завершена встреча с клиентом X" → find_client + find_client_tasks + update_task_status на "completed"
- "задача выполнена" → update_task_status на "completed"
- "начал работу над задачей" → update_task_status на "in-progress"

АНАЛИТИКА И ПОЛУЧЕНИЕ ИНФОРМАЦИИ О ЗАДАЧАХ:
- "что с клиентом X" → find_client + find_client_tasks + показать статус задач
- "все задачи" / "список всех задач" / "что у нас на сегодня" → get_all_tasks
- "задачи на сегодня" / "задачи сегодня" → get_all_tasks с фильтром по сегодняшней дате
- "активные задачи" → get_all_tasks с фильтром status_filter: "pending" или "in-progress"
- "выполненные задачи" → get_all_tasks с фильтром status_filter: "completed"
- "сколько заявок в работе" → get_analytics
- "статистика за неделю" → get_analytics с фильтрами

Выполняй ВСЕ действия автоматически и возвращай подробный отчёт о выполнении.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        tools: tools,
        tool_choice: "auto",
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const assistantMessage = data.choices[0].message;

    // Обрабатываем вызовы функций
    if (assistantMessage.tool_calls) {
      const functionResults = [];
      
      for (const toolCall of assistantMessage.tool_calls) {
        const functionName = toolCall.function.name;
        const functionArgs = JSON.parse(toolCall.function.arguments);
        
        console.log(`Calling function: ${functionName}`, functionArgs);
        
        try {
          let result;
          switch (functionName) {
            case 'find_client':
              result = await findClient(functionArgs, userId);
              if (result) {
                functionResults.push(`Клиент найден: ${result.name} (ID: ${result.id})`);
              } else {
                functionResults.push(`Клиент не найден по запросу: ${JSON.stringify(functionArgs)}`);
              }
              break;
              
            case 'update_client_with_comment':
              result = await updateClientWithComment(functionArgs.client_id, functionArgs.comment, userId);
              functionResults.push(`Комментарий добавлен к клиенту "${result.name}"`);
              break;
              
            case 'create_client':
              result = await createCRMClient(functionArgs, userId);
              functionResults.push(`Клиент "${functionArgs.name}" успешно создан с ID: ${result.id}`);
              break;
              
            case 'create_task':
              // Попытаемся найти клиента если не указан client_id но есть упоминание клиента в тексте
              if (!functionArgs.client_id && (functionArgs.title || functionArgs.description)) {
                const searchText = `${functionArgs.title} ${functionArgs.description || ''}`.toLowerCase();
                if (searchText.includes('федоров') || searchText.includes('алексей')) {
                  const foundClient = await findClient({ name: 'Федоров Алексей' }, userId);
                  if (foundClient) {
                    functionArgs.client_id = foundClient.id;
                    console.log(`Автоматически привязан клиент: ${foundClient.name} (${foundClient.id})`);
                  }
                }
              }
              result = await createTask(functionArgs, userId);
              const clientInfo = functionArgs.client_id ? ` для клиента` : '';
              functionResults.push(`Задача "${functionArgs.title}" успешно создана${clientInfo} с ID: ${result.id}`);
              break;
              
            case 'update_task_status':
              result = await updateTaskStatus(functionArgs.task_id, functionArgs.status, userId);
              functionResults.push(`Статус задачи "${result.title}" обновлен на "${functionArgs.status}"`);
              break;
              
              
            case 'get_all_tasks':
              const allTasks = await getTasksData(userId);
              let filteredTasks = allTasks;
              
              // Применяем фильтр по статусу если указан
              if (functionArgs.status_filter && functionArgs.status_filter !== 'all') {
                filteredTasks = allTasks.filter(task => task.status === functionArgs.status_filter);
              }
              
              // Применяем фильтр по дате если указан
              if (functionArgs.due_date_filter) {
                filteredTasks = filteredTasks.filter(task => {
                  if (!task.due_date) return false;
                  const taskDate = task.due_date.split('T')[0]; // получаем только дату без времени
                  return taskDate === functionArgs.due_date_filter;
                });
              }
              
              // Если фильтр по дате не указан, но запрос касается "сегодня"
              if (!functionArgs.due_date_filter && (message.includes('сегодня') || message.includes('на сегодня'))) {
                const today = new Date().toISOString().split('T')[0];
                filteredTasks = filteredTasks.filter(task => {
                  if (!task.due_date) return false;
                  const taskDate = task.due_date.split('T')[0];
                  return taskDate === today;
                });
              }
              
              // Получаем информацию о клиентах для задач
              const clientsInfo = await getClientsData(userId);
              const tasksWithClients = filteredTasks.map(task => {
                const client = task.client_id ? clientsInfo.find(c => c.id === task.client_id) : null;
                return {
                  ...task,
                  client_name: client ? client.name : 'Без клиента'
                };
              });
              
              result = tasksWithClients;
              functionResults.push(`Найдено ${result.length} задач(и) по запросу`);
              break;
              
            case 'find_client_tasks':
              result = await findClientTasks(functionArgs.client_id, userId);
              functionResults.push(`Найдено ${result.length} задач(и) для клиента`);
              break;
              
            case 'create_material':
              result = await createMaterial(functionArgs, userId);
              functionResults.push(`Материал "${functionArgs.name}" успешно добавлен с ID: ${result.id}`);
              break;
              
            case 'create_supplier':
              result = await createSupplier(functionArgs, userId);
              functionResults.push(`Поставщик "${functionArgs.name}" успешно добавлен с ID: ${result.id}`);
              break;
              
            case 'parse_complex_command':
              result = parseComplexCommand(functionArgs.command_text);
              functionResults.push(`Извлеченные сущности: ${JSON.stringify(result, null, 2)}`);
              break;

            case 'create_command_history':
              result = await createCommandHistory(functionArgs, userId);
              functionResults.push(`Команда сохранена в историю с ID: ${result.id}`);
              break;

            case 'get_command_history':
              result = await getCommandHistory(userId, 10);
              functionResults.push(`История команд загружена: ${result.length} записей`);
              break;

            case 'create_estimate':
              result = await createEstimateViaAI(functionArgs, userId);
              if (result.success) {
                functionResults.push(`✅ Смета успешно создана через AI-Сметчика: ${result.response || result.estimate_id}`);
              } else {
                functionResults.push(`❌ Ошибка создания сметы: ${result.error}`);
              }
              break;

            case 'delegate_to_ai_assistant':
              result = await delegateToAIAssistant(functionArgs, userId);
              if (result.success) {
                functionResults.push(`✅ Задача делегирована ${functionArgs.assistant_name}: ${result.result}`);
              } else {
                functionResults.push(`❌ Ошибка делегирования: ${result.error}`);
              }
              break;

            case 'get_analytics':
              switch (functionArgs.type) {
                case 'clients':
                  const clients = await getClientsData(userId);
                  result = {
                    total: clients.length,
                    new: clients.filter(c => c.status === 'new').length,
                    active: clients.filter(c => c.status === 'active').length,
                    data: clients
                  };
                  break;
                case 'tasks':
                  const tasks = await getTasksData(userId);
                  result = {
                    total: tasks.length,
                    pending: tasks.filter(t => t.status === 'pending').length,
                    in_progress: tasks.filter(t => t.status === 'in_progress').length,
                    completed: tasks.filter(t => t.status === 'completed').length,
                    high_priority: tasks.filter(t => t.priority === 'high').length,
                    data: tasks
                  };
                  break;
                case 'materials':
                  const materials = await getMaterialsData(userId);
                  result = {
                    total: materials.length,
                    low_stock: materials.filter(m => m.stock <= m.min_stock).length,
                    data: materials
                  };
                  break;
                default:
                  result = { message: "Общая аналитика пока не реализована" };
              }
              functionResults.push(`Аналитика получена: ${JSON.stringify(result, null, 2)}`);
              break;

            case 'calculate_estimate':
              result = await calculateEstimate(functionArgs.services, userId, functionArgs.task_id);
              if (result.success) {
                const calculations = result.calculations || [];
                let summary = `✅ Расчёт материалов завершён для ${calculations.length} услуг:\n\n`;
                
                calculations.forEach((calc: any) => {
                  summary += `🔹 ${calc.service} (${calc.quantity} ${calc.unit}):\n`;
                  calc.materials.forEach((mat: any) => {
                    if (mat.error) {
                      summary += `   ❌ ${mat.name}: ${mat.error}\n`;
                    } else {
                      summary += `   • ${mat.name}: ${mat.quantity} ${mat.unit}\n`;
                    }
                  });
                  summary += '\n';
                });
                
                functionResults.push(summary.trim());
              } else {
                functionResults.push(`❌ Ошибка расчёта материалов: ${result.error}`);
              }
              break;
              
            default:
              functionResults.push(`Неизвестная функция: ${functionName}`);
          }
        } catch (error) {
          console.error(`Error executing function ${functionName}:`, error);
          functionResults.push(`Ошибка при выполнении ${functionName}: ${error.message}`);
        }
      }
      
      // Формируем ответ с результатами выполнения функций
      const reply = functionResults.join('\n') + '\n\n' + (assistantMessage.content || 'Действия выполнены.');
      
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Обычный ответ без функций
    const reply = assistantMessage.content;
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in voice-chat function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});