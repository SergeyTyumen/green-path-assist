import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface ProposalSettings {
  id?: string;
  email_template: string;
  signature: string;
  default_validity_days: number;
  auto_send: boolean;
}

const defaultSettings: ProposalSettings = {
  email_template: 'Уважаемый {{client_name}}, направляем Вам коммерческое предложение по проекту "{{title}}".',
  signature: 'С уважением,\nКоманда компании',
  default_validity_days: 14,
  auto_send: false
};

export const useProposalSettings = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ProposalSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const loadSettings = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('proposal_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          email_template: data.email_template || defaultSettings.email_template,
          signature: data.signature || defaultSettings.signature,
          default_validity_days: data.default_validity_days || defaultSettings.default_validity_days,
          auto_send: data.auto_send || defaultSettings.auto_send
        });
      } else {
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Error loading proposal settings:', error);
      setSettings(defaultSettings);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: ProposalSettings) => {
    if (!user) return { error: new Error('User not authenticated') };

    try {
      const { data: existing } = await supabase
        .from('proposal_settings')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        // Обновляем существующие настройки
        const { error } = await supabase
          .from('proposal_settings')
          .update({
            email_template: newSettings.email_template,
            signature: newSettings.signature,
            default_validity_days: newSettings.default_validity_days,
            auto_send: newSettings.auto_send
          })
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        // Создаем новые настройки
        const { error } = await supabase
          .from('proposal_settings')
          .insert({
            user_id: user.id,
            email_template: newSettings.email_template,
            signature: newSettings.signature,
            default_validity_days: newSettings.default_validity_days,
            auto_send: newSettings.auto_send
          });

        if (error) throw error;
      }

      setSettings(newSettings);
      return { error: null };
    } catch (error) {
      console.error('Error saving proposal settings:', error);
      return { error: error as Error };
    }
  };

  useEffect(() => {
    loadSettings();
  }, [user]);

  return {
    settings,
    loading,
    saveSettings,
    refreshSettings: loadSettings
  };
};
