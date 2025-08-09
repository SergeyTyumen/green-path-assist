import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1'

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { 
      clientData, 
      userId 
    } = await req.json();

    console.log('Generating next action for client:', clientData.name);

    // Получаем задачи клиента
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientData.id || null); // Для новых клиентов может не быть ID

    // Получаем этапы клиента
    const { data: stages } = await supabase
      .from('client_stages')
      .select('*')
      .eq('user_id', userId)
      .eq('client_id', clientData.id || null)
      .order('stage_order');

    // Формируем контекст для ИИ
    const clientContext = {
      name: clientData.name,
      status: clientData.status,
      services: clientData.services || [],
      budget: clientData.budget,
      project_area: clientData.project_area,
      project_description: clientData.project_description,
      notes: clientData.notes,
      tasks: tasks || [],
      stages: stages || []
    };

    // Определяем текущий этап воронки продаж
    const currentStage = stages?.find(stage => !stage.completed);
    const completedStages = stages?.filter(stage => stage.completed) || [];
    
    // Формируем промпт для ИИ
    const prompt = `
Ты - ИИ-помощник для CRM системы ландшафтной компании. Проанализируй информацию о клиенте и сгенерируй короткое и конкретное следующее действие.

ИНФОРМАЦИЯ О КЛИЕНТЕ:
- Имя: ${clientContext.name}
- Статус: ${getStatusLabel(clientContext.status)}
- Услуги: ${clientContext.services.map(s => getServiceLabel(s)).join(', ')}
- Бюджет: ${clientContext.budget ? `₽${clientContext.budget.toLocaleString()}` : 'не указан'}
- Площадь: ${clientContext.project_area ? `${clientContext.project_area}м²` : 'не указана'}
- Описание проекта: ${clientContext.project_description || 'не указано'}
- Заметки: ${clientContext.notes || 'нет заметок'}

ТЕКУЩИЙ ЭТАП ВОРОНКИ:
${currentStage ? `Текущий этап: "${currentStage.stage_name}"` : 'Этапы не настроены'}

ЗАВЕРШЕННЫЕ ЭТАПЫ:
${completedStages.length > 0 ? completedStages.map(s => `✓ ${s.stage_name}`).join('\n') : 'Нет завершенных этапов'}

АКТИВНЫЕ ЗАДАЧИ:
${clientContext.tasks.length > 0 ? 
  clientContext.tasks.filter(t => t.status !== 'completed').map(t => `- ${t.title} (${t.status})`).join('\n') : 
  'Нет активных задач'}

ЗАВЕРШЕННЫЕ ЗАДАЧИ:
${clientContext.tasks.filter(t => t.status === 'completed').map(t => `✓ ${t.title}`).join('\n') || 'Нет завершенных задач'}

ТРЕБОВАНИЯ К ОТВЕТУ:
1. Ответ должен быть максимально коротким (до 50 слов)
2. Конкретное действие с указанием примерной даты (если применимо)
3. Учитывай статус клиента и текущий этап воронки
4. Если нет активных задач - предложи логичное следующее действие
5. Отвечай только текстом действия, без дополнительных объяснений

Примеры хороших ответов:
- "Позвонить клиенту для уточнения деталей проекта до 15.01.2024"
- "Подготовить коммерческое предложение по автополиву"
- "Назначить встречу на объекте для замера"
- "Отправить примеры работ по ландшафтному дизайну"
`;

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'Ты - эксперт по работе с клиентами в ландшафтной сфере. Генерируй короткие, конкретные и практичные следующие действия.' 
          },
          { role: 'user', content: prompt }
        ],
        max_tokens: 100,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const nextAction = data.choices[0].message.content.trim();

    console.log('Generated next action:', nextAction);

    return new Response(JSON.stringify({ 
      nextAction,
      success: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-next-action function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getStatusLabel(status: string): string {
  const labels = {
    "new": "Новый",
    "in-progress": "В работе", 
    "proposal-sent": "КП отправлено",
    "call-scheduled": "Созвон назначен",
    "postponed": "Отложено",
    "closed": "Закрыт"
  };
  return labels[status as keyof typeof labels] || status;
}

function getServiceLabel(service: string): string {
  const labels = {
    "landscape-design": "Ландшафтный дизайн",
    "auto-irrigation": "Автополив", 
    "lawn": "Газон",
    "planting": "Посадка растений",
    "hardscape": "Мощение",
    "maintenance": "Обслуживание"
  };
  return labels[service as keyof typeof labels] || service;
}