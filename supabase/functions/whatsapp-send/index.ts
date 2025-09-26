import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface WhatsAppSendRequest {
  to: string;
  message: string;
  type?: 'text' | 'template';
  template_name?: string;
  template_params?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { to, message, type = 'text', template_name, template_params }: WhatsAppSendRequest = await req.json();

    // Получаем аутентифицированного пользователя
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jwt = authHeader.replace('Bearer ', '');
    const { data: user } = await supabase.auth.getUser(jwt);

    if (!user.user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Получаем настройки WhatsApp для пользователя
    const { data: settings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('settings')
      .eq('user_id', user.user.id)
      .eq('integration_type', 'whatsapp')
      .single();

    if (settingsError || !settings?.settings?.access_token || !settings?.settings?.phone_number_id) {
      return new Response(JSON.stringify({ error: 'WhatsApp integration not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const accessToken = settings.settings.access_token;
    const phoneNumberId = settings.settings.phone_number_id;

    const whatsappApiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    let messageBody;

    if (type === 'template' && template_name) {
      messageBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'template',
        template: {
          name: template_name,
          language: {
            code: 'ru'
          },
          components: template_params ? [
            {
              type: 'body',
              parameters: template_params.map(param => ({
                type: 'text',
                text: param
              }))
            }
          ] : []
        }
      };
    } else {
      messageBody = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: message
        }
      };
    }

    console.log('Sending WhatsApp message:', messageBody);

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messageBody)
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('WhatsApp API error:', result);
      return new Response(JSON.stringify({ error: 'Failed to send message', details: result }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Сохраняем историю отправленного сообщения
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: user.user.id,
        transcript: `Отправлено в WhatsApp: ${to}`,
        response: message,
        conversation_context: {
          source: 'whatsapp_outbound',
          to: to,
          message_id: result.messages?.[0]?.id,
          timestamp: new Date().toISOString()
        },
        status: 'completed'
      });

    return new Response(JSON.stringify({
      success: true,
      message_id: result.messages?.[0]?.id,
      status: result.messages?.[0]?.message_status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in WhatsApp send function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});