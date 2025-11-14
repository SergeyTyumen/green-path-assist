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
    const { messages, clientName } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "No messages provided" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Формируем историю переписки для AI
    const conversationHistory = messages
      .map((msg: any) => {
        const role = msg.type === 'user' ? 'Клиент' : 'Менеджер';
        return `${role}: ${msg.content}`;
      })
      .join('\n');

    console.log('Generating summary for conversation with', clientName);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini-2025-08-07",
        messages: [
          {
            role: "system",
            content: `Ты - помощник менеджера. Твоя задача - создать краткий, структурированный комментарий о результатах переговоров с клиентом на основе истории переписки.

Комментарий должен включать:
1. Краткое описание запроса клиента (услуги, объем работ)
2. Ключевые детали проекта (площадь, бюджет, сроки)
3. Текущий статус и договоренности
4. Особые пожелания или требования клиента

Пиши кратко, по делу, используй профессиональный тон. Максимум 3-4 предложения.`
          },
          {
            role: "user",
            content: `Создай комментарий о переговорах с клиентом "${clientName}" на основе следующей переписки:\n\n${conversationHistory}`
          }
        ],
        max_completion_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Превышен лимит запросов OpenAI. Попробуйте позже." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Неверный API ключ OpenAI." }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const summary = data.choices[0].message.content;

    console.log('Summary generated:', summary?.substring(0, 100));

    return new Response(
      JSON.stringify({ summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-conversation-summary:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
