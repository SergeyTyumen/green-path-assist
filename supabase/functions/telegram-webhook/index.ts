import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const update = await req.json();
    console.log('Telegram webhook получен:', JSON.stringify(update, null, 2));

    // Обработка текстового сообщения
    if (update.message?.text) {
      const chatId = update.message.chat.id;
      const messageText = update.message.text;
      const userId = update.message.from.id.toString();
      const userName = update.message.from.username || update.message.from.first_name;

      console.log(`Сообщение от ${userName} (${userId}): ${messageText}`);

      // Получаем ВСЕ активные настройки Telegram (у нас может быть несколько пользователей с ботами)
      const { data: allSettings } = await supabase
        .from('integration_settings')
        .select('user_id, settings')
        .eq('integration_type', 'telegram')
        .eq('is_active', true);

      if (!allSettings || allSettings.length === 0) {
        console.error('Нет активных Telegram интеграций');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Берем первую активную интеграцию (в будущем можно добавить маппинг bot -> user)
      const settings = allSettings[0];

      const botToken = settings.settings?.bot_token;
      const crm_user_id = settings.user_id;

      console.log(`Используем CRM user_id: ${crm_user_id}`);

      if (!botToken) {
        console.error('Telegram bot token не найден');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Сохраняем историю сообщения
      await supabase.from('voice_command_history').insert({
        user_id: crm_user_id,
        command_text: messageText,
        command_type: 'telegram_message',
        status: 'pending',
        metadata: {
          chat_id: chatId,
          telegram_user_id: userId,
          telegram_username: userName
        }
      });

      // Вызываем AI консультанта (передаем user_id CRM, а не telegram user_id)
      const { data: consultantResponse, error: consultantError } = await supabase.functions.invoke(
        'ai-consultant',
        {
          body: {
            question: messageText,
            user_id: crm_user_id,
            context: {
              channel: 'telegram',
              chat_id: chatId,
              user_name: userName,
              telegram_user_id: userId
            },
            auto_send: false // Отправим сами через Telegram API
          }
        }
      );

      if (consultantError) {
        console.error('Ошибка AI консультанта:', consultantError);
        
        // Отправляем сообщение об ошибке пользователю
        await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: 'Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.',
          }),
        });

        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Ответ AI консультанта получен:', consultantResponse);

      // Отправляем ответ через Telegram
      if (consultantResponse?.response) {
        const responseText = typeof consultantResponse.response === 'string' 
          ? consultantResponse.response 
          : consultantResponse.response.answer || 'Извините, не смог сформировать ответ.';

        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: responseText,
            parse_mode: 'Markdown'
          }),
        });

        const result = await telegramResponse.json();
        console.log('Telegram отправка:', result);

        // Обновляем историю
        await supabase
          .from('voice_command_history')
          .update({
            status: 'completed',
            response_text: responseText,
            metadata: {
              chat_id: chatId,
              telegram_user_id: userId,
              telegram_username: userName,
              telegram_message_id: result.result?.message_id
            }
          })
          .eq('user_id', crm_user_id)
          .eq('command_text', messageText)
          .order('created_at', { ascending: false })
          .limit(1);
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Ошибка обработки webhook:', error);
    return new Response(JSON.stringify({ ok: true, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
