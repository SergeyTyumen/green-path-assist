import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Safe ArrayBuffer -> base64 encoder to avoid call stack overflow
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB chunks
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    // Convert chunk to string safely
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

// Initialize Supabase client for database access
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Get API key from database
async function getAPIKeyFromDatabase(userId: string, provider: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) {
      console.error(`Error fetching ${provider} API key:`, error);
      return null;
    }

    return data?.api_key || null;
  } catch (error) {
    console.error(`Error accessing database for ${provider} key:`, error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, provider = 'openai', voice, rate = 1.0, pitch = 1.0, apiKey } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    // Get user ID from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authorization');
    }

    // Try to get API key from database first, fallback to provided key
    let finalApiKey = apiKey;
    
    if (provider === 'openai') {
      const dbKey = await getAPIKeyFromDatabase(user.id, 'openai');
      if (dbKey) {
        finalApiKey = dbKey;
      } else if (!apiKey) {
        // Fallback to global secret
        finalApiKey = Deno.env.get('OPENAI_API_KEY');
      }
    } else if (provider === 'elevenlabs') {
      const dbKey = await getAPIKeyFromDatabase(user.id, 'elevenlabs');
      if (dbKey) {
        finalApiKey = dbKey;
      }
    } else if (provider === 'yandex') {
      const dbKey = await getAPIKeyFromDatabase(user.id, 'yandexgpt');
      if (dbKey) {
        finalApiKey = dbKey;
      }
    }

    let audioContent: string;

    switch (provider) {
      case 'openai':
        audioContent = await generateOpenAITTS(text, voice || 'alloy', finalApiKey);
        break;
      
      case 'elevenlabs':
        if (!finalApiKey) {
          throw new Error('ElevenLabs API key is required');
        }
        audioContent = await generateElevenLabsTTS(text, voice || '9BWtsMINqrJLrRacOk9x', finalApiKey);
        break;
      
      case 'yandex':
        if (!finalApiKey) {
          throw new Error('Yandex API key is required');
        }
        audioContent = await generateYandexTTS(text, voice || 'alena', finalApiKey);
        break;
      
      case 'web_speech':
        // Для Web Speech API возвращаем специальный ответ
        return new Response(
          JSON.stringify({ 
            provider: 'web_speech',
            text,
            voice,
            rate,
            pitch 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      
      default:
        throw new Error('Unsupported TTS provider');
    }

    return new Response(
      JSON.stringify({ audioContent, provider }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('TTS Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function generateOpenAITTS(text: string, voice: string, apiKey?: string): Promise<string> {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1-hd',
      input: text,
      voice: voice,
      response_format: 'mp3',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI TTS failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

async function generateElevenLabsTTS(text: string, voiceId: string, apiKey: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'Accept': 'audio/mpeg',
      'Content-Type': 'application/json',
      'xi-api-key': apiKey,
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.5,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs TTS failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

async function generateYandexTTS(text: string, voice: string, apiKey: string): Promise<string> {
  const response = await fetch('https://tts.api.cloud.yandex.net/speech/v1/tts:synthesize', {
    method: 'POST',
    headers: {
      'Authorization': `Api-Key ${apiKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      text,
      voice,
      lang: 'ru-RU',
      format: 'mp3',
      sampleRateHertz: '48000',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Yandex TTS failed: ${error}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}