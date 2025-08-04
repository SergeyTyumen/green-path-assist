import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Интерактивный диалог для сбора информации для анализа
async function handleConversationalRequest(task: string, data: any, userId: string): Promise<any> {
  console.log('AI-Analyst handling conversational request:', task);
  console.log('Data provided:', data);

  const taskLower = task.toLowerCase();
  const missingInfo = [];
  
  // Определяем тип анализа
  let analysisType = 'general';
  if (taskLower.includes('источник') || taskLower.includes('лид')) {
    analysisType = 'sources';
  } else if (taskLower.includes('воронка') || taskLower.includes('конверс')) {
    analysisType = 'conversion';  
  } else if (taskLower.includes('прибыль') || taskLower.includes('рентабельность')) {
    analysisType = 'profitability';
  } else if (taskLower.includes('прогноз') || taskLower.includes('планирование')) {
    analysisType = 'forecast';
  } else if (taskLower.includes('конкурент')) {
    analysisType = 'competitors';
  }

  // Получаем данные из CRM
  const crmData = await getCRMDataForAnalysis(userId);
  
  // Проверяем что нужно для анализа в зависимости от типа
  switch (analysisType) {
    case 'sources':
      if (!crmData.hasLeadSources) {
        missingInfo.push('Для анализа источников лидов нужно больше данных в CRM. Добавьте клиентов с указанием источника лида (звонок, сайт, соцсети, реклама, рекомендация, авито)');
      }
      break;
      
    case 'conversion':
      if (!crmData.hasStages) {
        missingInfo.push('Для анализа воронки продаж нужны данные о стадиях клиентов. Обновите статусы клиентов в CRM (new, qualified, proposal, negotiation, closed)');
      }
      break;
      
    case 'profitability':
      if (!crmData.hasBudgets) {
        missingInfo.push('Для анализа прибыльности укажите бюджеты/стоимость проектов у клиентов в CRM');
      }
      break;
      
    case 'forecast':
      if (!crmData.hasHistoricalData) {
        missingInfo.push('Для прогнозирования нужно больше исторических данных. Добавьте информацию о завершенных проектах и их датах');
      }
      break;
  }

  // Проверяем временной период для анализа
  if (!data.period && !data.start_date && !data.end_date) {
    missingInfo.push('Укажите период для анализа (например: за последний месяц, за квартал, с начала года)');
  }

  // Если информации недостаточно, возвращаем вопросы
  if (missingInfo.length > 0) {
    return {
      needs_clarification: true,
      questions: missingInfo.join('\n\n'),
      context: {
        task,
        analysis_type: analysisType,
        crm_data_available: crmData
      }
    };
  }

  // Если достаточно информации, создаем анализ
  return await createAnalysisReport(task, analysisType, crmData, data, userId);
}

// Получение данных из CRM для анализа
async function getCRMDataForAnalysis(userId: string): Promise<any> {
  try {
    // Получаем клиентов
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .eq('user_id', userId);

    if (clientsError) {
      console.error('Error fetching clients:', clientsError);
      return { hasData: false };
    }

    const totalClients = clients?.length || 0;
    
    // Анализируем источники лидов
    const leadSources = {};
    const conversionStages = {};
    let totalBudget = 0;
    let clientsWithBudget = 0;
    
    clients?.forEach(client => {
      // Источники лидов
      const source = client.lead_source || 'unknown';
      leadSources[source] = (leadSources[source] || 0) + 1;
      
      // Стадии конверсии
      const stage = client.conversion_stage || 'new';
      conversionStages[stage] = (conversionStages[stage] || 0) + 1;
      
      // Бюджет
      if (client.budget) {
        totalBudget += client.budget;
        clientsWithBudget++;
      }
    });

    return {
      hasData: totalClients > 0,
      hasLeadSources: Object.keys(leadSources).length > 1 && totalClients > 5,
      hasStages: Object.keys(conversionStages).length > 1,
      hasBudgets: clientsWithBudget > 0,
      hasHistoricalData: totalClients > 10,
      totalClients,
      leadSources,
      conversionStages,
      averageBudget: clientsWithBudget > 0 ? Math.round(totalBudget / clientsWithBudget) : 0,
      recentActivity: {
        thisMonth: clients?.filter(c => 
          new Date(c.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        ).length || 0
      }
    };
  } catch (error) {
    console.error('Error getting CRM data:', error);
    return { hasData: false };
  }
}

// Создание аналитического отчета
async function createAnalysisReport(task: string, analysisType: string, crmData: any, requestData: any, userId: string): Promise<any> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Системный промпт с актуальными данными
    const systemPrompt = `Ты - ИИ-аналитик для ландшафтной компании.
    
    АКТУАЛЬНЫЕ ДАННЫЕ ИЗ CRM:
    - Всего клиентов в базе: ${crmData.totalClients}
    - Источники лидов: ${JSON.stringify(crmData.leadSources)}
    - Конверсия по стадиям: ${JSON.stringify(crmData.conversionStages)}
    - Средний бюджет проекта: ${crmData.averageBudget}₽
    - Активность за месяц: ${crmData.recentActivity.thisMonth} новых клиентов
    
    Создавай подробные аналитические отчеты с конкретными цифрами, выводами и actionable рекомендациями.
    Анализируй тренды, сравнивай показатели, предлагай конкретные улучшения.`;

    const reportPrompts = {
      sources: "Проанализируй эффективность источников лидов и дай рекомендации по распределению рекламного бюджета",
      conversion: "Проанализируй воронку продаж и конверсию по этапам, предложи способы улучшения",
      profitability: "Проанализируй рентабельность по видам работ и клиентам, найди точки роста прибыли",
      forecast: "Сделай прогноз спроса на следующий сезон с учетом трендов рынка",
      competitors: "Проанализируй конкурентную ситуацию на рынке ландшафтных услуг"
    };

    const userMessage = reportPrompts[analysisType as keyof typeof reportPrompts] || task;

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Генерируем рекомендации
    const recommendationsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'На основе анализа дай 3-5 конкретных actionable рекомендаций для руководителя ландшафтной компании. Каждая рекомендация должна быть с ожидаемым результатом.' 
          },
          { role: 'user', content: analysis }
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    const recData = await recommendationsResponse.json();
    const recommendations = recData.choices[0].message.content;

    // Создаем задачу для отслеживания
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: `Аналитический отчет: ${analysisType}`,
        description: task,
        category: 'analytics',
        status: 'completed',
        ai_agent: 'ai-analyst'
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
    }

    return {
      success: true,
      response: formatAnalysisResponse(analysis, recommendations, analysisType, crmData),
      task_id: newTask?.id,
      analysis_data: {
        analysis,
        recommendations,
        reportType: analysisType,
        generated_at: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error creating analysis:', error);
    return {
      success: false,
      error: `Ошибка при создании анализа: ${error.message}`
    };
  }
}

// Форматирование ответа аналитика
function formatAnalysisResponse(analysis: string, recommendations: string, analysisType: string, crmData: any): string {
  const typeNames = {
    sources: 'источников лидов',
    conversion: 'воронки продаж',
    profitability: 'рентабельности',
    forecast: 'прогнозирования',
    competitors: 'конкурентов',
    general: 'общего анализа'
  };

  let response = `📊 Аналитический отчет: ${typeNames[analysisType] || 'анализ'}\n\n`;
  
  response += `📈 ДАННЫЕ ИЗ CRM:\n`;
  response += `• Всего клиентов: ${crmData.totalClients}\n`;
  response += `• Средний бюджет: ${crmData.averageBudget.toLocaleString()}₽\n`;
  response += `• Новых за месяц: ${crmData.recentActivity.thisMonth}\n\n`;
  
  response += `🔍 АНАЛИЗ:\n${analysis}\n\n`;
  response += `💡 РЕКОМЕНДАЦИИ:\n${recommendations}\n\n`;
  response += `📋 Отчет сохранен в разделе "Задачи". Вы можете просмотреть детали там.`;
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request, reportType = "general", crmData, task, data, conversation_mode } = await req.json();
    
    // Если это диалоговый режим, обрабатываем как интерактивный запрос
    if (conversation_mode && task) {
      const authHeader = req.headers.get('authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }

      const { data: { user }, error: userError } = await supabase.auth.getUser(
        authHeader.replace('Bearer ', '')
      );

      if (userError || !user) {
        throw new Error('Invalid authorization token');
      }

      const result = await handleConversationalRequest(task, data || {}, user.id);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Стандартный режим работы
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Системный промпт для ИИ-аналитика
    const systemPrompt = `Ты - ИИ-аналитик для ландшафтной компании "ЛандшафтСтрой".
    
    ${crmData ? `
    АКТУАЛЬНЫЕ ДАННЫЕ ИЗ CRM:
    - Всего клиентов в базе: ${crmData.totalClients}
    - Источники лидов: ${JSON.stringify(crmData.leadSources)}
    - Конверсия по стадиям: ${JSON.stringify(crmData.conversionStages)}
    - Активность за месяц: ${JSON.stringify(crmData.recentActivity)}
    ` : ''}
    
    Базовые данные компании:
    - Заявок в месяц: 45-50
    - Конверсия в сделки: 35%
    - Средний чек: 150,000₽
    - Источники лидов: Яндекс.Директ 40%, Сарафанное радио 35%, Instagram 15%, Авито 10%
    - Рентабельность: 25-30%
    - Сезонность: пик май-сентябрь
    - Услуги: озеленение, благоустройство, системы полива, ландшафтный дизайн
    - География: Тюмень и область
    
    ВАЖНО: Используй АКТУАЛЬНЫЕ ДАННЫЕ ИЗ CRM если они предоставлены, а базовые данные как дополнение.
    Создавай подробные аналитические отчеты с конкретными цифрами, выводами и actionable рекомендациями.
    Анализируй тренды, сравнивай показатели, предлагай конкретные улучшения.`;

    const reportPrompts = {
      sources: "Проанализируй эффективность источников лидов и дай рекомендации по распределению рекламного бюджета",
      conversion: "Проанализируй воронку продаж и конверсию по этапам, предложи способы улучшения",
      profitability: "Проанализируй рентабельность по видам работ и клиентам, найди точки роста прибыли",
      forecast: "Сделай прогноз спроса на следующий сезон с учетом трендов рынка",
      competitors: "Проанализируй конкурентную ситуацию на рынке ландшафтных услуг"
    };

    const userMessage = reportPrompts[reportType as keyof typeof reportPrompts] || request;

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
          { role: 'user', content: userMessage }
        ],
        temperature: 0.3,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    // Генерируем дополнительные рекомендации
    const recommendationsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'На основе анализа дай 3-5 конкретных actionable рекомендаций для руководителя ландшафтной компании. Каждая рекомендация должна быть с ожидаемым результатом.' 
          },
          { role: 'user', content: analysis }
        ],
        temperature: 0.4,
        max_tokens: 800,
      }),
    });

    const recData = await recommendationsResponse.json();
    const recommendations = recData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      analysis, 
      recommendations,
      reportType,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-analyst function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});