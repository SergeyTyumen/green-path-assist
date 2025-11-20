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

    // ПРИОРИТЕТ: Если materials уже есть в service (из ТЗ), используем их
    if (service.materials && Array.isArray(service.materials) && service.materials.length > 0) {
      console.log(`Using pre-calculated materials from tech spec for service: ${service.service}`);
      
      const processedMaterials: MaterialCalculation[] = [];
      
      for (const techMaterial of service.materials) {
        // Ищем материал в базе по точному названию
        const dbMaterial = allMaterials.find(m => 
          m.name.toLowerCase() === techMaterial.material_name.toLowerCase()
        );
        
        if (dbMaterial) {
          const totalPrice = dbMaterial.price * techMaterial.quantity;
          processedMaterials.push({
            material_id: dbMaterial.id,
            name: dbMaterial.name,
            unit: techMaterial.unit,
            quantity: techMaterial.quantity,
            calculation: techMaterial.calculation || `${service.quantity} ${service.unit}`,
            unit_price: dbMaterial.price,
            total_price: Math.round(totalPrice)
          });
        } else {
          console.warn(`Material not found in DB: ${techMaterial.material_name}`);
          processedMaterials.push({
            name: techMaterial.material_name,
            unit: techMaterial.unit,
            quantity: techMaterial.quantity,
            calculation: techMaterial.calculation || '',
            error: 'Материал не найден в базе данных'
          });
        }
      }
      
      const totalCost = processedMaterials.reduce((sum, m) => sum + (m.total_price || 0), 0) + servicePrice;
      
      results.push({
        service: service.service,
        quantity: service.quantity,
        unit: service.unit,
        materials: processedMaterials,
        service_price: servicePrice,
        total_cost: Math.round(totalCost)
      });
      
      continue; // Переходим к следующей услуге
    }

    // Fallback: Проверяем существующие нормы для данной услуги
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
          error: `Ошибка расчёта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
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
    
    // Улучшенное сопоставление для подстилающих слоев и оснований
    if (serviceLower.includes('подсыпк') || serviceLower.includes('основан') || serviceLower.includes('подстилающ')) {
      // Проверяем упоминание конкретных материалов в названии услуги
      if (serviceLower.includes('песк')) {
        return searchTerms.includes('песок') || materialLower.includes('песок');
      }
      if (serviceLower.includes('щебен') || serviceLower.includes('щебн')) {
        return searchTerms.includes('щебень') || materialLower.includes('щебен');
      }
      // Общий случай - песок или щебень
      return searchTerms.includes('песок') || searchTerms.includes('щебень');
    }
    
    // Асфальтирование
    if (serviceLower.includes('асфальт')) {
      return searchTerms.includes('асфальт') || materialLower.includes('асфальт');
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

  // Получаем список услуг пользователя для определения service_id
  const { data: allServices } = await supabase
    .from('services')
    .select('id, name, price, unit')
    .eq('user_id', userId);

  const servicesMap = new Map(
    (allServices || []).map(s => [s.name.toLowerCase(), s])
  );

  // Создаем позиции сметы
  const estimateItems = [];
  
  for (const calculation of calculations) {
    // 1. Добавляем услугу (работу)
    const dbService = servicesMap.get(calculation.service.toLowerCase());
    if (dbService && calculation.service_price && calculation.service_price > 0) {
      estimateItems.push({
        estimate_id: estimate.id,
        service_id: dbService.id,
        material_id: null, // услуга, не материал
        quantity: calculation.quantity,
        unit_price: dbService.price,
        total: calculation.service_price,
        description: calculation.service
      });
    }
    
    // 2. Добавляем материалы для этой услуги
    for (const material of calculation.materials) {
      if (!material.error && material.material_id) {
        estimateItems.push({
          estimate_id: estimate.id,
          service_id: null, // материал, не услуга
          material_id: material.material_id,
          quantity: material.quantity,
          unit_price: material.unit_price || 0,
          total: material.total_price || 0,
          description: `${material.name} для: ${calculation.service}`
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
    } else {
      console.log(`Created ${estimateItems.length} estimate items (services + materials)`);
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

  // ПРИОРИТЕТ: Проверяем наличие технического задания
  const hasDetailedTechnicalTask = checkForTechnicalTask(task, data);
  
  // Если есть technical_task_id, работаем с готовым ТЗ
  if (data.technical_task_id) {
    return await createEstimateFromTechnicalTask(data, userId);
  }
  
  if (!hasDetailedTechnicalTask) {
    return {
      needs_technical_task: true,
      response: `Для составления точной сметы мне нужно техническое задание.\n\n` +
                `Пожалуйста, обратитесь к AI Technical Specialist для создания подробного ТЗ с:\n` +
                `• Детальным описанием объекта\n` +
                `• Точными объемами работ\n` +
                `• Техническими требованиями\n` +
                `• Материалами и их характеристиками\n\n` +
                `После получения ТЗ я смогу создать точную смету с расчетом материалов и стоимости.`,
      action_needed: 'create_technical_task'
    };
  }

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

// Создание сметы из технического задания
async function createEstimateFromTechnicalTask(data: any, userId: string): Promise<any> {
  try {
    console.log('Creating estimate from technical task:', data.technical_task_id);

    // Получаем данные из технического задания
    const { data: technicalTask, error } = await supabase
      .from('technical_specifications')
      .select('*')
      .eq('id', data.technical_task_id)
      .eq('user_id', userId)
      .single();

    if (error || !technicalTask) {
      return {
        success: false,
        error: 'Техническое задание не найдено'
      };
    }

    console.log('Found tech spec:', technicalTask.title);

    // ПРИОРИТЕТ: Используем структурированные work_items если они есть
    let services: ServiceInput[] = [];
    
    if (technicalTask.work_items && Array.isArray(technicalTask.work_items) && technicalTask.work_items.length > 0) {
      console.log('Using structured work_items from tech spec');
      console.log('Work items:', JSON.stringify(technicalTask.work_items));
      
      services = technicalTask.work_items.map((item: any) => ({
        service: item.service_name,
        quantity: item.quantity,
        unit: item.unit,
        materials: item.materials // Передаем материалы из ТЗ
      }));
    } else {
      // Fallback: парсим из work_scope для старых ТЗ
      console.log('Fallback: parsing work_scope');
      services = parseServicesFromWorkScope(technicalTask.work_scope);
    }
    
    if (services.length === 0) {
      return {
        success: false,
        error: 'В техническом задании не найдены четко определенные объемы работ. Обновите ТЗ с указанием конкретных услуг и их объемов.'
      };
    }

    console.log('Parsed services from tech spec:', services.length);

    // Ищем клиента по имени из ТЗ
    let clientInfo = null;
    if (technicalTask.client_name) {
      const { data: client } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', userId)
        .eq('name', technicalTask.client_name)
        .single();
      
      clientInfo = client;
    }

    // Рассчитываем материалы
    const calculations = await calculateMaterialConsumption(services, userId);

    // Создаем смету в базе
    const result = await createFullEstimate(
      `Смета по ТЗ: ${technicalTask.title}`,
      clientInfo?.id || null,
      calculations,
      userId
    );

    return {
      success: true,
      response: formatEstimateResponseFromTechnicalTask(calculations, technicalTask, clientInfo),
      estimate_id: result.estimate.id,
      calculations: calculations,
      total_amount: result.estimate.total_amount,
      technical_task: {
        id: technicalTask.id,
        title: technicalTask.title,
        client_name: technicalTask.client_name
      }
    };

  } catch (error) {
    console.error('Error creating estimate from technical task:', error);
    return {
      success: false,
      error: `Ошибка при создании сметы из ТЗ: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
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
      error: `Ошибка при создании сметы: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`
    };
  }
}

// Проверка наличия детального технического задания
function checkForTechnicalTask(task: string, data: any): boolean {
  // Проверяем наличие подробного ТЗ
  if (data.technical_specification || data.detailed_task) {
    return true;
  }

  // Проверяем наличие детальной информации в тексте запроса
  const hasDetailedInfo = [
    // Детальные объемы работ
    /\d+\s*(м²|м³|м\.п|шт|кг|тн).*?\d+\s*(м²|м³|м\.п|шт|кг|тн)/i.test(task),
    
    // Технические характеристики
    /(толщина|глубина|высота|плотность|марка|класс|ГОСТ|ТУ)/i.test(task),
    
    // Конкретные материалы
    /(бетон.*?марки|песок.*?фракции|щебень.*?фракции|геотекстиль.*?плотности)/i.test(task),
    
    // Подробное описание объекта
    data.object_description && data.object_description.length > 100,
    
    // Список конкретных услуг с объемами
    data.services && Array.isArray(data.services) && data.services.length > 0
  ];

  // Должно быть минимум 3 критерия из списка для считающегося детальным ТЗ
  const detailLevel = hasDetailedInfo.filter(Boolean).length;
  
  console.log('Technical task detail level:', detailLevel, 'criteria met');
  
  return detailLevel >= 3;
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

// Парсинг услуг из объема работ технического задания
function parseServicesFromWorkScope(workScope: string): ServiceInput[] {
  console.log('Parsing work scope:', workScope);
  
  if (!workScope || typeof workScope !== 'string') {
    console.warn('Invalid work scope provided');
    return [];
  }
  
  const services: ServiceInput[] = [];
  const lines = workScope.split(/\n|;/).map(line => line.trim()).filter(line => line.length > 0);
  
  console.log(`Processing ${lines.length} lines from work scope`);
  
  for (const line of lines) {
    // Пропускаем строки без цифр
    if (!/\d/.test(line)) {
      continue;
    }
    
    // Универсальный паттерн для формата "Название: число единица"
    const universalMatch = line.match(/(.+?):\s*(\d+(?:\.\d+)?)\s*(м²|кв\.?\s*м|м\.п|п\.м|м(?!\²)|шт|точ)/i);
    if (universalMatch) {
      const serviceName = universalMatch[1].replace(/^\d+\.\s*/, '').trim(); // Убираем нумерацию
      const quantity = parseFloat(universalMatch[2]);
      const unit = normalizeUnit(universalMatch[3]);
      
      services.push({
        service: serviceName,
        quantity: quantity,
        unit: unit
      });
      
      console.log(`Parsed universal: ${serviceName} - ${quantity} ${unit}`);
      continue;
    }
    
    // Специфичные паттерны для стандартных услуг
    const patterns = [
      { regex: /(?:газон|озеленение|трав).*?(\d+(?:\.\d+)?)\s*(м²|кв)/i, service: 'Устройство газона', unit: 'м²' },
      { regex: /(?:дорожк|мощение|плитка|брусчатка).*?(\d+(?:\.\d+)?)\s*(м²|кв)/i, service: 'Мощение дорожек', unit: 'м²' },
      { regex: /(?:дренаж|водоотвод).*?(\d+(?:\.\d+)?)\s*(м\.п|п\.м|м(?!\²))/i, service: 'Устройство дренажа', unit: 'м.п' },
      { regex: /(?:бордюр|поребрик).*?(\d+(?:\.\d+)?)\s*(м\.п|п\.м|м(?!\²))/i, service: 'Установка бордюров', unit: 'м.п' },
      { regex: /(?:освещение|светильник|фонар).*?(\d+(?:\.\d+)?)\s*(шт|точ)/i, service: 'Устройство освещения', unit: 'шт' },
      { regex: /(?:автополив|полив|орошение).*?(\d+(?:\.\d+)?)\s*(м²|кв)/i, service: 'Система автополива', unit: 'м²' }
    ];
    
    for (const pattern of patterns) {
      const match = line.match(pattern.regex);
      if (match) {
        const quantity = parseFloat(match[1]);
        services.push({
          service: pattern.service,
          quantity: quantity,
          unit: pattern.unit
        });
        console.log(`Parsed specific: ${pattern.service} - ${quantity} ${pattern.unit}`);
        break;
      }
    }
  }
  
  console.log(`Successfully parsed ${services.length} services from work scope`);
  return services;
}

// Нормализация единиц измерения
function normalizeUnit(unit: string): string {
  const normalized = unit.toLowerCase().replace(/\s+/g, '');
  
  if (normalized.includes('м²') || normalized.includes('кв')) return 'м²';
  if (normalized.includes('м.п') || normalized.includes('п.м')) return 'м.п';
  if (normalized === 'м') return 'м.п';
  if (normalized.includes('шт')) return 'шт';
  if (normalized.includes('точ')) return 'шт';
  
  return unit;
}

// Форматирование ответа для сметы из технического задания
function formatEstimateResponseFromTechnicalTask(calculations: ServiceOutput[], technicalTask: any, clientInfo: any): string {
  let response = `✅ Смета создана на основе технического задания!\n\n`;
  
  response += `📋 Техническое задание: "${technicalTask.title}"\n`;
  
  if (clientInfo) {
    response += `👤 Клиент: ${clientInfo.name}\n`;
    if (clientInfo.phone) response += `📞 Телефон: ${clientInfo.phone}\n`;
  } else if (technicalTask.client_name) {
    response += `👤 Клиент: ${technicalTask.client_name}\n`;
  }
  
  if (technicalTask.object_address) {
    response += `📍 Адрес объекта: ${technicalTask.object_address}\n`;
  }
  
  response += `\n📋 Расчет по позициям:\n\n`;

  let totalAmount = 0;
  
  calculations.forEach((calc, index) => {
    response += `${index + 1}. 🔹 ${calc.service} (${calc.quantity} ${calc.unit})\n`;
    
    if (calc.materials && calc.materials.length > 0) {
      calc.materials.forEach(material => {
        if (material.error) {
          response += `   ❌ ${material.name}: ${material.error}\n`;
        } else {
          response += `   • ${material.name}: ${material.quantity} ${material.unit}`;
          if (material.total_price) {
            response += ` = ${material.total_price.toFixed(2)} руб.`;
          }
          response += '\n';
        }
      });
    }
    
    if (calc.total_cost) {
      response += `   💰 Итого за позицию: ${calc.total_cost.toFixed(2)} руб.\n`;
      totalAmount += calc.total_cost;
    }
    response += '\n';
  });

  response += `💰 **ОБЩАЯ СТОИМОСТЬ: ${totalAmount.toFixed(2)} руб.**\n\n`;
  response += `✅ Смета сохранена в системе и готова к отправке клиенту`;

  return response;
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

      case 'create_estimate_from_spec':
        console.log('Received data for create_estimate_from_spec:', JSON.stringify(data));
        
        const techSpecId = data?.technical_specification_id;
        
        if (!techSpecId) {
          console.error('Missing technical_specification_id in data:', data);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'technical_specification_id is required',
              received_data: data
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        console.log('Creating estimate from tech spec ID:', techSpecId);
        
        // Получаем техническое задание из БД
        const { data: techSpec, error: techSpecError } = await supabase
          .from('technical_specifications')
          .select('*')
          .eq('id', techSpecId)
          .single();

        if (techSpecError || !techSpec) {
          console.error('Tech spec not found:', techSpecError);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Technical specification not found' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
          );
        }

        console.log('Found tech spec:', techSpec.title);
        
        // НОВЫЙ ПОДХОД: используем структурированные work_items если есть
        let specServices;
        
        if (techSpec.work_items && Array.isArray(techSpec.work_items) && techSpec.work_items.length > 0) {
          console.log('Using structured work_items from tech spec');
          console.log('Work items:', JSON.stringify(techSpec.work_items));
          
          // Проверяем что services существуют в БД и получаем полную информацию
          const serviceNames = techSpec.work_items.map((item: any) => item.service_name);
          const { data: dbServices } = await supabase
            .from('services')
            .select('*')
            .eq('user_id', userId)
            .in('name', serviceNames);
          
          console.log('Found services in DB:', dbServices?.length);
          
          // Создаем массив услуг с проверкой наличия в БД
          specServices = techSpec.work_items.map((item: any) => {
            const dbService = dbServices?.find(s => s.name === item.service_name);
            if (!dbService) {
              console.warn(`Service not found in DB: ${item.service_name}`);
            }
            return {
              service: item.service_name,
              quantity: item.quantity,
              unit: item.unit,
              dbService: dbService  // для использования в расчетах
            };
          });
        } else if (techSpec.work_scope) {
          console.log('Fallback: parsing work_scope');
          // Старый подход: парсим текстовое описание
          specServices = await parseServicesFromWorkScope(techSpec.work_scope);
        } else {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Техническое задание не содержит ни work_items, ни work_scope' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        if (!specServices || specServices.length === 0) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Не удалось извлечь услуги из технического задания' 
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }

        console.log('Parsed services from tech spec:', specServices.length);

        // Получаем информацию о клиенте если есть
        let clientId = null;
        if (techSpec.client_name) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id')
            .eq('user_id', userId)
            .ilike('name', `%${techSpec.client_name}%`)
            .limit(1)
            .single();
          
          if (clientData) {
            clientId = clientData.id;
          }
        }

        // Создаем смету на основе ТЗ
        const specResult = await createFullEstimate(
          techSpec.title || `Смета для ${techSpec.client_name || 'клиента'}`,
          clientId,
          await calculateMaterialConsumption(specServices, userId),
          userId,
          undefined
        );

        return new Response(JSON.stringify({
          success: true,
          estimate_id: specResult.estimate.id,
          estimate: specResult.estimate,
          calculations: specResult.calculations,
          items_count: specResult.items_count,
          message: `✅ Смета создана на основе технического задания "${techSpec.title}"`
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
        details: error instanceof Error ? error.message : 'Неизвестная ошибка' 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});