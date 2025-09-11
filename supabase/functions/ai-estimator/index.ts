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
  area?: number;
}

interface MaterialCalculation {
  material_id?: string;
  name: string;
  unit: string;
  thickness?: number;
  compaction_ratio?: number;
  bulk_density?: number;
  calculation: string;
  quantity: number;
  unit_price?: number;
  total_price?: number;
  error?: string;
}

interface ServiceOutput {
  service: string;
  quantity: number;
  unit: string;
  materials: MaterialCalculation[];
  service_price?: number;
  total_cost?: number;
}

// Основная функция расчёта материалов с интеграцией настроек
async function calculateMaterialConsumption(services: ServiceInput[], userId: string): Promise<ServiceOutput[]> {
  const results: ServiceOutput[] = [];

  // Получаем настройки пользователя
  const { data: userSettings } = await supabase
    .from('ai_assistant_settings')
    .select('settings')
    .eq('user_id', userId)
    .eq('assistant_type', 'estimator')
    .maybeSingle();

  const settings = userSettings?.settings || {};
  console.log('Estimator settings:', settings);

  // Получаем все материалы и услуги пользователя
  const [materialsRes, servicesRes] = await Promise.all([
    supabase.from('materials').select('*').eq('user_id', userId),
    supabase.from('services').select('*').eq('user_id', userId)
  ]);

  const allMaterials = materialsRes.data || [];
  const allServices = servicesRes.data || [];
  
  console.log(`Found ${allMaterials.length} materials and ${allServices.length} services for user`);

  for (const service of services) {
    console.log(`Processing service: ${service.service}`);
    
    // Ищем услугу в базе данных пользователя
    const dbService = allServices.find(s => 
      s.name.toLowerCase().includes(service.service.toLowerCase()) ||
      service.service.toLowerCase().includes(s.name.toLowerCase())
    );

    let servicePrice = 0;
    if (dbService) {
      servicePrice = settings.include_labor_costs ? 
        (dbService.price * service.quantity) : 0;
    }

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
        }],
        service_price: servicePrice
      });
      continue;
    }

    let materialsToUse = [];

    if (norms && norms.length > 0) {
      // Используем существующие нормы
      console.log(`Found ${norms.length} norms for service: ${service.service}`);
      
      // Получаем материалы для каждой нормы
      for (const norm of norms) {
        if (norm.material_id) {
          const material = allMaterials.find(m => m.id === norm.material_id);
          if (material) {
            materialsToUse.push({
              material,
              compaction_ratio: norm.compaction_ratio,
              thickness: norm.thickness,
              mandatory: norm.mandatory
            });
          }
        }
      }
    } else {
      // Автоматически предлагаем материалы на основе названия услуги
      console.log(`No norms found for service: ${service.service}, suggesting materials`);
      
      const suggestedMaterials = suggestMaterialsForService(service.service, allMaterials);
      materialsToUse = suggestedMaterials.map(material => ({
        material,
        compaction_ratio: 1.2,
        thickness: 0.1,
        mandatory: true
      }));
    }

    const materials: MaterialCalculation[] = [];
    let totalMaterialCost = 0;

    for (const { material, compaction_ratio, thickness, mandatory } of materialsToUse) {
      try {
        const calculation = calculateMaterialQuantity(
          service, 
          material, 
          thickness, 
          compaction_ratio,
          settings
        );

        // Применяем настройки ценообразования
        let unitPrice = material.price || 0;
        let totalPrice = unitPrice * calculation.quantity;

        // Применяем наценку
        if (settings.markup_percentage) {
          totalPrice *= (1 + settings.markup_percentage / 100);
        }

        // Сезонные корректировки
        if (settings.seasonal_price_adjustment) {
          const currentMonth = new Date().getMonth();
          // Зимой +10%, летом базовая цена
          if (currentMonth >= 11 || currentMonth <= 2) {
            totalPrice *= 1.1;
          }
        }

        totalMaterialCost += totalPrice;

        materials.push({
          material_id: material.id,
          name: material.name,
          unit: material.unit,
          thickness: thickness,
          compaction_ratio: compaction_ratio,
          calculation: calculation.formula,
          quantity: calculation.quantity,
          unit_price: Math.round(unitPrice * 100) / 100,
          total_price: Math.round(totalPrice * 100) / 100
        });

        console.log(`Calculated for ${material.name}: ${calculation.quantity} ${material.unit} = ${totalPrice.toFixed(2)} руб`);

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

    // Если материалы не найдены, создаем базовый расчет
    if (materials.length === 0) {
      materials.push({
        name: 'Материалы не определены',
        unit: '',
        calculation: '',
        quantity: 0,
        error: `Для услуги "${service.service}" не найдены подходящие материалы. Добавьте материалы в номенклатуру или создайте нормы расхода.`
      });
    }

    // Общая стоимость услуги с материалами
    let totalServiceCost = totalMaterialCost + servicePrice;

    // Применяем НДС если настроен
    if (settings.tax_rate) {
      totalServiceCost *= (1 + settings.tax_rate / 100);
    }

    results.push({
      service: service.service,
      quantity: service.quantity,
      unit: service.unit,
      materials,
      service_price: Math.round(servicePrice * 100) / 100,
      total_cost: Math.round(totalServiceCost * 100) / 100
    });
  }

  return results;
}

// Предложение материалов на основе названия услуги
function suggestMaterialsForService(serviceName: string, allMaterials: any[]): any[] {
  const serviceLower = serviceName.toLowerCase();
  
  return allMaterials.filter(material => {
    const materialLower = material.name.toLowerCase();
    const purposeLower = (material.purpose || '').toLowerCase();
    const characteristicsLower = (material.characteristics || '').toLowerCase();
    const searchTerms = [materialLower, purposeLower, characteristicsLower].join(' ');
    
    // Интеллектуальное сопоставление
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
  });
}

// Расчёт количества материала
function calculateMaterialQuantity(
  service: ServiceInput, 
  material: any, 
  thickness: number, 
  compactionRatio: number,
  settings: any
): { quantity: number; formula: string } {
  let quantity = 0;
  let formula = '';

  const area = service.area || service.quantity;

  switch (material.unit) {
    case 'м³':
      quantity = area * (thickness || 0.1) * (compactionRatio || 1);
      formula = `${area} * ${thickness || 0.1} * ${compactionRatio || 1}`;
      break;

    case 'тн':
      const density = 1.5;
      quantity = area * (thickness || 0.1) * (compactionRatio || 1) * density;
      formula = `${area} * ${thickness || 0.1} * ${compactionRatio || 1} * ${density}`;
      break;

    case 'м²':
      quantity = area;
      formula = `${area}`;
      break;

    case 'шт':
      if (material.name.toLowerCase().includes('плитка') || material.name.toLowerCase().includes('брусчатка')) {
        quantity = Math.ceil(area * 25);
        formula = `${area} * 25 шт/м²`;
      } else {
        quantity = area;
        formula = `${area}`;
      }
      break;

    case 'кг':
      const normPerUnit = 0.5;
      quantity = area * normPerUnit;
      formula = `${area} * ${normPerUnit} кг/ед`;
      break;

    case 'м.п':
    case 'п.м':
      quantity = area;
      formula = `${area}`;
      break;

    case 'л':
      const normPerSqm = 0.1;
      quantity = area * normPerSqm;
      formula = `${area} * ${normPerSqm} л/м²`;
      break;

    default:
      quantity = area;
      formula = `${area} (пропорциональный расчёт)`;
  }

  return {
    quantity: Math.round(quantity * 100) / 100,
    formula
  };
}

// Создание полной сметы в базе данных
async function createFullEstimate(
  title: string,
  clientId: string | null,
  calculations: ServiceOutput[],
  userId: string,
  validUntil?: string
): Promise<any> {
  
  // Подсчитываем общую сумму
  const totalAmount = calculations.reduce((sum, calc) => sum + (calc.total_cost || 0), 0);

  // Создаем смету
  const { data: estimate, error: estimateError } = await supabase
    .from('estimates')
    .insert({
      user_id: userId,
      client_id: clientId,
      title,
      total_amount: Math.round(totalAmount),
      valid_until: validUntil,
      status: 'draft'
    })
    .select()
    .single();

  if (estimateError) {
    throw new Error(`Error creating estimate: ${estimateError.message}`);
  }

  // Создаем позиции сметы
  const estimateItems = [];
  
  for (const calculation of calculations) {
    for (const material of calculation.materials) {
      if (!material.error && material.material_id) {
        estimateItems.push({
          estimate_id: estimate.id,
          material_id: material.material_id,
          quantity: material.quantity,
          unit_price: material.unit_price || 0,
          total: material.total_price || 0
        });
      }
    }
  }

  if (estimateItems.length > 0) {
    const { error: itemsError } = await supabase
      .from('estimate_items')
      .insert(estimateItems);

    if (itemsError) {
      console.error('Error saving estimate items:', itemsError);
    }
  }

  return {
    estimate,
    items_count: estimateItems.length,
    calculations
  };
}

// Обработка диалогового режима
async function handleConversationalRequest(task: string, data: any, userId: string): Promise<any> {
  console.log('Handling conversational estimator request:', task);

  // Анализируем запрос и извлекаем информацию
  const missingInfo = [];
  let clientInfo = null;

  // Поиск клиента
  if (data.mentioned_clients && data.mentioned_clients.length > 0) {
    clientInfo = data.mentioned_clients[0];
  } else if (task.toLowerCase().includes('клиент')) {
    missingInfo.push('Уточните для какого клиента создавать смету (имя или телефон)');
  }

  // Проверяем описание объекта
  if (!data.object_description && !data.area) {
    missingInfo.push('Опишите объект: площадь, тип работ, особенности');
  }

  // Проверяем какие работы планируются
  if (!data.planned_services && (!data.available_services || data.available_services.length === 0)) {
    missingInfo.push('Какие виды работ планируются? (например: газон 100м², дорожки 20м², дренаж 50м.п.)');
  }

  if (missingInfo.length > 0) {
    return {
      needs_clarification: true,
      questions: missingInfo.join('\n\n'),
      context: { task, client_info: clientInfo }
    };
  }

  // Создаем смету на основе данных
  return await createEstimateFromConversation(task, data, clientInfo, userId);
}

// Создание сметы из диалогового режима
async function createEstimateFromConversation(task: string, data: any, clientInfo: any, userId: string): Promise<any> {
  try {
    // Парсим услуги из текста
    const services = parseServicesFromText(task);
    
    if (services.length === 0) {
      return {
        success: false,
        error: 'Не удалось определить требуемые услуги. Уточните какие работы нужно выполнить.'
      };
    }

    // Рассчитываем материалы
    const calculations = await calculateMaterialConsumption(services, userId);

    // Создаем смету в базе
    const result = await createFullEstimate(
      `Смета для ${clientInfo?.name || 'клиента'}`,
      clientInfo?.id || null,
      calculations,
      userId
    );

    return {
      success: true,
      response: formatEstimateResponse(calculations, clientInfo, data),
      estimate_id: result.estimate.id,
      calculations: calculations,
      total_amount: result.estimate.total_amount
    };

  } catch (error) {
    console.error('Error creating estimate from conversation:', error);
    return {
      success: false,
      error: `Ошибка при создании сметы: ${error.message}`
    };
  }
}

// Парсинг услуг из текста
function parseServicesFromText(text: string): ServiceInput[] {
  const services: ServiceInput[] = [];
  const textLower = text.toLowerCase();

  // Ищем площадь объекта
  let defaultArea = 100;
  const areaMatch = text.match(/(\d+)\s*(м²|кв\.?\s*м|квадрат)/i);
  if (areaMatch) {
    defaultArea = parseInt(areaMatch[1]);
  }

  // Ищем конкретные услуги с количеством
  const servicePatterns = [
    { pattern: /газон.*?(\d+)\s*(м²|кв)/i, service: 'Устройство газона', unit: 'м²' },
    { pattern: /дорожк.*?(\d+)\s*(м²|кв)/i, service: 'Мощение дорожек', unit: 'м²' },
    { pattern: /дренаж.*?(\d+)\s*(м\.п|п\.м|метр)/i, service: 'Устройство дренажа', unit: 'м.п' },
    { pattern: /бордюр.*?(\d+)\s*(м\.п|п\.м|метр)/i, service: 'Установка бордюров', unit: 'м.п' },
    { pattern: /освещение.*?(\d+)\s*(шт|точ)/i, service: 'Устройство освещения', unit: 'шт' }
  ];

  // Ищем совпадения по шаблонам
  for (const pattern of servicePatterns) {
    const match = textLower.match(pattern.pattern);
    if (match) {
      services.push({
        service: pattern.service,
        quantity: parseInt(match[1]),
        unit: pattern.unit
      });
    }
  }

  // Если не нашли конкретных услуг, добавляем базовые
  if (services.length === 0) {
    if (textLower.includes('газон')) {
      services.push({ service: 'Устройство газона', quantity: defaultArea, unit: 'м²' });
    }
    if (textLower.includes('дорожк')) {
      services.push({ service: 'Мощение дорожек', quantity: Math.round(defaultArea * 0.2), unit: 'м²' });
    }
    if (textLower.includes('дренаж')) {
      services.push({ service: 'Устройство дренажа', quantity: Math.round(defaultArea * 0.5), unit: 'м.п' });
    }
  }

  return services;
}

// Форматирование ответа
function formatEstimateResponse(calculations: ServiceOutput[], clientInfo: any, data: any): string {
  let response = `✅ Смета создана!\n\n`;
  
  if (clientInfo) {
    response += `👤 Клиент: ${clientInfo.name}\n`;
    if (clientInfo.phone) response += `📞 Телефон: ${clientInfo.phone}\n`;
  }
  
  response += `\n📋 Расчет по позициям:\n\n`;

  let totalAmount = 0;

  for (const calc of calculations) {
    response += `🔧 ${calc.service} (${calc.quantity} ${calc.unit}):\n`;
    
    if (calc.service_price && calc.service_price > 0) {
      response += `   💼 Работы: ${calc.service_price.toFixed(2)} руб\n`;
    }
    
    for (const material of calc.materials) {
      if (material.error) {
        response += `   ❌ ${material.name}: ${material.error}\n`;
      } else {
        response += `   📦 ${material.name}: ${material.quantity} ${material.unit}`;
        if (material.total_price) {
          response += ` = ${material.total_price.toFixed(2)} руб`;
        }
        response += `\n`;
      }
    }
    
    if (calc.total_cost) {
      response += `   💰 Итого по позиции: ${calc.total_cost.toFixed(2)} руб\n`;
      totalAmount += calc.total_cost;
    }
    response += `\n`;
  }

  response += `💵 ОБЩАЯ СУММА: ${totalAmount.toFixed(2)} руб\n\n`;
  response += `💡 Смета сохранена в системе. Вы можете просмотреть детали в разделе "Сметы".`;
  
  return response;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, data, conversation_mode } = await req.json();
    console.log('AI Estimator request:', { action, conversation_mode });

    // Проверяем аутентификацию
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: user, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user.user) {
      throw new Error('Authentication failed');
    }

    const userId = user.user.id;
    console.log('Authenticated user:', userId);

    // Обработка диалогового режима
    if (conversation_mode) {
      const result = await handleConversationalRequest(action || data.query, data, userId);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Прямые действия
    switch (action) {
      case 'calculate_materials':
        const services = data.services || [];
        if (!Array.isArray(services) || services.length === 0) {
          throw new Error('Services array is required');
        }

        const calculations = await calculateMaterialConsumption(services, userId);
        
        return new Response(JSON.stringify({
          success: true,
          calculations,
          summary: `Рассчитан расход материалов для ${services.length} услуг`
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'create_estimate':
        const estimateData = data.estimate || {};
        const result = await createFullEstimate(
          estimateData.title || 'Новая смета',
          estimateData.client_id || null,
          await calculateMaterialConsumption(estimateData.services || [], userId),
          userId,
          estimateData.valid_until
        );

        return new Response(JSON.stringify({
          success: true,
          estimate: result.estimate,
          calculations: result.calculations,
          items_count: result.items_count
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'get_user_data':
        // Получаем данные пользователя для работы со сметчиком
        const [materialsRes, servicesRes, clientsRes, settingsRes] = await Promise.all([
          supabase.from('materials').select('*').eq('user_id', userId),
          supabase.from('services').select('*').eq('user_id', userId),
          supabase.from('clients').select('id, name, phone, email').eq('user_id', userId),
          supabase.from('ai_assistant_settings').select('settings').eq('user_id', userId).eq('assistant_type', 'estimator').maybeSingle()
        ]);

        return new Response(JSON.stringify({
          success: true,
          materials: materialsRes.data || [],
          services: servicesRes.data || [],
          clients: clientsRes.data || [],
          settings: settingsRes.data?.settings || {}
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        throw new Error(`Unknown action: ${action}`);
    }

  } catch (error) {
    console.error('Error in ai-estimator function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'An error occurred during processing',
        details: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});