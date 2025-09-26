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

    const { context, currentStage, clientData, projectData } = await req.json();
    console.log('Generate Next Action request:', { context, currentStage });

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

    // Get recent client activity and history
    const { data: recentHistory } = await supabaseClient
      .from('voice_command_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    const { data: clientTasks } = await supabaseClient
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .eq('client_id', clientData?.id || null)
      .order('created_at', { ascending: false })
      .limit(5);

    const systemPrompt = `Вы - AI Система Генерации Следующих Действий, которая анализирует текущий контекст и предлагает оптимальные следующие шаги в работе с клиентами и проектами.

Ваши основные функции:
1. Анализ текущего этапа взаимодействия с клиентом
2. Предложение следующих логических действий
3. Приоритизация задач по важности и срочности
4. Автоматизация рутинных процессов
5. Оптимизация воронки продаж

Стадии клиента и возможные действия:
- new: Первый звонок, квалификация лида
- qualified: Назначение замера, техническое ТЗ
- measured: Подготовка сметы, расчет материалов
- estimated: Подготовка КП, презентация предложения
- negotiating: Корректировка условий, работа с возражениями
- contracted: Подписание договора, планирование работ
- in_progress: Контроль выполнения, промежуточные отчеты
- completed: Закрытие проекта, получение отзыва

История активности: ${JSON.stringify(recentHistory, null, 2)}
Текущие задачи: ${JSON.stringify(clientTasks, null, 2)}

Формат ответа должен содержать:
1. Рекомендуемые действия (приоритетные)
2. Временные рамки выполнения
3. Ответственного исполнителя или AI-ассистента
4. Автоматизируемые задачи
5. Потенциальные риски и их предотвращение`;

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
          { role: 'user', content: `Контекст: ${context}\n\nТекущий этап: ${currentStage}\n\nДанные клиента: ${JSON.stringify(clientData)}\n\nДанные проекта: ${JSON.stringify(projectData)}` }
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
    const recommendations = openAIData.choices[0].message.content;

    // Structure the response
    const nextActions = {
      immediate: [], // Действия на сегодня
      shortTerm: [], // Действия на неделю
      longTerm: [], // Долгосрочные действия
      automated: [], // Автоматизируемые задачи
      assistantTasks: [], // Задачи для AI-ассистентов
      risks: [] // Потенциальные риски
    };

    // Save recommendations to database
    await supabaseClient
      .from('voice_command_history')
      .insert({
        user_id: user.id,
        transcript: `Генерация следующих действий для этапа: ${currentStage}`,
        actions: [{ 
          type: 'next_action_generation', 
          context,
          currentStage,
          recommendations: nextActions 
        }],
        status: 'completed'
      });

    return new Response(JSON.stringify({ 
      nextActions,
      rawRecommendations: recommendations,
      currentStage,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Generate Next Action:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Неизвестная ошибка' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});