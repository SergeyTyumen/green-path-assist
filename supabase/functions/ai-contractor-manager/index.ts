import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Поиск подрядчиков по видам работ
async function findContractors(workTypes: string[], userId: string): Promise<any> {
  console.log('Finding contractors for work types:', workTypes);

  // Получаем подрядчиков из базы, которые подходят по специализации
  const { data: contractors, error } = await supabase
    .from('contractor_profiles')
    .select('*')
    .eq('verified', true);

  if (error) {
    console.error('Error fetching contractors:', error);
  }

  // Фильтруем подрядчиков по специализации
  const relevantContractors = (contractors || []).filter(contractor => 
    workTypes.some(workType => 
      contractor.specialization.some((spec: string) => 
        spec.toLowerCase().includes(workType.toLowerCase()) ||
        workType.toLowerCase().includes(spec.toLowerCase())
      )
    )
  );

  // Сортируем по рейтингу и опыту
  relevantContractors.sort((a, b) => {
    const ratingDiff = (b.rating || 0) - (a.rating || 0);
    if (ratingDiff !== 0) return ratingDiff;
    return (b.experience_years || 0) - (a.experience_years || 0);
  });

  // Генерируем рекомендации для поиска новых подрядчиков
  const recommendations = await generateContractorRecommendations(workTypes, relevantContractors);

  return {
    success: true,
    found_contractors: relevantContractors,
    recommendations: recommendations,
    work_types_searched: workTypes,
    total_found: relevantContractors.length,
    search_criteria: {
      verified_only: true,
      sorted_by: 'rating_and_experience'
    }
  };
}

// Формирование заданий для подрядчиков
async function createAssignments(assignmentData: any, userId: string): Promise<any> {
  console.log('Creating contractor assignments:', assignmentData);

  const assignments = [];
  
  for (const assignment of assignmentData.assignments) {
    try {
      // Получаем данные подрядчика
      const { data: contractor, error } = await supabase
        .from('contractor_profiles')
        .select('*')
        .eq('id', assignment.contractor_id)
        .single();

      if (error || !contractor) {
        assignments.push({
          contractor_id: assignment.contractor_id,
          success: false,
          error: 'Подрядчик не найден'
        });
        continue;
      }

      // Генерируем техническое задание
      const taskDescription = await generateTaskDescription(assignment, assignmentData.project_info);
      
      // Создаем задачу в системе
      const { data: task, error: taskError } = await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          client_id: assignmentData.project_info?.client_id,
          title: assignment.title || `Задание для ${contractor.company_name}`,
          description: taskDescription,
          assignee: contractor.company_name,
          status: 'pending',
          priority: assignment.priority || 'medium',
          due_date: assignment.due_date,
          category: 'contractor_assignment',
          ai_agent: 'ai-contractor-manager'
        })
        .select()
        .single();

      if (taskError) {
        assignments.push({
          contractor_id: assignment.contractor_id,
          success: false,
          error: 'Ошибка создания задачи: ' + taskError.message
        });
        continue;
      }

      // Отправляем задание подрядчику
      const notificationSent = await sendAssignmentNotification(contractor, task, taskDescription);

      // Логируем создание задания
      await logContractorAssignment(userId, contractor.id, task.id, {
        work_type: assignment.work_type,
        task_description: taskDescription
      });

      assignments.push({
        contractor_id: assignment.contractor_id,
        contractor_name: contractor.company_name,
        task_id: task.id,
        success: true,
        sent_at: new Date().toISOString(),
        notification_sent: notificationSent
      });

    } catch (error) {
      assignments.push({
        contractor_id: assignment.contractor_id,
        success: false,
        error: error.message
      });
    }
  }

  return {
    success: true,
    assignments_created: assignments.filter(a => a.success).length,
    total_assignments: assignments.length,
    results: assignments
  };
}

// Контроль сроков выполнения
async function trackProgress(projectId: string, userId: string): Promise<any> {
  console.log('Tracking contractor progress for project:', projectId);

  // Получаем все задачи подрядчиков для проекта
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('category', 'contractor_assignment')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Ошибка получения задач: ' + error.message);
  }

  // Анализируем статус выполнения
  const progress = analyzeTaskProgress(tasks || []);
  
  // Генерируем рекомендации по управлению
  const recommendations = generateProgressRecommendations(tasks || []);

  // Определяем проблемные зоны
  const alerts = findProgressAlerts(tasks || []);

  return {
    success: true,
    total_tasks: tasks?.length || 0,
    progress: progress,
    recommendations: recommendations,
    alerts: alerts,
    detailed_tasks: tasks?.map(task => ({
      ...task,
      days_since_created: Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      overdue: task.due_date && new Date(task.due_date) < new Date()
    }))
  };
}

// Генерация рекомендаций по подрядчикам
async function generateContractorRecommendations(workTypes: string[], existingContractors: any[]) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    return generateDefaultContractorRecommendations(workTypes, existingContractors);
  }

  const systemPrompt = `Ты - эксперт по поиску и управлению подрядчиками в ландшафтном дизайне.
Дай рекомендации по поиску подрядчиков для указанных видов работ.

РЕКОМЕНДАЦИИ ДОЛЖНЫ ВКЛЮЧАТЬ:
1. Где искать подрядчиков для каждого вида работ
2. На что обратить внимание при выборе
3. Критерии оценки качества работы
4. Вопросы для собеседования`;

  const userPrompt = `
ВИДЫ РАБОТ: ${workTypes.join(', ')}

НАЙДЕННЫЕ ПОДРЯДЧИКИ:
${existingContractors.map(c => 
  `${c.company_name} - ${c.specialization.join(', ')} (рейтинг: ${c.rating}, опыт: ${c.experience_years} лет)`
).join('\n')}

Дай рекомендации по поиску и выбору подрядчиков.`;

  try {
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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();
    return {
      ai_recommendations: data.choices[0].message.content,
      search_channels: generateSearchChannels(workTypes),
      missing_specializations: findMissingSpecializations(workTypes, existingContractors)
    };
  } catch (error) {
    console.error('Error generating AI recommendations:', error);
    return generateDefaultContractorRecommendations(workTypes, existingContractors);
  }
}

// Генерация технического задания
async function generateTaskDescription(assignment: any, projectInfo: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openaiApiKey) {
    return generateDefaultTaskDescription(assignment, projectInfo);
  }

  const systemPrompt = `Ты - менеджер проектов в ландшафтном дизайне. 
Создай детальное техническое задание для подрядчика.

СТРУКТУРА ТЗ:
1. Описание проекта
2. Конкретные работы для выполнения
3. Технические требования
4. Сроки выполнения
5. Требования к качеству
6. Условия приемки работ`;

  const userPrompt = `
ИНФОРМАЦИЯ О ПРОЕКТЕ:
${projectInfo ? JSON.stringify(projectInfo, null, 2) : 'Базовый проект ландшафтного дизайна'}

ЗАДАНИЕ ДЛЯ ПОДРЯДЧИКА:
Вид работ: ${assignment.work_type}
Описание: ${assignment.description || 'Требует уточнения'}
Площадь: ${assignment.area || 'не указана'}
Сроки: ${assignment.due_date ? new Date(assignment.due_date).toLocaleDateString('ru-RU') : 'по договоренности'}
Приоритет: ${assignment.priority || 'средний'}

Создай подробное техническое задание.`;

  try {
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
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.6,
        max_tokens: 1200,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating task description:', error);
    return generateDefaultTaskDescription(assignment, projectInfo);
  }
}

// Анализ прогресса выполнения задач
function analyzeTaskProgress(tasks: any[]) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const inProgress = tasks.filter(t => t.status === 'in-progress').length;
  const pending = tasks.filter(t => t.status === 'pending').length;
  const overdue = tasks.filter(t => t.due_date && new Date(t.due_date) < new Date()).length;

  return {
    total_tasks: total,
    completed: completed,
    in_progress: inProgress,
    pending: pending,
    overdue: overdue,
    completion_rate: total > 0 ? Math.round((completed / total) * 100) : 0,
    overdue_rate: total > 0 ? Math.round((overdue / total) * 100) : 0
  };
}

// Генерация рекомендаций по управлению прогрессом
function generateProgressRecommendations(tasks: any[]) {
  const recommendations = [];
  const now = new Date();

  // Анализ просроченных задач
  const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now);
  if (overdueTasks.length > 0) {
    recommendations.push(`Внимание: ${overdueTasks.length} просроченных задач требуют немедленного контроля`);
  }

  // Анализ долгих задач
  const longRunningTasks = tasks.filter(t => {
    const daysSinceCreated = Math.floor((now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCreated > 14 && t.status !== 'completed';
  });
  
  if (longRunningTasks.length > 0) {
    recommendations.push(`${longRunningTasks.length} задач выполняются более 2 недель - рекомендуется провести ревизию`);
  }

  // Рекомендации по приоритетам
  const highPriorityPending = tasks.filter(t => t.priority === 'high' && t.status === 'pending');
  if (highPriorityPending.length > 0) {
    recommendations.push(`${highPriorityPending.length} высокоприоритетных задач ожидают назначения`);
  }

  return recommendations;
}

// Поиск проблемных зон
function findProgressAlerts(tasks: any[]) {
  const alerts = [];
  const now = new Date();

  tasks.forEach(task => {
    const daysSinceCreated = Math.floor((now.getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24));
    
    if (task.due_date && new Date(task.due_date) < now) {
      alerts.push({
        type: 'overdue',
        task_id: task.id,
        message: `Задача "${task.title}" просрочена на ${Math.floor((now.getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24))} дней`,
        severity: 'high'
      });
    }
    
    if (daysSinceCreated > 7 && task.status === 'pending') {
      alerts.push({
        type: 'stalled',
        task_id: task.id,
        message: `Задача "${task.title}" не начата уже ${daysSinceCreated} дней`,
        severity: 'medium'
      });
    }
  });

  return alerts;
}

// Вспомогательные функции
function generateDefaultContractorRecommendations(workTypes: string[], existingContractors: any[]) {
  return {
    search_channels: generateSearchChannels(workTypes),
    missing_specializations: findMissingSpecializations(workTypes, existingContractors),
    general_advice: 'Рекомендуется проверять портфолио и отзывы перед наймом подрядчиков'
  };
}

function generateSearchChannels(workTypes: string[]) {
  const channels: { [key: string]: string[] } = {
    'благоустройство': ['Авито', 'Профи.ру', 'Строительные порталы'],
    'озеленение': ['Специализированные форумы', 'Ландшафтные ассоциации'],
    'мощение': ['Строительные компании', 'Камнеобрабатывающие предприятия'],
    'водоемы': ['Специализированные подрядчики', 'Компании по бассейнам']
  };

  const result: { [key: string]: string[] } = {};
  workTypes.forEach(workType => {
    const key = Object.keys(channels).find(k => 
      workType.toLowerCase().includes(k) || k.includes(workType.toLowerCase())
    );
    if (key) {
      result[workType] = channels[key];
    } else {
      result[workType] = ['Авито', 'Профи.ру', 'Строительные порталы', 'Рекомендации клиентов'];
    }
  });

  return result;
}

function findMissingSpecializations(requestedTypes: string[], existingContractors: any[]) {
  const existingSpecs = new Set(
    existingContractors.flatMap(c => c.specialization.map((s: string) => s.toLowerCase()))
  );

  return requestedTypes.filter(type => 
    !Array.from(existingSpecs).some(existing => 
      existing.includes(type.toLowerCase()) || type.toLowerCase().includes(existing)
    )
  );
}

function generateDefaultTaskDescription(assignment: any, projectInfo: any) {
  return `
# Техническое задание

## Вид работ: ${assignment.work_type}

## Описание проекта:
${projectInfo?.description || 'Проект ландшафтного дизайна и благоустройства территории'}

## Задачи для выполнения:
${assignment.description || 'Выполнение работ согласно проектной документации'}

## Технические требования:
- Соблюдение технологии выполнения работ
- Использование качественных материалов
- Соблюдение техники безопасности

## Сроки выполнения:
${assignment.due_date ? `До ${new Date(assignment.due_date).toLocaleDateString('ru-RU')}` : 'По договоренности'}

## Приемка работ:
- Визуальный контроль качества
- Соответствие техническому заданию
- Подписание акта выполненных работ

## Контактная информация:
Все вопросы решаются через менеджера проекта.
  `.trim();
}

async function sendAssignmentNotification(contractor: any, task: any, taskDescription: string): Promise<boolean> {
  console.log('Sending assignment notification to:', contractor.company_name);
  // В реальной системе здесь будет отправка уведомления
  return true;
}

async function logContractorAssignment(userId: string, contractorId: string, taskId: string, details: any) {
  await supabase.from('voice_command_history').insert({
    user_id: userId,
    transcript: `Создание задания для подрядчика`,
    status: 'completed',
    actions: [{ 
      type: 'contractor_assignment',
      contractor_id: contractorId,
      task_id: taskId,
      details 
    }]
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('AI Contractor Manager request:', { action });

    // Аутентификация
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user.user) {
      throw new Error('Authentication failed');
    }

    const userId = user.user.id;
    let result;

    switch (action) {
      case 'find_contractors':
        result = await findContractors(data.work_types, userId);
        break;
        
      case 'create_assignments':
        result = await createAssignments(data, userId);
        break;
        
      case 'track_progress':
        result = await trackProgress(data.project_id, userId);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-contractor-manager function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});