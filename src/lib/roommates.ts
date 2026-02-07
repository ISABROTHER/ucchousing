import { supabase } from './supabase';

export interface RoommateRequest {
  id: string;
  user_id: string;
  budget_min: number;
  budget_max: number;
  preferred_location: string;
  lifestyle: string;
  gender_preference: string;
  academic_level: string;
  description: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  user_profiles?: {
    full_name: string;
    avatar_url?: string;
  };
}

export async function getActiveRoommateRequests() {
  const { data, error } = await supabase
    .from('roommate_requests')
    .select(`
      *,
      user_profiles:user_id(full_name, avatar_url)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RoommateRequest[];
}

export async function getUserRoommateRequest(userId: string) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return data as RoommateRequest | null;
}

export async function createRoommateRequest(request: Omit<RoommateRequest, 'id' | 'created_at' | 'updated_at' | 'user_profiles'>) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .insert([request])
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateRoommateRequest(id: string, updates: Partial<RoommateRequest>) {
  const { data, error } = await supabase
    .from('roommate_requests')
    .update(updates)
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteRoommateRequest(id: string) {
  const { error } = await supabase
    .from('roommate_requests')
    .update({ is_active: false })
    .eq('id', id);

  if (error) throw error;
}
