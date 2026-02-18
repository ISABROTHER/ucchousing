import { supabase } from './supabase';

export type UtilityProvider = 'ecg' | 'gwcl' | 'other';
export type TopupStatus = 'pending' | 'processing' | 'success' | 'failed';

export interface UtilityAccount {
  id: string;
  student_id: string;
  provider: UtilityProvider;
  meter_number: string;
  account_name: string;
  is_shared: boolean;
  hostel_id: string | null;
  created_at: string;
}

export interface UtilityTopup {
  id: string;
  account_id: string;
  student_id: string;
  amount: number;
  token_received: string | null;
  status: TopupStatus;
  reference_number: string;
  created_at: string;
  utility_accounts?: UtilityAccount;
}

export interface BillSplit {
  id: string;
  topup_id: string;
  payer_id: string;
  owee_id: string;
  amount_owed: number;
  is_settled: boolean;
  settled_at: string | null;
  created_at: string;
  payer?: { full_name: string };
  owee?: { full_name: string };
}

export const PROVIDER_INFO: Record<UtilityProvider, { name: string; color: string; icon: string }> = {
  ecg: { name: 'Electricity Company of Ghana (ECG)', color: 'text-yellow-600 bg-yellow-50', icon: '⚡' },
  gwcl: { name: 'Ghana Water Company Limited (GWCL)', color: 'text-blue-600 bg-blue-50', icon: '💧' },
  other: { name: 'Other Utility', color: 'text-gray-600 bg-gray-50', icon: '🔌' },
};

export const TOPUP_AMOUNTS = [10, 20, 30, 50, 100, 150, 200];

export async function getUtilityAccounts(studentId: string): Promise<UtilityAccount[]> {
  const { data, error } = await supabase
    .from('utility_accounts')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createUtilityAccount(account: {
  student_id: string;
  provider: UtilityProvider;
  meter_number: string;
  account_name: string;
  is_shared?: boolean;
  hostel_id?: string;
}): Promise<UtilityAccount> {
  const { data, error } = await supabase
    .from('utility_accounts')
    .insert(account)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteUtilityAccount(accountId: string): Promise<void> {
  const { error } = await supabase
    .from('utility_accounts')
    .delete()
    .eq('id', accountId);

  if (error) throw error;
}

export async function getTopupHistory(studentId: string): Promise<UtilityTopup[]> {
  const { data, error } = await supabase
    .from('utility_topups')
    .select('*, utility_accounts(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function initiateTopup(
  accountId: string,
  studentId: string,
  amount: number
): Promise<UtilityTopup> {
  const { data, error } = await supabase
    .from('utility_topups')
    .insert({
      account_id: accountId,
      student_id: studentId,
      amount,
      status: 'processing',
    })
    .select('*, utility_accounts(*)')
    .single();

  if (error) throw error;

  setTimeout(async () => {
    const token = generateToken(data.utility_accounts?.provider || 'other');
    await supabase
      .from('utility_topups')
      .update({ status: 'success', token_received: token })
      .eq('id', data.id);
  }, 2000);

  return data;
}

function generateToken(provider: UtilityProvider): string {
  const digits = Array.from({ length: 20 }, () => Math.floor(Math.random() * 10)).join('');
  if (provider === 'ecg') {
    return digits.replace(/(\d{4})(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4-$5');
  }
  if (provider === 'gwcl') {
    return 'GW-' + digits.slice(0, 12).replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
  }
  return 'TK-' + digits.slice(0, 10);
}

export async function getBillSplits(userId: string): Promise<BillSplit[]> {
  const { data, error } = await supabase
    .from('utility_bill_splits')
    .select(`
      *,
      payer:user_profiles!utility_bill_splits_payer_id_fkey(full_name),
      owee:user_profiles!utility_bill_splits_owee_id_fkey(full_name)
    `)
    .or(`payer_id.eq.${userId},owee_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createBillSplit(splits: {
  topup_id: string;
  payer_id: string;
  owee_id: string;
  amount_owed: number;
}[]): Promise<void> {
  const { error } = await supabase
    .from('utility_bill_splits')
    .insert(splits);

  if (error) throw error;
}

export async function settleBillSplit(splitId: string): Promise<void> {
  const { error } = await supabase
    .from('utility_bill_splits')
    .update({ is_settled: true, settled_at: new Date().toISOString() })
    .eq('id', splitId);

  if (error) throw error;
}

export function getTopupStatusColor(status: TopupStatus): string {
  switch (status) {
    case 'success': return 'bg-green-50 text-green-700 border-green-200';
    case 'processing': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'pending': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'failed': return 'bg-red-50 text-red-700 border-red-200';
    default: return 'bg-gray-50 text-gray-600 border-gray-200';
  }
}
