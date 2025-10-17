import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateProposalRequest {
  template_id: string;
  client_id: string;
  estimate_id: string;
  title: string;
  valid_days: number;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const requestData: GenerateProposalRequest = await req.json();
    console.log('Generate proposal request:', requestData);

    // Получаем данные клиента
    const { data: client, error: clientError } = await supabaseClient
      .from('clients')
      .select('*')
      .eq('id', requestData.client_id)
      .single();

    if (clientError) throw clientError;

    // Получаем данные сметы
    const { data: estimate, error: estimateError } = await supabaseClient
      .from('estimates')
      .select('*, estimate_items(*)')
      .eq('id', requestData.estimate_id)
      .single();

    if (estimateError) throw estimateError;

    // Получаем шаблон
    const { data: template, error: templateError } = await supabaseClient
      .from('templates')
      .select('*')
      .eq('id', requestData.template_id)
      .single();

    if (templateError) throw templateError;

    // Формируем данные для заполнения
    const services = estimate.estimate_items?.map((item: any) => 
      `${item.description || 'Услуга'} - ${item.quantity} шт. × ${item.unit_price} ₽ = ${item.total} ₽`
    ).join('\n') || '';

    const replacements: Record<string, string> = {
      client_name: client.name || '',
      client_phone: client.phone || '',
      client_email: client.email || '',
      client_address: client.address || '',
      amount: estimate.total_amount?.toLocaleString('ru-RU') || '0',
      date: new Date().toLocaleDateString('ru-RU'),
      services: services,
      estimate_details: estimate.title || '',
    };

    console.log('Replacements:', replacements);

    // Если шаблон - это текстовый контент
    if (template.content) {
      let content = template.content;
      Object.entries(replacements).forEach(([key, value]) => {
        content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      });

      // Создаём HTML для превью
      const htmlContent = content.replace(/\n/g, '<br>');

      // Создаём КП в базе
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + requestData.valid_days);

      const { data: proposal, error: proposalError } = await supabaseClient
        .from('proposals')
        .insert({
          user_id: user.id,
          client_id: requestData.client_id,
          title: requestData.title,
          status: 'draft',
          amount: estimate.total_amount || 0,
          content: content,
          expires_at: expiresAt.toISOString(),
        })
        .select()
        .single();

      if (proposalError) throw proposalError;

      return new Response(
        JSON.stringify({ 
          success: true, 
          proposal,
          preview_html: htmlContent
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Если шаблон - это файл (для будущего расширения)
    throw new Error('DOCX templates not yet implemented');

  } catch (error) {
    console.error('Error generating proposal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
