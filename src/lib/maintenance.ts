import { supabase } from './supabase';

export interface MaintenanceRequest {
  id: string;
  hostel_id: string;
  student_id: string;
  booking_id: string | null;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  owner_notes: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  hostels?: { name: string; location: string };
  student?: { full_name: string; avatar_url: string | null };
}

export async function getStudentMaintenanceRequests(studentId: string): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`*, hostels(name, location)`)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getHostelMaintenanceRequests(hostelId: string): Promise<MaintenanceRequest[]> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      hostels(name, location),
      student:user_profiles!maintenance_requests_student_id_fkey(full_name, avatar_url)
    `)
    .eq('hostel_id', hostelId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOwnerMaintenanceRequests(ownerId: string): Promise<MaintenanceRequest[]> {
  const { data: hostels } = await supabase
    .from('hostels')
    .select('id')
    .eq('owner_id', ownerId);

  if (!hostels || hostels.length === 0) return [];

  const hostelIds = hostels.map(h => h.id);
  const { data, error } = await supabase
    .from('maintenance_requests')
    .select(`
      *,
      hostels(name, location),
      student:user_profiles!maintenance_requests_student_id_fkey(full_name, avatar_url)
    `)
    .in('hostel_id', hostelIds)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createMaintenanceRequest(request: {
  hostel_id: string;
  student_id: string;
  booking_id?: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}): Promise<MaintenanceRequest> {
  const { data, error } = await supabase
    .from('maintenance_requests')
    .insert(request)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMaintenanceStatus(
  id: string,
  status: 'open' | 'in_progress' | 'resolved' | 'closed',
  ownerNotes?: string
): Promise<void> {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (ownerNotes !== undefined) {
    updates.owner_notes = ownerNotes;
  }

  if (status === 'resolved' || status === 'closed') {
    updates.resolved_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('maintenance_requests')
    .update(updates)
    .eq('id', id);

  if (error) throw error;
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
    case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'open': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'in_progress': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
}
