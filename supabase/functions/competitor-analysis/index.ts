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

// Интерактивный диалог для сбора информации для конкурентного анализа
async function handleConversationalRequest(task: string, data: any, userId: string): Promise<any> {
  console.log('Competitor-Analysis handling conversational request:', task);
  console.log('Data provided:', data);

  const taskLower = task.toLowerCase();
  const missingInfo = [];
  
  // Определяем тип анализа
  let analysisType = 'general';
  if (taskLower.includes('сравнить') || taskLower.includes('сравнение')) {
    analysisType = 'comparison';
  } else if (taskLower.includes('цен') || taskLower.includes('стоимость')) {
    analysisType = 'pricing';
  } else if (taskLower.includes('акци') || taskLower.includes('скидки')) {
    analysisType = 'promotions';
  } else if (taskLower.includes('материал') || taskLower.includes('услуг')) {
    analysisType = 'services';
  }

  // Проверяем наличие данных о конкурентах
  if (!data.competitor_proposal && !data.competitor_data) {
    missingInfo.push('Предоставьте данные о конкуренте: коммерческое предложение, прайс-лист, или ссылку на сайт конкурента');
  }

  // Для сравнения нужно наше КП
  if (analysisType === 'comparison' && !data.our_proposal) {
    missingInfo.push('Для сравнения нужно наше коммерческое предложение или данные о наших услугах и ценах');
  }

  // Проверяем конкретность запроса
  if (!analysisType || analysisType === 'general') {
    missingInfo.push('Уточните задачу: сравнить цены, проанализировать акции, изучить услуги или сделать общий анализ конкурента?');
  }

  // Если нужна информация о нашей компании для контекста
  if (!data.our_company_context) {
    const companyData = await getOurCompanyContext(userId);
    data.our_company_context = companyData;
  }

  // Если информации недостаточно, возвращаем вопросы
  if (missingInfo.length > 0) {
    return {
      needs_clarification: true,
      questions: missingInfo.join('\n\n'),
      context: {
        task,
        analysis_type: analysisType,
        company_context: data.our_company_context
      }
    };
  }

  // Если достаточно информации, создаем анализ
  return await createCompetitorAnalysis(task, analysisType, data, userId);
}

// Получение контекста нашей компании
async function getOurCompanyContext(userId: string): Promise<any> {
  try {
    // Получаем наши услуги
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select('name, category, price, unit')
      .eq('user_id', userId)
      .limit(10);

    // Получаем материалы  
    const { data: materials, error: materialsError } = await supabase
      .from('materials')
      .select('name, category, price, unit')
      .eq('user_id', userId)
      .limit(10);

    // Получаем информацию о клиентах для понимания среднего чека
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('budget')
      .eq('user_id', userId)
      .not('budget', 'is', null);

    const averageBudget = clients?.length > 0 
      ? Math.round(clients.reduce((sum, c) => sum + (c.budget || 0), 0) / clients.length)
      : 150000;

    return {
      services: services || [],
      materials: materials || [],
      averageBudget,
      serviceCategories: [...new Set(services?.map(s => s.category) || [])],
      priceRange: {
        min: Math.min(...(services?.map(s => s.price) || [100])),
        max: Math.max(...(services?.map(s => s.price) || [5000]))
      }
    };
  } catch (error) {
    console.error('Error getting company context:', error);
    return {
      services: [],
      materials: [],
      averageBudget: 150000,
      serviceCategories: ['благоустройство', 'озеленение', 'ландшафтный дизайн'],
      priceRange: { min: 100, max: 5000 }
    };
  }
}

// Создание конкурентного анализа
async function createCompetitorAnalysis(task: string, analysisType: string, data: any, userId: string): Promise<any> {
  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Подготавливаем данные для анализа
    const ourContext = data.our_company_context;
    const competitorData = data.competitor_proposal || data.competitor_data;
    const ourProposal = data.our_proposal;

    const systemPrompt = `Ты - эксперт по конкурентному анализу в сфере ландшафтного дизайна и благоустройства.

КОНТЕКСТ НАШЕЙ КОМПАНИИ:
- Средний бюджет проекта: ${ourContext.averageBudget.toLocaleString()}₽
- Категории услуг: ${ourContext.serviceCategories.join(', ')}
- Диапазон цен: ${ourContext.priceRange.min}-${ourContext.priceRange.max}₽
- Количество услуг в каталоге: ${ourContext.services.length}

Твои задачи:
1. Сравнивать коммерческие предложения с конкурентами
2. Анализировать цены, услуги, условия работы
3. Находить преимущества и слабые места
4. Предлагать улучшения для нашего КП
5. Выявлять акции и специальные предложения конкурентов
6. Заполнять недостающие поля в нашей системе на основе анализа

При анализе обращай внимание на:
- Ценообразование (цена за м², общая стоимость)
- Состав работ и материалы
- Сроки выполнения
- Гарантии и сервис
- Дополнительные услуги
- Презентацию и оформление

Давай конкретные рекомендации по улучшению нашего предложения.`;

    let userMessage = '';
    
    if (analysisType === 'comparison' && competitorData && ourProposal) {
      userMessage = `Сравни наше КП с предложением конкурента:

НАШЕ КП:
${ourProposal}

КП КОНКУРЕНТА:
${competitorData}

Проанализируй и дай рекомендации по улучшению нашего предложения.`;
    } else if (competitorData) {
      userMessage = `Проанализируй данные конкурента и выдели ключевые особенности:

ДАННЫЕ КОНКУРЕНТА:
${competitorData}

Что мы можем использовать для улучшения наших предложений? Какие услуги или материалы нам стоит добавить в систему?`;
    } else {
      userMessage = task;
    }

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
        temperature: 0.4,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const analysisData = await response.json();
    const analysis = analysisData.choices[0].message.content;

    // Генерируем конкретные действия
    const actionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'На основе анализа конкурентов составь план конкретных действий для улучшения нашего КП. Каждое действие должно быть четким и выполнимым. Также предложи какие новые услуги или материалы добавить в систему.' 
          },
          { role: 'user', content: analysis }
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    const actionsData = await actionsResponse.json();
    const actionPlan = actionsData.choices[0].message.content;

    // Создаем задачу для отслеживания
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: `Конкурентный анализ: ${analysisType}`,
        description: task,
        category: 'competitor_analysis',
        status: 'completed',
        ai_agent: 'competitor-analysis'
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
    }

    return {
      success: true,
      response: formatCompetitorResponse(analysis, actionPlan, analysisType, data),
      task_id: newTask?.id,
      analysis_data: {
        analysis,
        actionPlan,
        analysisType,
        competitorAnalyzed: !!competitorData,
        ourProposalAnalyzed: !!ourProposal,
        generated_at: new Date().toISOString()
      }
    };

  } catch (error) {
    console.error('Error creating competitor analysis:', error);
    return {
      success: false,
      error: `Ошибка при создании конкурентного анализа: ${error.message}`
    };
  }
}

// Форматирование ответа конкурентного анализа
function formatCompetitorResponse(analysis: string, actionPlan: string, analysisType: string, data: any): string {
  const typeNames = {
    comparison: 'сравнительного анализа',
    pricing: 'анализа цен',
    promotions: 'анализа акций',
    services: 'анализа услуг',
    general: 'общего анализа'
  };

  let response = `🎯 Конкурентный анализ: ${typeNames[analysisType] || 'анализ'}\n\n`;
  
  if (data.competitor_proposal || data.competitor_data) {
    response += `📋 Проанализированы данные конкурента\n`;
  }
  
  if (data.our_proposal) {
    response += `✅ Проведено сравнение с нашим КП\n`;
  }
  
  response += `\n🔍 АНАЛИЗ:\n${analysis}\n\n`;
  response += `📝 ПЛАН ДЕЙСТВИЙ:\n${actionPlan}\n\n`;
  response += `📊 Результаты сохранены в разделе "Задачи". Рекомендуется обновить прайс-листы и добавить предложенные услуги.`;
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { competitorProposal, ourProposal, analysisType = "comparison", task, data, conversation_mode } = await req.json();
    
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

      // Подготавливаем данные для интерактивного анализа
      const requestData = {
        ...(data || {}),
        competitor_proposal: competitorProposal,
        our_proposal: ourProposal,
        analysis_type: analysisType
      };

      const result = await handleConversationalRequest(task, requestData, user.id);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Стандартный режим работы
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    const systemPrompt = `Ты - эксперт по конкурентному анализу в сфере ландшафтного дизайна и благоустройства.

Твои задачи:
1. Сравнивать коммерческие предложения с конкурентами
2. Анализировать цены, услуги, условия работы
3. Находить преимущества и слабые места
4. Предлагать улучшения для нашего КП
5. Выявлять акции и специальные предложения конкурентов

При анализе обращай внимание на:
- Ценообразование (цена за м², общая стоимость)
- Состав работ и материалы
- Сроки выполнения
- Гарантии и сервис
- Дополнительные услуги
- Презентацию и оформление

Давай конкретные рекомендации по улучшению нашего предложения.`;

    let userMessage = '';
    
    if (analysisType === 'comparison' && competitorProposal && ourProposal) {
      userMessage = `Сравни наше КП с предложением конкурента:

НАШЕ КП:
${ourProposal}

КП КОНКУРЕНТА:
${competitorProposal}

Проанализируй и дай рекомендации по улучшению нашего предложения.`;
    } else if (analysisType === 'competitor_only' && competitorProposal) {
      userMessage = `Проанализируй КП конкурента и выдели ключевые особенности:

КП КОНКУРЕНТА:
${competitorProposal}

Что мы можем использовать для улучшения наших предложений?`;
    } else {
      throw new Error('Недостаточно данных для анализа');
    }

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
        temperature: 0.4,
        max_tokens: 1200,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const responseData = await response.json();
    const analysis = responseData.choices[0].message.content;

    // Генерируем конкретные действия
    const actionsResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'На основе анализа конкурентов составь план конкретных действий для улучшения нашего КП. Каждое действие должно быть четким и выполнимым.' 
          },
          { role: 'user', content: analysis }
        ],
        temperature: 0.3,
        max_tokens: 600,
      }),
    });

    const actionsData = await actionsResponse.json();
    const actionPlan = actionsData.choices[0].message.content;

    return new Response(JSON.stringify({ 
      analysis,
      actionPlan,
      analysisType,
      competitorAnalyzed: !!competitorProposal,
      ourProposalAnalyzed: !!ourProposal,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in competitor-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});