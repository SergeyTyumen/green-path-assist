// Импортируем настройки из проекта
import { supabase } from './src/integrations/supabase/client.ts';

async function updateDatabase() {
  console.log('🚀 Проверяем текущее состояние базы данных...');
  
  try {
    // 1. Проверяем существующие клиенты
    console.log('📝 Получаем список клиентов...');
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(5);

    if (clientsError) {
      console.error('❌ Ошибка получения клиентов:', clientsError.message);
      return;
    }

    console.log('✅ Найдено клиентов:', clients.length);
    
    // 2. Проверяем есть ли поле project_description
    if (clients.length > 0) {
      const hasProjectDescription = 'project_description' in clients[0];
      console.log('📊 Поле project_description:', hasProjectDescription ? '✅ ЕСТЬ' : '❌ НЕТ');
      
      if (!hasProjectDescription) {
        console.log('\n🔧 НУЖНО ДОБАВИТЬ ПОЛЕ! Выполните в Supabase SQL Editor:');
        console.log('ALTER TABLE clients ADD COLUMN project_description TEXT;');
        console.log('\n🔗 Ссылка: https://supabase.com/dashboard/project/nxyzmxqtzsvjezmkmkja/sql');
        return;
      }
    }

    // 3. Обновляем данные клиента (если поле существует)
    console.log('📝 Обновляем данные клиента...');
    const { data: updateData, error: updateError } = await supabase
      .from('clients')
      .update({ project_description: 'футбольное поле для детей' })
      .eq('name', 'Гаврилюк Сергей Владимирович')
      .select();

    if (updateError) {
      console.error('❌ Ошибка обновления:', updateError.message);
    } else {
      console.log('✅ Данные клиента обновлены!', updateData);
    }

    // 4. Показываем финальный результат
    console.log('\n🔍 Проверяем финальный результат...');
    const { data: finalData, error: finalError } = await supabase
      .from('clients')
      .select('name, project_description, services')
      .eq('name', 'Гаврилюк Сергей Владимирович');

    if (finalError) {
      console.error('❌ Ошибка финальной проверки:', finalError.message);
    } else {
      console.log('📊 Финальные данные клиента:', finalData);
    }

    console.log('\n🎉 Процесс завершен!');
    
  } catch (error) {
    console.error('💥 Неожиданная ошибка:', error.message);
  }
}

// Запускаем обновление
updateDatabase();