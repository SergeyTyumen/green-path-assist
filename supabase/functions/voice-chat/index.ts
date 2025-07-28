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
async function createClient(data: any, userId: string) {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = "general" } = await req.json();
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
          name: "create_task",
          description: "Создать новую задачу",
          parameters: {
            type: "object",
            properties: {
              title: { type: "string", description: "Название задачи" },
              description: { type: "string", description: "Описание задачи" },
              assignee: { type: "string", description: "Исполнитель задачи" },
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
              due_date: { type: "string", description: "Срок выполнения (YYYY-MM-DD)" }
            },
            required: ["title"]
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
      }
    ];

    const systemPrompt = `Ты - умный голосовой помощник руководителя ландшафтной компании. 
    
    Ты можешь выполнять реальные действия в CRM системе:
    - Создавать клиентов, задачи, материалы, поставщиков
    - Получать аналитику и статистику
    - Анализировать данные
    
    ВАЖНО: 
    - Всегда используй доступные функции для выполнения действий
    - Отвечай кратко и по делу на русском языке
    - После выполнения действия сообщи о результате
    - Если нужна дополнительная информация - запроси её
    
    Примеры услуг: благоустройство, ландшафтный дизайн, газоны, дренаж, мощение, озеленение
    Примеры категорий материалов: растения, инструменты, удобрения, строительные материалы`;

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
            case 'create_client':
              result = await createClient(functionArgs, userId);
              functionResults.push(`Клиент "${functionArgs.name}" успешно создан с ID: ${result.id}`);
              break;
              
            case 'create_task':
              result = await createTask(functionArgs, userId);
              functionResults.push(`Задача "${functionArgs.title}" успешно создана с ID: ${result.id}`);
              break;
              
            case 'create_material':
              result = await createMaterial(functionArgs, userId);
              functionResults.push(`Материал "${functionArgs.name}" успешно добавлен с ID: ${result.id}`);
              break;
              
            case 'create_supplier':
              result = await createSupplier(functionArgs, userId);
              functionResults.push(`Поставщик "${functionArgs.name}" успешно добавлен с ID: ${result.id}`);
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