<?php
// Универсальные обработчики AI-помощников для Beget PHP-бэкенда.
// Каждый помощник — тонкая обёртка над GPT-4o с ролевым system prompt.

require_once __DIR__ . '/ai-technical-specialist.php'; // openai_chat, save_record, crm_records

function ai_extract_content(array $response): string
{
    return trim($response['choices'][0]['message']['content'] ?? '');
}

function ai_run_assistant(array $user, string $systemPrompt, string $userPrompt, float $temp = 0.7, int $maxTokens = 2000): array
{
    $apiKey = app_config()['openai_api_key'] ?? '';
    if (!$apiKey) {
        return [
            'success' => false,
            'analysis' => 'AI-ключ не настроен на сервере. Добавьте openai_api_key в config.php.',
            'response' => 'AI-ключ не настроен на сервере.',
            'content' => '',
            'warning' => 'missing_api_key',
        ];
    }
    $response = openai_chat($apiKey, [
        ['role' => 'system', 'content' => $systemPrompt],
        ['role' => 'user', 'content' => $userPrompt],
    ], $temp, $maxTokens);
    $text = ai_extract_content($response);
    return [
        'success' => true,
        'analysis' => $text,
        'response' => $text,
        'content' => $text,
        'message' => $text,
        'timestamp' => now_iso(),
    ];
}

// ---------- Промпты для каждой роли ----------

function ai_consultant(array $user, array $body): array
{
    $system = "Ты AI-Консультант строительной компании. Помогай клиенту с выбором услуг, "
        . "отвечай понятно и профессионально по-русски. Учитывай контекст диалога и данные клиента. "
        . "Не придумывай данные CRM: если данных нет во входном контексте, прямо скажи, что данных нет.";
    $message = trim((string)($body['message'] ?? $body['question'] ?? $body['task'] ?? ''));
    $context = json_encode($body['context'] ?? $body['clientData'] ?? [], JSON_UNESCAPED_UNICODE);
    return ai_run_assistant($user, $system, "Сообщение: $message\n\nКонтекст: $context", 0.7, 1500);
}

function ai_analyst(array $user, array $body): array
{
    $system = "Ты AI-Аналитик CRM. Анализируй данные по клиентам, продажам, задачам и давай "
        . "структурированные выводы и рекомендации на русском языке. Используй только реальные данные CRM из запроса и базы; ничего не выдумывай.";
    $query = trim((string)($body['query'] ?? $body['request'] ?? $body['task'] ?? ''));
    $filters = json_encode($body['filters'] ?? [], JSON_UNESCAPED_UNICODE);

    // Подтягиваем минимальный контекст из БД
    $clients = crm_records('applications', $user['id']);
    $tasks = crm_records('tasks', $user['id']);
    $crmData = json_encode($body['crmData'] ?? [], JSON_UNESCAPED_UNICODE);
    $stats = 'Всего клиентов в базе: ' . count($clients) . '. Всего задач в базе: ' . count($tasks) . '.';

    $prompt = "Запрос: $query\nФильтры: $filters\n\nСводка данных: $stats\n\nДанные с frontend: $crmData";
    return ai_run_assistant($user, $system, $prompt, 0.4, 2000);
}

function ai_proposal_manager(array $user, array $body): array
{
    $system = "Ты AI-Менеджер по коммерческим предложениям. Формируй тексты КП, "
        . "структурируй разделы (о компании, состав работ, стоимость, сроки, гарантии). Отвечай по-русски.";
    $task = trim((string)($body['task'] ?? $body['action'] ?? 'Сформировать КП'));
    $data = json_encode($body, JSON_UNESCAPED_UNICODE);

    if (($body['action'] ?? '') === 'send_proposal') {
        $proposalId = (string)($body['data']['proposal_id'] ?? '');
        if ($proposalId) {
            $proposals = crm_records('proposals', $user['id']);
            foreach ($proposals as $proposal) {
                if (($proposal['id'] ?? '') === $proposalId) {
                    $proposal['status'] = 'sent';
                    $proposal['sent_at'] = now_iso();
                    save_record('proposals', $user['id'], $proposal);
                    return ['success' => true, 'sent_to' => $proposal['client_email'] ?? 'клиенту', 'proposal' => $proposal];
                }
            }
        }
        return ['success' => false, 'error' => 'КП не найдено в CRM'];
    }

    return ai_run_assistant($user, $system, "Задача: $task\n\nВходные данные: $data", 0.6, 2500);
}

function ai_sales_manager(array $user, array $body): array
{
    $system = "Ты AI-Менеджер по продажам. Даёшь советы по работе с клиентами, скриптам звонков, "
        . "закрытию сделок, обработке возражений. Пиши коротко, по делу, по-русски. Не придумывай клиентов и сделки.";
    $task = trim((string)($body['task'] ?? $body['message'] ?? $body['action'] ?? ''));
    $clients = crm_records('applications', $user['id']);
    $clientId = (string)($body['clientId'] ?? $body['client_id'] ?? '');
    $client = null;
    foreach ($clients as $row) if (($row['id'] ?? '') === $clientId) $client = $row;
    $data = json_encode(['client' => $client, 'clientData' => $body['clientData'] ?? null, 'context' => $body['salesContext'] ?? $body['context'] ?? []], JSON_UNESCAPED_UNICODE);
    return ai_run_assistant($user, $system, "Задача: $task\n\nДанные: $data", 0.7, 2000);
}

function ai_supplier_manager(array $user, array $body): array
{
    $system = "Ты AI-Менеджер по снабжению. Помогаешь выбирать поставщиков, сравнивать цены, "
        . "формировать запросы. Отвечай структурировано по-русски.";
    $suppliers = crm_records('suppliers', $user['id']);
    $suppliersList = $suppliers
        ? implode("\n", array_map(fn($s) => '- ' . ($s['name'] ?? '') . ' (' . ($s['contact'] ?? '') . ')', array_slice($suppliers, 0, 30)))
        : 'Поставщики не заведены';
    $task = trim((string)($body['task'] ?? $body['message'] ?? $body['action'] ?? ''));
    $requirements = json_encode($body['requirements'] ?? $body['data'] ?? $body, JSON_UNESCAPED_UNICODE);
    $prompt = "Задача: $task\n\nТребования: $requirements\n\nПоставщики в базе:\n$suppliersList";
    $result = ai_run_assistant($user, $system, $prompt, 0.6, 2000);
    $result['total_found'] = count($suppliers);
    $result['suppliers'] = array_slice($suppliers, 0, 10);
    return $result;
}

function ai_contractor_manager(array $user, array $body): array
{
    $system = "Ты AI-Менеджер по подрядчикам. Помогаешь искать подрядчиков, оценивать их квалификацию, "
        . "давать рекомендации. Отвечай по-русски.";
    $contractors = crm_records('contractors', $user['id']);
    $list = $contractors
        ? implode("\n", array_map(fn($c) => '- ' . ($c['name'] ?? '') . ' (' . ($c['specialization'] ?? '') . ')', array_slice($contractors, 0, 30)))
        : 'Подрядчики не заведены';
    $task = trim((string)($body['task'] ?? $body['action'] ?? ''));
    $reqs = json_encode($body['contractorRequirements'] ?? $body['projectData'] ?? $body['data'] ?? [], JSON_UNESCAPED_UNICODE);
    $prompt = "Задача: $task\n\nТребования: $reqs\n\nПодрядчики в базе:\n$list";
    $result = ai_run_assistant($user, $system, $prompt, 0.7, 2000);
    $result['recommendedContractors'] = array_slice($contractors, 0, 3);
    $result['total_found'] = count($contractors);
    return $result;
}

function ai_generate_proposal_document(array $user, array $body): array
{
    $clients = crm_records('applications', $user['id']);
    $estimates = crm_records('estimates', $user['id']);
    $templates = crm_records('templates', $user['id']);

    $clientId = (string)($body['client_id'] ?? '');
    $estimateId = (string)($body['estimate_id'] ?? '');
    $templateId = (string)($body['template_id'] ?? '');
    $client = null;
    $estimate = null;
    $template = null;
    foreach ($clients as $row) if (($row['id'] ?? '') === $clientId) $client = $row;
    foreach ($estimates as $row) if (($row['id'] ?? '') === $estimateId) $estimate = $row;
    foreach ($templates as $row) if (($row['id'] ?? '') === $templateId) $template = $row;

    if (!$client) return ['success' => false, 'error' => 'Клиент не найден в CRM'];
    if (!$estimate) return ['success' => false, 'error' => 'Смета не найдена в CRM'];

    $title = trim((string)($body['title'] ?? 'Коммерческое предложение'));
    $validDays = max(1, (int)($body['valid_days'] ?? 14));
    $amount = (float)($estimate['total_amount'] ?? $estimate['amount'] ?? 0);
    $content = "Коммерческое предложение: $title\n\nКлиент: " . ($client['name'] ?? 'Клиент')
        . "\nТелефон: " . ($client['phone'] ?? '')
        . "\n\nОснование: " . ($estimate['title'] ?? 'Смета')
        . "\nСумма: " . number_format($amount, 0, '.', ' ') . " руб."
        . "\n\nСрок действия: $validDays дней.\n\n" . (string)($template['content'] ?? 'Состав работ и условия уточняются по смете.');

    $proposal = [
        'client_id' => $clientId,
        'estimate_id' => $estimateId,
        'title' => $title,
        'amount' => $amount,
        'status' => 'draft',
        'content' => $content,
        'expires_at' => gmdate('Y-m-d', time() + $validDays * 86400),
    ];
    $saved = save_record_return('proposals', $user['id'], $proposal);
    return ['success' => true, 'proposal' => $saved];
}

function ai_convert_proposal_to_pdf(array $user, array $body): array
{
    $proposalId = (string)($body['proposal_id'] ?? '');
    $proposals = crm_records('proposals', $user['id']);
    foreach ($proposals as $proposal) {
        if (($proposal['id'] ?? '') === $proposalId) {
            $proposal['pdf_status'] = 'ready';
            $proposal['pdf_note'] = 'PDF-конвертация на Beget будет добавлена отдельным модулем; КП подготовлено к отправке.';
            save_record('proposals', $user['id'], $proposal);
            return ['success' => true, 'proposal' => $proposal];
        }
    }
    return ['success' => false, 'error' => 'КП не найдено'];
}

function save_record_return(string $table, string $userId, array $record): array
{
    [$id, $recordUserId, $createdAt, $updatedAt, $data] = split_record($record, $userId);
    db()->prepare('INSERT INTO crm_records (id, logical_table, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)')
        ->execute([$id, $table, $recordUserId, json_encode($data, JSON_UNESCAPED_UNICODE), $createdAt, $updatedAt]);
    return array_merge($data, ['id' => $id, 'user_id' => $recordUserId, 'created_at' => $createdAt, 'updated_at' => $updatedAt]);
}

function ai_competitor_analysis(array $user, array $body): array
{
    $system = "Ты AI-аналитик конкурентов в строительной отрасли. Проведи анализ компании: "
        . "сильные стороны, слабые стороны, позиционирование, ценовая политика, рекомендации. По-русски.";
    $name = trim((string)($body['company_name'] ?? $body['task'] ?? ''));
    $type = (string)($body['analysis_type'] ?? 'general');
    return ai_run_assistant($user, $system, "Компания: $name\nТип анализа: $type", 0.5, 2500);
}

function ai_generate_next_action(array $user, array $body): array
{
    $system = "Ты AI-помощник CRM. По данным клиента предложи одно конкретное следующее действие "
        . "менеджера (одно предложение, повелительное наклонение, по-русски).";
    $data = json_encode($body, JSON_UNESCAPED_UNICODE);
    $result = ai_run_assistant($user, $system, "Данные клиента/сделки: $data", 0.6, 300);
    return ['nextAction' => $result['content'], 'action' => $result['content'], 'success' => true];
}

function ai_generate_summary(array $user, array $body): array
{
    $system = "Ты AI-помощник CRM. Составь краткое резюме диалога (3-5 предложений) с ключевыми "
        . "договорённостями и следующими шагами. По-русски.";
    $messages = json_encode($body['messages'] ?? $body['conversation'] ?? $body, JSON_UNESCAPED_UNICODE);
    $result = ai_run_assistant($user, $system, "Диалог: $messages", 0.5, 800);
    return ['summary' => $result['content'], 'success' => true];
}

function ai_edit_technical_specification(array $user, array $body): array
{
    $system = "Ты AI-Технолог. Пользователь просит внести правки в существующее ТЗ. "
        . "Верни обновлённое ТЗ строго в JSON без markdown.";
    $spec = json_encode($body['specification'] ?? $body['current'] ?? [], JSON_UNESCAPED_UNICODE);
    $instruction = trim((string)($body['instruction'] ?? $body['message'] ?? ''));

    $apiKey = app_config()['openai_api_key'] ?? '';
    if (!$apiKey) return ['success' => false, 'error' => 'AI-ключ не настроен'];
    $response = openai_chat($apiKey, [
        ['role' => 'system', 'content' => $system],
        ['role' => 'user', 'content' => "Текущее ТЗ: $spec\n\nПравки: $instruction"],
    ], 0.2, 3000);
    $content = ai_extract_content($response);
    $parsed = json_decode(trim(preg_replace('/^```json|```$/m', '', $content)), true);
    if (!is_array($parsed)) return ['success' => false, 'error' => 'AI вернул не JSON', 'raw' => $content];
    if (!empty($parsed['id'])) save_record('technical_specifications', $user['id'], $parsed);
    return ['success' => true, 'specification' => $parsed];
}

// ---------- Роутер делегирования (assistant-router) ----------

function assistant_router(array $user, array $body): array
{
    $name = mb_strtolower(trim((string)($body['assistant_name'] ?? '')));
    $task = (string)($body['task_description'] ?? '');
    $data = (array)($body['additional_data'] ?? []);
    $payload = array_merge($data, ['task' => $task, 'message' => $task]);

    $map = [
        'сметчик' => 'ai_estimator', 'estimator' => 'ai_estimator',
        'технолог' => 'ai_technical_specialist', 'technical-specialist' => 'ai_technical_specialist',
        'аналитик' => 'ai_analyst', 'analyst' => 'ai_analyst',
        'консультант' => 'ai_consultant', 'consultant' => 'ai_consultant',
        'кп-менеджер' => 'ai_proposal_manager', 'proposal-manager' => 'ai_proposal_manager',
        'продажник' => 'ai_sales_manager', 'sales-manager' => 'ai_sales_manager',
        'поставщик-менеджер' => 'ai_supplier_manager', 'supplier-manager' => 'ai_supplier_manager',
        'подрядчик-менеджер' => 'ai_contractor_manager', 'contractor-manager' => 'ai_contractor_manager',
        'конкурентный-анализ' => 'ai_competitor_analysis', 'competitor-analysis' => 'ai_competitor_analysis',
    ];

    if (!isset($map[$name])) {
        return ['success' => false, 'error' => "Неизвестный ассистент: $name", 'available' => array_keys($map)];
    }
    $fn = $map[$name];
    if ($fn === 'ai_estimator') {
        require_once __DIR__ . '/ai-estimator.php';
    }
    $result = $fn($user, $payload);
    return ['success' => true, 'assistant' => $name, 'task' => $task, 'result' => $result, 'timestamp' => now_iso()];
}
