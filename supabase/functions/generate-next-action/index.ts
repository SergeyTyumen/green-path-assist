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

    const { clientId, currentComment, clientData } = await req.json();
    console.log('Generate Next Action request:', { clientId, currentComment, clientData });

    // Получаем все комментарии клиента из истории
    const { data: comments, error: commentsError } = await supabaseClient
      .from('client_comments')
      .select('content, created_at, comment_type')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (commentsError) {
      console.error('Error fetching client comments:', commentsError);
      return new Response(JSON.stringify({ 
        error: 'Ошибка загрузки истории переговоров' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Проверяем наличие комментариев (сохраненных или текущего)
    const hasCurrentComment = currentComment && currentComment.trim().length > 0;
    const hasSavedComments = comments && comments.length > 0;

    if (!hasCurrentComment && !hasSavedComments) {
      return new Response(JSON.stringify({ 
        error: 'Напишите комментарий о переговорах для генерации действий' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Found ${comments?.length || 0} saved comments, current comment: ${hasCurrentComment ? 'yes' : 'no'}`);

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

    // Формируем текст всех комментариев для анализа
    let commentsHistory = '';
    
    if (hasSavedComments && comments) {
      commentsHistory = comments.map((comment, index) => 
        `Комментарий ${index + 1} (${new Date(comment.created_at).toLocaleDateString('ru-RU')}):\n${comment.content}`
      ).join('\n\n---\n\n');
    }

    // Добавляем текущий комментарий, если есть
    if (hasCurrentComment) {
      if (commentsHistory) {
        commentsHistory = `Текущий комментарий (еще не сохранен):\n${currentComment}\n\n---\n\n${commentsHistory}`;
      } else {
        commentsHistory = `Текущий комментарий:\n${currentComment}`;
      }
    }

    const systemPrompt = `Вы - AI Система Генерации Следующих Действий. Ваша задача - проанализировать всю историю взаимодействия с клиентом и предложить 3-5 конкретных следующих действий для менеджера.

Каждое действие должно быть:
1. Конкретным и выполнимым
2. Логичным продолжением текущего этапа
3. Ориентированным на результат
4. Основанным на всей истории переговоров

Информация о клиенте:
- Имя: ${clientData?.name || 'Неизвестно'}
- Этап: ${clientData?.stage || 'Неизвестно'}
- Телефон: ${clientData?.phone || 'Не указан'}
- Email: ${clientData?.email || 'Не указан'}

Верните ТОЛЬКО массив JSON без дополнительного текста в следующем формате:
[
  {
    "title": "Краткое описание действия",
    "priority": "high|medium|low",
    "category": "Категория действия"
  }
]

Примеры категорий: "Звонок", "Email", "Встреча", "Подготовка документов", "Расчет", "Консультация"
Примеры приоритетов: 
- "high" - срочные действия (звонки, срочные согласования)
- "medium" - важные плановые действия (подготовка КП, замеры)
- "low" - отложенные действия (отправка доп. информации)`;

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyData.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `История переговоров с клиентом:\n\n${commentsHistory}` }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
    }

    const openAIData = await openAIResponse.json();
    const content = openAIData.choices[0].message.content;
    
    console.log('OpenAI Response:', content);

    // Parse JSON from AI response
    let suggestions = [];
    try {
      // Try to extract JSON from response (AI might add extra text)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        suggestions = JSON.parse(content);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('AI вернул невалидный формат данных');
    }

    // Validate suggestions format
    if (!Array.isArray(suggestions) || suggestions.length === 0) {
      throw new Error('AI не смог предложить действия');
    }

    return new Response(JSON.stringify({ 
      suggestions,
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