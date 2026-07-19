<?php

function crm_records(string $table, string $userId): array
{
    $stmt = db()->prepare('SELECT * FROM crm_records WHERE logical_table = ? AND user_id = ? ORDER BY created_at DESC');
    $stmt->execute([$table, $userId]);
    return array_map('row_to_record', $stmt->fetchAll());
}

function ai_technical_specialist(array $user, array $body): array
{
    $description = trim($body['object_description'] ?? '');
    if ($description === '') throw new RuntimeException('Описание объекта обязательно');

    $materials = crm_records('materials', $user['id']);
    $services = crm_records('services', $user['id']);

    $materialsList = $materials ? implode("\n", array_map(fn($m) => '- ' . ($m['name'] ?? '') . ' (' . ($m['category'] ?? '') . ', ' . ($m['unit'] ?? '') . ')', $materials)) : 'Номенклатура материалов не загружена';
    $servicesList = $services ? implode("\n", array_map(fn($s) => '- ' . ($s['name'] ?? '') . ' (' . ($s['category'] ?? '') . ', ' . ($s['unit'] ?? '') . ')', $services)) : 'Номенклатура услуг не загружена';

    $prompt = "Ты AI-Технолог. Сформируй техническое задание строго в JSON. Используй только услуги и материалы из номенклатуры.\n\nУСЛУГИ:\n$servicesList\n\nМАТЕРИАЛЫ:\n$materialsList\n\nОписание объекта: $description\nКлиент: " . ($body['client_name'] ?? 'Не указан') . "\nАдрес: " . ($body['object_address'] ?? 'Не указан');

    $apiKey = app_config()['openai_api_key'] ?? '';
    if (!$apiKey) {
        return fallback_technical_spec($user, $body, 'AI-ключ не настроен на Beget. Вернулся черновик без обращения к AI.');
    }

    $response = openai_chat($apiKey, [
        ['role' => 'system', 'content' => 'Отвечай только валидным JSON без markdown.'],
        ['role' => 'user', 'content' => $prompt],
    ], 0.1, 3000);

    $content = $response['choices'][0]['message']['content'] ?? '';
    $parsed = json_decode(trim(preg_replace('/^```json|```$/m', '', $content)), true);
    if (!is_array($parsed)) return fallback_technical_spec($user, $body, 'AI вернул ответ не в JSON, создан черновик.');

    $spec = $parsed['specification'] ?? $parsed;
    $spec['id'] = $spec['id'] ?? uuidv4();
    $spec['user_id'] = $user['id'];
    $spec['created_at'] = now_iso();
    save_record('technical_specifications', $user['id'], $spec);

    return ['success' => true, 'specification' => $spec];
}

function fallback_technical_spec(array $user, array $body, string $note): array
{
    $spec = [
        'id' => uuidv4(),
        'user_id' => $user['id'],
        'object_description' => $body['object_description'] ?? '',
        'client_name' => $body['client_name'] ?? '',
        'object_address' => $body['object_address'] ?? '',
        'work_scope' => 'Черновик ТЗ: требуется ручная детализация состава работ.',
        'work_items' => [],
        'materials_spec' => 'Материалы будут рассчитаны после настройки AI-ключа и номенклатуры.',
        'normative_references' => [],
        'recommendations' => $note,
        'estimated_area' => null,
        'estimated_duration' => '',
        'created_at' => now_iso(),
    ];
    save_record('technical_specifications', $user['id'], $spec);
    return ['success' => true, 'specification' => $spec, 'warning' => $note];
}

function openai_chat(string $apiKey, array $messages, float $temperature, int $maxTokens): array
{
    $ch = curl_init('https://api.openai.com/v1/chat/completions');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $apiKey, 'Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode(['model' => 'gpt-4o', 'messages' => $messages, 'temperature' => $temperature, 'max_tokens' => $maxTokens], JSON_UNESCAPED_UNICODE),
        CURLOPT_TIMEOUT => 90,
    ]);
    $raw = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($raw === false || $status >= 400) throw new RuntimeException('Ошибка AI-провайдера: ' . ($raw ?: curl_error($ch)));
    return json_decode($raw, true) ?: [];
}

function save_record(string $table, string $userId, array $record): void
{
    [$id, $recordUserId, $createdAt, $updatedAt, $data] = split_record($record, $userId);
    db()->prepare('INSERT INTO crm_records (id, logical_table, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)')
        ->execute([$id, $table, $recordUserId, json_encode($data, JSON_UNESCAPED_UNICODE), $createdAt, $updatedAt]);
}
