import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

async function notifyAdminsOfNewRegistration(requestData: any) {
  try {
    // Получаем всех администраторов
    const { data: adminRoles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (rolesError) throw rolesError;

    const adminUserIds = adminRoles.map(r => r.user_id);

    // Получаем профили администраторов
    const { data: adminProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select('email, full_name')
      .in('user_id', adminUserIds)
      .not('email', 'is', null);

    if (profilesError) throw profilesError;

    console.log(`Notifying ${adminProfiles.length} administrators about new registration request`);
    
    // Здесь должна быть отправка email уведомлений
    // Пока что логируем в консоль
    adminProfiles.forEach(admin => {
      console.log(`Email notification to admin ${admin.email}:`);
      console.log(`New registration request from ${requestData.full_name} (${requestData.email})`);
      console.log(`Message: ${requestData.message || 'No message'}`);
    });

    return { success: true, notifiedAdmins: adminProfiles.length };
  } catch (error) {
    console.error('Error notifying admins:', error);
    return { success: false, error: error.message };
  }
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();

    switch (type) {
      case 'new_registration_request':
        const result = await notifyAdminsOfNewRegistration(data);
        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown notification type' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          }
        );
    }
  } catch (error: any) {
    console.error('Error in notify-admin function:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);