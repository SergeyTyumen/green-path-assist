<?php

function app_config(): array
{
    static $config = null;
    if ($config !== null) return $config;

    $local = __DIR__ . '/config.php';
    $example = __DIR__ . '/config.example.php';
    $config = require (file_exists($local) ? $local : $example);
    return $config;
}

function db(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $cfg = app_config()['db'];
    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=%s', $cfg['host'], $cfg['name'], $cfg['charset'] ?? 'utf8mb4');
    $pdo = new PDO($dsn, $cfg['user'], $cfg['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    return $pdo;
}

function uuidv4(): string
{
    $data = random_bytes(16);
    $data[6] = chr((ord($data[6]) & 0x0f) | 0x40);
    $data[8] = chr((ord($data[8]) & 0x3f) | 0x80);
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function now_iso(): string
{
    return gmdate('Y-m-d H:i:s');
}

function json_response($data = null, int $status = 200, $error = null): void
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['data' => $data, 'error' => $error], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function read_json_body(): array
{
    $raw = file_get_contents('php://input');
    if (!$raw) return [];
    $data = json_decode($raw, true);
    if (!is_array($data)) json_response(null, 400, ['message' => 'Некорректный JSON']);
    return $data;
}

function clean_identifier(string $value): string
{
    if (!preg_match('/^[a-zA-Z_][a-zA-Z0-9_]*$/', $value)) {
        json_response(null, 400, ['message' => 'Некорректное имя таблицы или поля']);
    }
    return $value;
}
