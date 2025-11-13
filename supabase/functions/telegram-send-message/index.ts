import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { chat_id, text } = await req.json()
    
    if (!chat_id || !text) {
      throw new Error('chat_id и text обязательны')
    }

    console.log('Отправка сообщения в Telegram:', { chat_id, text })

    // Получаем токен бота из профиля пользователя
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Получаем user_id из JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    
    if (!user) {
      throw new Error('Пользователь не авторизован')
    }

    // Получаем токен Telegram из настроек интеграции
    const { data: integrationSettings, error: settingsError } = await supabase
      .from('integration_settings')
      .select('settings, is_active')
      .eq('user_id', user.id)
      .eq('integration_type', 'telegram')
      .single()

    if (settingsError || !integrationSettings) {
      console.error('Ошибка получения настроек Telegram:', settingsError)
      throw new Error('Telegram интеграция не настроена')
    }

    if (!integrationSettings.is_active) {
      throw new Error('Telegram интеграция отключена')
    }

    const settings = (integrationSettings.settings as any) || {}
    const telegramToken = settings.bot_token

    if (!telegramToken) {
      throw new Error('Telegram bot token не настроен в интеграции')
    }

    // Отправляем сообщение через Telegram Bot API
    const telegramUrl = `https://api.telegram.org/bot${telegramToken}/sendMessage`
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chat_id,
        text: text,
        parse_mode: 'HTML'
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Ошибка Telegram API:', result)
      throw new Error(result.description || 'Ошибка отправки в Telegram')
    }

    console.log('Сообщение успешно отправлено в Telegram')

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Ошибка в telegram-send-message:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
