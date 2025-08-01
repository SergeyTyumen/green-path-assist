import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  try {
    const chunks: Uint8Array[] = [];
    let position = 0;
    
    // Clean the base64 string
    const cleanBase64 = base64String.replace(/[^A-Za-z0-9+/=]/g, '');
    
    while (position < cleanBase64.length) {
      const chunk = cleanBase64.slice(position, position + chunkSize);
      
      try {
        const binaryChunk = atob(chunk);
        const bytes = new Uint8Array(binaryChunk.length);
        
        for (let i = 0; i < binaryChunk.length; i++) {
          bytes[i] = binaryChunk.charCodeAt(i);
        }
        
        chunks.push(bytes);
      } catch (chunkError) {
        console.error('Error processing base64 chunk:', chunkError);
        throw new Error(`Invalid base64 chunk at position ${position}`);
      }
      
      position += chunkSize;
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    
    if (totalLength === 0) {
      throw new Error('No valid audio data after base64 processing');
    }
    
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    console.log(`Processed base64 to ${totalLength} bytes`);
    return result;
  } catch (error) {
    console.error('Error in processBase64Chunks:', error);
    throw new Error(`Failed to process base64 audio data: ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { audio } = await req.json();
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    if (!openaiApiKey) {
      throw new Error('OPENAI_API_KEY not found');
    }

    // Validate base64 audio data
    if (typeof audio !== 'string' || audio.length < 100) {
      throw new Error('Invalid audio data format');
    }

    console.log(`Processing audio data of length: ${audio.length}`);

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'ru');

    console.log('Sending audio to OpenAI Whisper API...');

    // Send to OpenAI
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    console.log(`OpenAI API response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const result = await response.json();
    console.log('Transcription successful:', result.text?.length || 0, 'characters');

    return new Response(
      JSON.stringify({ text: result.text }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in speech-to-text function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});