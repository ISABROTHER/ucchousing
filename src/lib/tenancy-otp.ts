import { supabase } from './supabase';

export function generateOTPCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createOTP(agreementId: string): Promise<{ code: string; id: string } | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('otp_verifications')
    .insert({
      user_id: user.id,
      code,
      purpose: 'sign_agreement',
      agreement_id: agreementId,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error || !data) return null;
  return { code, id: data.id };
}

export async function verifyOTP(
  agreementId: string,
  inputCode: string
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { data: otps, error } = await supabase
    .from('otp_verifications')
    .select('id, code, expires_at, used_at')
    .eq('user_id', user.id)
    .eq('agreement_id', agreementId)
    .eq('purpose', 'sign_agreement')
    .is('used_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error || !otps || otps.length === 0) {
    return { success: false, error: 'No active OTP found. Please request a new one.' };
  }

  const otp = otps[0];

  if (new Date(otp.expires_at) < new Date()) {
    return { success: false, error: 'OTP has expired. Please request a new one.' };
  }

  if (otp.code !== inputCode) {
    return { success: false, error: 'Incorrect OTP code.' };
  }

  await supabase
    .from('otp_verifications')
    .update({ used_at: new Date().toISOString() })
    .eq('id', otp.id);

  return { success: true };
}

export async function signAgreement(
  agreementId: string,
  role: 'student' | 'landlord'
): Promise<{ success: boolean; error?: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Not authenticated' };

  const { error: sigError } = await supabase.from('signature_events').insert({
    agreement_id: agreementId,
    signer_id: user.id,
    role,
    otp_verified_at: new Date().toISOString(),
    ip_address: 'client',
    user_agent: navigator.userAgent,
  });

  if (sigError) return { success: false, error: sigError.message };

  const newStatus = role === 'student' ? 'student_signed' : 'landlord_signed';
  const updateData: Record<string, string> = { status: newStatus };
  if (role === 'student') updateData.student_signed_at = new Date().toISOString();
  if (role === 'landlord') updateData.landlord_signed_at = new Date().toISOString();

  const { error: updError } = await supabase
    .from('tenancy_agreements')
    .update(updateData)
    .eq('id', agreementId);

  if (updError) return { success: false, error: updError.message };

  await supabase.from('audit_logs').insert({
    entity_type: 'tenancy_agreement',
    entity_id: agreementId,
    action: `${role}_signed`,
    actor_id: user.id,
    metadata: { role, signed_at: new Date().toISOString() },
  });

  return { success: true };
}

export async function getSignatureEvents(agreementId: string) {
  const { data, error } = await supabase
    .from('signature_events')
    .select('*')
    .eq('agreement_id', agreementId)
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}
