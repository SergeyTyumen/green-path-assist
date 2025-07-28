import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { request, reportType = "general" } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Системный промпт для ИИ-аналитика
    const systemPrompt = `Ты - ИИ-аналитик для ландшафтной компании. Ты специализируешься на:

1. Анализе источников лидов и их эффективности
2. Статистике по заявкам и конверсии
3. Анализе рентабельности проектов
4. Рекомендациях по рекламному бюджету
5. Прогнозировании трендов в ландшафтном бизнесе

Данные компании:
- Заявок в месяц: 45-50
- Конверсия в сделки: 35%
- Средний чек: 150,000₽
- Источники лидов: Яндекс.Директ (40%), Сарафанное радио (35%), Instagram (15%), Авито (10%)
- Рентабельность: 25-30%
- Сезонность: пик март-октябрь

Отвечай подробно с конкретными цифрами, графиками в текстовом виде и actionable рекомендациями.`;

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