import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface SendDocumentRequest {
  recipientType: 'client' | 'user';
  recipientId: string;
  documentType: 'proposal' | 'estimate' | 'technical_specification' | 'contract';
  documentId: string;
  sendMethod: 'email' | 'telegram' | 'whatsapp';
  recipientContact: string;
  message?: string;
  documentTitle: string;
}

async function logDocumentSend(
  userId: string,
  sendData: SendDocumentRequest,
  status: 'pending' | 'sent' | 'failed',
  errorMessage?: string
) {
  try {
    await supabase.from('document_sends').insert({
      user_id: userId,
      recipient_type: sendData.recipientType,
      recipient_id: sendData.recipientId,
      document_type: sendData.documentType,
      document_id: sendData.documentId,
      send_method: sendData.sendMethod,
      recipient_contact: sendData.recipientContact,
      status: status,
      sent_at: status === 'sent' ? new Date().toISOString() : null,
      error_message: errorMessage
    });
  } catch (error) {
    console.error('Error logging document send:', error);
  }
}

async function sendEmail(
  recipientEmail: string,
  documentTitle: string,
  documentType: string,
  message?: string
) {
  // Здесь должна быть интеграция с почтовой службой (например, Resend)
  // Пока что имитируем отправку
  console.log(`Sending email to ${recipientEmail}:`);
  console.log(`Subject: ${documentTitle}`);
  console.log(`Document type: ${documentType}`);
  console.log(`Message: ${message || 'No additional message'}`);
  
  // Имитация задержки отправки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, messageId: `email_${Date.now()}` };
}

async function sendTelegram(
  username: string,
  documentTitle: string,
  documentType: string,
  message?: string
) {
  // Здесь должна быть интеграция с Telegram Bot API
  // Пока что имитируем отправку
  console.log(`Sending Telegram message to ${username}:`);
  console.log(`Document: ${documentTitle} (${documentType})`);
  console.log(`Message: ${message || 'No additional message'}`);
  
  // Имитация задержки отправки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, messageId: `telegram_${Date.now()}` };
}

async function sendWhatsApp(
  phoneNumber: string,
  documentTitle: string,
  documentType: string,
  message?: string
) {
  // Здесь должна быть интеграция с WhatsApp Business API
  // Пока что имитируем отправку
  console.log(`Sending WhatsApp message to ${phoneNumber}:`);
  console.log(`Document: ${documentTitle} (${documentType})`);
  console.log(`Message: ${message || 'No additional message'}`);
  
  // Имитация задержки отправки
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, messageId: `whatsapp_${Date.now()}` };
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Получаем пользователя из токена
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid auth token');
    }

    const sendData: SendDocumentRequest = await req.json();

    console.log('Sending document:', {
      user: user.id,
      ...sendData
    });

    // Логируем попытку отправки
    await logDocumentSend(user.id, sendData, 'pending');

    let sendResult;

    try {
      // Выбираем способ отправки
      switch (sendData.sendMethod) {
        case 'email':
          sendResult = await sendEmail(
            sendData.recipientContact,
            sendData.documentTitle,
            sendData.documentType,
            sendData.message
          );
          break;

        case 'telegram':
          sendResult = await sendTelegram(
            sendData.recipientContact,
            sendData.documentTitle,
            sendData.documentType,
            sendData.message
          );
          break;

        case 'whatsapp':
          sendResult = await sendWhatsApp(
            sendData.recipientContact,
            sendData.documentTitle,
            sendData.documentType,
            sendData.message
          );
          break;

        default:
          throw new Error(`Unsupported send method: ${sendData.sendMethod}`);
      }

      if (sendResult.success) {
        // Обновляем статус на "отправлено"
        await supabase
          .from('document_sends')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('document_id', sendData.documentId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1);

        return new Response(
          JSON.stringify({
            success: true,
            messageId: sendResult.messageId,
            method: sendData.sendMethod,
            recipient: sendData.recipientContact
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
      } else {
        throw new Error('Failed to send document');
      }

    } catch (sendError: any) {
      // Логируем ошибку отправки
      await logDocumentSend(user.id, sendData, 'failed', sendError.message);
      throw sendError;
    }

  } catch (error: any) {
    console.error('Error in send-document function:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Unknown error occurred'
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);