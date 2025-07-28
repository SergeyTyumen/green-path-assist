import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { competitorProposal, ourProposal, analysisType = "comparison" } = await req.json();
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

    const data = await response.json();
    const analysis = data.choices[0].message.content;

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