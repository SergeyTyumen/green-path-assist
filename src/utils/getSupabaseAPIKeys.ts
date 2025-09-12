import { supabase } from "@/integrations/supabase/client";

// Utility for edge functions to get API keys from database
export const getAPIKeyFromDatabase = async (userId: string, provider: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('api_key')
      .eq('user_id', userId)
      .eq('provider', provider)
      .single();

    if (error) {
      console.error(`Error fetching ${provider} API key:`, error);
      return null;
    }

    return data?.api_key || null;
  } catch (error) {
    console.error(`Error accessing database for ${provider} key:`, error);
    return null;
  }
};

// Get all user's API keys for edge functions
export const getAllAPIKeysFromDatabase = async (userId: string): Promise<Record<string, string>> => {
  try {
    const { data, error } = await supabase
      .from('api_keys')
      .select('provider, api_key')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching API keys:', error);
      return {};
    }

    const keysMap: Record<string, string> = {};
    if (data) {
      data.forEach(item => {
        keysMap[item.provider] = item.api_key;
      });
    }

    return keysMap;
  } catch (error) {
    console.error('Error accessing database for API keys:', error);
    return {};
  }
};