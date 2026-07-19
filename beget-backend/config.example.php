<?php
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'DB_NAME_HERE',
        'user' => 'DB_USER_HERE',
        'password' => 'DB_PASSWORD_HERE',
        'charset' => 'utf8mb4',
    ],

    // Сгенерируйте своё значение: openssl rand -hex 32
    'jwt_secret' => 'CHANGE_ME_TO_LONG_RANDOM_SECRET',

    // Временный режим для первого входа: если пользователей нет, первый логин создаст администратора.
    // После создания первого пользователя обязательно поменяйте на false.
    'allow_first_admin_bootstrap' => true,

    // Ключи AI-провайдеров хранятся только на Beget, не во frontend-коде.
    'openai_api_key' => getenv('OPENAI_API_KEY') ?: '',
    'elevenlabs_api_key' => getenv('ELEVENLABS_API_KEY') ?: '', // опционально, только если TTS через ElevenLabs

    // Если frontend и api лежат на одном домене, оставьте пустым массивом.
    'allowed_origins' => [],
];
