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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
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
      `${item.description || 'Услуга'} - ${item.quantity} шт. × ${item.unit_price?.toLocaleString('ru-RU')} ₽ = ${item.total?.toLocaleString('ru-RU')} ₽`
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

    // Заполняем шаблон
    let content = template.content || '';
    Object.entries(replacements).forEach(([key, value]) => {
      content = content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    // Создаём HTML для PDF (простой вариант без библиотек)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; }
          h1 { color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px; }
          .content { white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <h1>${requestData.title}</h1>
        <div class="content">${content.replace(/\n/g, '<br>')}</div>
      </body>
      </html>
    `;

    // Генерируем имя файла
    const fileName = `proposal_${requestData.client_id}_${Date.now()}.html`;
    const filePath = `${user.id}/${fileName}`;

    // Сохраняем HTML файл (для просмотра как PDF через принт)
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('proposal-templates')
      .upload(filePath, new Blob([htmlContent], { type: 'text/html' }), {
        contentType: 'text/html',
        upsert: true
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    // Получаем публичный URL
    const { data: urlData } = supabaseClient.storage
      .from('proposal-templates')
      .getPublicUrl(filePath);

    console.log('File uploaded:', urlData.publicUrl);

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
        template_url: urlData.publicUrl,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (proposalError) {
      console.error('Proposal creation error:', proposalError);
      throw proposalError;
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        proposal,
        file_url: urlData.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

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
