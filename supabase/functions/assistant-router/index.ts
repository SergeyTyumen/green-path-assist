import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface DelegationRequest {
  assistant_name: string;
  task_description: string;
  additional_data?: any;
  context?: any;
}

async function routeToEstimator(taskDescription: string, additionalData: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-estimator', {
      body: {
        conversation_mode: true,
        action: taskDescription,
        data: {
          object_description: taskDescription,
          area: additionalData?.area,
          planned_services: additionalData?.services,
          special_requirements: additionalData?.special_requirements,
          mentioned_clients: additionalData?.client_name ? [{ name: additionalData.client_name }] : []
        }
      },
      headers: {
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Ошибка сметчика: ${error.message}`);
  }
}

async function routeToAnalyst(taskDescription: string, additionalData: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('ai-analyst', {
      body: {
        query: taskDescription,
        filters: additionalData,
        user_id: userId
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Ошибка аналитика: ${error.message}`);
  }
}

async function routeToCompetitorAnalysis(taskDescription: string, additionalData: any, userId: string): Promise<any> {
  try {
    const { data, error } = await supabase.functions.invoke('competitor-analysis', {
      body: {
        company_name: additionalData?.company_name || taskDescription,
        analysis_type: additionalData?.analysis_type || 'general',
        user_id: userId
      }
    });

    if (error) throw error;
    return data;
  } catch (error) {
    throw new Error(`Ошибка конкурентного анализа: ${error.message}`);
  }
}

async function logDelegationRequest(userId: string, request: DelegationRequest, result: any, success: boolean): Promise<void> {
  try {
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: userId,
        transcript: `Делегирование: ${request.assistant_name} - ${request.task_description}`,
        status: success ? 'completed' : 'failed',
        execution_result: {
          delegation_target: request.assistant_name,
          task: request.task_description,
          result: result,
          success: success
        },
        actions: [{
          type: 'delegation',
          target: request.assistant_name,
          task: request.task_description
        }]
      });
  } catch (error) {
    console.error('Error logging delegation request:', error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    const delegationRequest: DelegationRequest = await req.json();

    if (!delegationRequest.assistant_name || !delegationRequest.task_description) {
      throw new Error('assistant_name и task_description обязательны');
    }

    let result: any;
    let success = true;

    // Маршрутизация на основе имени ассистента
    switch (delegationRequest.assistant_name.toLowerCase()) {
      case 'сметчик':
      case 'estimator':
        result = await routeToEstimator(
          delegationRequest.task_description,
          delegationRequest.additional_data,
          user.id
        );
        break;

      case 'аналитик':
      case 'analyst':
        result = await routeToAnalyst(
          delegationRequest.task_description,
          delegationRequest.additional_data,
          user.id
        );
        break;

      case 'конкурентный-анализ':
      case 'competitor-analysis':
        result = await routeToCompetitorAnalysis(
          delegationRequest.task_description,
          delegationRequest.additional_data,
          user.id
        );
        break;

      default:
        success = false;
        result = {
          error: `Неизвестный ассистент: ${delegationRequest.assistant_name}`,
          available_assistants: ['сметчик', 'аналитик', 'конкурентный-анализ']
        };
    }

    // Логируем запрос делегирования
    await logDelegationRequest(user.id, delegationRequest, result, success);

    return new Response(JSON.stringify({
      success,
      assistant: delegationRequest.assistant_name,
      task: delegationRequest.task_description,
      result,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in assistant-router:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      assistant: 'router',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});