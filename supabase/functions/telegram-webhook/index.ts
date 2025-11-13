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

      // 1. Найти или создать канал Telegram
      let { data: channel } = await supabase
        .from('channels')
        .select('id')
        .eq('user_id', crm_user_id)
        .eq('type', 'telegram')
        .single();

      if (!channel) {
        const { data: newChannel } = await supabase
          .from('channels')
          .insert({
            user_id: crm_user_id,
            type: 'telegram',
            name: 'Telegram',
            is_active: true,
            credentials: { bot_token: botToken }
          })
          .select('id')
          .single();
        channel = newChannel;
      }

      if (!channel) {
        console.error('Не удалось создать канал');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 1.5. Найти или создать channel_account для бота
      let { data: channelAccount } = await supabase
        .from('channel_accounts')
        .select('id')
        .eq('channel_id', channel.id)
        .single();

      if (!channelAccount) {
        const { data: newChannelAccount } = await supabase
          .from('channel_accounts')
          .insert({
            channel_id: channel.id,
            display_name: 'Telegram Bot',
            external_account_id: botToken.split(':')[0]
          })
          .select('id')
          .single();
        channelAccount = newChannelAccount;
      }

      if (!channelAccount) {
        console.error('Не удалось создать channel_account');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 2. Найти или создать контакт
      let { data: contactIdentity } = await supabase
        .from('contact_identities')
        .select('contact_id, contacts(*)')
        .eq('channel_id', channel.id)
        .eq('external_user_id', userId)
        .single();

      let contact;
      if (!contactIdentity) {
        // Создаем новый контакт
        const { data: newContact } = await supabase
          .from('contacts')
          .insert({
            user_id: crm_user_id,
            name: userName,
            phone: '',
          })
          .select()
          .single();

        if (newContact) {
          // Создаем identity
          await supabase
            .from('contact_identities')
            .insert({
              contact_id: newContact.id,
              channel_id: channel.id,
              external_user_id: userId,
              meta: { username: userName, chat_id: chatId }
            });
          contact = newContact;
        }
      } else {
        contact = contactIdentity.contacts;
      }

      if (!contact) {
        console.error('Не удалось создать контакт');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Найти или создать conversation
      let { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('contact_id', contact.id)
        .eq('channel_id', channel.id)
        .single();

      if (!conversation) {
        const { data: newConversation, error: convError } = await supabase
          .from('conversations')
          .insert({
            contact_id: contact.id,
            channel_id: channel.id,
            channel_account_id: channelAccount.id,
            status: 'open',
            last_message_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        if (convError) {
          console.error('Ошибка создания conversation:', convError);
        }
        conversation = newConversation;
      }

      if (!conversation) {
        console.error('Не удалось создать conversation');
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 4. Сохранить входящее сообщение
      const { data: incomingMessage } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          direction: 'inbound',
          provider: 'telegram',
          provider_message_id: update.message.message_id?.toString(),
          text: messageText,
          status: 'received',
          sent_at: new Date(update.message.date * 1000).toISOString(),
          payload: { chat_id: chatId, from: update.message.from }
        })
        .select('id')
        .single();

      console.log('Входящее сообщение сохранено:', incomingMessage?.id);

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

        // 5. Сохранить исходящее сообщение
        if (result.ok && conversation) {
          await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              direction: 'outbound',
              provider: 'telegram',
              provider_message_id: result.result?.message_id?.toString(),
              text: responseText,
              status: 'sent',
              sent_at: new Date().toISOString(),
              author_user_id: crm_user_id,
              payload: result.result
            });

          // Обновляем время последнего сообщения в conversation
          await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation.id);
        }
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
