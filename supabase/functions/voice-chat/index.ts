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
    const { message, context = "general" } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Создаем системный промпт в зависимости от контекста
    const systemPrompts = {
      general: `Ты - голосовой помощник руководителя ландшафтной компании. Отвечай кратко и по делу на русском языке. 
      Ты умеешь:
      - Анализировать данные по клиентам, сметам, задачам
      - Давать поручения другим ИИ-помощникам
      - Предоставлять статистику и отчеты
      - Помогать с принятием решений
      
      Если нужна детальная аналитика - скажи что передаешь задачу ИИ-аналитику.
      Если нужен анализ конкурентов - скажи что передаешь задачу помощнику по конкурентному анализу.`,
      
      clients: `Ты анализируешь данные по клиентам. У компании 23 активные заявки, 7 новых за 3 дня. 
      Средний чек 150,000₽. Основные источники: Яндекс.Директ (40%), сарафанное радио (35%), соцсети (25%).`,
      
      estimates: `Ты анализируешь сметы. Средний чек 150,000₽, максимальная смета 500,000₽ (проект "Парк Победы"). 
      Рентабельность по материалам 35%. Популярные работы: газоны (60%), дренаж (40%), мощение (30%).`,
      
      tasks: `Ты управляешь задачами. Сейчас 12 активных задач: 4 высокого приоритета, 6 средних, 2 низких. 
      Просрочена 1 задача от Петрова (укладка газона). Средний срок выполнения 3 дня.`
    };

    const systemPrompt = systemPrompts[context as keyof typeof systemPrompts] || systemPrompts.general;

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
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.choices[0].message.content;

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