import { supabase } from './supabase';

export interface TenancyAgreement {
  id: string;
  hostel_id: string;
  student_id: string;
  owner_id: string;
  booking_id: string | null;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  terms_and_conditions: string | null;
  special_clauses: string | null;
  status: 'draft' | 'pending_signature' | 'active' | 'expired' | 'terminated';
  student_signed_at: string | null;
  owner_signed_at: string | null;
  rent_control_reference: string | null;
  created_at: string;
  updated_at: string;
  hostels?: { name: string; location: string; city: string };
  student?: { full_name: string; email: string; phone: string | null };
  owner?: { full_name: string; email: string; phone: string | null };
}

export interface RentInvoice {
  id: string;
  agreement_id: string;
  student_id: string;
  amount: number;
  due_date: string;
  paid_at: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  invoice_number: string;
  notes: string | null;
  created_at: string;
  tenancy_agreements?: {
    hostels?: { name: string };
  };
}

export async function getStudentAgreements(studentId: string): Promise<TenancyAgreement[]> {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .select(`
      *,
      hostels(name, location, city),
      student:user_profiles!tenancy_agreements_student_id_fkey(full_name, email, phone),
      owner:user_profiles!tenancy_agreements_owner_id_fkey(full_name, email, phone)
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOwnerAgreements(ownerId: string): Promise<TenancyAgreement[]> {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .select(`
      *,
      hostels(name, location, city),
      student:user_profiles!tenancy_agreements_student_id_fkey(full_name, email, phone),
      owner:user_profiles!tenancy_agreements_owner_id_fkey(full_name, email, phone)
    `)
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createAgreement(agreement: {
  hostel_id: string;
  student_id: string;
  owner_id: string;
  booking_id?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  terms_and_conditions?: string;
  special_clauses?: string;
}): Promise<TenancyAgreement> {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .insert({ ...agreement, status: 'draft' })
    .select('*, hostels(name, location, city)')
    .single();

  if (error) throw error;
  return data;
}

export async function signAgreement(
  agreementId: string,
  role: 'student' | 'owner'
): Promise<void> {
  const now = new Date().toISOString();
  const field = role === 'student' ? 'student_signed_at' : 'owner_signed_at';

  const { data: existing } = await supabase
    .from('tenancy_agreements')
    .select('student_signed_at, owner_signed_at')
    .eq('id', agreementId)
    .single();

  const otherSigned = role === 'student' ? existing?.owner_signed_at : existing?.student_signed_at;
  const newStatus = otherSigned ? 'active' : 'pending_signature';

  await supabase
    .from('tenancy_agreements')
    .update({
      [field]: now,
      status: newStatus,
      updated_at: now,
    })
    .eq('id', agreementId);
}

export async function updateAgreementStatus(
  agreementId: string,
  status: TenancyAgreement['status']
): Promise<void> {
  await supabase
    .from('tenancy_agreements')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', agreementId);
}

export async function getStudentInvoices(studentId: string): Promise<RentInvoice[]> {
  const { data, error } = await supabase
    .from('rent_invoices')
    .select(`
      *,
      tenancy_agreements(hostels(name))
    `)
    .eq('student_id', studentId)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function markInvoicePaid(invoiceId: string): Promise<void> {
  await supabase
    .from('rent_invoices')
    .update({ status: 'paid', paid_at: new Date().toISOString() })
    .eq('id', invoiceId);
}

export async function createInvoice(invoice: {
  agreement_id: string;
  student_id: string;
  amount: number;
  due_date: string;
  notes?: string;
}): Promise<RentInvoice> {
  const { data, error } = await supabase
    .from('rent_invoices')
    .insert(invoice)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export function getAgreementStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-50 text-green-700 border-green-200';
    case 'pending_signature': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'draft': return 'bg-gray-50 text-gray-600 border-gray-200';
    case 'expired': return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'terminated': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function getInvoiceStatusColor(status: string): string {
  switch (status) {
    case 'paid': return 'bg-green-50 text-green-700 border-green-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'overdue': return 'bg-red-50 text-red-700 border-red-200';
    case 'cancelled': return 'bg-gray-50 text-gray-500 border-gray-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function generateRentControlText(agreement: TenancyAgreement): string {
  return `TENANCY AGREEMENT SUMMARY\n` +
    `-----------------------------------\n` +
    `Property: ${agreement.hostels?.name || 'N/A'}\n` +
    `Location: ${agreement.hostels?.location || 'N/A'}, ${agreement.hostels?.city || 'Cape Coast'}\n` +
    `Tenant: ${agreement.student?.full_name || 'N/A'}\n` +
    `Landlord: ${agreement.owner?.full_name || 'N/A'}\n` +
    `Tenancy Period: ${agreement.start_date} to ${agreement.end_date}\n` +
    `Monthly Rent: GHS ${agreement.monthly_rent.toLocaleString()}\n` +
    `Security Deposit: GHS ${agreement.deposit_amount.toLocaleString()}\n` +
    `Status: ${agreement.status.replace('_', ' ').toUpperCase()}\n` +
    `Tenant Signed: ${agreement.student_signed_at ? new Date(agreement.student_signed_at).toLocaleDateString() : 'Pending'}\n` +
    `Landlord Signed: ${agreement.owner_signed_at ? new Date(agreement.owner_signed_at).toLocaleDateString() : 'Pending'}\n` +
    `\nThis document was generated by StaySync. For Rent Control registration,\n` +
    `please present this summary at the Ghana Rent Control Department office.`;
}
