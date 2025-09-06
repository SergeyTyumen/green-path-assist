# Настройка n8n для голосового помощника

## Шаг 1: Установка и запуск n8n

### Вариант A: Локальная установка
```bash
# Установка через npm
npm install n8n -g

# Запуск
n8n start

# n8n будет доступен по адресу http://localhost:5678
```

### Вариант B: Использование cloud.n8n.io (рекомендуется для начинающих)
1. Перейдите на https://cloud.n8n.io
2. Создайте аккаунт
3. Создайте новый workflow

## Шаг 2: Создание базового workflow

### 1. Webhook Trigger
- Добавьте узел "Webhook"
- Установите HTTP Method: `POST`
- Скопируйте Webhook URL (понадобится позже)
- Активируйте webhook

### 2. Парсинг входящих данных
Добавьте узел "Code" после webhook:

```javascript
// Парсинг запроса от голосового помощника
const inputData = $json;

// Извлекаем данные
const message = inputData.message || '';
const conversationHistory = inputData.conversation_history || [];
const userId = inputData.user_id || '';

// Простая классификация запроса
let assistantType = 'general';
let action = 'chat';

// Определяем тип запроса
if (message.toLowerCase().includes('смет')) {
  assistantType = 'estimator';
  action = 'create_estimate';
} else if (message.toLowerCase().includes('клиент')) {
  assistantType = 'crm';
  action = 'create_client';
} else if (message.toLowerCase().includes('анализ') || message.toLowerCase().includes('отчет')) {
  assistantType = 'analyst';
  action = 'analyze';
}

// Возвращаем классифицированные данные
return {
  json: {
    original_message: message,
    conversation_history: conversationHistory,
    user_id: userId,
    assistant_type: assistantType,
    action: action,
    timestamp: new Date().toISOString()
  }
};
```

### 3. Маршрутизация (Switch узел)
Добавьте узел "Switch" после Code узла:

**Условие 1 (Сметчик):**
- Expression: `{{$json.assistant_type === 'estimator'}}`

**Условие 2 (CRM):**
- Expression: `{{$json.assistant_type === 'crm'}}`

**Условие 3 (Аналитик):**
- Expression: `{{$json.assistant_type === 'analyst'}}`

**По умолчанию:**
- Все остальные запросы

## Шаг 3: Настройка вызовов AI-ассистентов

### Для ветки "Сметчик"
Добавьте HTTP Request узел:
- URL: `https://nxyzmxqtzsvjezmkmkja.supabase.co/functions/v1/ai-estimator`
- Method: `POST`
- Headers: 
  ```
  Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "conversation_mode": true,
    "action": "{{$json.original_message}}",
    "data": {
      "object_description": "{{$json.original_message}}",
      "area": 100,
      "planned_services": ["газон"],
      "mentioned_clients": []
    }
  }
  ```

### Для ветки "CRM"
Добавьте HTTP Request узел:
- URL: `https://nxyzmxqtzsvjezmkmkja.supabase.co/functions/v1/enhanced-voice-chat`
- Method: `POST`
- Headers: 
  ```
  Authorization: Bearer YOUR_SUPABASE_ANON_KEY
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "message": "{{$json.original_message}}",
    "conversation_history": "{{$json.conversation_history}}"
  }
  ```

### Для ветки "Аналитик"
Добавьте HTTP Request узел:
- URL: `https://nxyzmxqtzsvjezmkmkja.supabase.co/functions/v1/ai-analyst`
- Method: `POST`
- Headers: 
  ```
  Authorization: Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY
  Content-Type: application/json
  ```
- Body:
  ```json
  {
    "query": "{{$json.original_message}}",
    "user_id": "{{$json.user_id}}"
  }
  ```

## Шаг 4: Обработка ответов

Добавьте узел "Code" для обработки ответов от каждого ассистента:

```javascript
// Обработка ответа от AI-ассистента
const response = $json;

let finalResponse = '';

// Обрабатываем ответ в зависимости от типа ассистента
if (response.success) {
  finalResponse = response.response || response.message || 'Задача выполнена успешно';
} else {
  finalResponse = `Ошибка: ${response.error || 'Неизвестная ошибка'}`;
}

// Добавляем информацию об ассистенте
const assistantType = $('Switch').item(0).json.assistant_type;
let assistantName = '';

switch(assistantType) {
  case 'estimator':
    assistantName = 'AI-Сметчик';
    break;
  case 'analyst':
    assistantName = 'AI-Аналитик';
    break;
  case 'crm':
    assistantName = 'CRM-помощник';
    break;
  default:
    assistantName = 'Голосовой помощник';
}

return {
  json: {
    response: finalResponse,
    assistant: assistantName,
    timestamp: new Date().toISOString(),
    success: true
  }
};
```

## Шаг 5: Возврат результата

Добавьте узел "Respond to Webhook":
- Response Code: `200`
- Response Body:
  ```json
  {
    "response": "{{$json.response}}",
    "assistant": "{{$json.assistant}}",
    "timestamp": "{{$json.timestamp}}",
    "success": true
  }
  ```

## Шаг 6: Обновление клиентского кода

После создания workflow скопируйте Webhook URL и обновите код:

В файле `src/pages/VoiceChatAssistant.tsx` замените:
```typescript
const n8nWebhookUrl = 'YOUR_WEBHOOK_URL_HERE';
```

## Шаг 7: Тестирование

1. Активируйте workflow в n8n
2. Откройте голосовой помощник в браузере
3. Отправьте тестовое сообщение: "Создай смету на газон 100 кв.м"
4. Проверьте логи в n8n для отладки

## Шаг 8: Дополнительные настройки

### Логирование
Добавьте узел "Set" для сохранения логов:
```json
{
  "log_entry": {
    "timestamp": "{{new Date().toISOString()}}",
    "user_message": "{{$json.original_message}}",
    "assistant_type": "{{$json.assistant_type}}",
    "response": "{{$json.response}}"
  }
}
```

### Обработка ошибок
Добавьте узел "Error Trigger" для обработки ошибок:
```javascript
return {
  json: {
    response: "Извините, произошла ошибка при обработке запроса. Попробуйте позже.",
    error: $json.error || 'Unknown error',
    timestamp: new Date().toISOString(),
    success: false
  }
};
```

## Полезные советы

1. **Отладка**: Используйте узел "Edit Fields" для просмотра данных на каждом этапе
2. **Безопасность**: Храните API ключи в Environment Variables n8n
3. **Производительность**: Включите кеширование для часто используемых запросов
4. **Мониторинг**: Настройте уведомления об ошибках через Slack/Email

После настройки n8n будет обрабатывать все запросы голосового помощника и маршрутизировать их к соответствующим AI-ассистентам!