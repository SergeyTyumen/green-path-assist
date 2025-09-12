import { supabase } from "@/integrations/supabase/client";

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

// Sync API keys from Supabase
export const getAPIKeys = async (userId: string): Promise<Record<string, string>> => {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabase
      .from('api_keys')
      .select('provider, api_key')
      .eq('user_id', userId);

    if (error) {
      console.error('Error loading API keys from Supabase:', error);
      // Fallback to localStorage
      return getAPIKeysFromLocalStorage(userId);
    }

    if (data && data.length > 0) {
      // Convert to object for convenient access
      const keysMap: Record<string, string> = {};
      data.forEach(item => {
        if (item.api_key) {
          keysMap[item.provider] = item.api_key;
        }
      });
      return keysMap;
    } else {
      // If no keys in Supabase, try localStorage and migrate
      const localKeys = getAPIKeysFromLocalStorage(userId);
      if (Object.keys(localKeys).length > 0) {
        // Migrate from localStorage to Supabase
        await migrateKeysToSupabase(userId, localKeys);
      }
      return localKeys;
    }
  } catch (error) {
    console.error('Error loading API keys:', error);
    // Fallback to localStorage
    return getAPIKeysFromLocalStorage(userId);
  }
};

// Fallback function for localStorage
const getAPIKeysFromLocalStorage = (userId: string): Record<string, string> => {
  try {
    const storageKey = `api_keys_${userId}`;
    const savedKeysRaw = localStorage.getItem(storageKey);
    const savedKeys: APIKeyConfig[] = savedKeysRaw ? JSON.parse(savedKeysRaw) : [];
    
    // Convert to object for convenient access
    const keysMap: Record<string, string> = {};
    
    savedKeys.forEach(config => {
      if (config.is_active && config.api_key) {
        keysMap[config.provider] = config.api_key;
      }
    });
    
    return keysMap;
  } catch (error) {
    console.error('Error loading API keys from localStorage:', error);
    return {};
  }
};

// Migrate keys from localStorage to Supabase
const migrateKeysToSupabase = async (userId: string, keys: Record<string, string>) => {
  try {
    const keysToInsert = Object.entries(keys).map(([provider, api_key]) => ({
      user_id: userId,
      provider,
      api_key
    }));

    const { error } = await supabase
      .from('api_keys')
      .upsert(keysToInsert, {
        onConflict: 'user_id,provider'
      });

    if (error) {
      console.error('Error migrating keys to Supabase:', error);
    } else {
      console.log('Successfully migrated API keys to Supabase');
    }
  } catch (error) {
    console.error('Error during migration:', error);
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

export const getOpenAIKey = async (userId: string): Promise<string | null> => {
  const keys = await getAPIKeys(userId);
  return keys.openai || null;
};

export const getElevenLabsKey = async (userId: string): Promise<string | null> => {
  const keys = await getAPIKeys(userId);
  return keys.elevenlabs || null;
};

export const getYandexKey = async (userId: string): Promise<string | null> => {
  const keys = await getAPIKeys(userId);
  return keys.yandexgpt || null;
};

export const getAnthropicKey = async (userId: string): Promise<string | null> => {
  const keys = await getAPIKeys(userId);
  return keys.anthropic || null;
};

// Helper for getting AI config for specific assistant
export const getAIConfigForAssistant = async (userId: string, assistantType: string) => {
  const keys = await getAPIKeys(userId);
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