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

// Автоматическая отправка через мессенджеры
async function sendAutoResponse(userId: string, clientPhone: string, message: string, channel: 'whatsapp' | 'telegram') {
  try {
    console.log(`Автоотправка через ${channel} на ${clientPhone}`);
    
    if (channel === 'whatsapp') {
      // Отправка через WhatsApp
      const { data: settings } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('user_id', userId)
        .eq('integration_type', 'whatsapp')
        .single();

      if (!settings?.settings?.access_token || !settings?.settings?.phone_number_id) {
        console.log('WhatsApp не настроен');
        return { success: false, reason: 'whatsapp_not_configured' };
      }

      const whatsappApiUrl = `https://graph.facebook.com/v18.0/${settings.settings.phone_number_id}/messages`;
      
      const response = await fetch(whatsappApiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${settings.settings.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: clientPhone,
          type: 'text',
          text: { body: message }
        })
      });

      const result = await response.json();
      console.log('WhatsApp response:', result);
      
      return { 
        success: response.ok, 
        message_id: result.messages?.[0]?.id,
        channel: 'whatsapp'
      };
    }
    
    if (channel === 'telegram') {
      // Отправка через Telegram Bot API
      const { data: settings } = await supabase
        .from('integration_settings')
        .select('settings')
        .eq('user_id', userId)
        .eq('integration_type', 'telegram')
        .eq('is_active', true)
        .single();

      if (!settings?.settings?.bot_token) {
        return { success: false, reason: 'telegram_not_configured' };
      }

      const botToken = settings.settings.bot_token;
      const chatId = context?.chat_id || clientPhone;

      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'Markdown'
        })
      });

      const result = await response.json();
      console.log('Telegram отправка результат:', result);

      return { 
        success: response.ok, 
        message_id: result.result?.message_id,
        channel: 'telegram'
      };
    }
    
    return { success: false, reason: 'channel_not_supported' };
    
  } catch (error) {
    console.error('Ошибка автоотправки:', error);
    return { success: false, error: error.message };
  }
}

// Обработка консультационных запросов
async function handleConsultationRequest(question: string, context: any, userId: string, autoSend: boolean = false): Promise<any> {
  console.log('AI-Consultant handling question:', question);
  
  const channel = context?.channel || 'web';
  
  // Получаем данные из базы для контекста
  const knowledgeBase = await getKnowledgeBase(userId);
  
  // Анализируем тип вопроса
  const questionType = analyzeQuestionType(question);
  
  // Формируем контекстуальный ответ с учетом истории
  const response = await generateConsultationResponse(question, questionType, knowledgeBase, context, userId);
  
  // Сохраняем в историю консультаций
  await saveConsultationHistory(userId, question, response, questionType);
  
  let sendResult = null;
  
  // Автоматическая отправка, если включена
  if (autoSend) {
    const targetChannel = channel === 'telegram' ? 'telegram' : 'whatsapp';
    const targetContact = channel === 'telegram' ? context?.chat_id : context?.client_phone;
    
    if (targetContact) {
      sendResult = await sendAutoResponse(
        userId, 
        targetContact, 
        response.answer, 
        targetChannel
      );
    }
  }
  
  return {
    success: true,
    response: response.answer,
    question_type: questionType,
    recommendations: response.recommendations,
    related_services: response.related_services,
    price_range: response.price_range,
    auto_sent: sendResult
  };
}

// Получение базы знаний для консультаций
async function getKnowledgeBase(userId: string) {
  const [servicesRes, materialsRes, estimatesRes, knowledgeBaseRes] = await Promise.all([
    supabase.from('services').select('*').eq('user_id', userId),
    supabase.from('materials').select('*').eq('user_id', userId),
    supabase.from('estimates').select('*').eq('user_id', userId).limit(10),
    supabase.from('knowledge_base').select('*').eq('user_id', userId).eq('is_active', true).order('priority', { ascending: true })
  ]);

  return {
    services: servicesRes.data || [],
    materials: materialsRes.data || [],
    recent_estimates: estimatesRes.data || [],
    knowledge_base: knowledgeBaseRes.data || [],
    total_services: servicesRes.data?.length || 0,
    total_materials: materialsRes.data?.length || 0
  };
}

// Анализ типа вопроса
function analyzeQuestionType(question: string): string {
  const questionLower = question.toLowerCase();
  
  if (questionLower.includes('цен') || questionLower.includes('стоимость') || questionLower.includes('сколько')) {
    return 'pricing';
  } else if (questionLower.includes('материал') || questionLower.includes('какой') && questionLower.includes('использовать')) {
    return 'materials';
  } else if (questionLower.includes('услуг') || questionLower.includes('работ') || questionLower.includes('можете')) {
    return 'services';
  } else if (questionLower.includes('сроки') || questionLower.includes('когда') || questionLower.includes('время')) {
    return 'timing';
  } else if (questionLower.includes('как') || questionLower.includes('процесс') || questionLower.includes('этапы')) {
    return 'process';
  } else {
    return 'general';
  }
}

// Получение истории диалогов для обучения
async function getConversationHistory(userId: string, limit: number = 20) {
  const { data: history } = await supabase
    .from('voice_command_history')
    .select('transcript, response, conversation_context, execution_result')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(limit);

  return history || [];
}

// Генерация ответа с помощью OpenAI и обучением на истории
async function generateConsultationResponse(question: string, questionType: string, knowledgeBase: any, context: any, userId: string) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not found');
  }

  // Получаем настройки AI-консультанта пользователя
  const { data: userSettings } = await supabase
    .from('ai_assistant_settings')
    .select('settings')
    .eq('user_id', userId)
    .eq('assistant_type', 'consultant')
    .eq('is_active', true)
    .maybeSingle();

  const customPrompt = userSettings?.settings?.system_prompt;
  console.log('Custom prompt:', customPrompt ? 'Используется кастомный промпт' : 'Используется дефолтный промпт');

  // Получаем историю диалогов для контекста
  const conversationHistory = await getConversationHistory(userId);
  
  // Формируем контекст из истории
  const historyContext = conversationHistory.map((h: any) => 
    `Клиент: ${h.transcript}\nОтвет: ${h.response}`
  ).join('\n\n');

  // Дефолтный промпт (используется если нет кастомного)
  const defaultSystemPrompt = `Ты - профессиональный консультант строительной компании.
Отвечай на вопросы клиентов по услугам, ценам, материалам и процессам.

БАЗА ЗНАНИЙ:
${knowledgeBase.knowledge_base.map((item: any) => `
Категория: ${item.category}
Тема: ${item.topic}
Содержание: ${item.content}
Ключевые слова: ${item.keywords?.join(', ') || 'Не указаны'}
Приоритет: ${item.priority === 1 ? 'Высокий' : item.priority === 2 ? 'Средний' : 'Низкий'}
`).join('\n')}

ДОСТУПНЫЕ УСЛУГИ:
${knowledgeBase.services.map((s: any) => `${s.name} - ${s.price}₽ за ${s.unit} (${s.category})`).join('\n')}

ДОСТУПНЫЕ МАТЕРИАЛЫ:
${knowledgeBase.materials.map((m: any) => `${m.name} - ${m.price}₽ за ${m.unit} (${m.category})`).join('\n')}

ПОСЛЕДНИЕ СМЕТЫ:
${knowledgeBase.recent_estimates.map((e: any) => `${e.title} - ${e.total_amount}₽ (${e.status})`).join('\n')}

ИСТОРИЯ ПРЕДЫДУЩИХ ДИАЛОГОВ (для контекста):
${historyContext}

ИНСТРУКЦИИ:
- Используй информацию из базы знаний для ответов
- Учитывай историю предыдущих диалогов для персонализации
- Ищи релевантную информацию по темам, содержанию и ключевым словам
- Информация с высоким приоритетом важнее чем с низким
- Если вопрос о ценах - указывай конкретные цены из базы
- Предлагай дополнительные услуги когда это уместно
- Будь профессиональным и вежливым
- Если нет точных данных - предложи связаться с менеджером
- Адаптируй ответы на основе стиля общения из истории

Тип вопроса: ${questionType}
${context ? `Контекст: ${JSON.stringify(context)}` : ''}`;

  // Используем кастомный промпт если есть, иначе дефолтный с данными из БД
  const finalSystemPrompt = customPrompt || defaultSystemPrompt;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: userSettings?.settings?.model || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: finalSystemPrompt },
        { role: 'user', content: question }
      ],
      temperature: userSettings?.settings?.temperature || 0.7,
      max_tokens: userSettings?.settings?.max_tokens || 1000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const answer = data.choices[0].message.content;

  // Находим релевантные услуги
  const relatedServices = findRelatedServices(question, knowledgeBase.services);
  const priceRange = calculatePriceRange(relatedServices);
  const recommendations = generateRecommendations(questionType, relatedServices, knowledgeBase);

  return {
    answer,
    related_services: relatedServices,
    price_range: priceRange,
    recommendations
  };
}

// Поиск релевантных услуг
function findRelatedServices(question: string, services: any[]) {
  const questionLower = question.toLowerCase();
  const keywords = questionLower.split(' ').filter(word => word.length > 3);
  
  return services.filter(service => {
    const serviceLower = `${service.name} ${service.category} ${service.description || ''}`.toLowerCase();
    return keywords.some(keyword => serviceLower.includes(keyword));
  }).slice(0, 5);
}

// Расчет диапазона цен
function calculatePriceRange(services: any[]) {
  if (services.length === 0) return null;
  
  const prices = services.map(s => s.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
  };
}

// Генерация рекомендаций
function generateRecommendations(questionType: string, relatedServices: any[], knowledgeBase: any) {
  const recommendations = [];
  
  if (questionType === 'pricing' && relatedServices.length > 0) {
    recommendations.push('Рекомендую рассмотреть комплексное решение для экономии');
  }
  
  if (questionType === 'materials') {
    recommendations.push('Могу подобрать оптимальные материалы под ваш бюджет');
  }
  
  if (relatedServices.length > 1) {
    recommendations.push('Доступна скидка при заказе нескольких услуг');
  }
  
  return recommendations;
}

// Сохранение истории консультаций
async function saveConsultationHistory(userId: string, question: string, response: any, questionType: string) {
  try {
    await supabase.from('voice_command_history').insert({
      user_id: userId,
      transcript: question,
      status: 'completed',
      actions: [{
        type: 'consultation',
        question_type: questionType,
        response_length: response.answer.length
      }],
      execution_result: {
        success: true,
        response_type: questionType,
        related_services_count: response.related_services.length
      }
    });
  } catch (error) {
    console.error('Failed to save consultation history:', error);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { question, context, conversation_mode, auto_send = false, user_id } = await req.json();
    console.log('AI Consultant request:', { question, conversation_mode, auto_send, channel: context?.channel });

    if (!question) {
      throw new Error('Question is required');
    }

    let userId: string;

    // Для Telegram/WhatsApp используем user_id из body (вызов от webhook)
    if (context?.channel === 'telegram' || context?.channel === 'whatsapp') {
      if (!user_id) {
        throw new Error('user_id is required for messenger integrations');
      }
      userId = user_id;
      console.log('Using user_id from messenger webhook:', userId);
    } else {
      // Для веб-интерфейса требуем JWT аутентификацию
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Authorization header required');
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: user, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user.user) {
        throw new Error('Authentication failed');
      }

      userId = user.user.id;
      console.log('Using user_id from JWT:', userId);
    }

    // Обработка консультационного запроса с автоотправкой
    const result = await handleConsultationRequest(question, context || {}, userId, auto_send);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-consultant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});