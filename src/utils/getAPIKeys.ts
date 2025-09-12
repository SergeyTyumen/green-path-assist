import { useAuth } from "@/hooks/useAuth";

interface APIKeyConfig {
  provider: string;
  api_key: string;
  is_active: boolean;
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