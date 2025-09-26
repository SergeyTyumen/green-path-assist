import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface IntegrationStatus {
  whatsapp: boolean;
  telegram: boolean;
  website: boolean;
}

export function useIntegrationStatus() {
  const { user } = useAuth();
  const [integrations, setIntegrations] = useState<IntegrationStatus>({
    whatsapp: false,
    telegram: false,
    website: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      checkIntegrationStatus();
    }
  }, [user]);

  const checkIntegrationStatus = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('integration_settings')
        .select('integration_type, is_active')
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const status: IntegrationStatus = {
        whatsapp: false,
        telegram: false,
        website: false
      };

      data?.forEach(integration => {
        if (integration.integration_type === 'whatsapp') {
          status.whatsapp = true;
        } else if (integration.integration_type === 'telegram') {
          status.telegram = true;
        } else if (integration.integration_type === 'website') {
          status.website = true;
        }
      });

      setIntegrations(status);
    } catch (error) {
      console.error('Error checking integration status:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    integrations,
    loading,
    refetch: checkIntegrationStatus
  };
}