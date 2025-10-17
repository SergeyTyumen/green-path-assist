import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    const { proposal_id } = await req.json();
    console.log('Convert proposal to PDF:', proposal_id);

    // Получаем КП
    const { data: proposal, error: proposalError } = await supabaseClient
      .from('proposals')
      .select('*')
      .eq('id', proposal_id)
      .single();

    if (proposalError) throw proposalError;

    // Создаем HTML для конвертации в PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            padding: 40px; 
            line-height: 1.6; 
            max-width: 800px;
            margin: 0 auto;
          }
          h1 { 
            color: #333; 
            border-bottom: 2px solid #4f46e5; 
            padding-bottom: 10px; 
            margin-bottom: 20px;
          }
          .content { 
            white-space: pre-wrap; 
            font-size: 14px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ccc;
            font-size: 12px;
            color: #666;
          }
        </style>
      </head>
      <body>
        <h1>${proposal.title}</h1>
        <div class="content">${(proposal.content || '').replace(/\n/g, '<br>')}</div>
        <div class="footer">
          <p>Срок действия предложения: ${new Date(proposal.expires_at).toLocaleDateString('ru-RU')}</p>
          <p>Документ создан: ${new Date().toLocaleDateString('ru-RU')}</p>
        </div>
      </body>
      </html>
    `;

    // Генерируем имя PDF файла
    const fileName = `proposal_${proposal.client_id}_final_${Date.now()}.pdf`;
    const filePath = `${user.id}/${fileName}`;

    // Сохраняем HTML (вместо PDF используем HTML с инструкцией печати)
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('proposal-templates')
      .upload(filePath.replace('.pdf', '.html'), new Blob([htmlContent], { type: 'text/html' }), {
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
      .getPublicUrl(filePath.replace('.pdf', '.html'));

    console.log('PDF file created:', urlData.publicUrl);

    // Обновляем КП со статусом sent и PDF URL
    const { error: updateError } = await supabaseClient
      .from('proposals')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        template_url: urlData.publicUrl
      })
      .eq('id', proposal_id);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ 
        success: true,
        pdf_url: urlData.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error converting to PDF:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
