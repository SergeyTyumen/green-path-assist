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

interface ServiceInput {
  service: string;
  quantity: number;
  unit: string;
}

interface MaterialCalculation {
  name: string;
  unit: string;
  thickness?: number;
  compaction_ratio?: number;
  bulk_density?: number;
  calculation: string;
  quantity: number;
  error?: string;
}

interface ServiceOutput {
  service: string;
  quantity: number;
  unit: string;
  materials: MaterialCalculation[];
}

// AI-Сметчик: расчёт расхода материалов по услугам
async function calculateMaterialConsumption(services: ServiceInput[], userId: string): Promise<ServiceOutput[]> {
  const results: ServiceOutput[] = [];

  // Получаем все материалы пользователя
  const { data: allMaterials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('user_id', userId);

  if (materialsError) {
    console.error('Error fetching materials:', materialsError);
    return results;
  }

  console.log(`Found ${allMaterials?.length || 0} materials for user`);

  for (const service of services) {
    console.log(`Processing service: ${service.service}`);
    
    // Проверяем существующие нормы для данной услуги
    const { data: norms, error: normsError } = await supabase
      .from('norms')
      .select('*')
      .eq('user_id', userId)
      .eq('service_name', service.service)
      .eq('active', true);

    if (normsError) {
      console.error('Error fetching norms:', normsError);
      results.push({
        service: service.service,
        quantity: service.quantity,
        unit: service.unit,
        materials: [{
          name: 'Ошибка',
          unit: '',
          calculation: '',
          quantity: 0,
          error: `Ошибка получения норм: ${normsError.message}`
        }]
      });
      continue;
    }

    let materialsToUse = [];

    if (norms && norms.length > 0) {
      // Используем существующие нормы
      console.log(`Found ${norms.length} norms for service: ${service.service}`);
      
      for (const norm of norms) {
        const material = allMaterials?.find(m => m.id === norm.material_id);
        if (material) {
          materialsToUse.push({
            material,
            compaction_ratio: norm.compaction_ratio,
            thickness: norm.thickness,
            mandatory: norm.mandatory
          });
        }
      }
    } else {
      // Автоматически предлагаем материалы на основе названия услуги
      console.log(`No norms found for service: ${service.service}, suggesting materials`);
      
      const serviceLower = service.service.toLowerCase();
      const suggestedMaterials = allMaterials?.filter(material => {
        const materialLower = material.name.toLowerCase();
        const purposeLower = (material.purpose || '').toLowerCase();
        const characteristicsLower = (material.characteristics || '').toLowerCase();
        
        // Умное сопоставление на основе названия, назначения и характеристик
        const searchTerms = [materialLower, purposeLower, characteristicsLower].join(' ');
        
        if (serviceLower.includes('газон') || serviceLower.includes('трав')) {
          return searchTerms.includes('трав') || searchTerms.includes('газон') || 
                 searchTerms.includes('семен') || searchTerms.includes('рулон');
        }
        
        if (serviceLower.includes('плитка') || serviceLower.includes('мощение')) {
          return searchTerms.includes('плитка') || searchTerms.includes('брусчатка') ||
                 searchTerms.includes('песок') || searchTerms.includes('цемент');
        }
        
        if (serviceLower.includes('бордюр')) {
          return searchTerms.includes('бордюр') || materialLower.startsWith('бр');
        }
        
        if (serviceLower.includes('дренаж')) {
          return searchTerms.includes('щебень') || searchTerms.includes('геотекстиль') ||
                 searchTerms.includes('дренаж');
        }
        
        if (serviceLower.includes('подсыпка') || serviceLower.includes('основание')) {
          return searchTerms.includes('песок') || searchTerms.includes('щебень');
        }
        
        return false;
      }) || [];

      materialsToUse = suggestedMaterials.map(material => ({
        material,
        compaction_ratio: 1.2, // Стандартный коэффициент уплотнения
        thickness: 0.1, // Стандартная толщина 10 см
        mandatory: true
      }));
    }

    const materials: MaterialCalculation[] = [];

    for (const { material, compaction_ratio, thickness, mandatory } of materialsToUse) {
      try {
        let calculatedQuantity = 0;
        let calculationFormula = '';

        // Расчёт в зависимости от единиц измерения
        switch (material.unit) {
          case 'м³':
            // м³ = quantity * thickness * compaction_ratio
            calculatedQuantity = service.quantity * (thickness || 0.1) * (compaction_ratio || 1);
            calculationFormula = `${service.quantity} * ${thickness || 0.1} * ${compaction_ratio || 1}`;
            break;

          case 'тн':
            // тн = quantity * thickness * compaction_ratio * density
            const density = 1.5; // Стандартная плотность 1.5 т/м³
            calculatedQuantity = service.quantity * (thickness || 0.1) * (compaction_ratio || 1) * density;
            calculationFormula = `${service.quantity} * ${thickness || 0.1} * ${compaction_ratio || 1} * ${density}`;
            break;

          case 'м²':
            // м² = quantity (площадь 1:1)
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity}`;
            break;

          case 'шт':
            // шт - зависит от типа материала
            if (material.name.toLowerCase().includes('плитка') || material.name.toLowerCase().includes('брусчатка')) {
              // Для плитки: примерно 25 шт/м²
              calculatedQuantity = Math.ceil(service.quantity * 25);
              calculationFormula = `${service.quantity} * 25 шт/м²`;
            } else {
              // Для других материалов - 1:1
              calculatedQuantity = service.quantity;
              calculationFormula = `${service.quantity}`;
            }
            break;

          case 'кг':
            // кг = quantity * норма расхода на единицу
            const normPerUnit = 0.5; // 0.5 кг на единицу по умолчанию
            calculatedQuantity = service.quantity * normPerUnit;
            calculationFormula = `${service.quantity} * ${normPerUnit} кг/ед`;
            break;

          case 'м.п':
          case 'п.м':
            // погонные метры = quantity
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity}`;
            break;

          case 'л':
            // литры = quantity * норма расхода
            const normPerSqm = 0.1; // 0.1 л на м²
            calculatedQuantity = service.quantity * normPerSqm;
            calculationFormula = `${service.quantity} * ${normPerSqm} л/м²`;
            break;

          default:
            // Неизвестная единица - пропорциональный расчёт
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity} (пропорциональный расчёт)`;
        }

        // Округляем до 2 знаков после запятой
        calculatedQuantity = Math.round(calculatedQuantity * 100) / 100;

        materials.push({
          name: material.name,
          unit: material.unit,
          thickness: thickness,
          compaction_ratio: compaction_ratio,
          bulk_density: null,
          calculation: calculationFormula,
          quantity: calculatedQuantity
        });

        console.log(`Calculated for ${material.name}: ${calculatedQuantity} ${material.unit}`);

      } catch (error) {
        console.error(`Error calculating material ${material.name}:`, error);
        materials.push({
          name: material.name,
          unit: material.unit,
          calculation: '',
          quantity: 0,
          error: `Ошибка расчёта: ${error.message}`
        });
      }
    }

    // Если материалы не найдены, сообщаем об этом
    if (materials.length === 0) {
      materials.push({
        name: 'Нет данных',
        unit: '',
        calculation: '',
        quantity: 0,
        error: `Материалы для услуги "${service.service}" не найдены. Добавьте материалы в номенклатуру или создайте нормы расхода.`
      });
    }

    results.push({
      service: service.service,
      quantity: service.quantity,
      unit: service.unit,
      materials
    });
  }

  return results;
}

// Сохранение результатов расчёта в smeta_items
async function saveSmetaItems(taskId: string, userId: string, calculations: ServiceOutput[]) {
  const smetaItems = [];

  for (const service of calculations) {
    for (const material of service.materials) {
      if (!material.error) {
        smetaItems.push({
          user_id: userId,
          task_id: taskId,
          service_name: service.service,
          service_quantity: service.quantity,
          service_unit: service.unit,
          material_name: material.name,
          material_unit: material.unit,
          thickness: material.thickness,
          compaction_ratio: material.compaction_ratio,
          bulk_density: material.bulk_density,
          calculation_formula: material.calculation,
          calculated_quantity: material.quantity
        });
      }
    }
  }

  if (smetaItems.length > 0) {
    const { error } = await supabase
      .from('smeta_items')
      .insert(smetaItems);

    if (error) {
      console.error('Error saving smeta items:', error);
      throw error;
    }
  }
}

// Интерактивный диалог для сбора информации
async function handleConversationalRequest(task: string, data: any, userId: string): Promise<any> {
  console.log('Handling conversational request:', task);
  console.log('Data provided:', data);

  // Анализируем запрос и определяем что нужно для выполнения задачи
  const missingInfo = [];
  let clientInfo = null;

  // Проверяем упоминания клиентов
  if (data.mentioned_clients && data.mentioned_clients.length > 0) {
    clientInfo = data.mentioned_clients[0];
    console.log('Found client info:', clientInfo);
  } else {
    // Ищем клиента по имени в тексте задачи
    const taskLower = task.toLowerCase();
    if (taskLower.includes('клиент') || taskLower.includes('для ')) {
      missingInfo.push('Уточните для какого клиента создавать смету (имя или телефон)');
    }
  }

  // Проверяем географию объекта
  if (!data.object_location && !clientInfo?.address) {
    missingInfo.push('Где находится объект? (адрес или район города)');
  }

  // Проверяем описание объекта
  if (!data.object_description) {
    missingInfo.push('Опишите объект: тип (дом, дача, коттедж), площадь, особенности');
  }

  // Проверяем какие работы планируются
  if (!data.planned_services && (!data.available_services || data.available_services.length === 0)) {
    missingInfo.push('Какие виды работ планируются? (например: газон, дорожки, дренаж, освещение)');
  }

  // Если информации недостаточно, возвращаем вопросы
  if (missingInfo.length > 0) {
    return {
      needs_clarification: true,
      questions: missingInfo.join('\n\n'),
      context: {
        task,
        client_info: clientInfo,
        available_services: data.available_services || [],
        available_materials: data.available_materials || []
      }
    };
  }

  // Если достаточно информации, создаем смету
  return await createEstimateFromData(task, data, clientInfo, userId);
}

// Создание сметы на основе собранных данных
async function createEstimateFromData(task: string, data: any, clientInfo: any, userId: string): Promise<any> {
  try {
    // Определяем услуги на основе описания задачи и доступных услуг
    const plannedServices = identifyServices(task, data);
    
    if (plannedServices.length === 0) {
      return {
        success: false,
        error: 'Не удалось определить требуемые услуги. Уточните какие работы нужно выполнить.'
      };
    }

    // Рассчитываем материалы
    const calculations = await calculateMaterialConsumption(plannedServices, userId);

    // Создаем задачу для отслеживания
    const { data: newTask, error: taskError } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        title: `Смета для ${clientInfo?.name || 'клиента'}`,
        description: `${task}\n\nОбъект: ${data.object_location || clientInfo?.address || 'не указан'}\nОписание: ${data.object_description || 'не указано'}`,
        category: 'estimate',
        status: 'in_progress',
        client_id: clientInfo?.id,
        ai_agent: 'ai-estimator'
      })
      .select()
      .single();

    if (taskError) {
      console.error('Error creating task:', taskError);
    }

    // Сохраняем результаты расчетов
    if (newTask?.id) {
      await saveSmetaItems(newTask.id, userId, calculations);
    }

    return {
      success: true,
      response: formatEstimateResponse(calculations, clientInfo, data),
      task_id: newTask?.id,
      calculations
    };

  } catch (error) {
    console.error('Error creating estimate:', error);
    return {
      success: false,
      error: `Ошибка при создании сметы: ${error.message}`
    };
  }
}

// Определение услуг на основе текста задачи
function identifyServices(task: string, data: any): ServiceInput[] {
  const services: ServiceInput[] = [];
  const taskLower = task.toLowerCase();

  // Площадь объекта (примерная, если не указана)
  let estimatedArea = 100; // м² по умолчанию
  
  // Пытаемся извлечь площадь из описания
  const areaMatch = task.match(/(\d+)\s*(м²|кв\.?\s*м|квадрат)/i);
  if (areaMatch) {
    estimatedArea = parseInt(areaMatch[1]);
  }

  // Определяем услуги на основе ключевых слов
  if (taskLower.includes('газон') || taskLower.includes('трав')) {
    services.push({ service: 'Устройство газона', quantity: estimatedArea, unit: 'м²' });
  }

  if (taskLower.includes('дорожки') || taskLower.includes('мощение') || taskLower.includes('плитка')) {
    const pathArea = Math.round(estimatedArea * 0.2); // 20% от общей площади
    services.push({ service: 'Мощение дорожек', quantity: pathArea, unit: 'м²' });
  }

  if (taskLower.includes('дренаж')) {
    const drainageLength = Math.round(Math.sqrt(estimatedArea) * 4); // периметр объекта
    services.push({ service: 'Устройство дренажа', quantity: drainageLength, unit: 'м.п' });
  }

  if (taskLower.includes('бордюр')) {
    const borderLength = Math.round(Math.sqrt(estimatedArea) * 4);
    services.push({ service: 'Установка бордюров', quantity: borderLength, unit: 'м.п' });
  }

  if (taskLower.includes('освещение')) {
    const lightPoints = Math.max(4, Math.round(estimatedArea / 50));
    services.push({ service: 'Устройство освещения', quantity: lightPoints, unit: 'шт' });
  }

  // Если услуги не определились автоматически, добавляем базовые
  if (services.length === 0) {
    services.push({ service: 'Благоустройство территории', quantity: estimatedArea, unit: 'м²' });
  }

  return services;
}

// Форматирование ответа с результатами сметы
function formatEstimateResponse(calculations: ServiceOutput[], clientInfo: any, data: any): string {
  let response = `✅ Смета создана!\n\n`;
  
  if (clientInfo) {
    response += `👤 Клиент: ${clientInfo.name}\n`;
    if (clientInfo.phone) response += `📞 Телефон: ${clientInfo.phone}\n`;
    if (clientInfo.address || data.object_location) {
      response += `📍 Объект: ${data.object_location || clientInfo.address}\n`;
    }
  }
  
  response += `\n📋 Расчет материалов:\n\n`;

  for (const calc of calculations) {
    response += `🔧 ${calc.service} (${calc.quantity} ${calc.unit}):\n`;
    
    for (const material of calc.materials) {
      if (material.error) {
        response += `   ❌ ${material.name}: ${material.error}\n`;
      } else {
        response += `   📦 ${material.name}: ${material.quantity} ${material.unit}\n`;
        if (material.calculation) {
          response += `      (расчет: ${material.calculation})\n`;
        }
      }
    }
    response += `\n`;
  }

  response += `💡 Смета сохранена в системе. Вы можете просмотреть детали в разделе "Сметы".`;
  
  return response;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Получаем пользователя из JWT токена
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Invalid authorization token');
    }

    const { action, services, taskId, task, data, conversation_mode } = await req.json();

    // Если это диалоговый режим, обрабатываем как интерактивный запрос
    if (conversation_mode && task) {
      const result = await handleConversationalRequest(task, data || {}, user.id);
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    switch (action) {
      case 'calculate_materials': {
        if (!services || !Array.isArray(services)) {
          throw new Error('Services array is required');
        }

        console.log('Calculating materials for services:', services);
        const calculations = await calculateMaterialConsumption(services, user.id);

        // Если передан taskId, сохраняем результаты
        if (taskId) {
          await saveSmetaItems(taskId, user.id, calculations);
        }

        return new Response(JSON.stringify({
          success: true,
          calculations,
          summary: `Рассчитан расход материалов для ${services.length} услуг`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      case 'get_smeta_by_task': {
        if (!taskId) {
          throw new Error('Task ID is required');
        }

        const { data: smetaItems, error } = await supabase
          .from('smeta_items')
          .select('*')
          .eq('user_id', user.id)
          .eq('task_id', taskId)
          .order('service_name', { ascending: true });

        if (error) {
          throw error;
        }

        return new Response(JSON.stringify({
          success: true,
          smeta_items: smetaItems || []
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in ai-estimator function:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});