import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function notifyAdminsOfNewRegistration(requestData: any) {
  try {
    // Получаем всех администраторов
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Получаем профили администраторов
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminUserIds)
      .not('email', 'is', null);

    if (profilesError) throw profilesError;

    console.log(`Notifying ${adminProfiles.length} administrators about new registration request`);
    
    // Отправляем email уведомления всем администраторам
    const emailPromises = adminProfiles.map(async (admin) => {
      try {
        const htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9f9f9; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <h1 style="color: #2563eb; text-align: center; margin-bottom: 30px;">
                🔔 Новая заявка на регистрацию
              </h1>
              
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                <h2 style="color: #374151; margin-top: 0;">Информация о заявителе:</h2>
                <p style="margin: 10px 0;"><strong>Имя:</strong> ${requestData.full_name}</p>
                <p style="margin: 10px 0;"><strong>Email:</strong> ${requestData.email}</p>
                <p style="margin: 10px 0;"><strong>Дата подачи:</strong> ${new Date().toLocaleDateString('ru-RU')}</p>
              </div>

              ${requestData.message ? `
                <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                  <h3 style="color: #92400e; margin-top: 0;">Сообщение от заявителя:</h3>
                  <p style="color: #92400e; font-style: italic; margin: 0;">"${requestData.message}"</p>
                </div>
              ` : ''}

              <div style="text-align: center; margin-top: 30px;">
                <p style="color: #6b7280; margin-bottom: 20px;">
                  Войдите в админ-панель для обработки заявки:
                </p>
                <a href="${Deno.env.get('SUPABASE_URL') || 'https://your-app.com'}/user-management" 
                   style="background-color: #2563eb; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                  Перейти в админ-панель
                </a>
              </div>

              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
                  Это автоматическое уведомление из CRM Garden.<br>
                  Получатель: ${admin.full_name || admin.email}
                </p>
              </div>
            </div>
          </div>
        `;

        const emailResponse = await resend.emails.send({
          from: "CRM Garden <noreply@crmgarden.ru>",
          to: [admin.email],
          subject: `🔔 Новая заявка на регистрацию от ${requestData.full_name}`,
          html: htmlContent,
        });

        console.log(`Email sent successfully to ${admin.email}:`, emailResponse);
        return { admin: admin.email, success: true, messageId: emailResponse.data?.id };
      } catch (error) {
        console.error(`Failed to send email to ${admin.email}:`, error);
        return { admin: admin.email, success: false, error: error.message };
      }
    });

    const emailResults = await Promise.all(emailPromises);
    const successfulEmails = emailResults.filter(result => result.success).length;
    const failedEmails = emailResults.filter(result => !result.success);

    console.log(`Email notification results: ${successfulEmails} successful, ${failedEmails.length} failed`);
    
    if (failedEmails.length > 0) {
      console.error('Failed email notifications:', failedEmails);
    }

    return { 
      success: true, 
      notifiedAdmins: adminProfiles.length,
      emailsSent: successfulEmails,
      emailsFailed: failedEmails.length,
      results: emailResults
    };
  } catch (error) {
    console.error('Error notifying admins:', error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    switch (type) {
      case 'new_registration_request':
        const result = await notifyAdminsOfNewRegistration(data);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown notification type' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
    }
  } catch (error: any) {
    console.error('Error in notify-admin function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);