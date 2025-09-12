import { useAuth } from "@/hooks/useAuth";

interface APIKeyConfig {
  provider: string;
  api_key: string;
  is_active: boolean;
}

interface UserSettings {
  preferred_ai_model: 'openai' | 'yandex' | 'anthropic';
  interaction_mode: 'text' | 'voice' | 'mixed';
  ai_settings: {
    openai_model: string;
    yandex_model: string;
    anthropic_model: string;
    temperature: number;
    max_tokens: number;
  };
}

export const getAPIKeys = (userId: string): Record<string, string> => {
  try {
    const storageKey = `api_keys_${userId}`;
    const savedKeysRaw = localStorage.getItem(storageKey);
    const savedKeys: APIKeyConfig[] = savedKeysRaw ? JSON.parse(savedKeysRaw) : [];
    
    // Преобразуем в объект для удобного доступа
    const keysMap: Record<string, string> = {};
    
    savedKeys.forEach(config => {
      if (config.is_active && config.api_key) {
        keysMap[config.provider] = config.api_key;
      }
    });
    
    return keysMap;
  } catch (error) {
    console.error('Error loading API keys:', error);
    return {};
  }
};

export const getUserSettings = (userId: string): UserSettings | null => {
  try {
    const storageKey = `user_settings_${userId}`;
    const savedSettingsRaw = localStorage.getItem(storageKey);
    return savedSettingsRaw ? JSON.parse(savedSettingsRaw) : null;
  } catch (error) {
    console.error('Error loading user settings:', error);
    return null;
  }
};

export const getOpenAIKey = (userId: string): string | null => {
  const keys = getAPIKeys(userId);
  return keys.openai || null;
};

export const getElevenLabsKey = (userId: string): string | null => {
  const keys = getAPIKeys(userId);
  return keys.elevenlabs || null;
};

export const getYandexKey = (userId: string): string | null => {
  const keys = getAPIKeys(userId);
  return keys.yandexgpt || null;
};

export const getAnthropicKey = (userId: string): string | null => {
  const keys = getAPIKeys(userId);
  return keys.anthropic || null;
};

// Helper для получения настроек AI для конкретного помощника
export const getAIConfigForAssistant = (userId: string, assistantType: string) => {
  const keys = getAPIKeys(userId);
  const settings = getUserSettings(userId);
  
  if (!settings) {
    return null;
  }

  const modelConfig = {
    openai: {
      apiKey: keys.openai,
      model: settings.ai_settings.openai_model || 'gpt-4o-mini',
      temperature: settings.ai_settings.temperature || 0.7,
      max_tokens: settings.ai_settings.max_tokens || 1000
    },
    yandex: {
      apiKey: keys.yandexgpt,
      model: settings.ai_settings.yandex_model || 'yandexgpt',
      temperature: settings.ai_settings.temperature || 0.7,
      max_tokens: settings.ai_settings.max_tokens || 1000
    },
    anthropic: {
      apiKey: keys.anthropic,
      model: settings.ai_settings.anthropic_model || 'claude-3-haiku-20240307',
      temperature: settings.ai_settings.temperature || 0.7,
      max_tokens: settings.ai_settings.max_tokens || 1000
    }
  };

  const provider = settings.preferred_ai_model;
  return modelConfig[provider] || modelConfig.openai;
};