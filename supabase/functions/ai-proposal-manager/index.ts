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

// Создание коммерческого предложения
async function createProposal(proposalData: any, userId: string): Promise<any> {
  console.log('Creating proposal for user:', userId);
  
  // Получаем данные клиента и сметы
  const [clientData, estimateData] = await Promise.all([
    getClientData(proposalData.client_id, userId),
    proposalData.estimate_id ? getEstimateData(proposalData.estimate_id, userId) : null
  ]);

  // Генерируем содержание КП с помощью ИИ
  const proposalContent = await generateProposalContent(proposalData, clientData, estimateData);
  
  // Создаем КП в базе данных
  const { data: proposal, error } = await supabase
    .from('proposals')
    .insert({
      user_id: userId,
      client_id: proposalData.client_id,
      title: proposalData.title || `КП для ${clientData?.name || 'клиента'}`,
      amount: proposalData.amount || estimateData?.total_amount || 0,
      status: 'draft',
      expires_at: proposalData.expires_at || getDefaultExpiryDate()
    })
    .select()
    .single();

  if (error) {
    throw new Error('Ошибка создания КП: ' + error.message);
  }

  // Сохраняем контент КП
  await saveProposalContent(proposal.id, proposalContent);

  return {
    success: true,
    proposal_id: proposal.id,
    content: proposalContent,
    status: 'created'
  };
}

// Автоотправка КП клиенту
async function sendProposal(proposalId: string, userId: string, sendOptions: any = {}): Promise<any> {
  console.log('Sending proposal:', proposalId);

  // Получаем данные КП и клиента
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select(`
      *,
      clients (
        id, name, email, phone
      )
    `)
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (proposalError || !proposal) {
    throw new Error('КП не найдено');
  }

  if (!proposal.clients?.email) {
    throw new Error('У клиента не указан email для отправки');
  }

  // Получаем контент КП
  const proposalContent = await getProposalContent(proposalId);

  // Генерируем сопроводительное письмо
  const emailContent = await generateEmailContent(proposal, proposalContent, sendOptions);

  // Имитируем отправку email (в реальной системе здесь будет интеграция с email-сервисом)
  const emailSent = await simulateEmailSending(proposal.clients.email, emailContent);

  if (emailSent) {
    // Обновляем статус КП
    await supabase
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString()
      })
      .eq('id', proposalId);

    // Логируем отправку
    await logProposalAction(userId, proposalId, 'sent', {
      email: proposal.clients.email,
      send_method: sendOptions.method || 'email'
    });

    return {
      success: true,
      status: 'sent',
      sent_to: proposal.clients.email,
      sent_at: new Date().toISOString()
    };
  } else {
    throw new Error('Ошибка отправки email');
  }
}

// Отслеживание статуса КП
async function trackProposalStatus(proposalId: string, userId: string): Promise<any> {
  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(`
      *,
      clients (
        id, name, phone, email
      )
    `)
    .eq('id', proposalId)
    .eq('user_id', userId)
    .single();

  if (error || !proposal) {
    throw new Error('КП не найдено');
  }

  // Получаем историю действий
  const { data: history } = await supabase
    .from('voice_command_history')
    .select('*')
    .contains('actions', [{ proposal_id: proposalId }])
    .order('created_at', { ascending: false });

  return {
    success: true,
    proposal,
    status_history: history || [],
    recommendations: generateStatusRecommendations(proposal)
  };
}

// Получение данных клиента
async function getClientData(clientId: string, userId: string) {
  if (!clientId) return null;
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching client:', error);
    return null;
  }

  return data;
}

// Получение данных сметы
async function getEstimateData(estimateId: string, userId: string) {
  const { data, error } = await supabase
    .from('estimates')
    .select(`
      *,
      estimate_items (*)
    `)
    .eq('id', estimateId)
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching estimate:', error);
    return null;
  }

  return data;
}

// Генерация содержания КП с помощью ИИ
async function generateProposalContent(proposalData: any, clientData: any, estimateData: any) {
  const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiApiKey) {
    return generateDefaultProposalContent(proposalData, clientData, estimateData);
  }

  const systemPrompt = `Ты - профессиональный менеджер по продажам ландшафтных услуг. 
Создай привлекательное коммерческое предложение на основе предоставленных данных.

СТРУКТУРА КП:
1. Персональное обращение к клиенту
2. Краткое описание понимания потребностей
3. Предлагаемые услуги и их преимущества  
4. Стоимость (если есть данные сметы)
5. Сроки выполнения
6. Гарантии и преимущества работы с нами
7. Призыв к действию

Стиль: Профессиональный, но дружелюбный. Фокус на выгодах для клиента.`;

  const userPrompt = `
ДАННЫЕ КЛИЕНТА:
${clientData ? `
Имя: ${clientData.name}
Телефон: ${clientData.phone}
Email: ${clientData.email || 'не указан'}
Адрес: ${clientData.address || 'не указан'}
Услуги: ${clientData.services?.join(', ') || 'не указаны'}
Примечания: ${clientData.notes || 'нет'}
` : 'Данные клиента не предоставлены'}

ДАННЫЕ СМЕТЫ:
${estimateData ? `
Название: ${estimateData.title}
Общая сумма: ${estimateData.total_amount} ₽
Количество позиций: ${estimateData.estimate_items?.length || 0}
` : 'Смета не предоставлена'}

ПАРАМЕТРЫ КП:
Заголовок: ${proposalData.title || 'Коммерческое предложение'}
Сумма: ${proposalData.amount || 'не указана'}

Создай коммерческое предложение.`;

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
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('Error generating proposal with AI:', error);
    return generateDefaultProposalContent(proposalData, clientData, estimateData);
  }
}

// Дефолтное содержание КП
function generateDefaultProposalContent(proposalData: any, clientData: any, estimateData: any) {
  return `
# Коммерческое предложение

Уважаемый ${clientData?.name || 'клиент'}!

Благодарим за обращение в нашу компанию по вопросам ландшафтного дизайна и благоустройства.

## Предлагаемые услуги:
${clientData?.services?.map((service: any) => `• ${service}`).join('\n') || '• Ландшафтные работы по индивидуальному проекту'}

## Стоимость работ:
${proposalData.amount ? `**${proposalData.amount.toLocaleString()} ₽**` : 'Рассчитывается индивидуально'}

## Наши преимущества:
• Опытная команда специалистов
• Качественные материалы
• Гарантия на выполненные работы
• Соблюдение сроков

Для уточнения деталей и заключения договора свяжитесь с нами удобным способом.

С уважением,
Команда ландшафтного дизайна
  `.trim();
}

// Остальные вспомогательные функции
function getDefaultExpiryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30); // +30 дней
  return date.toISOString();
}

async function saveProposalContent(proposalId: string, content: string) {
  // В реальной системе можно сохранять в отдельную таблицу или файловое хранилище
  console.log('Saving proposal content for:', proposalId);
}

async function getProposalContent(proposalId: string): Promise<string> {
  // Заглушка - в реальной системе получение из хранилища
  return "Контент коммерческого предложения";
}

async function generateEmailContent(proposal: any, proposalContent: string, sendOptions: any) {
  return `
Тема: ${proposal.title}

Добрый день, ${proposal.clients.name}!

Направляем Вам коммерческое предложение согласно нашей договоренности.

${proposalContent}

Предложение действительно до ${new Date(proposal.expires_at).toLocaleDateString('ru-RU')}.

С уважением,
Ваша команда
  `;
}

async function simulateEmailSending(email: string, content: string): Promise<boolean> {
  // Имитация отправки email
  console.log('Sending email to:', email);
  console.log('Content length:', content.length);
  return true; // В реальной системе здесь будет настоящая отправка
}

async function logProposalAction(userId: string, proposalId: string, action: string, details: any) {
  await supabase.from('voice_command_history').insert({
    user_id: userId,
    transcript: `Действие с КП: ${action}`,
    status: 'completed',
    actions: [{ 
      type: 'proposal_action',
      proposal_id: proposalId,
      action,
      details 
    }]
  });
}

function generateStatusRecommendations(proposal: any): string[] {
  const recommendations = [];
  const now = new Date();
  const sentDate = proposal.sent_at ? new Date(proposal.sent_at) : null;
  const expiryDate = new Date(proposal.expires_at);

  if (proposal.status === 'sent' && sentDate) {
    const daysSinceSent = Math.floor((now.getTime() - sentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceSent > 7) {
      recommendations.push('КП отправлено более недели назад - рекомендуется контрольный звонок');
    }
  }

  if (expiryDate < now) {
    recommendations.push('Срок действия КП истек - необходимо обновить предложение');
  }

  return recommendations;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();
    console.log('AI Proposal Manager request:', { action });

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
      case 'create_proposal':
        result = await createProposal(data, userId);
        break;
        
      case 'send_proposal':
        result = await sendProposal(data.proposal_id, userId, data.send_options);
        break;
        
      case 'track_status':
        result = await trackProposalStatus(data.proposal_id, userId);
        break;
        
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-proposal-manager function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Неизвестная ошибка',
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});