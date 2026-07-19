<?php
// Голосовой помощник: STT (Whisper), Chat (GPT-4o), TTS (OpenAI)

function voice_openai_key(): string
{
    $key = app_config()['openai_api_key'] ?? '';
    if (!$key) throw new RuntimeException('OPENAI_API_KEY не настроен в config.php');
    return $key;
}

function voice_crm_records(string $table, string $userId, int $limit = 50): array
{
    $limit = max(1, min(100, $limit));
    $stmt = db()->prepare("SELECT * FROM crm_records WHERE logical_table = ? AND user_id = ? ORDER BY created_at DESC LIMIT $limit");
    $stmt->execute([$table, $userId]);
    return array_map('row_to_record', $stmt->fetchAll());
}

function voice_save_crm_record(string $table, string $userId, array $record): array
{
    [$id, $recordUserId, $createdAt, $updatedAt, $data] = split_record($record, $userId);
    db()->prepare('INSERT INTO crm_records (id, logical_table, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)')
        ->execute([$id, $table, $recordUserId, json_encode($data, JSON_UNESCAPED_UNICODE), $createdAt, $updatedAt]);
    return array_merge($data, ['id' => $id, 'user_id' => $recordUserId, 'created_at' => $createdAt, 'updated_at' => $updatedAt]);
}

function voice_normalize_phone(string $phone): string
{
    return preg_replace('/\D+/', '', $phone);
}

function voice_find_client(array $clients, string $message): ?array
{
    $messageLower = mb_strtolower($message);
    $messagePhone = voice_normalize_phone($message);

    foreach ($clients as $client) {
        $name = mb_strtolower((string)($client['name'] ?? ''));
        $phone = voice_normalize_phone((string)($client['phone'] ?? ''));
        if ($name !== '' && str_contains($messageLower, $name)) return $client;
        if ($phone !== '' && $messagePhone !== '' && str_contains($messagePhone, $phone)) return $client;
    }

    return null;
}

function voice_format_clients(array $clients): string
{
    if (!$clients) return 'В CRM сейчас нет клиентов.';

    $lines = array_map(function ($client) {
        $name = trim((string)($client['name'] ?? 'Без имени'));
        $phone = trim((string)($client['phone'] ?? ''));
        $status = trim((string)($client['status'] ?? $client['conversion_stage'] ?? ''));
        $parts = [$name];
        if ($phone !== '') $parts[] = $phone;
        if ($status !== '') $parts[] = 'статус: ' . $status;
        return '— ' . implode(', ', $parts);
    }, array_slice($clients, 0, 20));

    return "Клиенты в CRM (" . count($clients) . "):\n" . implode("\n", $lines);
}

function voice_format_tasks(array $tasks): string
{
    if (!$tasks) return 'В CRM сейчас нет задач.';

    $lines = array_map(function ($task) {
        $title = trim((string)($task['title'] ?? 'Без названия'));
        $status = trim((string)($task['status'] ?? 'pending'));
        $priority = trim((string)($task['priority'] ?? 'medium'));
        $due = trim((string)($task['due_date'] ?? ''));
        $parts = [$title, 'статус: ' . $status, 'приоритет: ' . $priority];
        if ($due !== '') $parts[] = 'срок: ' . $due;
        return '— ' . implode(', ', $parts);
    }, array_slice($tasks, 0, 20));

    return "Задачи в CRM (" . count($tasks) . "):\n" . implode("\n", $lines);
}

function voice_extract_task_title(string $message): string
{
    $title = trim(preg_replace('/^(создай|создать|добавь|добавить|поставь|поставить)\s+(мне\s+)?задач[ауи]?\s*[:\-]?\s*/iu', '', $message));
    return $title !== '' ? $title : trim($message);
}

function voice_handle_crm_command(array $user, string $message): ?array
{
    $text = mb_strtolower($message);

    if (preg_match('/\b(какие|список|покажи|есть|выведи)\b.*\b(клиент|клиенты|клиентов|заявк|лид)/iu', $text)
        || preg_match('/\b(клиент|клиенты|клиентов)\b.*\b(какие|список|покажи|есть|выведи)\b/iu', $text)) {
        $clients = voice_crm_records('applications', $user['id']);
        return ['response' => voice_format_clients($clients), 'message' => voice_format_clients($clients)];
    }

    if (preg_match('/\b(какие|список|покажи|есть|выведи|стоят)\b.*\b(задач|задачи|задача)\b/iu', $text)
        || preg_match('/\b(задач|задачи|задача)\b.*\b(какие|список|покажи|есть|выведи|стоят)\b/iu', $text)) {
        $tasks = voice_crm_records('tasks', $user['id']);
        return ['response' => voice_format_tasks($tasks), 'message' => voice_format_tasks($tasks)];
    }

    if (preg_match('/\b(создай|создать|добавь|добавить|поставь|поставить)\b.*\bзадач/iu', $text)) {
        $clients = voice_crm_records('applications', $user['id']);
        $client = voice_find_client($clients, $message);
        $title = voice_extract_task_title($message);
        $task = voice_save_crm_record('tasks', $user['id'], [
            'title' => $title,
            'description' => $message,
            'client_id' => $client['id'] ?? null,
            'status' => 'pending',
            'priority' => 'medium',
            'category' => 'other',
            'is_public' => false,
        ]);

        $clientNote = $client
            ? ' Я привязал её к клиенту ' . ($client['name'] ?? 'из CRM') . '.'
            : ' Клиента из текста я не нашёл в CRM, поэтому задача создана без привязки к клиенту.';

        $answer = 'Задача создана: «' . ($task['title'] ?? $title) . '».' . $clientNote;
        return ['response' => $answer, 'message' => $answer, 'task' => $task];
    }

    return null;
}

function voice_crm_context(array $user): string
{
    $clients = voice_crm_records('applications', $user['id'], 20);
    $tasks = voice_crm_records('tasks', $user['id'], 20);

    return "РЕАЛЬНЫЕ ДАННЫЕ CRM. Ничего не придумывай: если данных нет, прямо скажи, что в CRM данных нет.\n\n"
        . voice_format_clients($clients)
        . "\n\n"
        . voice_format_tasks($tasks);
}


/**
 * Chat: принимает {message, conversation_history} -> ответ модели.
 * Совместимо с прежним enhanced-voice-chat: возвращает {response, message}.
 */
function voice_chat(array $user, array $body): array
{
    $message = trim((string)($body['message'] ?? ''));
    if ($message === '') throw new RuntimeException('Пустое сообщение');

    $crmCommandResult = voice_handle_crm_command($user, $message);
    if ($crmCommandResult !== null) return $crmCommandResult;

    $history = array_map(function ($m) {
        $role = ($m['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user';
        return ['role' => $role, 'content' => (string)($m['content'] ?? '')];
    }, array_slice((array)($body['conversation_history'] ?? []), -10));

    $systemPrompt = "Ты голосовой помощник CRM для строительной компании. "
        . "Отвечай кратко, дружелюбно, по-русски. Помогай с задачами, клиентами, сметами, ТЗ. "
        . "Используй только переданные ниже реальные данные CRM. Не выдумывай клиентов, задачи, сметы и цифры. "
        . "Если пользователь просит создать задачу или показать клиентов/задачи, но действие не выполнено заранее инструментом, скажи что нужно повторить команду точнее.\n\n"
        . voice_crm_context($user);

    $messages = array_merge(
        [['role' => 'system', 'content' => $systemPrompt]],
        $history,
        [['role' => 'user', 'content' => $message]]
    );

    $response = openai_chat(voice_openai_key(), $messages, 0.7, 800);
    $text = trim($response['choices'][0]['message']['content'] ?? '');

    return ['response' => $text, 'message' => $text];
}

/**
 * Speech-to-text: принимает {audio: base64, mimeType?} -> {text}.
 */
function voice_stt(array $user, array $body): array
{
    $base64 = (string)($body['audio'] ?? '');
    if ($base64 === '') throw new RuntimeException('Аудио не передано');

    $binary = base64_decode($base64, true);
    if ($binary === false || strlen($binary) < 512) throw new RuntimeException('Аудио пустое или повреждено');

    $mime = (string)($body['mimeType'] ?? 'audio/webm');
    $ext = match (true) {
        str_contains($mime, 'mp4') => 'mp4',
        str_contains($mime, 'mpeg') || str_contains($mime, 'mp3') => 'mp3',
        str_contains($mime, 'wav') => 'wav',
        str_contains($mime, 'ogg') => 'ogg',
        default => 'webm',
    };

    $tmp = tempnam(sys_get_temp_dir(), 'stt_') . '.' . $ext;
    file_put_contents($tmp, $binary);

    try {
        $ch = curl_init('https://api.openai.com/v1/audio/transcriptions');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . voice_openai_key()],
            CURLOPT_POSTFIELDS => [
                'file' => new CURLFile($tmp, $mime, 'recording.' . $ext),
                'model' => 'whisper-1',
                'language' => 'ru',
            ],
            CURLOPT_TIMEOUT => 90,
        ]);
        $raw = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false || $status >= 400) throw new RuntimeException('Whisper: ' . ($raw ?: curl_error($ch)));
        $json = json_decode($raw, true) ?: [];
        return ['text' => (string)($json['text'] ?? '')];
    } finally {
        @unlink($tmp);
    }
}

/**
 * Text-to-speech: принимает {text, voice?} -> {audioContent: base64 mp3}.
 * Всегда используется OpenAI TTS (достаточно одного ключа).
 */
function voice_tts(array $user, array $body): array
{
    $text = trim((string)($body['text'] ?? ''));
    if ($text === '') throw new RuntimeException('Пустой текст для озвучки');
    if (mb_strlen($text) > 4000) $text = mb_substr($text, 0, 4000);

    $voice = (string)($body['voice'] ?? '');

    $ch = curl_init('https://api.openai.com/v1/audio/speech');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . voice_openai_key(), 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'model' => 'gpt-4o-mini-tts',
            'input' => $text,
            'voice' => $voice ?: 'alloy',
            'response_format' => 'mp3',
        ], JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 120,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($raw === false || $status >= 400) throw new RuntimeException('OpenAI TTS: ' . ($raw ?: curl_error($ch)));
    return ['audioContent' => base64_encode($raw), 'provider' => 'openai'];
}
