import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export async function initializePaystackPayment(
  invoiceId: string,
  email: string
): Promise<{ authorization_url: string; reference: string } | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const res = await fetch(`${SUPABASE_URL}/functions/v1/paystack-initialize`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      Apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ invoice_id: invoiceId, email }),
  });

  const data = await res.json();
  if (!res.ok || data.error) return null;
  return data;
}

export async function getReceipts(studentId?: string) {
  let query = supabase
    .from('receipts')
    .select(`
      *,
      rent_invoices (
        id,
        due_date,
        amount,
        invoice_number,
        tenancy_agreements (
          id,
          hostels (name)
        )
      )
    `)
    .order('paid_at', { ascending: false });

  if (studentId) query = query.eq('student_id', studentId);

  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function markInvoicePaidLocally(
  invoiceId: string,
  reference: string
): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error: invError } = await supabase
    .from('rent_invoices')
    .update({
      status: 'paid',
      paystack_reference: reference,
      paid_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('student_id', user.id);

  if (invError) return false;

  const { data: invoice } = await supabase
    .from('rent_invoices')
    .select('amount')
    .eq('id', invoiceId)
    .maybeSingle();

  if (invoice) {
    await supabase.from('receipts').insert({
      invoice_id: invoiceId,
      student_id: user.id,
      amount_paid: invoice.amount,
      payment_method: 'paystack',
      paystack_reference: reference,
      payment_channel: 'card',
      paid_at: new Date().toISOString(),
    });

    await supabase.from('audit_logs').insert({
      entity_type: 'rent_invoice',
      entity_id: invoiceId,
      action: 'payment_confirmed',
      actor_id: user.id,
      metadata: { reference, amount: invoice.amount },
    });
  }

  return true;
}
