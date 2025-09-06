import { supabase } from '@/integrations/supabase/client';

// Типы для интеграции между ИИ-помощниками
export interface AIIntegrationRequest {
  sourceAssistant: string;
  targetAssistant: string;
  action: string;
  data: any;
  context?: any;
}

export interface AIIntegrationResponse {
  success: boolean;
  data?: any;
  error?: string;
  nextActions?: string[];
}

// Центральный сервис для интеграции между ИИ-помощниками
export class AIIntegrationService {
  
  // Маршрутизация между помощниками
  static async routeToAssistant(request: AIIntegrationRequest): Promise<AIIntegrationResponse> {
    try {
      console.log('Routing request from', request.sourceAssistant, 'to', request.targetAssistant);
      
      // Вызываем assistant-router который уже умеет маршрутизировать
      const { data, error } = await supabase.functions.invoke('assistant-router', {
        body: {
          assistant_name: this.mapAssistantName(request.targetAssistant),
          task_description: request.action,
          additional_data: request.data,
          context: {
            source_assistant: request.sourceAssistant,
            ...request.context
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      return {
        success: data.success,
        data: data.result,
        nextActions: this.generateNextActions(request.sourceAssistant, request.targetAssistant, data.result)
      };
    } catch (error) {
      console.error('Error in AI integration:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Workflow для создания полного цикла работы с клиентом
  static async executeClientWorkflow(clientId: string, workflowType: 'full_service' | 'estimate_only' | 'consultation'): Promise<AIIntegrationResponse> {
    try {
      const workflows = {
        full_service: [
          { assistant: 'consultant', action: 'initial_consultation' },
          { assistant: 'estimator', action: 'create_estimate' },
          { assistant: 'proposal-manager', action: 'create_proposal' },
          { assistant: 'sales-manager', action: 'follow_up' }
        ],
        estimate_only: [
          { assistant: 'consultant', action: 'requirements_gathering' },
          { assistant: 'estimator', action: 'create_estimate' }
        ],
        consultation: [
          { assistant: 'consultant', action: 'detailed_consultation' }
        ]
      };

      const steps = workflows[workflowType];
      const results = [];

      for (const step of steps) {
        const result = await this.routeToAssistant({
          sourceAssistant: 'workflow-manager',
          targetAssistant: step.assistant,
          action: step.action,
          data: { client_id: clientId },
          context: { workflow_type: workflowType, previous_results: results }
        });

        results.push(result);
        
        if (!result.success) {
          break; // Останавливаем workflow при ошибке
        }
      }

      return {
        success: results.every(r => r.success),
        data: results,
        nextActions: ['Workflow completed', 'Review results']
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Интеграция сметчика с КП-менеджером
  static async estimateToProposal(estimateId: string): Promise<AIIntegrationResponse> {
    return this.routeToAssistant({
      sourceAssistant: 'estimator',
      targetAssistant: 'proposal-manager',
      action: 'create_proposal_from_estimate',
      data: { estimate_id: estimateId }
    });
  }

  // Интеграция консультанта с сметчиком
  static async consultationToEstimate(consultationData: any): Promise<AIIntegrationResponse> {
    return this.routeToAssistant({
      sourceAssistant: 'consultant',
      targetAssistant: 'estimator',
      action: 'create_estimate_from_consultation',
      data: consultationData
    });
  }

  // Интеграция аналитика с продажником
  static async analyticsToSales(analysisData: any): Promise<AIIntegrationResponse> {
    return this.routeToAssistant({
      sourceAssistant: 'analyst',
      targetAssistant: 'sales-manager',
      action: 'optimize_sales_strategy',
      data: analysisData
    });
  }

  // Интеграция поставщик-менеджера с сметчиком
  static async supplierToEstimator(supplierData: any): Promise<AIIntegrationResponse> {
    return this.routeToAssistant({
      sourceAssistant: 'supplier-manager',
      targetAssistant: 'estimator',
      action: 'update_material_prices',
      data: supplierData
    });
  }

  // Интеграция подрядчик-менеджера с проектами
  static async contractorToProject(contractorData: any): Promise<AIIntegrationResponse> {
    return this.routeToAssistant({
      sourceAssistant: 'contractor-manager',
      targetAssistant: 'project-manager',
      action: 'assign_contractor',
      data: contractorData
    });
  }

  // Маппинг имен помощников для роутера
  private static mapAssistantName(assistantType: string): string {
    const mapping = {
      'estimator': 'сметчик',
      'analyst': 'аналитик', 
      'proposal-manager': 'кп-менеджер',
      'consultant': 'консультант',
      'sales-manager': 'продажник',
      'supplier-manager': 'поставщик-менеджер',
      'contractor-manager': 'подрядчик-менеджер'
    };
    
    return mapping[assistantType] || assistantType;
  }

  // Генерация следующих рекомендуемых действий
  private static generateNextActions(sourceAssistant: string, targetAssistant: string, result: any): string[] {
    const actions = [];
    
    // Логика генерации следующих шагов на основе результата
    if (sourceAssistant === 'consultant' && targetAssistant === 'estimator') {
      actions.push('Создать коммерческое предложение на основе сметы');
      actions.push('Отправить смету клиенту для согласования');
    }
    
    if (sourceAssistant === 'estimator' && targetAssistant === 'proposal-manager') {
      actions.push('Настроить автоотправку КП');
      actions.push('Запланировать follow-up');
    }
    
    if (targetAssistant === 'supplier-manager') {
      actions.push('Запросить цены у дополнительных поставщиков');
      actions.push('Проанализировать предложения');
    }
    
    if (targetAssistant === 'contractor-manager') {
      actions.push('Создать календарный план работ');
      actions.push('Настроить контроль выполнения');
    }
    
    return actions;
  }

  // Получение статуса интеграций для дашборда
  static async getIntegrationStatus(): Promise<any> {
    try {
      // Получаем последние операции интеграции
      const { data: history, error } = await supabase
        .from('voice_command_history')
        .select('*')
        .contains('actions', [{ type: 'ai_integration' }])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching integration history:', error);
        return { integrations: 0, success_rate: 0, last_integration: null };
      }

      const successfulIntegrations = history?.filter(h => h.status === 'completed').length || 0;
      const totalIntegrations = history?.length || 0;
      
      return {
        integrations: totalIntegrations,
        success_rate: totalIntegrations > 0 ? Math.round((successfulIntegrations / totalIntegrations) * 100) : 100,
        last_integration: history?.[0]?.created_at || null
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      return { integrations: 0, success_rate: 0, last_integration: null };
    }
  }
}