import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const { action, clientId, clientData, salesContext } = await req.json();

    console.log('AI Sales Manager request:', { action, clientId, salesContext });

    // Получаем данные клиента
    let client = null;
    if (clientId) {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .eq('user_id', user.id)
        .single();
      client = data;
    }

    // Получаем историю взаимодействий
    const { data: clientComments } = await supabase
      .from('client_comments')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Получаем активные задачи по клиенту
    const { data: clientTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('client_id', clientId)
      .eq('user_id', user.id)
      .neq('status', 'completed');

    const systemPrompt = `Ты - ИИ-продажник строительной компании. Твоя задача - вести клиентов от заявки до заключения договора.

ИНФОРМАЦИЯ О КЛИЕНТЕ:
${client ? `
Имя: ${client.name}
Телефон: ${client.phone}
Email: ${client.email || 'Не указан'}
Статус: ${client.status}
Этап воронки: ${client.conversion_stage}
Бюджет: ${client.budget || 'Не указан'} руб
Услуги: ${client.services?.join(', ') || 'Не указаны'}
Описание проекта: ${client.project_description || 'Нет описания'}
Последний контакт: ${client.last_contact || 'Нет данных'}
Следующее действие: ${client.next_action || 'Не запланировано'}
Заметки: ${client.notes || 'Нет заметок'}
` : 'Новый клиент'}

ИСТОРИЯ КОММЕНТАРИЕВ:
${clientComments?.map(c => `${c.created_at}: ${c.content} (${c.comment_type})`).join('\n') || 'Нет истории'}

АКТИВНЫЕ ЗАДАЧИ:
${clientTasks?.map(t => `- ${t.title} (${t.status}, до ${t.due_date || 'без срока'})`).join('\n') || 'Нет активных задач'}

ЭТАПЫ ВОРОНКИ ПРОДАЖ:
1. new - Новый лид
2. contacted - Первый контакт
3. meeting_scheduled - Встреча назначена
4. needs_analysis - Анализ потребностей
5. proposal_sent - КП отправлено
6. negotiation - Переговоры
7. contract_sent - Договор отправлен
8. closed_won - Сделка закрыта (успешно)
9. closed_lost - Сделка закрыта (проиграна)

ВОЗМОЖНЫЕ ДЕЙСТВИЯ:
- contact_client - связаться с клиентом
- schedule_meeting - назначить встречу
- analyze_needs - проанализировать потребности
- create_proposal - создать КП
- send_proposal - отправить КП
- follow_up - сделать напоминание
- negotiate - провести переговоры
- close_deal - закрыть сделку
- update_stage - обновить этап

ПРАВИЛА:
1. Всегда анализируй текущий этап клиента
2. Предлагай конкретные действия для продвижения по воронке
3. Учитывай временные рамки и срочность
4. Создавай задачи с конкретными сроками
5. Обновляй информацию о клиенте
6. Веди аналитику продаж

Отвечай в JSON формате:
{
  "analysis": "анализ текущего состояния клиента",
  "recommendedAction": "рекомендуемое действие",
  "nextStage": "следующий этап воронки",
  "tasks": [
    {
      "title": "название задачи",
      "description": "описание",
      "due_date": "2024-XX-XX",
      "priority": "high/medium/low",
      "assignee": "кому назначить"
    }
  ],
  "clientUpdates": {
    "status": "новый статус если нужно",
    "conversion_stage": "новый этап если нужно",
    "next_action": "следующее действие",
    "notes": "дополнительные заметки"
  },
  "comments": [
    {
      "content": "комментарий о взаимодействии",
      "comment_type": "meeting/call/email/note"
    }
  ],
  "nextActions": ["список следующих действий"]
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Действие: ${action}\n\nКонтекст: ${JSON.stringify(salesContext)}` }
        ],
        max_completion_tokens: 2000,
      }),
    });

    const aiResponse = await response.json();
    
    if (!response.ok) {
      console.error('OpenAI API error:', aiResponse);
      throw new Error(`OpenAI API error: ${aiResponse.error?.message || 'Unknown error'}`);
    }

    const result = JSON.parse(aiResponse.choices[0].message.content);

    // Обновляем клиента если есть изменения
    if (client && result.clientUpdates) {
      const updates: any = {};
      Object.entries(result.clientUpdates).forEach(([key, value]) => {
        if (value && value !== client[key]) {
          updates[key] = value;
        }
      });

      if (Object.keys(updates).length > 0) {
        updates.updated_at = new Date().toISOString();
        await supabase
          .from('clients')
          .update(updates)
          .eq('id', clientId)
          .eq('user_id', user.id);
      }
    }

    // Создаем задачи
    if (result.tasks?.length > 0) {
      const tasks = result.tasks.map((task: any) => ({
        ...task,
        user_id: user.id,
        client_id: clientId,
        status: 'pending',
        category: 'sales'
      }));

      await supabase
        .from('tasks')
        .insert(tasks);
    }

    // Добавляем комментарии
    if (result.comments?.length > 0) {
      const comments = result.comments.map((comment: any) => ({
        ...comment,
        user_id: user.id,
        client_id: clientId,
        author_name: 'ИИ-продажник'
      }));

      await supabase
        .from('client_comments')
        .insert(comments);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in ai-sales-manager function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});