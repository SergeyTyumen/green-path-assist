<?php
require_once __DIR__ . '/auth.php';

$config = app_config();
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && (empty($config['allowed_origins']) || in_array($origin, $config['allowed_origins'], true))) {
    header("Access-Control-Allow-Origin: $origin");
    header('Vary: Origin');
}
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Headers: Authorization, Content-Type');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit;

$action = $_GET['action'] ?? '';
$body = $_SERVER['REQUEST_METHOD'] === 'POST' && str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') ? [] : read_json_body();

try {
    if (str_starts_with($action, 'auth.')) handle_auth_action($action, $body);
    if ($action === 'query') handle_query($body);
    if ($action === 'rpc') handle_rpc($body);
    if ($action === 'function') handle_function($body);
    if ($action === 'upload') handle_upload();
    json_response(null, 404, ['message' => 'Неизвестное действие API']);
} catch (Throwable $e) {
    json_response(null, 500, ['message' => $e->getMessage()]);
}

function row_to_record(array $row): array
{
    $data = json_decode($row['data'] ?? '{}', true) ?: [];
    return array_merge($data, [
        'id' => $row['id'],
        'user_id' => $row['user_id'],
        'created_at' => $row['created_at'],
        'updated_at' => $row['updated_at'],
    ]);
}

function split_record(array $record, string $userId): array
{
    $id = $record['id'] ?? uuidv4();
    $createdAt = $record['created_at'] ?? now_iso();
    $updatedAt = $record['updated_at'] ?? now_iso();
    $recordUserId = $record['user_id'] ?? $userId;
    unset($record['id'], $record['user_id'], $record['created_at'], $record['updated_at']);
    return [$id, $recordUserId, $createdAt, $updatedAt, $record];
}

function filter_sql(array $filters, array &$params): string
{
    $parts = [];
    foreach ($filters as $filter) {
        $column = clean_identifier((string)($filter['column'] ?? ''));
        $op = (string)($filter['operator'] ?? 'eq');
        $value = $filter['value'] ?? null;
        $expr = in_array($column, ['id', 'user_id', 'created_at', 'updated_at'], true)
            ? $column
            : "JSON_UNQUOTE(JSON_EXTRACT(data, '$.$column'))";

        if ($op === 'eq') { $parts[] = "$expr = ?"; $params[] = $value; }
        elseif ($op === 'gte') { $parts[] = "$expr >= ?"; $params[] = $value; }
        elseif ($op === 'lt') { $parts[] = "$expr < ?"; $params[] = $value; }
        elseif ($op === 'in' && is_array($value)) {
            if (!$value) { $parts[] = '1=0'; continue; }
            $parts[] = "$expr IN (" . implode(',', array_fill(0, count($value), '?')) . ')';
            array_push($params, ...$value);
        } elseif ($op === 'is') {
            $parts[] = $value === null ? "$expr IS NULL" : "$expr IS NOT NULL";
        } elseif (str_starts_with($op, 'not.')) {
            $parts[] = "$expr != ?"; $params[] = $value;
        }
    }
    return $parts ? ' AND ' . implode(' AND ', $parts) : '';
}

function load_records(string $table, string $userId, array $payload): array
{
    $params = [$table, $userId];
    $where = 'logical_table = ? AND user_id = ?' . filter_sql($payload['filters'] ?? [], $params);

    $orderSql = '';
    foreach (($payload['order'] ?? []) as $order) {
        $column = clean_identifier((string)($order['column'] ?? 'created_at'));
        $dir = !empty($order['ascending']) ? 'ASC' : 'DESC';
        $expr = in_array($column, ['id', 'user_id', 'created_at', 'updated_at'], true)
            ? $column
            : "JSON_UNQUOTE(JSON_EXTRACT(data, '$.$column'))";
        $orderSql = " ORDER BY $expr $dir";
        break;
    }
    if (!$orderSql) $orderSql = ' ORDER BY created_at DESC';

    $limitSql = isset($payload['limit']) && $payload['limit'] ? ' LIMIT ' . max(1, (int)$payload['limit']) : '';
    $stmt = db()->prepare("SELECT * FROM crm_records WHERE $where$orderSql$limitSql");
    $stmt->execute($params);
    return array_map('row_to_record', $stmt->fetchAll());
}

function real_filter_sql(array $filters, array &$params, array $allowedColumns): string
{
    $parts = [];
    foreach ($filters as $filter) {
        $column = clean_identifier((string)($filter['column'] ?? ''));
        if (!in_array($column, $allowedColumns, true)) continue;
        $op = (string)($filter['operator'] ?? 'eq');
        $value = $filter['value'] ?? null;

        if ($op === 'eq') { $parts[] = "$column = ?"; $params[] = $value; }
        elseif ($op === 'in' && is_array($value)) {
            if (!$value) { $parts[] = '1=0'; continue; }
            $parts[] = "$column IN (" . implode(',', array_fill(0, count($value), '?')) . ')';
            array_push($params, ...$value);
        } elseif ($op === 'is') {
            $parts[] = $value === null ? "$column IS NULL" : "$column IS NOT NULL";
        }
    }
    return $parts ? ' AND ' . implode(' AND ', $parts) : '';
}

function handle_profiles_query(array $payload, array $user): void
{
    $columns = ['id', 'user_id', 'email', 'full_name', 'phone', 'user_type', 'company_name', 'status', 'position', 'department', 'telegram_username', 'whatsapp_phone', 'avatar_url', 'preferred_ai_model', 'interaction_mode', 'voice_settings', 'ai_settings', 'advanced_features', 'ui_preferences', 'created_at', 'updated_at'];
    $operation = $payload['operation'] ?? 'select';
    $isAdmin = user_has_role($user['id'], 'admin');

    if ($operation === 'select') {
        $params = [];
        $where = $isAdmin ? '1=1' : 'user_id = ?';
        if (!$isAdmin) $params[] = $user['id'];
        $where .= real_filter_sql($payload['filters'] ?? [], $params, $columns);

        $orderSql = ' ORDER BY full_name ASC';
        foreach (($payload['order'] ?? []) as $order) {
            $column = clean_identifier((string)($order['column'] ?? 'full_name'));
            if (in_array($column, $columns, true)) {
                $dir = !empty($order['ascending']) ? 'ASC' : 'DESC';
                $orderSql = " ORDER BY $column $dir";
            }
            break;
        }

        $stmt = db()->prepare("SELECT * FROM profiles WHERE $where$orderSql");
        $stmt->execute($params);
        $rows = array_map('normalize_profile_row', $stmt->fetchAll());
        if (!empty($payload['single']) || !empty($payload['maybeSingle'])) json_response($rows[0] ?? null);
        json_response($rows);
    }

    if ($operation === 'insert' || $operation === 'upsert') {
        $values = $payload['values'] ?? [];
        $items = array_is_list($values) ? $values : [$values];
        $saved = [];
        foreach ($items as $item) {
            $profileUserId = $item['user_id'] ?? $user['id'];
            if (!$isAdmin && $profileUserId !== $user['id']) json_response(null, 403, ['message' => 'Недостаточно прав']);
            $id = $item['id'] ?? uuidv4();
            $now = now_iso();
            $data = array_intersect_key($item, array_flip($columns));
            $data = array_merge([
                'id' => $id,
                'user_id' => $profileUserId,
                'email' => $user['email'] ?? null,
                'full_name' => $user['full_name'] ?? null,
                'status' => 'active',
                'created_at' => $now,
                'updated_at' => $now,
            ], $data, ['updated_at' => $now]);
            db()->prepare('INSERT INTO profiles (id, user_id, email, full_name, phone, user_type, company_name, status, position, department, telegram_username, whatsapp_phone, avatar_url, preferred_ai_model, interaction_mode, voice_settings, ai_settings, advanced_features, ui_preferences, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email), full_name = VALUES(full_name), phone = VALUES(phone), user_type = VALUES(user_type), company_name = VALUES(company_name), status = VALUES(status), position = VALUES(position), department = VALUES(department), telegram_username = VALUES(telegram_username), whatsapp_phone = VALUES(whatsapp_phone), avatar_url = VALUES(avatar_url), preferred_ai_model = VALUES(preferred_ai_model), interaction_mode = VALUES(interaction_mode), voice_settings = VALUES(voice_settings), ai_settings = VALUES(ai_settings), advanced_features = VALUES(advanced_features), ui_preferences = VALUES(ui_preferences), updated_at = VALUES(updated_at)')
                ->execute([$data['id'], $data['user_id'], $data['email'], $data['full_name'], $data['phone'] ?? null, $data['user_type'] ?? null, $data['company_name'] ?? null, $data['status'], $data['position'] ?? null, $data['department'] ?? null, $data['telegram_username'] ?? null, $data['whatsapp_phone'] ?? null, $data['avatar_url'] ?? null, $data['preferred_ai_model'] ?? null, $data['interaction_mode'] ?? null, json_encode($data['voice_settings'] ?? null, JSON_UNESCAPED_UNICODE), json_encode($data['ai_settings'] ?? null, JSON_UNESCAPED_UNICODE), json_encode($data['advanced_features'] ?? null, JSON_UNESCAPED_UNICODE), json_encode($data['ui_preferences'] ?? null, JSON_UNESCAPED_UNICODE), $data['created_at'], $data['updated_at']]);
            $saved[] = normalize_profile_row($data);
        }
        json_response(!empty($payload['single']) ? ($saved[0] ?? null) : $saved);
    }

    if ($operation === 'update') {
        $params = [];
        $where = $isAdmin ? '1=1' : 'user_id = ?';
        if (!$isAdmin) $params[] = $user['id'];
        $where .= real_filter_sql($payload['filters'] ?? [], $params, $columns);
        $updates = array_intersect_key($payload['values'] ?? [], array_flip($columns));
        unset($updates['id'], $updates['user_id'], $updates['created_at']);
        $updates = encode_profile_json_fields($updates);
        $updates['updated_at'] = now_iso();
        if (!$updates) json_response(null, 400, ['message' => 'Нет данных для обновления']);
        $set = implode(', ', array_map(fn($c) => "$c = ?", array_keys($updates)));
        db()->prepare("UPDATE profiles SET $set WHERE $where")->execute([...array_values($updates), ...$params]);
        $stmt = db()->prepare("SELECT * FROM profiles WHERE $where LIMIT 1");
        $stmt->execute($params);
        $row = $stmt->fetch();
        json_response($row ? normalize_profile_row($row) : null);
    }

    json_response(null, 400, ['message' => 'Неподдерживаемая операция профилей']);
}

function normalize_profile_row(array $row): array
{
    foreach (['voice_settings', 'ai_settings', 'advanced_features', 'ui_preferences'] as $field) {
        if (isset($row[$field]) && is_string($row[$field])) $row[$field] = json_decode($row[$field], true);
    }
    return $row;
}

function encode_profile_json_fields(array $values): array
{
    foreach (['voice_settings', 'ai_settings', 'advanced_features', 'ui_preferences'] as $field) {
        if (array_key_exists($field, $values) && !is_string($values[$field])) {
            $values[$field] = json_encode($values[$field], JSON_UNESCAPED_UNICODE);
        }
    }
    return $values;
}

function handle_user_roles_query(array $payload, array $user): void
{
    $operation = $payload['operation'] ?? 'select';
    $isAdmin = user_has_role($user['id'], 'admin');
    $columns = ['id', 'user_id', 'role', 'created_at'];

    if ($operation === 'select') {
        $params = [];
        $where = $isAdmin ? '1=1' : 'user_id = ?';
        if (!$isAdmin) $params[] = $user['id'];
        $where .= real_filter_sql($payload['filters'] ?? [], $params, $columns);
        $stmt = db()->prepare("SELECT * FROM user_roles WHERE $where ORDER BY created_at DESC");
        $stmt->execute($params);
        $rows = $stmt->fetchAll();
        if (!empty($payload['single']) || !empty($payload['maybeSingle'])) json_response($rows[0] ?? null);
        json_response($rows);
    }

    if (!$isAdmin) json_response(null, 403, ['message' => 'Недостаточно прав']);

    if ($operation === 'insert' || $operation === 'upsert') {
        $values = $payload['values'] ?? [];
        $items = array_is_list($values) ? $values : [$values];
        $saved = [];
        foreach ($items as $item) {
            $id = $item['id'] ?? uuidv4();
            $createdAt = $item['created_at'] ?? now_iso();
            db()->prepare('INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)')
                ->execute([$id, $item['user_id'], $item['role'], $createdAt]);
            $saved[] = ['id' => $id, 'user_id' => $item['user_id'], 'role' => $item['role'], 'created_at' => $createdAt];
        }
        json_response(!empty($payload['single']) ? ($saved[0] ?? null) : $saved);
    }

    if ($operation === 'update') {
        $params = [];
        $where = '1=1' . real_filter_sql($payload['filters'] ?? [], $params, $columns);
        $role = $payload['values']['role'] ?? null;
        if (!$role) json_response(null, 400, ['message' => 'Не указана роль']);
        db()->prepare("UPDATE user_roles SET role = ? WHERE $where")->execute([$role, ...$params]);
        json_response(null);
    }

    if ($operation === 'delete') {
        $params = [];
        $where = '1=1' . real_filter_sql($payload['filters'] ?? [], $params, $columns);
        db()->prepare("DELETE FROM user_roles WHERE $where")->execute($params);
        json_response(null);
    }

    json_response(null, 400, ['message' => 'Неподдерживаемая операция ролей']);
}

function handle_query(array $payload): void
{
    $user = require_user();
    $table = clean_identifier((string)($payload['table'] ?? ''));
    $operation = $payload['operation'] ?? 'select';

    if ($table === 'profiles') handle_profiles_query($payload, $user);
    if ($table === 'user_roles') handle_user_roles_query($payload, $user);

    if ($operation === 'select') {
        $rows = load_records($table, $user['id'], $payload);
        if (!empty($payload['single']) || !empty($payload['maybeSingle'])) json_response($rows[0] ?? null);
        json_response($rows);
    }

    if ($operation === 'insert' || $operation === 'upsert') {
        $values = $payload['values'] ?? [];
        $items = array_is_list($values) ? $values : [$values];
        $saved = [];
        foreach ($items as $item) {
            [$id, $recordUserId, $createdAt, $updatedAt, $data] = split_record($item, $user['id']);
            $stmt = db()->prepare('INSERT INTO crm_records (id, logical_table, user_id, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)');
            $stmt->execute([$id, $table, $recordUserId, json_encode($data, JSON_UNESCAPED_UNICODE), $createdAt, $updatedAt]);
            $saved[] = array_merge($data, ['id' => $id, 'user_id' => $recordUserId, 'created_at' => $createdAt, 'updated_at' => $updatedAt]);
        }
        json_response(!empty($payload['single']) ? ($saved[0] ?? null) : $saved);
    }

    if ($operation === 'update') {
        $rows = load_records($table, $user['id'], $payload);
        $updates = $payload['values'] ?? [];
        $saved = [];
        foreach ($rows as $row) {
            $merged = array_merge($row, $updates, ['updated_at' => now_iso()]);
            [$id, $recordUserId, $createdAt, $updatedAt, $data] = split_record($merged, $user['id']);
            db()->prepare('UPDATE crm_records SET data = ?, updated_at = ? WHERE id = ? AND logical_table = ? AND user_id = ?')
                ->execute([json_encode($data, JSON_UNESCAPED_UNICODE), $updatedAt, $id, $table, $user['id']]);
            $saved[] = array_merge($data, ['id' => $id, 'user_id' => $recordUserId, 'created_at' => $createdAt, 'updated_at' => $updatedAt]);
        }
        json_response(!empty($payload['single']) ? ($saved[0] ?? null) : $saved);
    }

    if ($operation === 'delete') {
        $rows = load_records($table, $user['id'], $payload);
        foreach ($rows as $row) {
            db()->prepare('DELETE FROM crm_records WHERE id = ? AND logical_table = ? AND user_id = ?')->execute([$row['id'], $table, $user['id']]);
        }
        json_response(null);
    }

    json_response(null, 400, ['message' => 'Неподдерживаемая операция']);
}

function handle_rpc(array $body): void
{
    $user = require_user();
    $name = $body['name'] ?? '';
    $args = $body['args'] ?? [];
    if ($name === 'has_role') json_response(user_has_role($args['_user_id'] ?? $user['id'], $args['_role'] ?? 'user'));
    if ($name === 'is_admin') json_response(user_has_role($user['id'], 'admin'));
    if ($name === 'mark_messages_as_read') json_response(true);
    json_response(null, 404, ['message' => 'RPC не реализован']);
}

function handle_function(array $body): void
{
    $user = require_user();
    $name = clean_identifier(str_replace('-', '_', (string)($body['name'] ?? '')));
    $fnBody = $body['body'] ?? [];

    if ($name === 'ai_technical_specialist') {
        require_once __DIR__ . '/functions/ai-technical-specialist.php';
        json_response(ai_technical_specialist($user, $fnBody));
    }
    if ($name === 'ai_estimator') {
        require_once __DIR__ . '/functions/ai-estimator.php';
        json_response(ai_estimator($user, $fnBody));
    }
    if (in_array($name, ['enhanced_voice_chat', 'voice_chat'], true)) {
        require_once __DIR__ . '/functions/voice.php';
        require_once __DIR__ . '/functions/ai-technical-specialist.php';
        json_response(voice_chat($user, $fnBody));
    }
    if ($name === 'speech_to_text') {
        require_once __DIR__ . '/functions/voice.php';
        json_response(voice_stt($user, $fnBody));
    }
    if ($name === 'text_to_speech') {
        require_once __DIR__ . '/functions/voice.php';
        json_response(voice_tts($user, $fnBody));
    }

    // Остальные AI-помощники
    $aiMap = [
        'ai_consultant' => 'ai_consultant',
        'ai_analyst' => 'ai_analyst',
        'ai_proposal_manager' => 'ai_proposal_manager',
        'ai_sales_manager' => 'ai_sales_manager',
        'ai_supplier_manager' => 'ai_supplier_manager',
        'ai_contractor_manager' => 'ai_contractor_manager',
        'competitor_analysis' => 'ai_competitor_analysis',
        'generate_next_action' => 'ai_generate_next_action',
        'generate_conversation_summary' => 'ai_generate_summary',
        'edit_technical_specification' => 'ai_edit_technical_specification',
        'assistant_router' => 'assistant_router',
    ];
    if (isset($aiMap[$name])) {
        require_once __DIR__ . '/functions/ai-assistants.php';
        $fn = $aiMap[$name];
        json_response($fn($user, $fnBody));
    }

    json_response(null, 501, ['message' => "Функция $name ещё не перенесена на PHP"]);
}

function handle_upload(): void
{
    $user = require_user();
    $bucket = clean_identifier($_POST['bucket'] ?? 'files');
    $path = trim($_POST['path'] ?? '', '/');
    if (!$path || empty($_FILES['file']['tmp_name'])) json_response(null, 400, ['message' => 'Файл не передан']);

    $safePath = preg_replace('/[^a-zA-Z0-9_\.\-\/]/', '_', $path);
    $targetDir = __DIR__ . '/uploads/' . $bucket . '/' . dirname($safePath);
    if (!is_dir($targetDir)) mkdir($targetDir, 0775, true);
    $target = __DIR__ . '/uploads/' . $bucket . '/' . $safePath;
    if (!move_uploaded_file($_FILES['file']['tmp_name'], $target)) json_response(null, 500, ['message' => 'Не удалось сохранить файл']);
    json_response(['path' => $safePath, 'fullPath' => "/uploads/$bucket/$safePath", 'user_id' => $user['id']]);
}
