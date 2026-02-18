import { supabase } from './supabase';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

export type NotificationType =
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'new_message'
  | 'maintenance_update'
  | 'check_in_reminder'
  | 'check_out_reminder'
  | 'review_request'
  | 'payment_received'
  | 'new_booking';

export async function getNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return count || 0;
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  body: string,
  data: Record<string, unknown> = {}
): Promise<void> {
  await supabase.from('notifications').insert({ user_id: userId, type, title, body, data });
}

export function getNotificationIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    booking_confirmed: 'CheckCircle',
    booking_cancelled: 'XCircle',
    new_message: 'MessageCircle',
    maintenance_update: 'Wrench',
    check_in_reminder: 'LogIn',
    check_out_reminder: 'LogOut',
    review_request: 'Star',
    payment_received: 'DollarSign',
    new_booking: 'Calendar',
  };
  return icons[type] || 'Bell';
}

export function getNotificationColor(type: NotificationType): string {
  const colors: Record<NotificationType, string> = {
    booking_confirmed: 'text-green-600 bg-green-50',
    booking_cancelled: 'text-red-600 bg-red-50',
    new_message: 'text-blue-600 bg-blue-50',
    maintenance_update: 'text-orange-600 bg-orange-50',
    check_in_reminder: 'text-teal-600 bg-teal-50',
    check_out_reminder: 'text-amber-600 bg-amber-50',
    review_request: 'text-yellow-600 bg-yellow-50',
    payment_received: 'text-emerald-600 bg-emerald-50',
    new_booking: 'text-sky-600 bg-sky-50',
  };
  return colors[type] || 'text-gray-600 bg-gray-50';
}
