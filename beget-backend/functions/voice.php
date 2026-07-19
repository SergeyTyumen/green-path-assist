<?php
// Голосовой помощник: STT (Whisper), Chat (GPT-4o), TTS (OpenAI)

function voice_openai_key(): string
{
    $key = app_config()['openai_api_key'] ?? '';
    if (!$key) throw new RuntimeException('OPENAI_API_KEY не настроен в config.php');
    return $key;
}


/**
 * Chat: принимает {message, conversation_history} -> ответ модели.
 * Совместимо с прежним enhanced-voice-chat: возвращает {response, message}.
 */
function voice_chat(array $user, array $body): array
{
    $message = trim((string)($body['message'] ?? ''));
    if ($message === '') throw new RuntimeException('Пустое сообщение');

    $history = array_map(function ($m) {
        $role = ($m['role'] ?? 'user') === 'assistant' ? 'assistant' : 'user';
        return ['role' => $role, 'content' => (string)($m['content'] ?? '')];
    }, array_slice((array)($body['conversation_history'] ?? []), -10));

    $systemPrompt = "Ты голосовой помощник CRM для строительной компании. "
        . "Отвечай кратко, дружелюбно, по-русски. Помогай с задачами, клиентами, сметами, ТЗ. "
        . "Если пользователь просит выполнить действие в CRM — сообщи, что действие ставится в очередь.";

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
 * Text-to-speech: принимает {text, provider?, voice?} -> {audioContent: base64 mp3}.
 */
function voice_tts(array $user, array $body): array
{
    $text = trim((string)($body['text'] ?? ''));
    if ($text === '') throw new RuntimeException('Пустой текст для озвучки');
    if (mb_strlen($text) > 4000) $text = mb_substr($text, 0, 4000);

    $provider = strtolower((string)($body['provider'] ?? 'openai'));
    $voice = (string)($body['voice'] ?? '');

    if ($provider === 'elevenlabs') {
        $key = voice_elevenlabs_key();
        if (!$key) throw new RuntimeException('ELEVENLABS_API_KEY не настроен');
        $voiceId = $voice ?: 'JBFqnCBsd6RMkjVDRZzb'; // George
        $ch = curl_init("https://api.elevenlabs.io/v1/text-to-speech/$voiceId?output_format=mp3_44100_128");
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => ['xi-api-key: ' . $key, 'Content-Type: application/json'],
            CURLOPT_POSTFIELDS => json_encode(['text' => $text, 'model_id' => 'eleven_multilingual_v2'], JSON_UNESCAPED_UNICODE),
            CURLOPT_TIMEOUT => 120,
        ]);
        $raw = curl_exec($ch);
        $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($raw === false || $status >= 400) throw new RuntimeException('ElevenLabs TTS: ' . ($raw ?: curl_error($ch)));
        return ['audioContent' => base64_encode($raw), 'provider' => 'elevenlabs'];
    }

    // OpenAI по умолчанию
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
