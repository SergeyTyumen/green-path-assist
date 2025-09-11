import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { AuthProvider } from "@/hooks/useAuth";
import Dashboard from "./pages/Dashboard";
import Clients from "./pages/Clients";
import Estimates from "./pages/Estimates";
import Proposals from "./pages/Proposals";
import Contractors from "./pages/Contractors";
import Suppliers from "./pages/Suppliers";
import Nomenclature from "./pages/Nomenclature";
import Tasks from "./pages/Tasks";
import Archive from "./pages/Archive";
import AIAssistants from "./pages/AIAssistants";
import VoiceAssistant from "./pages/VoiceAssistant";
import VoiceChatAssistant from "./pages/VoiceChatAssistant";

import NotFound from "./pages/NotFound";
import { Auth } from "./pages/Auth";
import AIAnalystPage from "./pages/AIAnalystPage";
import CompetitorAnalysisPage from "./pages/CompetitorAnalysisPage";
import AIEstimator from "./pages/AIEstimator";
import AIConsultant from "./pages/AIConsultant";
import AIProposalManager from "./pages/AIProposalManager";
import AISalesManager from "./pages/AISalesManager";
import AISupplierManager from "./pages/AISupplierManager";
import AIContractorManager from "./pages/AIContractorManager";
import AIAssistantsSettings from "./pages/AIAssistantsSettings";
import UserManagement from "./pages/UserManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="clients" element={<Clients />} />
              <Route path="estimates" element={<Estimates />} />
              <Route path="proposals" element={<Proposals />} />
              <Route path="contractors" element={<Contractors />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="nomenclature" element={<Nomenclature />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="archive" element={<Archive />} />
              <Route path="ai-assistants" element={<AIAssistants />} />
              <Route path="voice-assistant" element={<VoiceAssistant />} />
              <Route path="voice-chat" element={<VoiceChatAssistant />} />
              
              <Route path="ai-analyst" element={<AIAnalystPage />} />
              <Route path="competitor-analysis" element={<CompetitorAnalysisPage />} />
              <Route path="ai-estimator" element={<AIEstimator />} />
              <Route path="ai-consultant" element={<AIConsultant />} />
              <Route path="ai-proposal-manager" element={<AIProposalManager />} />
              <Route path="ai-sales-manager" element={<AISalesManager />} />
              <Route path="ai-supplier-manager" element={<AISupplierManager />} />
              <Route path="ai-contractor-manager" element={<AIContractorManager />} />
              <Route path="ai-assistants-settings" element={<AIAssistantsSettings />} />
              <Route path="user-management" element={<UserManagement />} />
            </Route>
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
