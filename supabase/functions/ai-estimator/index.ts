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
        
        // Умное сопоставление материалов по названию услуги
        if (serviceLower.includes('газон') || serviceLower.includes('трав')) {
          return materialLower.includes('трав') || materialLower.includes('газон') || 
                 materialLower.includes('семен') || materialLower.includes('рулон');
        }
        
        if (serviceLower.includes('плитка') || serviceLower.includes('мощение')) {
          return materialLower.includes('плитка') || materialLower.includes('брусчатка') ||
                 materialLower.includes('песок') || materialLower.includes('цемент');
        }
        
        if (serviceLower.includes('дренаж')) {
          return materialLower.includes('щебень') || materialLower.includes('геотекстиль') ||
                 materialLower.includes('дренаж');
        }
        
        if (serviceLower.includes('подсыпка') || serviceLower.includes('основание')) {
          return materialLower.includes('песок') || materialLower.includes('щебень');
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

    const { action, services, taskId } = await req.json();

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