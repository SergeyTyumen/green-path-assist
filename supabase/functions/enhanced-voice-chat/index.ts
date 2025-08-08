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

async function callN8NVoiceAssistant(messages: AIMessage[], settings: UserSettings, userId: string): Promise<string> {
  const n8nWebhookUrl = Deno.env.get('N8N_VOICE_ASSISTANT_WEBHOOK_URL');
  if (!n8nWebhookUrl) {
    throw new Error('N8N Voice Assistant webhook URL not configured');
  }

  try {
    // Подготавливаем данные для отправки в n8n
    const requestData = {
      message: messages[messages.length - 1]?.content || '',
      conversation_history: messages.slice(0, -1),
      user_id: userId,
      settings: settings
    };

    console.log('Sending request to n8n:', { url: n8nWebhookUrl, data: requestData });

    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`n8n webhook error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('n8n response:', data);
    
    return data.response || data.message || 'Ответ получен от n8n';
  } catch (error) {
    console.error('Error calling n8n webhook:', error);
    throw new Error(`Ошибка вызова n8n: ${error.message}`);
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

    // Вызываем n8n voice assistant webhook
    const aiResponse = await callN8NVoiceAssistant(messages, userSettings, user.id);

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