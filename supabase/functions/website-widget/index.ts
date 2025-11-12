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
    const { question, userId, sessionId, userName } = await req.json();
    console.log('Website widget message:', { question, userId, sessionId, userName });

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Найти или создать канал Website
    let { data: channel } = await supabase
      .from('channels')
      .select('id')
      .eq('user_id', userId)
      .eq('type', 'website')
      .single();

    if (!channel) {
      const { data: newChannel } = await supabase
        .from('channels')
        .insert({
          user_id: userId,
          type: 'website',
          name: 'Website Widget',
          is_active: true,
          credentials: {}
        })
        .select('id')
        .single();
      channel = newChannel;
    }

    if (!channel) {
      console.error('Не удалось создать канал');
      return new Response(
        JSON.stringify({ error: 'Failed to create channel' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Найти или создать контакт
    const contactName = userName || `Посетитель ${sessionId.substring(0, 8)}`;
    
    let { data: contactIdentity } = await supabase
      .from('contact_identities')
      .select('contact_id, contacts(*)')
      .eq('channel_id', channel.id)
      .eq('external_user_id', sessionId)
      .single();

    let contact;
    if (!contactIdentity) {
      // Создаем новый контакт
      const { data: newContact } = await supabase
        .from('contacts')
        .insert({
          user_id: userId,
          name: contactName,
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
            external_user_id: sessionId,
            meta: { session_id: sessionId, name: contactName }
          });
        contact = newContact;
      }
    } else {
      contact = contactIdentity.contacts;
    }

    if (!contact) {
      console.error('Не удалось создать контакт');
      return new Response(
        JSON.stringify({ error: 'Failed to create contact' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Найти или создать conversation
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contact.id)
      .eq('channel_id', channel.id)
      .single();

    if (!conversation) {
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          contact_id: contact.id,
          channel_id: channel.id,
          status: 'open',
          last_message_at: new Date().toISOString()
        })
        .select('id')
        .single();
      conversation = newConversation;
    }

    if (!conversation) {
      console.error('Не удалось создать conversation');
      return new Response(
        JSON.stringify({ error: 'Failed to create conversation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Сохранить входящее сообщение
    const { data: incomingMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        direction: 'inbound',
        provider: 'website',
        text: question,
        status: 'received',
        sent_at: new Date().toISOString(),
        payload: { session_id: sessionId }
      })
      .select('id')
      .single();

    console.log('Входящее сообщение сохранено:', incomingMessage?.id);

    // 5. Вызываем AI консультанта
    const { data: consultantResponse, error: consultantError } = await supabase.functions.invoke(
      'ai-consultant',
      {
        body: {
          question,
          user_id: userId,
          context: {
            channel: 'website',
            session_id: sessionId,
            contact_name: contactName
          },
          auto_send: false
        }
      }
    );

    if (consultantError) {
      console.error('Ошибка AI консультанта:', consultantError);
      
      return new Response(
        JSON.stringify({ error: 'AI consultant error', response: 'Извините, произошла ошибка. Попробуйте позже.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Ответ AI консультанта получен:', consultantResponse);

    const responseText = typeof consultantResponse.response === 'string' 
      ? consultantResponse.response 
      : consultantResponse.response?.answer || 'Извините, не смог сформировать ответ.';

    // 6. Сохранить исходящее сообщение
    if (conversation) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          direction: 'outbound',
          provider: 'website',
          text: responseText,
          status: 'sent',
          sent_at: new Date().toISOString(),
          author_user_id: userId,
          payload: {}
        });

      // Обновляем время последнего сообщения в conversation
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', conversation.id);
    }

    return new Response(
      JSON.stringify({ success: true, response: responseText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Ошибка обработки сообщения виджета:', error);
    return new Response(
      JSON.stringify({ error: error.message, response: 'Произошла ошибка при обработке запроса.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
