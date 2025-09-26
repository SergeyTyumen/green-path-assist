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
    const systemPrompt = `Ты AI-Технолог, специалист по формированию технических заданий для строительных работ.

ВАША ЗАДАЧА: На основе описания объекта сформировать подробное техническое задание согласно российским строительным нормам, ОБЯЗАТЕЛЬНО используя точные наименования из номенклатуры пользователя.

НОРМАТИВНАЯ БАЗА (использовать при формировании ТЗ):
${defaultSettings.normativeSources.map(source => `- ${source}`).join('\n')}

РЕГИОН РАБОТЫ: ${defaultSettings.region === 'russia' ? 'Россия (общефедеральные нормы)' : 'Московский регион'}
ВИДЫ РАБОТ: ${defaultSettings.workTypes.join(', ')}

НОМЕНКЛАТУРА МАТЕРИАЛОВ ПОЛЬЗОВАТЕЛЯ (ОБЯЗАТЕЛЬНО используй ТОЛЬКО эти точные наименования):
${materialsNomenclature}

НОМЕНКЛАТУРА УСЛУГ ПОЛЬЗОВАТЕЛЯ (ОБЯЗАТЕЛЬНО используй ТОЛЬКО эти точные наименования):
${servicesNomenclature}

КРИТИЧЕСКИ ВАЖНО:
- Используй ТОЛЬКО точные наименования материалов и услуг из номенклатуры пользователя
- НЕ придумывай собственные названия, используй только те, что указаны выше
- Если нужного материала/услуги нет в номенклатуре, укажи "Требуется добавить в номенклатуру: [название]"
- При указании работ обязательно ссылайся на конкретные услуги из номенклатуры

БАЗА ЗНАНИЙ (строительные нормы):

СНИП 3.02.01-87 "Земляные сооружения":
- Толщина слоев при засыпке: 0.2-0.4 м
- Коэффициент уплотнения: 0.95-0.98
- Плотность песка: 1.6-1.8 т/м³

СНИП 2.02.01-83 "Основания зданий":
- Песчаная подушка: толщина 15-50 см
- Гравийная подушка: толщина 20-60 см
- Коэффициент запаса материалов: 1.1-1.15

ГОСТ 8736-2014 "Песок для строительных работ":
- Песок мелкий: модуль крупности 1.5-2.0
- Песок средний: модуль крупности 2.0-2.5
- Песок крупный: модуль крупности 2.5-3.0

ГОСТ 8267-93 "Щебень и гравий":
- Фракция 5-20 мм для подушек
- Фракция 20-40 мм для дренажа
- Морозостойкость F50-F300

ТИПОВЫЕ РАБОТЫ И НОРМЫ:
1. Разработка грунта: 1.1-1.3 м³ на 1 м² при глубине до 2м
2. Устройство песчаной подушки: 0.3-0.6 м³/м² (толщина 20-40 см)
3. Уплотнение: коэффициент 0.85-0.9 от объема насыпного материала
4. Планировка: добавить 10-15% к основному объему

СТРУКТУРА ТЕХНИЧЕСКОГО ЗАДАНИЯ:
1. ОБЩИЕ СВЕДЕНИЯ (клиент, адрес, площадь, сроки)
2. ОБЪЕМ РАБОТ (детальное описание с указанием технологий)
3. СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ (с указанием ГОСТов и характеристик)
4. НОРМАТИВНЫЕ ССЫЛКИ (конкретные СНИПы и ГОСТы)
5. РЕКОМЕНДАЦИИ ПО ВЫПОЛНЕНИЮ

ВАЖНО:
- Указывайте конкретные нормативы и их разделы
- Рассчитывайте примерную площадь работ
- Учитывайте климатические условия региона
- Указывайте требования к качеству материалов
- Давайте технологические рекомендации

ФОРМАТ ОТВЕТА (строго JSON):
{
  "specification": {
    "id": "uuid",
    "object_description": "исходное описание",
    "client_name": "имя клиента",
    "object_address": "адрес объекта", 
    "work_scope": "детальное описание всех видов работ с указанием объемов и последовательности",
    "materials_spec": "спецификация материалов с характеристиками, количеством и единицами измерения",
    "normative_references": ["СНИП 3.02.01-87", "ГОСТ 8736-2014", ...],
    "recommendations": "технологические рекомендации и особенности выполнения работ",
    "estimated_area": число_площади_в_м2,
    "estimated_duration": "оценка времени выполнения",
    "created_at": "ISO дата"
  }
}

ВАЖНО:
- Указывай конкретные объемы материалов с учетом коэффициентов уплотнения
- Ссылайся на конкретные СНИП и ГОСТ
- Учитывай технологические запасы материалов
- Описывай последовательность работ
- Указывай точные характеристики материалов`;

    // Запрос к OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { 
            role: 'user', 
            content: `Сформируй техническое задание для объекта:

ОПИСАНИЕ ОБЪЕКТА: ${object_description}
КЛИЕНТ: ${client_name || 'Не указан'}
АДРЕС: ${object_address || 'Не указан'}

Проанализируй описание и сформируй детальное ТЗ согласно строительным нормам.`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000,
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