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

  for (const service of services) {
    console.log(`Processing service: ${service.service}`);
    
    // Получаем нормы расхода для данной услуги
    const { data: norms, error: normsError } = await supabase
      .from('norms')
      .select(`
        *,
        materials_norms:material_id (
          name,
          unit,
          bulk_density,
          notes
        )
      `)
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

    if (!norms || norms.length === 0) {
      console.log(`No norms found for service: ${service.service}`);
      results.push({
        service: service.service,
        quantity: service.quantity,
        unit: service.unit,
        materials: [{
          name: 'Нет данных',
          unit: '',
          calculation: '',
          quantity: 0,
          error: 'Нормы расхода для данной услуги не найдены'
        }]
      });
      continue;
    }

    const materials: MaterialCalculation[] = [];

    for (const norm of norms) {
      const material = norm.materials_norms;
      if (!material) continue;

      try {
        let calculatedQuantity = 0;
        let calculationFormula = '';

        switch (material.unit) {
          case 'м³':
            // м³ = quantity * thickness * compaction_ratio
            calculatedQuantity = service.quantity * (norm.thickness || 0) * (norm.compaction_ratio || 1);
            calculationFormula = `${service.quantity} * ${norm.thickness || 0} * ${norm.compaction_ratio || 1}`;
            break;

          case 'тн':
            // тн = quantity * thickness * compaction_ratio * bulk_density
            if (!material.bulk_density) {
              materials.push({
                name: material.name,
                unit: material.unit,
                thickness: norm.thickness,
                compaction_ratio: norm.compaction_ratio,
                calculation: '',
                quantity: 0,
                error: 'Не указана насыпная плотность для расчёта в тоннах'
              });
              continue;
            }
            calculatedQuantity = service.quantity * (norm.thickness || 0) * (norm.compaction_ratio || 1) * material.bulk_density;
            calculationFormula = `${service.quantity} * ${norm.thickness || 0} * ${norm.compaction_ratio || 1} * ${material.bulk_density}`;
            break;

          case 'м²':
            // м² = quantity (просто площадь)
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity}`;
            break;

          case 'шт':
            // шт = quantity (штуки)
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity}`;
            break;

          case 'кг':
            // кг = quantity * норма расхода на единицу
            calculatedQuantity = service.quantity * (norm.thickness || 1);
            calculationFormula = `${service.quantity} * ${norm.thickness || 1}`;
            break;

          case 'п.м':
            // п.м = quantity (погонные метры)
            calculatedQuantity = service.quantity;
            calculationFormula = `${service.quantity}`;
            break;

          default:
            materials.push({
              name: material.name,
              unit: material.unit,
              calculation: '',
              quantity: 0,
              error: `Неподдерживаемая единица измерения: ${material.unit}`
            });
            continue;
        }

        // Округляем до 2 знаков после запятой
        calculatedQuantity = Math.round(calculatedQuantity * 100) / 100;

        materials.push({
          name: material.name,
          unit: material.unit,
          thickness: norm.thickness,
          compaction_ratio: norm.compaction_ratio,
          bulk_density: material.bulk_density,
          calculation: calculationFormula,
          quantity: calculatedQuantity
        });

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