import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  phone: string | null;
  user_type: string | null;
  company_name: string | null;
  created_at: string;
  updated_at: string;
  preferred_ai_model: string | null;
  interaction_mode: string | null;
  voice_settings: any;
  ai_settings: any;
  advanced_features: any;
  email: string | null;
  position: string | null;
  department: string | null;
  telegram_username: string | null;
  whatsapp_phone: string | null;
  avatar_url: string | null;
  ui_preferences: any;
}

export function useProfiles() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      setProfiles(data || []);
    } catch (error) {
      console.error('Error fetching profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching current profile:', error);
        return;
      }

      setCurrentProfile(data);
    } catch (error) {
      console.error('Error fetching current profile:', error);
    }
  };

  const updateProfile = async (profileData: Partial<Profile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating profile:', error);
        throw error;
      }

      setCurrentProfile(data);
      await fetchProfiles();
      return data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const createProfile = async (profileData: Partial<Profile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .insert({
          ...profileData,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile:', error);
        throw error;
      }

      setCurrentProfile(data);
      await fetchProfiles();
      return data;
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      fetchProfiles();
      fetchCurrentProfile();
    }
  }, [user]);

  return {
    profiles,
    currentProfile,
    loading,
    updateProfile,
    createProfile,
    refetch: () => {
      fetchProfiles();
      fetchCurrentProfile();
    }
  };
}