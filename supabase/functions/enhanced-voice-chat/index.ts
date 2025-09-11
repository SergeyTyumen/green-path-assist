import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      // Build payload dynamically to support both GPT-5/4.1 and legacy models
      body: JSON.stringify((() => {
        const configuredModel = (settings?.ai_settings?.openai_model as string) || 'gpt-4o-mini';
        const isNewModel = configuredModel.startsWith('gpt-5') || configuredModel.startsWith('gpt-4.1') || configuredModel.startsWith('o3') || configuredModel.startsWith('o4');
        const payload: any = {
          model: isNewModel ? 'gpt-4o-mini' : configuredModel,
          messages: messages,
          tools: [
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
            }
          ],
          tool_choice: "auto"
        };
        if (isNewModel) {
          payload.max_completion_tokens = settings?.ai_settings?.max_tokens || 1000;
        } else {
          payload.temperature = settings?.ai_settings?.temperature ?? 0.7;
          payload.max_tokens = settings?.ai_settings?.max_tokens || 1000;
        }
        return payload;
      })()),
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
        {
          role: "assistant",
          content: message.content || "",
          tool_calls: message.tool_calls
        },
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
    case 'create_client':
      return await createCrmClient(userId, args);

    case 'create_estimate':
      return await createEstimateViaAI(userId, args, userToken);
      
    default:
      return { error: `Unknown function: ${functionName}` };
  }
}

async function createCrmClient(userId: string, clientData: any) {
  try {
    // Создаем клиент Supabase с service role key для записи в базу
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    const { data, error } = await supabaseAdmin
      .from('clients')
      .insert({
        user_id: userId,
        name: clientData.name,
        phone: clientData.phone || '',
        email: clientData.email || '',
        lead_source: clientData.lead_source || 'неизвестно',
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
    return { success: false, error: error.message };
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

async function getUserSettings(userId: string): Promise<UserSettings> {
  // Создаем клиент Supabase с service role key для чтения профилей
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data, error } = await supabaseAdmin
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
    console.log('enhanced-voice-chat: Request received');
    
    // Создаем клиент Supabase для авторизации
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration not found');
    }
    
    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('enhanced-voice-chat: No authorization header');
      throw new Error('No authorization header');
    }

    console.log('enhanced-voice-chat: Getting user from token...');
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !user) {
      console.error('enhanced-voice-chat: Invalid token:', authError?.message || 'No user found');
      throw new Error(`Authentication failed: ${authError?.message || 'Invalid token'}`);
    }

    console.log('enhanced-voice-chat: User authenticated:', user.id);

    console.log('enhanced-voice-chat: Parsing request body...');
    let requestBody;
    try {
      const rawBody = await req.text();
      console.log('enhanced-voice-chat: Raw request body:', rawBody.substring(0, 200));
      requestBody = JSON.parse(rawBody);
    } catch (parseError) {
      console.error('enhanced-voice-chat: JSON parse error:', parseError);
      throw new Error(`Invalid JSON in request body: ${parseError.message}`);
    }
    
    const { message, conversation_history = [] } = requestBody;

    if (!message) {
      console.error('enhanced-voice-chat: Message is required');
      throw new Error('Message is required');
    }

    console.log('enhanced-voice-chat: Message received:', message.substring(0, 100));

    console.log('enhanced-voice-chat: Getting user settings...');
    // Получаем настройки пользователя
    const userSettings = await getUserSettings(user.id);

    const systemPrompt = `Вы - умный голосовой помощник руководителя ландшафтной строительной компании. 
Вы понимаете контекст разговора и помогаете управлять бизнесом.

ОСНОВНЫЕ ФУНКЦИИ:
- Создание клиентов через create_client (имя, телефон, email, источник лида)
- Создание смет через AI-Сметчика (указывайте: описание проекта, площадь, клиента, виды работ)

СОЗДАНИЕ КЛИЕНТОВ:
Когда пользователь просит создать клиента, используйте функцию create_client:
- Обязательно укажите name (имя клиента)
- Если известен телефон - добавьте phone
- Если известен email - добавьте email
- Обязательно укажите lead_source (источник лида)
- Если есть дополнительная информация - добавьте notes

СОЗДАНИЕ СМЕТ:
Когда пользователь просит создать смету, используйте функцию create_estimate:
- Обязательно укажите project_description (описание проекта)
- Если известна площадь - добавьте area в кв.м
- Если назван клиент - укажите client_name
- Если названы виды работ - добавьте services как массив

ПРИМЕРЫ КОМАНД:
- "Создай клиента Дениса, звонок с сайта" → create_client
- "Создай смету на газон 100 кв.м для клиента Дениса" → create_estimate

ВАЖНО: 
- Определяйте о чем идет речь и какая функция нужна
- При создании клиентов указывайте источник лида
- Сначала создавайте клиента, потом смету для него

Отвечайте конкретно и по делу. Задавайте уточняющие вопросы если нужно.`;

    console.log('enhanced-voice-chat: Building message array...');
    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...conversation_history.map((msg: any) => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log('enhanced-voice-chat: Calling OpenAI with tools...');
    // Вызываем OpenAI с поддержкой функций для работы с базой данных
    const aiResponse = await callOpenAIWithTools(messages, userSettings, user.id, token);

    console.log('enhanced-voice-chat: OpenAI response received, saving to history...');
    // Сохраняем историю команд
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    await supabaseAdmin
      .from('voice_command_history')
      .insert({
        user_id: user.id,
        transcript: message,
        status: 'completed',
        execution_result: { response: aiResponse, model: 'enhanced-voice-chat' }
      });

    console.log('enhanced-voice-chat: Returning success response');
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