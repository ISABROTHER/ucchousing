import { supabase } from './supabase';

export interface Conversation {
  id: string;
  hostel_id: string;
  student_id: string;
  owner_id: string;
  last_message_at: string;
  created_at: string;
  hostels?: { name: string; location: string };
  student?: { full_name: string; avatar_url: string | null };
  owner?: { full_name: string; avatar_url: string | null };
  unread_count?: number;
  last_message?: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { full_name: string; avatar_url: string | null };
}

export async function getConversations(userId: string): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('conversations')
    .select(`
      *,
      hostels(name, location),
      student:user_profiles!conversations_student_id_fkey(full_name, avatar_url),
      owner:user_profiles!conversations_owner_id_fkey(full_name, avatar_url)
    `)
    .or(`student_id.eq.${userId},owner_id.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOrCreateConversation(
  hostelId: string,
  studentId: string,
  ownerId: string
): Promise<Conversation> {
  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('hostel_id', hostelId)
    .eq('student_id', studentId)
    .maybeSingle();

  if (existing) return existing;

  const { data, error } = await supabase
    .from('conversations')
    .insert({ hostel_id: hostelId, student_id: studentId, owner_id: ownerId })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      *,
      sender:user_profiles!messages_sender_id_fkey(full_name, avatar_url)
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message> {
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 2000) {
    throw new Error('Message must be between 1 and 2000 characters');
  }

  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: trimmed })
    .select(`
      *,
      sender:user_profiles!messages_sender_id_fkey(full_name, avatar_url)
    `)
    .single();

  if (error) throw error;

  await supabase
    .from('conversations')
    .update({ last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function markMessagesRead(conversationId: string, userId: string): Promise<void> {
  await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .eq('is_read', false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { data: convos } = await supabase
    .from('conversations')
    .select('id')
    .or(`student_id.eq.${userId},owner_id.eq.${userId}`);

  if (!convos || convos.length === 0) return 0;

  const convoIds = convos.map(c => c.id);
  const { count } = await supabase
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .in('conversation_id', convoIds)
    .neq('sender_id', userId)
    .eq('is_read', false);

  return count || 0;
}
