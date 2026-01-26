import { supabase } from './supabase';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  user_type: 'student' | 'owner';
  bio?: string;
  phone?: string;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data;
}

export async function createUserProfile(
  userId: string,
  email: string,
  fullName: string,
  userType: 'student' | 'owner'
) {
  const { error } = await supabase
    .from('user_profiles')
    .insert([
      {
        id: userId,
        email,
        full_name: fullName,
        user_type: userType,
      },
    ]);

  if (error) {
    throw error;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<UserProfile>) {
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    throw error;
  }
}

export async function signUp(email: string, password: string, fullName: string, userType: 'student' | 'owner') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await createUserProfile(data.user.id, email, fullName, userType);
  }

  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
