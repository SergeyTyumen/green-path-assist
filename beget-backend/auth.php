<?php
require_once __DIR__ . '/db.php';

function b64url_encode(string $data): string
{
    return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
}

function b64url_decode(string $data): string|false
{
    return base64_decode(strtr($data . str_repeat('=', (4 - strlen($data) % 4) % 4), '-_', '+/'));
}

function sign_token(array $payload): string
{
    $secret = app_config()['jwt_secret'];
    $header = ['alg' => 'HS256', 'typ' => 'JWT'];
    $segments = [b64url_encode(json_encode($header)), b64url_encode(json_encode($payload, JSON_UNESCAPED_UNICODE))];
    $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
    $segments[] = b64url_encode($signature);
    return implode('.', $segments);
}

function verify_token(?string $token): ?array
{
    if (!$token) return null;
    $parts = explode('.', $token);
    if (count($parts) !== 3) return null;

    [$h, $p, $s] = $parts;
    $expected = b64url_encode(hash_hmac('sha256', "$h.$p", app_config()['jwt_secret'], true));
    if (!hash_equals($expected, $s)) return null;

    $payload = json_decode(b64url_decode($p), true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) return null;
    return $payload;
}

function bearer_token(): ?string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
    if (preg_match('/Bearer\s+(.+)/i', $header, $m)) return trim($m[1]);
    return $_COOKIE['crm_token'] ?? null;
}

function current_user(): ?array
{
    $payload = verify_token(bearer_token());
    if (!$payload || empty($payload['sub'])) return null;

    $stmt = db()->prepare('SELECT id, email, full_name, status FROM users WHERE id = ? LIMIT 1');
    $stmt->execute([$payload['sub']]);
    $user = $stmt->fetch();
    if (!$user || $user['status'] !== 'active') return null;
    return $user;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) json_response(null, 401, ['message' => 'Требуется вход в CRM']);
    return $user;
}

function user_has_role(string $userId, string $role): bool
{
    $stmt = db()->prepare('SELECT 1 FROM user_roles WHERE user_id = ? AND role = ? LIMIT 1');
    $stmt->execute([$userId, $role]);
    return (bool)$stmt->fetchColumn();
}

function build_session(array $user): array
{
    $expires = time() + 60 * 60 * 24 * 30;
    $token = sign_token(['sub' => $user['id'], 'email' => $user['email'], 'exp' => $expires]);
    setcookie('crm_token', $token, [
        'expires' => $expires,
        'path' => '/',
        'secure' => !empty($_SERVER['HTTPS']),
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    $publicUser = [
        'id' => $user['id'],
        'email' => $user['email'],
        'user_metadata' => ['full_name' => $user['full_name'] ?? ''],
    ];

    return [
        'access_token' => $token,
        'token_type' => 'bearer',
        'expires_at' => $expires,
        'user' => $publicUser,
    ];
}

function handle_auth_action(string $action, array $body): void
{
    if ($action === 'auth.login') {
        $email = mb_strtolower(trim($body['email'] ?? ''));
        $password = (string)($body['password'] ?? '');
        if (!$email || !$password) json_response(null, 400, ['message' => 'Укажите email и пароль']);

        $count = (int)db()->query('SELECT COUNT(*) FROM users')->fetchColumn();
        if ($count === 0 && !empty(app_config()['allow_first_admin_bootstrap'])) {
            $id = uuidv4();
            $stmt = db()->prepare('INSERT INTO users (id, email, password_hash, full_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, "active", ?, ?)');
            $stmt->execute([$id, $email, password_hash($password, PASSWORD_DEFAULT), 'Администратор', now_iso(), now_iso()]);
            db()->prepare('INSERT INTO user_roles (id, user_id, role, created_at) VALUES (?, ?, "admin", ?)')->execute([uuidv4(), $id, now_iso()]);
            db()->prepare('INSERT INTO profiles (id, user_id, email, full_name, status, created_at, updated_at) VALUES (?, ?, ?, ?, "active", ?, ?)')
                ->execute([uuidv4(), $id, $email, 'Администратор', now_iso(), now_iso()]);
        }

        $stmt = db()->prepare('SELECT id, email, password_hash, full_name, status FROM users WHERE email = ? LIMIT 1');
        $stmt->execute([$email]);
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash']) || $user['status'] !== 'active') {
            json_response(null, 401, ['message' => 'Неверный email или пароль']);
        }

        $session = build_session($user);
        json_response(['user' => $session['user'], 'session' => $session]);
    }

    if ($action === 'auth.me') {
        $user = require_user();
        json_response(['user' => ['id' => $user['id'], 'email' => $user['email'], 'user_metadata' => ['full_name' => $user['full_name'] ?? '']]]);
    }

    if ($action === 'auth.logout') {
        setcookie('crm_token', '', ['expires' => time() - 3600, 'path' => '/']);
        json_response(['ok' => true]);
    }

    if ($action === 'auth.updateUser') {
        $user = require_user();
        if (!empty($body['password'])) {
            if (mb_strlen($body['password']) < 6) json_response(null, 400, ['message' => 'Пароль должен быть минимум 6 символов']);
            $stmt = db()->prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?');
            $stmt->execute([password_hash($body['password'], PASSWORD_DEFAULT), now_iso(), $user['id']]);
        }
        $session = build_session($user);
        json_response(['user' => $session['user'], 'session' => $session]);
    }

    if ($action === 'auth.resetPasswordForEmail') {
        json_response(['message' => 'Восстановление пароля нужно подключить к SMTP Beget отдельным шагом.']);
    }
}
