import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Аутентификация пользователя
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { object_description, client_name, object_address, existing_spec_id, update_mode } = await req.json();

    if (!object_description) {
      throw new Error('Описание объекта обязательно');
    }

    console.log('Generating technical specification for user:', user.id);

    // Получаем номенклатуру материалов и услуг пользователя
    const [materialsResult, servicesResult] = await Promise.all([
      supabase.from('materials').select('name, category, unit, characteristics, purpose').eq('user_id', user.id),
      supabase.from('services').select('name, category, unit, description, duration_hours').eq('user_id', user.id)
    ]);

    const userMaterials = materialsResult.data || [];
    const userServices = servicesResult.data || [];

    console.log('User materials count:', userMaterials.length);
    console.log('User services count:', userServices.length);

    // Получаем настройки из localStorage (в реальном приложении - из базы данных)
    const defaultSettings = {
      region: "russia",
      workTypes: ["concrete", "masonry", "roofing", "insulation", "foundation"],
      normativeSources: [
        "СНИП 3.03.01-87 (Несущие и ограждающие конструкции)",
        "ГОСТ 31108-2003 (Цементы общестроительные)",
        "СНИП 2.02.01-83 (Основания зданий и сооружений)",
        "СНИП 23-02-2003 (Тепловая защита зданий)",
        "ГОСТ 530-2012 (Кирпич и камень керамические)"
      ],
      qualityRequirements: "standard",
      includeLocalCodes: true
    };

    // Формируем списки номенклатуры для AI
    const materialsNomenclature = userMaterials.length > 0 
      ? userMaterials.map(m => `- ${m.name} (${m.category}, ${m.unit}${m.characteristics ? ', ' + m.characteristics : ''}${m.purpose ? ', применение: ' + m.purpose : ''})`).join('\n')
      : "Номенклатура материалов не загружена";

    const servicesNomenclature = userServices.length > 0
      ? userServices.map(s => `- ${s.name} (${s.category}, ${s.unit}${s.description ? ', ' + s.description : ''}, время: ${s.duration_hours}ч)`).join('\n')
      : "Номенклатура услуг не загружена";

    // Расширенный системный промпт с нормативной базой и номенклатурой
    const systemPrompt = `Ты AI-Технолог, строительный эксперт по формированию технических заданий.

⚠️ КРИТИЧЕСКИ ВАЖНОЕ ПРАВИЛО #1:
ИСПОЛЬЗУЙ ИСКЛЮЧИТЕЛЬНО НАИМЕНОВАНИЯ ИЗ НОМЕНКЛАТУРЫ ПОЛЬЗОВАТЕЛЯ!
ЗАПРЕЩЕНО придумывать, изменять или модифицировать названия услуг и материалов!

═══════════════════════════════════════════════════════════════
📋 НОМЕНКЛАТУРА УСЛУГ ПОЛЬЗОВАТЕЛЯ (используй ТОЛЬКО эти названия):
═══════════════════════════════════════════════════════════════
${servicesNomenclature}

═══════════════════════════════════════════════════════════════
📦 НОМЕНКЛАТУРА МАТЕРИАЛОВ ПОЛЬЗОВАТЕЛЯ (используй ТОЛЬКО эти названия):
═══════════════════════════════════════════════════════════════
${materialsNomenclature}

═══════════════════════════════════════════════════════════════

🚫 ЗАПРЕТЫ:
1. НЕЛЬЗЯ придумывать собственные названия услуг/материалов
2. НЕЛЬЗЯ модифицировать существующие названия
3. НЕЛЬЗЯ сокращать или расширять названия
4. НЕЛЬЗЯ использовать синонимы или похожие названия

✅ ПРАВИЛА:
1. Копируй названия услуг и материалов ТОЧЬ-В-ТОЧЬ из списков выше
2. Если нужной позиции НЕТ в номенклатуре - НЕ ВКЛЮЧАЙ её в work_items
3. В поле "recommendations" укажи: "⚠️ Требуется добавить в номенклатуру: [точное название]"
4. Используй только те единицы измерения, которые указаны в номенклатуре

НОРМАТИВНАЯ БАЗА:
${defaultSettings.normativeSources.map(source => `- ${source}`).join('\n')}

СТРОИТЕЛЬНЫЕ НОРМЫ И КОЭФФИЦИЕНТЫ:

СНИП 3.02.01-87 "Земляные сооружения":
- Толщина слоев при засыпке: 0.2-0.4 м
- Коэффициент уплотнения песка: 1.1-1.15
- Коэффициент уплотнения щебня: 1.2-1.3
- Плотность песка: 1.6-1.8 т/м³
- Плотность щебня: 1.4-1.6 т/м³

СНИП 2.02.01-83 "Основания зданий":
- Песчаная подушка: 15-50 см
- Щебеночная подушка: 20-60 см
- Коэффициент запаса: 1.05-1.1

ТИПОВЫЕ РАСЧЕТЫ:
- Песок: площадь × толщина × коэфф_уплотнения (м² × м × 1.1)
- Щебень: площадь × толщина × коэфф_уплотнения (м² × м × 1.25)
- ЦПС: площадь × толщина × коэфф_уплотнения (м² × м × 1.1)
- Геотекстиль: площадь × 1.05 (запас на нахлест)

СТРУКТУРА ОТВЕТА (строго JSON):
{
  "specification": {
    "id": "uuid",
    "object_description": "исходное описание объекта",
    "client_name": "имя клиента",
    "object_address": "адрес объекта",
    "work_scope": "Детальное описание работ в текстовом виде с технологической последовательностью и объемами. Пример:\n1. Снятие почвенно-растительного слоя - 100 м²\n2. Планировка основания - 100 м²\n3. Укладка геотекстиля - 100 м²",
    "work_items": [
      {
        "service_name": "ТОЧНОЕ название из номенклатуры услуг (копируй без изменений!)",
        "quantity": число,
        "unit": "единица измерения ИЗ НОМЕНКЛАТУРЫ",
        "materials": [
          {
            "material_name": "ТОЧНОЕ название из номенклатуры материалов (копируй без изменений!)",
            "quantity": рассчитанное_количество,
            "unit": "единица измерения ИЗ НОМЕНКЛАТУРЫ",
            "calculation": "подробная формула (пример: 100 м² × 0.3 м × 1.1 = 33 м³)"
          }
        ]
      }
    ],
    "materials_spec": "Спецификация материалов в текстовом виде со списком. Пример:\n- Геотекстиль Дорнит 150 г/м² (ГОСТ 53225-2008) - 105 м²\n- Песок строительный с доставкой (ГОСТ 8736-2014) - 33 м³\n- Щебень фракции 20-40 мм (ГОСТ 8267-93) - 50 м³",
    "normative_references": ["СНИП X.XX.XX-XX", "ГОСТ XXXXX-XXXX"],
    "recommendations": "технологические рекомендации + список недостающих позиций",
    "estimated_area": число_м2,
    "estimated_duration": "срок выполнения",
    "created_at": "ISO дата"
  }
}

⚠️ ВАЖНО: 
- work_scope должен быть ТЕКСТОМ со списком работ
- materials_spec должен быть ТЕКСТОМ со списком материалов
- work_items - это ОТДЕЛЬНЫЙ структурированный массив для AI-Сметчика (скрыт от пользователя)

ПРИМЕР ПРАВИЛЬНОГО work_items (если в номенклатуре есть эти позиции):
[
  {
    "service_name": "Снятие почвенно-растительного слоя под отметку",
    "quantity": 100,
    "unit": "м²",
    "materials": []
  },
  {
    "service_name": "Укладка геотекстиля",
    "quantity": 100,
    "unit": "м²",
    "materials": [
      {
        "material_name": "Геотекстиль нетканый Дорнит 150 г/м2 2х50 м",
        "quantity": 105,
        "unit": "м²",
        "calculation": "100 м² × 1.05 (нахлест) = 105 м²"
      }
    ]
  },
  {
    "service_name": "Устройство подстилающих и выравнивающих слоев оснований: из песка",
    "quantity": 100,
    "unit": "м²",
    "materials": [
      {
        "material_name": "Песок строительный с доставкой по городу",
        "quantity": 33,
        "unit": "м³",
        "calculation": "100 м² × 0.3 м × 1.1 = 33 м³"
      }
    ]
  }
]

⚠️ ВНИМАНИЕ: Каждое service_name и material_name должно ТОЧНО совпадать с номенклатурой выше!`;

    // Запрос к OpenAI с улучшенными параметрами
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',  // Используем более точную модель
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Сформируй техническое задание для объекта:

ОПИСАНИЕ ОБЪЕКТА: ${object_description}
КЛИЕНТ: ${client_name || 'Не указан'}
АДРЕС: ${object_address || 'Не указан'}

⚠️ КРИТИЧЕСКИ ВАЖНО:
1. Используй ТОЛЬКО наименования из номенклатуры выше
2. Копируй названия ТОЧЬ-В-ТОЧЬ, без изменений
3. Если позиции нет в номенклатуре - НЕ включай её в work_items
4. Укажи недостающие позиции в recommendations

Проанализируй описание и сформируй детальное ТЗ.`
          }
        ],
        temperature: 0.1,  // Снизили для большей точности
        max_tokens: 3000,  // Увеличили лимит для детального ответа
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices[0].message.content;
    
    console.log('AI response:', content);

    // Парсим JSON ответ от AI
    let parsedResponse;
    try {
      // Извлекаем JSON из ответа (может быть обернут в ```json```)
      const jsonMatch = content.match(/```json\n?(.*)\n?```/s) || content.match(/```\n?(.*)\n?```/s);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Ошибка обработки ответа AI');
    }

    // Добавляем уникальный ID и дату
    parsedResponse.specification.id = crypto.randomUUID();
    parsedResponse.specification.created_at = new Date().toISOString();

    // Сохраняем или обновляем ТЗ в таблицу technical_specifications
    try {
      const specData = parsedResponse.specification;
      let savedSpec, saveError;
      
      if (update_mode && existing_spec_id) {
        // Обновляем существующее ТЗ
        console.log('Updating existing specification:', existing_spec_id);
        const { data, error } = await supabase
          .from('technical_specifications')
          .update({
            object_description: specData.object_description,
            client_name: specData.client_name,
            object_address: specData.object_address,
            work_scope: specData.work_scope,
            work_items: specData.work_items || null,
            materials_spec: specData.materials_spec,
            normative_references: specData.normative_references,
            quality_requirements: specData.recommendations,
            timeline: specData.estimated_duration,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing_spec_id)
          .eq('user_id', user.id)
          .select()
          .single();
        
        savedSpec = data;
        saveError = error;
      } else {
        // Создаем новое ТЗ
        console.log('Creating new specification');
        const { data, error } = await supabase
          .from('technical_specifications')
          .insert({
            user_id: user.id,
            title: `ТЗ для ${client_name || 'объекта'} от ${new Date().toLocaleDateString()}`,
            object_description: specData.object_description,
            client_name: specData.client_name,
            object_address: specData.object_address,
            work_scope: specData.work_scope,
            work_items: specData.work_items || null,
            materials_spec: specData.materials_spec,
            normative_references: specData.normative_references,
            quality_requirements: specData.recommendations,
            timeline: specData.estimated_duration,
            status: 'draft'
          })
          .select()
          .single();
        
        savedSpec = data;
        saveError = error;
      }

      if (saveError) {
        console.error('Error saving to technical_specifications:', saveError);
      } else {
        console.log('Technical specification saved successfully:', savedSpec);
        // Обновляем ID в результате
        parsedResponse.specification.id = savedSpec.id;
      }

      // Также сохраняем в историю команд для отслеживания
      await supabase
        .from('voice_command_history')
        .insert({
          user_id: user.id,
          transcript: `Формирование ТЗ: ${object_description.substring(0, 100)}...`,
          status: 'completed',
          execution_result: parsedResponse.specification,
          actions: [{
            type: 'technical_specification',
            description: 'Формирование технического задания',
            data: parsedResponse.specification
          }]
        });

    } catch (dbError) {
      console.error('Database error:', dbError);
      // Не прерываем выполнение при ошибке БД
    }

    return new Response(JSON.stringify(parsedResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-technical-specialist function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Внутренняя ошибка сервера',
        details: error instanceof Error ? error.toString() : 'Неизвестная ошибка'
      }), 
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});