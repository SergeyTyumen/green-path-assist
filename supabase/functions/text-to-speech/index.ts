import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text, provider = 'openai', voice, rate = 1.0, pitch = 1.0, apiKey } = await req.json();

    if (!text) {
      throw new Error('Text is required');
    }

    let audioContent: string;

    switch (provider) {
      case 'openai':
        audioContent = await generateOpenAITTS(text, voice || 'alloy');
        break;
      
      case 'elevenlabs':
        if (!apiKey) {
          throw new Error('ElevenLabs API key is required');
        }
        audioContent = await generateElevenLabsTTS(text, voice || '9BWtsMINqrJLrRacOk9x', apiKey);
        break;
      
      case 'yandex':
        if (!apiKey) {
          throw new Error('Yandex API key is required');
        }
        audioContent = await generateYandexTTS(text, voice || 'alena', apiKey);
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

async function generateOpenAITTS(text: string, voice: string): Promise<string> {
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openaiKey}`,
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
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
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
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
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
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}