import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ConfirmationEmailRequest {
  email: string;
  confirmationUrl: string;
  type: 'signup' | 'recovery' | 'invite';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting confirmation email sending process");

    // Get user from auth header
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const { email, confirmationUrl, type = 'signup' }: ConfirmationEmailRequest = await req.json();

    if (!email || !confirmationUrl) {
      return new Response(
        JSON.stringify({ error: "Email and confirmation URL are required" }),
        { status: 400, headers: corsHeaders }
      );
    }

    console.log(`Sending ${type} confirmation email to: ${email}`);

    // Email content based on type
    let subject = "Подтвердите ваш email";
    let htmlContent = "";

    switch (type) {
      case 'signup':
        subject = "Добро пожаловать! Подтвердите ваш аккаунт";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Добро пожаловать в CRM Garden!</h1>
            <p style="color: #666; font-size: 16px;">
              Спасибо за регистрацию! Для завершения создания аккаунта, пожалуйста, подтвердите ваш email адрес.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background-color: #007bff; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Подтвердить Email
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              Если кнопка не работает, скопируйте и вставьте эту ссылку в ваш браузер:<br>
              <a href="${confirmationUrl}" style="color: #007bff;">${confirmationUrl}</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Если вы не регистрировались на нашем сайте, проигнорируйте это письмо.
            </p>
          </div>
        `;
        break;

      case 'recovery':
        subject = "Восстановление пароля";
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Восстановление пароля</h1>
            <p style="color: #666; font-size: 16px;">
              Вы запросили восстановление пароля для вашего аккаунта в CRM Garden.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background-color: #dc3545; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Сбросить пароль
              </a>
            </div>
            <p style="color: #999; font-size: 14px;">
              Если кнопка не работает, скопируйте и вставьте эту ссылку в ваш браузер:<br>
              <a href="${confirmationUrl}" style="color: #dc3545;">${confirmationUrl}</a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">
              Если вы не запрашивали восстановление пароля, проигнорируйте это письмо.
            </p>
          </div>
        `;
        break;

      default:
        htmlContent = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #333; text-align: center;">Подтверждение действия</h1>
            <p style="color: #666; font-size: 16px;">
              Для подтверждения действия перейдите по ссылке ниже:
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${confirmationUrl}" 
                 style="background-color: #28a745; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 5px; display: inline-block;">
                Подтвердить
              </a>
            </div>
          </div>
        `;
    }

    const emailResponse = await resend.emails.send({
      from: "CRM Garden <noreply@crmgarden.rese>",
      to: [email],
      subject: subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ 
      success: true, 
      messageId: emailResponse.data?.id 
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });

  } catch (error: any) {
    console.error("Error in send-confirmation-email function:", error);
    return new Response(
      JSON.stringify({ 
        error: "Failed to send email",
        details: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);