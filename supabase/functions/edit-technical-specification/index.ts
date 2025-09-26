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

    const { 
      specification_id, 
      edit_instructions, 
      fields_to_edit, 
      current_specification 
    } = await req.json();

    if (!specification_id || !edit_instructions || !fields_to_edit || !current_specification) {
      throw new Error('Все параметры обязательны');
    }

    console.log('Editing technical specification:', specification_id, 'Fields:', fields_to_edit);

    // Системный промпт для частичного редактирования
    const systemPrompt = `Ты AI-редактор технических заданий. Твоя задача - внести точечные правки в техническое задание.

ВАЖНЫЕ ПРАВИЛА:
1. Изменяй ТОЛЬКО те поля, которые указаны в fields_to_edit
2. НЕ изменяй поля, которые не указаны для редактирования
3. Сохраняй существующий текст в неизменяемых полях
4. Вноси правки только согласно инструкциям пользователя
5. Используй российские строительные нормы (СНИПы, ГОСТы)

ПОЛЯ ДЛЯ РЕДАКТИРОВАНИЯ: ${fields_to_edit.join(', ')}

ФОРМАТ ОТВЕТА (строго JSON):
{
  "updated_specification": {
    "title": "заголовок (изменяй только если в fields_to_edit)",
    "object_description": "описание объекта (изменяй только если в fields_to_edit)", 
    "client_name": "имя клиента (изменяй только если в fields_to_edit)",
    "object_address": "адрес (изменяй только если в fields_to_edit)",
    "work_scope": "объем работ (изменяй только если в fields_to_edit)",
    "materials_spec": "спецификация материалов (изменяй только если в fields_to_edit)",
    "normative_references": "нормативные ссылки (изменяй только если в fields_to_edit)",
    "quality_requirements": "требования к качеству (изменяй только если в fields_to_edit)",
    "timeline": "временные рамки (изменяй только если в fields_to_edit)",
    "safety_requirements": "требования безопасности (изменяй только если в fields_to_edit)",
    "acceptance_criteria": "критерии приемки (изменяй только если в fields_to_edit)",
    "additional_requirements": "дополнительные требования (изменяй только если в fields_to_edit)"
  }
}`;

    // Формируем содержимое текущего ТЗ для контекста
    const currentSpecText = `
ТЕКУЩЕЕ ТЕХНИЧЕСКОЕ ЗАДАНИЕ:
Заголовок: ${current_specification.title || ''}
Описание объекта: ${current_specification.object_description || ''}
Клиент: ${current_specification.client_name || ''}
Адрес: ${current_specification.object_address || ''}
Объем работ: ${current_specification.work_scope || ''}
Спецификация материалов: ${current_specification.materials_spec || ''}
Нормативные ссылки: ${current_specification.normative_references || ''}
Требования к качеству: ${current_specification.quality_requirements || ''}
Временные рамки: ${current_specification.timeline || ''}
Требования безопасности: ${current_specification.safety_requirements || ''}
Критерии приемки: ${current_specification.acceptance_criteria || ''}
Дополнительные требования: ${current_specification.additional_requirements || ''}`;

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
            content: `${currentSpecText}

ИНСТРУКЦИИ ПО РЕДАКТИРОВАНИЮ: ${edit_instructions}

ПОЛЯ ДЛЯ ИЗМЕНЕНИЯ: ${fields_to_edit.join(', ')}

Внеси правки ТОЛЬКО в указанные поля согласно инструкциям. Остальные поля оставь без изменений.`
          }
        ],
        temperature: 0.1,
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
    
    console.log('AI edit response:', content);

    // Парсим JSON ответ от AI
    let parsedResponse;
    try {
      const jsonMatch = content.match(/```json\n?(.*)\n?```/s) || content.match(/```\n?(.*)\n?```/s);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      parsedResponse = JSON.parse(jsonString);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Ошибка обработки ответа AI');
    }

    // Подготавливаем данные для обновления только указанных полей
    const updatedData: any = {
      updated_at: new Date().toISOString()
    };

    // Обновляем только поля, которые были указаны для редактирования
    const updatedSpec = parsedResponse.updated_specification;
    
    if (fields_to_edit.includes('title')) updatedData.title = updatedSpec.title;
    if (fields_to_edit.includes('object_description')) updatedData.object_description = updatedSpec.object_description;
    if (fields_to_edit.includes('client_name')) updatedData.client_name = updatedSpec.client_name;
    if (fields_to_edit.includes('object_address')) updatedData.object_address = updatedSpec.object_address;
    if (fields_to_edit.includes('work_scope')) updatedData.work_scope = updatedSpec.work_scope;
    if (fields_to_edit.includes('materials_spec')) updatedData.materials_spec = updatedSpec.materials_spec;
    if (fields_to_edit.includes('normative_references')) updatedData.normative_references = updatedSpec.normative_references;
    if (fields_to_edit.includes('quality_requirements')) updatedData.quality_requirements = updatedSpec.quality_requirements;
    if (fields_to_edit.includes('timeline')) updatedData.timeline = updatedSpec.timeline;
    if (fields_to_edit.includes('safety_requirements')) updatedData.safety_requirements = updatedSpec.safety_requirements;
    if (fields_to_edit.includes('acceptance_criteria')) updatedData.acceptance_criteria = updatedSpec.acceptance_criteria;
    if (fields_to_edit.includes('additional_requirements')) updatedData.additional_requirements = updatedSpec.additional_requirements;

    // Обновляем техническое задание в базе данных
    const { data: savedSpec, error: saveError } = await supabase
      .from('technical_specifications')
      .update(updatedData)
      .eq('id', specification_id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (saveError) {
      console.error('Error updating technical specification:', saveError);
      throw new Error('Ошибка сохранения изменений');
    }

    console.log('Technical specification updated successfully:', savedSpec);

    // Сохраняем в историю команд
    await supabase
      .from('voice_command_history')
      .insert({
        user_id: user.id,
        transcript: `Редактирование ТЗ: ${edit_instructions.substring(0, 100)}...`,
        status: 'completed',
        execution_result: savedSpec,
        actions: [{
          type: 'edit_technical_specification',
          description: 'Частичное редактирование технического задания',
          fields_edited: fields_to_edit,
          data: savedSpec
        }]
      });

    return new Response(JSON.stringify({ 
      success: true, 
      updated_specification: savedSpec,
      fields_edited: fields_to_edit
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in edit-technical-specification function:', error);
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