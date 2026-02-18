import { supabase } from './supabase';

export interface TenancyAgreement {
  id: string;
  hostel_id: string;
  student_id: string;
  owner_id: string;
  landlord_id: string | null;
  booking_id: string | null;
  application_id: string | null;
  template_id: string | null;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  room_number: string;
  agreement_content: string | null;
  pdf_url: string | null;
  terms_and_conditions: string | null;
  special_clauses: string | null;
  status: 'draft' | 'sent' | 'student_signed' | 'landlord_signed' | 'active' | 'terminated' | 'pending_signature' | 'expired';
  student_signed_at: string | null;
  owner_signed_at: string | null;
  landlord_signed_at: string | null;
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
  paystack_reference: string | null;
  invoice_number: string | null;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  notes: string | null;
  created_at: string;
  tenancy_agreements?: {
    hostels?: { name: string };
    monthly_rent?: number;
    room_number?: string;
  };
}

export interface TenantApplication {
  id: string;
  student_id: string;
  hostel_id: string;
  room_number: string;
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  landlord_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  hostels?: { name: string; location: string; city: string };
  student?: { full_name: string; email: string; phone: string | null };
}

export interface AgreementTemplate {
  id: string;
  created_by: string | null;
  title: string;
  content: string;
  category: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  invoice_id: string;
  student_id: string;
  amount_paid: number;
  payment_method: string;
  paystack_reference: string | null;
  payment_channel: string | null;
  paid_at: string;
  created_at: string;
  rent_invoices?: {
    invoice_number: string | null;
    due_date: string;
    amount: number;
    tenancy_agreements?: { hostels?: { name: string } };
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

export async function getLandlordAgreements(landlordId: string): Promise<TenancyAgreement[]> {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .select(`
      *,
      hostels(name, location, city),
      student:user_profiles!tenancy_agreements_student_id_fkey(full_name, email, phone)
    `)
    .eq('landlord_id', landlordId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOwnerAgreements(ownerId: string): Promise<TenancyAgreement[]> {
  return getLandlordAgreements(ownerId);
}

export async function getAgreementById(id: string): Promise<TenancyAgreement | null> {
  const { data, error } = await supabase
    .from('tenancy_agreements')
    .select(`
      *,
      hostels(name, location, city),
      student:user_profiles!tenancy_agreements_student_id_fkey(full_name, email, phone),
      owner:user_profiles!tenancy_agreements_owner_id_fkey(full_name, email, phone)
    `)
    .eq('id', id)
    .maybeSingle();

  if (error) return null;
  return data;
}

export async function createAgreement(agreement: {
  hostel_id: string;
  student_id: string;
  owner_id: string;
  landlord_id?: string;
  booking_id?: string;
  application_id?: string;
  template_id?: string;
  start_date: string;
  end_date: string;
  monthly_rent: number;
  deposit_amount: number;
  room_number?: string;
  agreement_content?: string;
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

export async function updateAgreementContent(
  agreementId: string,
  content: string
): Promise<void> {
  await supabase
    .from('tenancy_agreements')
    .update({ agreement_content: content, status: 'sent', updated_at: new Date().toISOString() })
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
    .update({ [field]: now, status: newStatus, updated_at: now })
    .eq('id', agreementId);
}

export async function getStudentInvoices(studentId: string): Promise<RentInvoice[]> {
  const { data, error } = await supabase
    .from('rent_invoices')
    .select(`*, tenancy_agreements(monthly_rent, room_number, hostels(name))`)
    .eq('student_id', studentId)
    .order('due_date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getLandlordInvoices(landlordId: string): Promise<RentInvoice[]> {
  const { data, error } = await supabase
    .from('rent_invoices')
    .select(`*, tenancy_agreements(monthly_rent, room_number, hostels(name), landlord_id)`)
    .order('due_date', { ascending: false });

  if (error) return [];
  return (data || []).filter((inv: RentInvoice & { tenancy_agreements?: { landlord_id?: string } }) =>
    inv.tenancy_agreements?.landlord_id === landlordId
  );
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
  invoice_number?: string;
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

export async function autoGenerateInvoices(
  agreementId: string,
  studentId: string,
  monthlyRent: number,
  startDate: string,
  endDate: string
): Promise<void> {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const invoices = [];
  let current = new Date(start);
  let invoiceNum = 1;

  while (current <= end) {
    invoices.push({
      agreement_id: agreementId,
      student_id: studentId,
      amount: monthlyRent,
      due_date: new Date(current.getFullYear(), current.getMonth(), 1).toISOString().split('T')[0],
      invoice_number: `INV-${agreementId.slice(0, 6).toUpperCase()}-${String(invoiceNum).padStart(3, '0')}`,
      status: 'pending',
    });
    current.setMonth(current.getMonth() + 1);
    invoiceNum++;
  }

  if (invoices.length > 0) {
    await supabase.from('rent_invoices').insert(invoices);
  }
}

export async function getStudentApplications(studentId: string): Promise<TenantApplication[]> {
  const { data, error } = await supabase
    .from('tenant_applications')
    .select(`*, hostels(name, location, city)`)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getLandlordApplications(landlordId: string): Promise<TenantApplication[]> {
  const { data: hostels } = await supabase
    .from('hostels')
    .select('id')
    .eq('owner_id', landlordId);

  if (!hostels || hostels.length === 0) return [];

  const hostelIds = hostels.map(h => h.id);
  const { data, error } = await supabase
    .from('tenant_applications')
    .select(`
      *,
      hostels(name, location, city),
      student:user_profiles!tenant_applications_student_id_fkey(full_name, email, phone)
    `)
    .in('hostel_id', hostelIds)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function submitApplication(application: {
  hostel_id: string;
  room_number: string;
  message: string;
}): Promise<TenantApplication | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('tenant_applications')
    .insert({ ...application, student_id: user.id, status: 'pending' })
    .select('*, hostels(name, location, city)')
    .single();

  if (error) return null;
  return data;
}

export async function updateApplicationStatus(
  applicationId: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await supabase
    .from('tenant_applications')
    .update({ status, reviewed_at: new Date().toISOString() })
    .eq('id', applicationId);
}

export async function getTemplates(): Promise<AgreementTemplate[]> {
  const { data, error } = await supabase
    .from('agreement_templates')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function fillTemplate(
  templateContent: string,
  vars: Record<string, string>
): Promise<string> {
  let filled = templateContent;
  for (const [key, value] of Object.entries(vars)) {
    filled = filled.replaceAll(`{{${key}}}`, value);
  }
  return filled;
}

export async function getAuditLogs(entityId: string) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export async function getReceipts(studentId: string): Promise<Receipt[]> {
  const { data, error } = await supabase
    .from('receipts')
    .select(`
      *,
      rent_invoices(invoice_number, due_date, amount, tenancy_agreements(hostels(name)))
    `)
    .eq('student_id', studentId)
    .order('paid_at', { ascending: false });

  if (error) return [];
  return data || [];
}

export function getAgreementStatusColor(status: string): string {
  switch (status) {
    case 'active': return 'bg-green-50 text-green-700 border-green-200';
    case 'student_signed': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'landlord_signed': return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'sent': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'pending_signature': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'draft': return 'bg-gray-50 text-gray-600 border-gray-200';
    case 'expired': return 'bg-slate-50 text-slate-600 border-slate-200';
    case 'terminated': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}

export function getAgreementStatusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active';
    case 'student_signed': return 'Student Signed';
    case 'landlord_signed': return 'Landlord Signed';
    case 'sent': return 'Awaiting Signature';
    case 'pending_signature': return 'Pending Signature';
    case 'draft': return 'Draft';
    case 'expired': return 'Expired';
    case 'terminated': return 'Terminated';
    default: return status;
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
    `Status: ${agreement.status.replace(/_/g, ' ').toUpperCase()}\n` +
    `Tenant Signed: ${agreement.student_signed_at ? new Date(agreement.student_signed_at).toLocaleDateString() : 'Pending'}\n` +
    `Landlord Signed: ${agreement.owner_signed_at || agreement.landlord_signed_at ? new Date((agreement.owner_signed_at || agreement.landlord_signed_at)!).toLocaleDateString() : 'Pending'}\n` +
    `\nThis document was generated by StaySync. For Rent Control registration,\n` +
    `please present this summary at the Ghana Rent Control Department office.`;
}
