import { useState } from 'react';
import { CheckCircle, FileText, Shield, PenLine, Download, AlertCircle } from 'lucide-react';
import { TenancyAgreement } from '../../lib/tenancy';
import { signAgreement } from '../../lib/tenancy-otp';
import OTPModal from './OTPModal';

interface ESignStepperProps {
  agreement: TenancyAgreement;
  role: 'student' | 'landlord';
  onSigned: () => void;
  onClose: () => void;
}

type Step = 'review' | 'otp' | 'sign' | 'done';

export default function ESignStepper({ agreement, role, onSigned, onClose }: ESignStepperProps) {
  const [step, setStep] = useState<Step>('review');
  const [otpVerified, setOtpVerified] = useState(false);
  const [signing, setSigning] = useState(false);
  const [error, setError] = useState('');

  const steps = [
    { key: 'review', label: 'Review', icon: FileText },
    { key: 'otp', label: 'Verify OTP', icon: Shield },
    { key: 'sign', label: 'Sign', icon: PenLine },
  ];

  const currentIndex = steps.findIndex(s => s.key === step);

  async function handleSign() {
    setSigning(true);
    setError('');
    const result = await signAgreement(agreement.id, role);
    setSigning(false);
    if (result.success) {
      setStep('done');
      onSigned();
    } else {
      setError(result.error || 'Failed to sign agreement.');
    }
  }

  function handleDownload() {
    const content = agreement.agreement_content || 'Agreement content not available.';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenancy-agreement-${agreement.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (step === 'done') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900">Agreement Signed!</h3>
          <p className="mt-2 text-sm text-gray-500">
            Your signature has been recorded with a full audit trail.
          </p>
          <div className="mt-5 rounded-xl bg-gray-50 p-4 text-left text-xs text-gray-600">
            <p><span className="font-semibold">Agreement ID:</span> {agreement.id.slice(0, 12)}...</p>
            <p className="mt-1"><span className="font-semibold">Signed at:</span> {new Date().toLocaleString()}</p>
            <p className="mt-1"><span className="font-semibold">Role:</span> {role === 'student' ? 'Tenant' : 'Landlord'}</p>
          </div>
          <div className="mt-5 flex gap-2">
            <button
              onClick={handleDownload}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="h-4 w-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
          <div className="border-b border-gray-100 p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900">Sign Tenancy Agreement</h2>
              <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
            </div>
            <div className="mt-4 flex items-center gap-0">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <div key={s.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center gap-1">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                        done ? 'border-green-500 bg-green-500' :
                        active ? 'border-blue-600 bg-blue-600' :
                        'border-gray-200 bg-white'
                      }`}>
                        {done
                          ? <CheckCircle className="h-4 w-4 text-white" />
                          : <Icon className={`h-4 w-4 ${active ? 'text-white' : 'text-gray-400'}`} />
                        }
                      </div>
                      <span className={`text-[10px] font-medium ${active ? 'text-blue-600' : done ? 'text-green-600' : 'text-gray-400'}`}>
                        {s.label}
                      </span>
                    </div>
                    {i < steps.length - 1 && (
                      <div className={`h-0.5 flex-1 mb-5 transition-all ${done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {step === 'review' && (
              <div>
                <div className="mb-4 max-h-80 overflow-y-auto rounded-xl bg-gray-50 p-4 font-mono text-xs text-gray-700 whitespace-pre-wrap leading-relaxed border border-gray-100">
                  {agreement.agreement_content || agreement.terms_and_conditions || 'Agreement content will appear here.'}
                </div>
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700 mb-4">
                  By proceeding, you confirm you have read and understood this tenancy agreement.
                </div>
                <button
                  onClick={() => setStep('otp')}
                  className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  I've Read the Agreement — Continue
                </button>
              </div>
            )}

            {step === 'sign' && (
              <div>
                <div className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">Identity Verified</span>
                  </div>
                  <p className="mt-1 text-xs text-green-600">OTP confirmed. You can now sign the agreement.</p>
                </div>

                <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs text-gray-500 mb-1">Signing as</p>
                  <p className="font-bold text-gray-900">{role === 'student' ? 'Tenant / Student' : 'Landlord / Property Owner'}</p>
                  <p className="text-xs text-gray-500 mt-2">Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>

                {error && (
                  <div className="mb-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  onClick={handleSign}
                  disabled={signing}
                  className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {signing ? 'Signing...' : 'Sign Agreement'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {step === 'otp' && (
        <OTPModal
          agreementId={agreement.id}
          onVerified={() => {
            setOtpVerified(true);
            setStep('sign');
          }}
          onClose={() => setStep('review')}
        />
      )}
    </>
  );
}
