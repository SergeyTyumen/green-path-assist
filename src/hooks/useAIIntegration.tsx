import { useState } from 'react';
import { AIIntegrationService, AIIntegrationRequest, AIIntegrationResponse } from '@/services/AIIntegrationService';
import { toast } from 'sonner';

export function useAIIntegration() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<AIIntegrationResponse | null>(null);

  const executeIntegration = async (request: AIIntegrationRequest): Promise<AIIntegrationResponse> => {
    setLoading(true);
    
    try {
      const result = await AIIntegrationService.routeToAssistant(request);
      setLastResult(result);
      
      if (result.success) {
        toast.success(
          `Интеграция успешна`,
          {
            description: `${request.sourceAssistant} → ${request.targetAssistant}: ${request.action}`
          }
        );
      } else {
        toast.error(
          'Ошибка интеграции',
          {
            description: result.error || 'Неизвестная ошибка'
          }
        );
      }
      
      return result;
    } catch (error) {
      const errorResult = { success: false, error: error.message };
      setLastResult(errorResult);
      
      toast.error('Ошибка интеграции', {
        description: error.message
      });
      
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  const executeWorkflow = async (clientId: string, workflowType: 'full_service' | 'estimate_only' | 'consultation'): Promise<AIIntegrationResponse> => {
    setLoading(true);
    
    try {
      const result = await AIIntegrationService.executeClientWorkflow(clientId, workflowType);
      setLastResult(result);
      
      if (result.success) {
        toast.success(
          'Workflow выполнен',
          {
            description: `Успешно выполнен workflow "${workflowType}" для клиента`
          }
        );
      } else {
        toast.error(
          'Ошибка Workflow',
          {
            description: result.error || 'Ошибка выполнения workflow'
          }
        );
      }
      
      return result;
    } catch (error) {
      const errorResult = { success: false, error: error.message };
      setLastResult(errorResult);
      
      toast.error('Ошибка Workflow', {
        description: error.message
      });
      
      return errorResult;
    } finally {
      setLoading(false);
    }
  };

  // Быстрые интеграции
  const estimateToProposal = async (estimateId: string) => {
    return executeIntegration({
      sourceAssistant: 'estimator',
      targetAssistant: 'proposal-manager',
      action: 'create_proposal_from_estimate',
      data: { estimate_id: estimateId }
    });
  };

  const consultationToEstimate = async (consultationData: any) => {
    return executeIntegration({
      sourceAssistant: 'consultant',
      targetAssistant: 'estimator',
      action: 'create_estimate_from_consultation',
      data: consultationData
    });
  };

  const optimizeSalesFromAnalytics = async (analysisData: any) => {
    return executeIntegration({
      sourceAssistant: 'analyst',
      targetAssistant: 'sales-manager',
      action: 'optimize_sales_strategy',
      data: analysisData
    });
  };

  const updateMaterialPrices = async (supplierData: any) => {
    return executeIntegration({
      sourceAssistant: 'supplier-manager', 
      targetAssistant: 'estimator',
      action: 'update_material_prices',
      data: supplierData
    });
  };

  const assignContractorToProject = async (contractorData: any) => {
    return executeIntegration({
      sourceAssistant: 'contractor-manager',
      targetAssistant: 'project-manager',
      action: 'assign_contractor',
      data: contractorData
    });
  };

  return {
    loading,
    lastResult,
    executeIntegration,
    executeWorkflow,
    
    // Быстрые методы
    estimateToProposal,
    consultationToEstimate,
    optimizeSalesFromAnalytics,
    updateMaterialPrices,
    assignContractorToProject
  };
}