// Простой скрипт для обновления базы данных
const { createClient } = require('@supabase/supabase-js');

// Настройки (вставьте ваши из .env или src/integrations/supabase/client.ts)
const supabaseUrl = 'https://nxyzmxqtzsvjezmkmkja.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54eXpteHF0enN2amV6bWtta2phIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc0NzQxNDcsImV4cCI6MjA1MzA1MDE0N30.cq6aIx7HHcRfIo5lPOJOa3vEP4pz6hKhqRHNTLGDXDM';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAndUpdate() {
  console.log('🚀 Подключаемся к базе данных...');
  
  try {
    // Проверяем подключение
    const { data: testData, error: testError } = await supabase
      .from('clients')
      .select('name')
      .limit(1);
    
    if (testError) {
      console.error('❌ Ошибка подключения:', testError.message);
      return;
    }
    
    console.log('✅ Подключение успешно!');
    
    // Проверяем структуру таблицы
    const { data: clients, error: clientsError } = await supabase
      .from('clients')
      .select('*')
      .limit(1);
    
    if (clientsError) {
      console.error('❌ Ошибка получения данных:', clientsError.message);
      return;
    }
    
    if (clients.length > 0) {
      const hasProjectDescription = 'project_description' in clients[0];
      console.log('📊 Поле project_description:', hasProjectDescription ? '✅ ЕСТЬ' : '❌ НЕТ');
      
      if (!hasProjectDescription) {
        console.log('\n🔧 НУЖНО ДОБАВИТЬ ПОЛЕ В БАЗУ ДАННЫХ!');
        console.log('📝 Скопируйте и выполните в Supabase SQL Editor:');
        console.log('\nALTER TABLE clients ADD COLUMN project_description TEXT;');
        console.log('\n🔗 Ссылка: https://supabase.com/dashboard/project/nxyzmxqtzsvjezmkmkja/sql');
        console.log('\n⚠️  После добавления поля запустите скрипт повторно!');
        return;
      }
      
      // Если поле есть - обновляем данные
      console.log('📝 Обновляем данные клиента...');
      const { data: updateResult, error: updateError } = await supabase
        .from('clients')
        .update({ project_description: 'футбольное поле для детей' })
        .eq('name', 'Гаврилюк Сергей Владимирович')
        .select('name, project_description');
      
      if (updateError) {
        console.error('❌ Ошибка обновления:', updateError.message);
      } else {
        console.log('✅ Клиент обновлен:', updateResult);
      }
    }
    
    console.log('\n🎉 Готово!');
    
  } catch (error) {
    console.error('💥 Неожиданная ошибка:', error.message);
  }
}

// Запуск
checkAndUpdate();