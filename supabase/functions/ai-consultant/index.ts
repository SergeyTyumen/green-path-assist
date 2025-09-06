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

// Обработка консультационных запросов
async function handleConsultationRequest(question: string, context: any, userId: string): Promise<any> {
  console.log('AI-Consultant handling question:', question);
  
  // Получаем данные из базы для контекста
  const knowledgeBase = await getKnowledgeBase(userId);
  
  // Анализируем тип вопроса
  const questionType = analyzeQuestionType(question);
  
  // Формируем контекстуальный ответ
  const response = await generateConsultationResponse(question, questionType, knowledgeBase, context);
  
  // Сохраняем в историю консультаций
  await saveConsultationHistory(userId, question, response, questionType);
  
  return {
    success: true,
    response: response.answer,
    question_type: questionType,
    recommendations: response.recommendations,
    related_services: response.related_services,
    price_range: response.price_range
  };
}

// Получение базы знаний для консультаций
async function getKnowledgeBase(userId: string) {
  const [servicesRes, materialsRes, estimatesRes] = await Promise.all([
    supabase.from('services').select('*').eq('user_id', userId),
    supabase.from('materials').select('*').eq('user_id', userId),
    supabase.from('estimates').select('*').eq('user_id', userId).limit(10)
  ]);

  return {
    services: servicesRes.data || [],
    materials: materialsRes.data || [],
    recent_estimates: estimatesRes.data || [],
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

// Генерация ответа с помощью OpenAI
async function generateConsultationResponse(question: string, questionType: string, knowledgeBase: any, context: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    throw new Error('OPENAI_API_KEY not found');
  }

  const systemPrompt = `Ты - опытный консультант по ландшафтному дизайну и благоустройству. 
Отвечай профессионально и подробно на вопросы клиентов.

ДОСТУПНЫЕ УСЛУГИ:
${knowledgeBase.services.map(s => `${s.name} - ${s.price}₽ за ${s.unit} (${s.category})`).join('\n')}

ДОСТУПНЫЕ МАТЕРИАЛЫ:
${knowledgeBase.materials.map(m => `${m.name} - ${m.price}₽ за ${m.unit} (${m.category})`).join('\n')}

СТАТИСТИКА:
- Всего услуг в каталоге: ${knowledgeBase.total_services}
- Всего материалов: ${knowledgeBase.total_materials}

ИНСТРУКЦИИ:
- Давай конкретные ответы на основе доступных услуг и материалов
- Если вопрос о ценах - указывай конкретные цены из базы
- Предлагай дополнительные услуги когда это уместно
- Будь дружелюбным но профессиональным
- Если нет точных данных - честно говори об этом`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.7,
      max_tokens: 1000,
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
    const { question, context, conversation_mode } = await req.json();
    console.log('AI Consultant request:', { question, conversation_mode });

    if (!question) {
      throw new Error('Question is required');
    }

    // Аутентификация пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user.user) {
      throw new Error('Authentication failed');
    }

    const userId = user.user.id;

    // Обработка консультационного запроса
    const result = await handleConsultationRequest(question, context || {}, userId);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-consultant function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});