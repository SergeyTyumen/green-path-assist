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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('WhatsApp webhook called:', req.method);
    
    // Verify webhook для первоначальной настройки
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');
      
      console.log('Webhook verification:', { mode, token, challenge });
      
      if (mode === 'subscribe' && token === 'whatsapp_verify_token') {
        return new Response(challenge, { status: 200 });
      } else {
        return new Response('Verification failed', { status: 403 });
      }
    }

    // Обработка входящих сообщений
    if (req.method === 'POST') {
      const body = await req.json();
      console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

      // Проверяем, что это сообщение от WhatsApp
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry || []) {
          for (const change of entry.changes || []) {
            if (change.field === 'messages') {
              const value = change.value;
              
              // Обрабатываем входящие сообщения
              for (const message of value.messages || []) {
                await handleIncomingMessage(message, value.metadata);
              }
            }
          }
        }
      }

      return new Response('OK', { status: 200 });
    }

    return new Response('Method not allowed', { status: 405 });
  } catch (error) {
    console.error('Error in WhatsApp webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleIncomingMessage(message: any, metadata: any) {
  try {
    console.log('Processing message:', message);
    
    // Извлекаем информацию о сообщении
    const fromNumber = message.from;
    const messageId = message.id;
    const timestamp = new Date(parseInt(message.timestamp) * 1000);
    
    let messageText = '';
    if (message.type === 'text') {
      messageText = message.text.body;
    } else {
      messageText = `[${message.type} message]`;
    }

    console.log('Message details:', { fromNumber, messageText, messageId });

    // Находим пользователя по номеру телефона WhatsApp
    const { data: profile } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('whatsapp_number', fromNumber)
      .single();

    let userId = profile?.user_id;

    // Если пользователь не найден, создаем новый контакт
    if (!userId) {
      // Получаем первого админа как владельца контакта
      const { data: adminUser } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
        .limit(1)
        .single();

      if (adminUser) {
        userId = adminUser.user_id;
        
        // Создаем новый контакт
        await supabase
          .from('contacts')
          .insert({
            user_id: userId,
            name: `WhatsApp ${fromNumber}`,
            phone: fromNumber,
            whatsapp_number: fromNumber
          });
      }
    }

    if (userId) {
      // Генерируем ответ с помощью ИИ-консультанта
      const aiResponse = await generateAIResponse(messageText, userId);
      
      // Отправляем ответ в WhatsApp
      await sendWhatsAppMessage(fromNumber, aiResponse, userId);
      
      // Сохраняем историю переписки
      await saveConversationHistory(userId, messageText, aiResponse, 'whatsapp', fromNumber);
    }

  } catch (error) {
    console.error('Error handling incoming message:', error);
  }
}

async function generateAIResponse(message: string, userId: string): Promise<string> {
  try {
    // Вызываем существующий ИИ-консультант
    const response = await supabase.functions.invoke('ai-consultant', {
      body: {
        question: message,
        context: {
          source: 'whatsapp',
          timestamp: new Date().toISOString()
        }
      }
    });

    if (response.error) {
      console.error('AI consultant error:', response.error);
      return 'Извините, сейчас возникли технические трудности. Свяжитесь с нами по телефону для получения консультации.';
    }

    return response.data?.response || 'Спасибо за ваше сообщение. Наш менеджер свяжется с вами в ближайшее время.';
  } catch (error) {
    console.error('Error generating AI response:', error);
    return 'Извините, сейчас возникли технические трудности. Свяжитесь с нами по телефону для получения консультации.';
  }
}

async function sendWhatsAppMessage(toNumber: string, message: string, userId: string) {
  try {
    // Получаем настройки WhatsApp для пользователя
    const { data: settings } = await supabase
      .from('integration_settings')
      .select('settings')
      .eq('user_id', userId)
      .eq('integration_type', 'whatsapp')
      .single();

    if (!settings?.settings?.access_token || !settings?.settings?.phone_number_id) {
      console.error('WhatsApp settings not found for user:', userId);
      return;
    }

    const accessToken = settings.settings.access_token;
    const phoneNumberId = settings.settings.phone_number_id;

    const whatsappApiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    const response = await fetch(whatsappApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber,
        type: 'text',
        text: {
          body: message
        }
      })
    });

    const result = await response.json();
    console.log('WhatsApp message sent:', result);

    if (!response.ok) {
      console.error('Failed to send WhatsApp message:', result);
    }

  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
  }
}

async function saveConversationHistory(
  userId: string,
  userMessage: string,
  aiResponse: string,
  source: string,
  contactInfo: string
) {
  try {
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: userId,
        transcript: userMessage,
        response: aiResponse,
        conversation_context: {
          source,
          contact_info: contactInfo,
          timestamp: new Date().toISOString()
        },
        status: 'completed'
      });
  } catch (error) {
    console.error('Error saving conversation history:', error);
  }
}