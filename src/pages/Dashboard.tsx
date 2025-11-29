import { useEffect, useState } from "react";
import { useClients } from "@/hooks/useClients";
import { useTasks } from "@/hooks/useTasks";
import { useEstimates } from "@/hooks/useEstimates";
import { useProposals } from "@/hooks/useProposals";
import { useAuth } from "@/hooks/useAuth";
import { useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { supabase } from "@/integrations/supabase/client";
import { WidgetRenderer } from "@/components/dashboard/WidgetRenderer";
import { Loader2, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { DashboardWidget, WidgetSize } from "@/types/dashboard";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { widgets: initialWidgets, loading: widgetsLoading } = useDashboardWidgets();
  const [widgets, setWidgets] = useState<DashboardWidget[]>([]);
  const { clients, loading: clientsLoading } = useClients();
  const { tasks, loading: tasksLoading } = useTasks();
  const { estimates, loading: estimatesLoading } = useEstimates();
  const { proposals, loading: proposalsLoading } = useProposals();

  const [newRequestsCount, setNewRequestsCount] = useState(0);
  const [newMessagesCount, setNewMessagesCount] = useState(0);
  const [statsChanges, setStatsChanges] = useState({
    clientsChange: 0,
    estimatesChange: 0,
    proposalsChange: 0,
    revenueChange: 0,
  });
  const [consultantStats, setConsultantStats] = useState({
    todayConversations: 0,
    averageResponseTime: 0,
    totalMessages: 0,
  });

  useEffect(() => {
    if (initialWidgets.length > 0) {
      setWidgets(initialWidgets);
    }
  }, [initialWidgets]);

  // Расчет изменений статистики
  useEffect(() => {
    if (!user || clientsLoading || estimatesLoading || proposalsLoading) return;

    const calculateChanges = async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      try {
        // Клиенты
        const { data: currentClients } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { data: previousClients } = await supabase
          .from("applications")
          .select("id")
          .eq("user_id", user.id)
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());

        const clientsChange = previousClients?.length
          ? Math.round(
              ((currentClients?.length || 0) - previousClients.length) /
                previousClients.length *
                100
            )
          : 0;

        // Сметы
        const { data: currentEstimates } = await supabase
          .from("estimates")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["draft", "sent"])
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { data: previousEstimates } = await supabase
          .from("estimates")
          .select("id")
          .eq("user_id", user.id)
          .in("status", ["draft", "sent"])
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());

        const estimatesChange =
          (currentEstimates?.length || 0) - (previousEstimates?.length || 0);

        // КП
        const { data: currentProposals } = await supabase
          .from("proposals")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "sent")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { data: previousProposals } = await supabase
          .from("proposals")
          .select("id")
          .eq("user_id", user.id)
          .eq("status", "sent")
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());

        const proposalsChange =
          (currentProposals?.length || 0) - (previousProposals?.length || 0);

        // Оборот
        const { data: currentRevenue } = await supabase
          .from("proposals")
          .select("amount")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("created_at", thirtyDaysAgo.toISOString());

        const { data: previousRevenue } = await supabase
          .from("proposals")
          .select("amount")
          .eq("user_id", user.id)
          .eq("status", "approved")
          .gte("created_at", sixtyDaysAgo.toISOString())
          .lt("created_at", thirtyDaysAgo.toISOString());

        const currentRevenueTotal =
          currentRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;
        const previousRevenueTotal =
          previousRevenue?.reduce((sum, p) => sum + p.amount, 0) || 0;

        const revenueChange = previousRevenueTotal
          ? Math.round(
              ((currentRevenueTotal - previousRevenueTotal) /
                previousRevenueTotal) *
                100
            )
          : 0;

        setStatsChanges({
          clientsChange,
          estimatesChange,
          proposalsChange,
          revenueChange,
        });
      } catch (error) {
        console.error("Error calculating stats changes:", error);
      }
    };

    calculateChanges();
  }, [user, clientsLoading, estimatesLoading, proposalsLoading]);

  // Загрузка уведомлений
  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      try {
        const { data: channels } = await supabase
          .from("channels")
          .select("id")
          .eq("user_id", user.id);

        if (!channels || channels.length === 0) return;

        const channelIds = channels.map((c) => c.id);

        const { data: conversations } = await supabase
          .from("conversations")
          .select(`
            id,
            contact_id,
            contacts (id, name, phone, email),
            messages (
              id,
              direction,
              created_at,
              is_read
            )
          `)
          .eq("archived", false)
          .in("channel_id", channelIds)
          .order("created_at", { ascending: false });

        if (!conversations) return;

        const { data: allClients } = await supabase
          .from("applications")
          .select("id, lead_source_details, assigned_manager_id")
          .eq("user_id", user.id);

        const contactToClientMap = new Map();
        allClients?.forEach((client) => {
          const sourceDetails = client.lead_source_details as {
            contact_id?: string;
          } | null;
          const contactId = sourceDetails?.contact_id;
          if (contactId) {
            contactToClientMap.set(contactId, client);
          }
        });

        let newRequests = 0;
        let myClientMessages = 0;

        conversations.forEach((conv: any) => {
          if (!conv.messages || conv.messages.length === 0) return;

          const sortedMessages = [...conv.messages].sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          const lastMessage = sortedMessages[sortedMessages.length - 1];

          if (lastMessage.direction === "in" && !lastMessage.is_read) {
            const client = contactToClientMap.get(conv.contact_id);

            if (!client) {
              newRequests++;
            } else if (client.assigned_manager_id === user.id) {
              myClientMessages++;
            }
          }
        });

        setNewRequestsCount(newRequests);
        setNewMessagesCount(myClientMessages);
      } catch (error) {
        console.error("Error loading notifications:", error);
      }
    };

    loadNotifications();

    // Realtime подписка
    const channel = supabase
      .channel("dashboard-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        () => {
          loadNotifications();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Загрузка статистики AI консультанта
  useEffect(() => {
    if (!user) return;

    const loadConsultantStats = async () => {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data: channels } = await supabase
          .from("channels")
          .select("id")
          .eq("user_id", user.id);

        if (!channels || channels.length === 0) return;

        const channelIds = channels.map((c) => c.id);

        const { data: todayConversations } = await supabase
          .from("conversations")
          .select("id, created_at")
          .eq("archived", false)
          .in("channel_id", channelIds)
          .gte("created_at", today.toISOString());

        const { data: todayMessages } = await supabase
          .from("messages")
          .select("id, created_at, direction, conversation_id")
          .gte("created_at", today.toISOString());

        const conversationIds = todayConversations?.map((c) => c.id) || [];
        const relevantMessages =
          todayMessages?.filter((m) =>
            conversationIds.includes(m.conversation_id)
          ) || [];

        let totalResponseTime = 0;
        let responseCount = 0;

        const messagesByConv = relevantMessages.reduce((acc: any, msg: any) => {
          if (!acc[msg.conversation_id]) acc[msg.conversation_id] = [];
          acc[msg.conversation_id].push(msg);
          return acc;
        }, {});

        Object.values(messagesByConv).forEach((messages: any) => {
          const sorted = [...messages].sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          for (let i = 0; i < sorted.length - 1; i++) {
            if (
              sorted[i].direction === "in" &&
              sorted[i + 1].direction === "out"
            ) {
              const inTime = new Date(sorted[i].created_at).getTime();
              const outTime = new Date(sorted[i + 1].created_at).getTime();
              const responseTime = (outTime - inTime) / 1000;

              if (responseTime > 0 && responseTime < 3600) {
                totalResponseTime += responseTime;
                responseCount++;
              }
            }
          }
        });

        const avgResponseTime =
          responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;

        setConsultantStats({
          todayConversations: todayConversations?.length || 0,
          averageResponseTime: avgResponseTime,
          totalMessages: relevantMessages.length,
        });
      } catch (error) {
        console.error("Error loading consultant stats:", error);
      }
    };

    loadConsultantStats();
  }, [user]);

  const getGridColsClass = (size: WidgetSize) => {
    switch (size) {
      case "2x2":
      case "2x1":
        return "col-span-2";
      case "1x2":
        return "row-span-2";
      default:
        return "";
    }
  };

  if (
    widgetsLoading ||
    clientsLoading ||
    tasksLoading ||
    estimatesLoading ||
    proposalsLoading
  ) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const dashboardData = {
    newRequestsCount,
    newMessagesCount,
    clientsCount: clients.length,
    statsChanges,
    estimatesInWork: estimates.filter(
      (e) => e.status === "draft" || e.status === "sent"
    ).length,
    proposalsSent: proposals.filter((p) => p.status === "sent").length,
    revenue: `₽${(proposals.filter((p) => p.status === "approved").reduce((sum, p) => sum + p.amount, 0) / 1000000).toFixed(1)}М`,
    consultantStats,
    todayTasks: tasks.filter((task) => task.status === "pending").slice(0, 3),
    recentClients: clients.slice(0, 4),
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Рабочий стол</h1>
          <p className="text-muted-foreground mt-1">
            Добро пожаловать! Вот обзор вашей работы
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => navigate("/user-profile?tab=interface")}
        >
          <Settings className="h-4 w-4 mr-2" />
          Настроить дашборд
        </Button>
      </div>

      {widgets.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            У вас нет активных виджетов на дашборде
          </p>
          <Button onClick={() => navigate("/user-profile?tab=interface")}>
            <Settings className="h-4 w-4 mr-2" />
            Настроить виджеты
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {widgets.map((widget) => (
            <div key={widget.id} className={cn(getGridColsClass(widget.size))}>
              <WidgetRenderer
                widgetId={widget.id}
                size={widget.size}
                data={dashboardData}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
