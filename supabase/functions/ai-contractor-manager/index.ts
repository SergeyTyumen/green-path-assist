import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization')!;
    const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { task, projectData, contractorRequirements } = await req.json();
    console.log('AI Contractor Manager request:', { task, projectData, contractorRequirements });

    // Get OpenAI API key
    const { data: apiKeyData } = await supabaseClient
      .from('api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .eq('provider', 'openai')
      .single();

    if (!apiKeyData?.api_key) {
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not found. Please add your API key in settings.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get contractor data from database
    const { data: contractors } = await supabaseClient
      .from('contractor_profiles')
      .select('*')
      .eq('verified', true);

    const systemPrompt = `Вы - AI Менеджер по Подрядчикам, специализирующийся на поиске, оценке и управлении подрядчиками для строительных проектов.

Ваши основные функции:
1. Поиск подходящих подрядчиков для проектов
2. Оценка квалификации и надежности подрядчиков
3. Формирование рекомендаций по выбору подрядчика
4. Управление процессом заключения договоров
5. Контроль качества работ и соблюдения сроков

Доступные подрядчики: ${JSON.stringify(contractors, null, 2)}

Отвечайте на русском языке. Предоставляйте практичные и обоснованные рекомендации.`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyData.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Задача: ${task}\n\nДанные проекта: ${JSON.stringify(projectData)}\n\nТребования к подрядчику: ${JSON.stringify(contractorRequirements)}` }
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json();
    const analysis = openAIData.choices[0].message.content;

    // Save to database if this is a contractor search/recommendation
    if (task.toLowerCase().includes('поиск') || task.toLowerCase().includes('рекомендаци')) {
      await supabaseClient
        .from('voice_command_history')
        .insert({
          user_id: user.id,
          transcript: task,
          actions: [{ type: 'contractor_analysis', result: analysis }],
          status: 'completed'
        });
    }

    return new Response(JSON.stringify({ 
      analysis,
      recommendedContractors: contractors?.slice(0, 3) || [],
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in AI Contractor Manager:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});