import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Archive {
  id: string;
  client_id: string;
  user_id: string;
  restore_at: string;
  reminder_type: string;
  reminder_sent: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date();
    console.log(`[${now.toISOString()}] Checking archives...`);

    // Find archives that need to be restored (restore_at <= now)
    const { data: archivesToRestore, error: fetchError } = await supabase
      .from("client_archives")
      .select("*")
      .eq("status", "active")
      .lte("restore_at", now.toISOString());

    if (fetchError) {
      console.error("Error fetching archives:", fetchError);
      throw fetchError;
    }

    console.log(`Found ${archivesToRestore?.length || 0} archives to restore`);

    let restoredCount = 0;
    let remindersSentCount = 0;

    for (const archive of archivesToRestore || []) {
      try {
        // Update archive status
        const { error: archiveUpdateError } = await supabase
          .from("client_archives")
          .update({
            status: "restored",
            restored_at: now.toISOString(),
          })
          .eq("id", archive.id);

        if (archiveUpdateError) throw archiveUpdateError;

        // Update client status
        const { error: clientUpdateError } = await supabase
          .from("clients")
          .update({
            is_archived: false,
            archived_until: null,
          })
          .eq("id", archive.client_id);

        if (clientUpdateError) throw clientUpdateError;

        // Add comment to history
        await supabase.from("client_comments").insert({
          client_id: archive.client_id,
          user_id: archive.user_id,
          author_name: "Система",
          comment_type: "restore",
          content: "Клиент автоматически восстановлен из архива по истечении срока",
        });

        restoredCount++;
        console.log(`Restored client ${archive.client_id}`);
      } catch (error) {
        console.error(`Error restoring archive ${archive.id}:`, error);
      }
    }

    // Find archives that need reminders (restore_at is within 24 hours and reminder not sent)
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: archivesForReminder, error: reminderFetchError } = await supabase
      .from("client_archives")
      .select("*, clients(name)")
      .eq("status", "active")
      .eq("reminder_sent", false)
      .gte("restore_at", now.toISOString())
      .lte("restore_at", tomorrow.toISOString());

    if (reminderFetchError) {
      console.error("Error fetching reminders:", reminderFetchError);
      throw reminderFetchError;
    }

    console.log(`Found ${archivesForReminder?.length || 0} reminders to send`);

    // Here you would send actual reminders based on reminder_type
    // For now, we'll just mark them as sent
    for (const archive of archivesForReminder || []) {
      try {
        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("client_archives")
          .update({
            reminder_sent: true,
            reminder_sent_at: now.toISOString(),
          })
          .eq("id", archive.id);

        if (updateError) throw updateError;

        // Add system notification/comment
        await supabase.from("client_comments").insert({
          client_id: archive.client_id,
          user_id: archive.user_id,
          author_name: "Система",
          comment_type: "reminder",
          content: `Напоминание: клиент будет восстановлен из архива ${new Date(archive.restore_at).toLocaleDateString('ru-RU')}`,
        });

        remindersSentCount++;
        console.log(`Sent reminder for client ${archive.client_id}`);
      } catch (error) {
        console.error(`Error sending reminder for archive ${archive.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        restoredCount,
        remindersSentCount,
        timestamp: now.toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in check-archives function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
