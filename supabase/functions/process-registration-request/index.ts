import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Создаем клиент с service role для admin операций
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Обычный клиент для работы с таблицами
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface ProcessRequestBody {
  requestId: string;
  action: 'approve' | 'reject';
  adminNotes?: string;
}

async function generateTempPassword(): Promise<string> {
  return Math.random().toString(36).slice(-8) + 'A1!';
}

async function verifyAdminUser(authToken: string): Promise<string | null> {
  try {
    // Извлекаем JWT токен из заголовка Authorization
    const token = authToken.replace('Bearer ', '');
    
    // Создаем клиент с токеном пользователя
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: `Bearer ${token}` },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('User verification failed:', userError);
      return null;
    }

    console.log(`Verifying admin role for user: ${user.id}`);

    // Проверяем роль админа через admin клиент (без RLS ограничений)
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      console.error('Admin role verification failed:', roleError);
      return null;
    }

    console.log(`Admin role verified for user: ${user.id}`);
    return user.id;
  } catch (error) {
    console.error('Admin verification error:', error);
    return null;
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Проверяем права администратора
    const adminUserId = await verifyAdminUser(authHeader);
    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const { requestId, action, adminNotes }: ProcessRequestBody = await req.json();

    if (!requestId || !action) {
      return new Response(
        JSON.stringify({ error: 'requestId and action are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Получаем заявку
    const { data: request, error: requestError } = await supabaseClient
      .from('user_registration_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return new Response(
        JSON.stringify({ error: 'Registration request not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    if (request.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Request already processed' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    let result: any = { success: true };

    // Если одобряем заявку - создаем пользователя
    if (action === 'approve') {
      const tempPassword = await generateTempPassword();
      
      console.log(`Creating user for ${request.email} with temp password: ${tempPassword}`);

      // Создаем пользователя через Admin API
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: request.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: request.full_name
        }
      });

      if (authError) {
        console.error('Error creating user:', authError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${authError.message}` }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      if (!authData.user) {
        return new Response(
          JSON.stringify({ error: 'User creation failed - no user data returned' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Создаем профиль пользователя
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .insert({
          user_id: authData.user.id,
          full_name: request.full_name,
          email: request.email
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Не останавливаем процесс, профиль может быть создан триггером
      }

      // Назначаем роль employee по умолчанию
      const { error: roleError } = await supabaseClient
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: 'employee'
        });

      if (roleError) {
        console.error('Error creating role:', roleError);
        // Не останавливаем процесс, роль может быть создана триггером
      }

      result.userId = authData.user.id;
      result.tempPassword = tempPassword;
      result.message = `User created successfully with temp password: ${tempPassword}`;
      
      console.log(`User ${request.email} created successfully with ID: ${authData.user.id}`);
    }

    // Обновляем статус заявки
    const { error: updateError } = await supabaseClient
      .from('user_registration_requests')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        admin_notes: adminNotes || null,
        processed_by: adminUserId,
        processed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to update request: ${updateError.message}` }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log(`Registration request ${requestId} ${action}d by admin ${adminUserId}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  } catch (error: any) {
    console.error('Error in process-registration-request function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);