import { supabase } from './supabase';

export interface LaundryProvider {
  id: string;
  name: string;
  location: string;
  city: string;
  phone: string | null;
  is_active: boolean;
  price_per_kg: number;
  delivery_fee: number;
  rating: number;
  review_count: number;
  created_at: string;
}

export type LaundryStatus =
  | 'pending'
  | 'confirmed'
  | 'picked_up'
  | 'washing'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

export interface LaundryOrder {
  id: string;
  student_id: string;
  provider_id: string;
  hostel_id: string | null;
  pickup_address: string;
  delivery_address: string;
  estimated_weight_kg: number;
  status: LaundryStatus;
  pickup_scheduled_at: string | null;
  delivered_at: string | null;
  total_price: number | null;
  special_instructions: string | null;
  created_at: string;
  updated_at: string;
  laundry_providers?: LaundryProvider;
  tracking?: LaundryTracking[];
}

export interface LaundryTracking {
  id: string;
  order_id: string;
  status: string;
  message: string;
  created_at: string;
}

export const LAUNDRY_STATUS_STEPS: { status: LaundryStatus; label: string; message: string }[] = [
  { status: 'pending', label: 'Order Placed', message: 'Your laundry order has been placed and is awaiting confirmation.' },
  { status: 'confirmed', label: 'Confirmed', message: 'Your order has been confirmed. A rider will pick up your laundry soon.' },
  { status: 'picked_up', label: 'Picked Up', message: 'Your laundry has been picked up and is on the way to the laundry facility.' },
  { status: 'washing', label: 'Being Washed', message: 'Your clothes are currently being washed and treated with care.' },
  { status: 'out_for_delivery', label: 'Out for Delivery', message: 'Your clean laundry is on the way back to you!' },
  { status: 'delivered', label: 'Delivered', message: 'Your laundry has been delivered. Enjoy your fresh clothes!' },
];

export function getStatusIndex(status: LaundryStatus): number {
  return LAUNDRY_STATUS_STEPS.findIndex(s => s.status === status);
}

export function getStatusColor(status: LaundryStatus): string {
  const colors: Record<LaundryStatus, string> = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
    picked_up: 'bg-sky-50 text-sky-700 border-sky-200',
    washing: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    out_for_delivery: 'bg-orange-50 text-orange-700 border-orange-200',
    delivered: 'bg-green-50 text-green-700 border-green-200',
    cancelled: 'bg-red-50 text-red-700 border-red-200',
  };
  return colors[status] || 'bg-gray-50 text-gray-700 border-gray-200';
}

export async function getLaundryProviders(): Promise<LaundryProvider[]> {
  const { data, error } = await supabase
    .from('laundry_providers')
    .select('*')
    .eq('is_active', true)
    .order('rating', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getStudentLaundryOrders(studentId: string): Promise<LaundryOrder[]> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .select(`
      *,
      laundry_providers(*)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLaundryOrderWithTracking(orderId: string): Promise<LaundryOrder | null> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .select(`
      *,
      laundry_providers(*),
      laundry_tracking(*)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createLaundryOrder(order: {
  student_id: string;
  provider_id: string;
  hostel_id?: string;
  pickup_address: string;
  delivery_address: string;
  estimated_weight_kg: number;
  pickup_scheduled_at?: string;
  special_instructions?: string;
  total_price: number;
}): Promise<LaundryOrder> {
  const { data, error } = await supabase
    .from('laundry_orders')
    .insert(order)
    .select('*, laundry_providers(*)')
    .single();

  if (error) throw error;

  await supabase.from('laundry_tracking').insert({
    order_id: data.id,
    status: 'pending',
    message: 'Your laundry order has been placed and is awaiting confirmation.',
  });

  return data;
}

export async function updateLaundryOrderStatus(
  orderId: string,
  status: LaundryStatus
): Promise<void> {
  await supabase
    .from('laundry_orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', orderId);

  const step = LAUNDRY_STATUS_STEPS.find(s => s.status === status);
  if (step) {
    await supabase.from('laundry_tracking').insert({
      order_id: orderId,
      status,
      message: step.message,
    });
  }
}

export async function cancelLaundryOrder(orderId: string): Promise<void> {
  await supabase
    .from('laundry_orders')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  await supabase.from('laundry_tracking').insert({
    order_id: orderId,
    status: 'cancelled',
    message: 'Your laundry order has been cancelled.',
  });
}
