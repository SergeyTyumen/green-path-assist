import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/components/ui/use-toast";

export interface AIAssistantSettings {
  id?: string;
  assistant_type: string;
  settings: Record<string, any>;
  is_active: boolean;
}

export interface AIPrompt {
  id?: string;
  assistant_type: string;
  prompt_type: string;
  name: string;
  content: string;
  variables: string[];
  is_default: boolean;
  is_active: boolean;
}

export const useAISettings = (assistantType: string) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AIAssistantSettings | null>(null);
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [loading, setLoading] = useState(true);

  // Загрузка настроек
  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Загружаем настройки
      const { data: settingsData, error: settingsError } = await supabase
        .from('ai_assistant_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('assistant_type', assistantType)
        .maybeSingle();

      if (settingsError) throw settingsError;

      // Загружаем промпты
      const { data: promptsData, error: promptsError } = await supabase
        .from('ai_prompts')
        .select('*')
        .eq('user_id', user.id)
        .eq('assistant_type', assistantType);

      if (promptsError) throw promptsError;

      setSettings(settingsData as AIAssistantSettings);
      setPrompts((promptsData || []) as AIPrompt[]);
    } catch (error) {
      console.error('Error loading AI settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки ассистента",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Сохранение настроек
  const saveSettings = async (newSettings: Record<string, any>) => {
    if (!user) return;

    try {
      const settingsData = {
        user_id: user.id,
        assistant_type: assistantType,
        settings: newSettings,
        is_active: true,
      };

      const { data, error } = await supabase
        .from('ai_assistant_settings')
        .upsert(settingsData, {
          onConflict: 'user_id,assistant_type'
        })
        .select()
        .single();

      if (error) throw error;

      setSettings(data as AIAssistantSettings);
      toast({
        title: "Успешно",
        description: "Настройки ассистента сохранены",
      });
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить настройки",
        variant: "destructive",
      });
    }
  };

  // Сохранение промпта
  const savePrompt = async (prompt: Omit<AIPrompt, 'id'>) => {
    if (!user) return;

    try {
      const promptData = {
        ...prompt,
        user_id: user.id,
        assistant_type: assistantType,
      };

      const { data, error } = await supabase
        .from('ai_prompts')
        .insert(promptData)
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => [...prev, data as AIPrompt]);
      toast({
        title: "Успешно",
        description: "Промпт добавлен",
      });

      return data;
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить промпт",
        variant: "destructive",
      });
    }
  };

  // Обновление промпта
  const updatePrompt = async (id: string, updates: Partial<AIPrompt>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('ai_prompts')
        .update(updates)
        .eq('id', id)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setPrompts(prev => prev.map(p => p.id === id ? data as AIPrompt : p));
      toast({
        title: "Успешно",
        description: "Промпт обновлен",
      });
    } catch (error) {
      console.error('Error updating prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить промпт",
        variant: "destructive",
      });
    }
  };

  // Удаление промпта
  const deletePrompt = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('ai_prompts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setPrompts(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Успешно",
        description: "Промпт удален",
      });
    } catch (error) {
      console.error('Error deleting prompt:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить промпт",
        variant: "destructive",
      });
    }
  };

  // Переключение активности ассистента
  const toggleActive = async () => {
    if (!settings) return;

    await saveSettings({
      ...settings.settings,
      is_active: !settings.is_active
    });
  };

  useEffect(() => {
    loadSettings();
  }, [user, assistantType]);

  return {
    settings,
    prompts,
    loading,
    saveSettings,
    savePrompt,
    updatePrompt,
    deletePrompt,
    toggleActive,
    reload: loadSettings,
  };
};