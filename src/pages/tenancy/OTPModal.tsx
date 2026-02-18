import { useState, useEffect, useRef } from 'react';
import { Shield, X, RefreshCw } from 'lucide-react';
import { createOTP, verifyOTP } from '../../lib/tenancy-otp';

interface OTPModalProps {
  agreementId: string;
  onVerified: () => void;
  onClose: () => void;
}

export default function OTPModal({ agreementId, onVerified, onClose }: OTPModalProps) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(600);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sending, setSending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    handleSendOTP();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [otpCode]);

  async function handleSendOTP() {
    setSending(true);
    setError('');
    setCountdown(600);
    const result = await createOTP(agreementId);
    setSending(false);
    if (result) {
      setOtpCode(result.code);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } else {
      setError('Failed to send OTP. Please try again.');
    }
  }

  function handleDigitChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify() {
    const code = digits.join('');
    if (code.length !== 6) {
      setError('Please enter all 6 digits.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await verifyOTP(agreementId, code);
    setLoading(false);
    if (result.success) {
      onVerified();
    } else {
      setError(result.error || 'Verification failed.');
    }
  }

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">OTP Verification</p>
              <p className="text-xs text-gray-500">Verify your identity to sign</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {sending ? (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              <p className="text-sm text-gray-500">Sending OTP...</p>
            </div>
          ) : (
            <>
              <p className="mb-1 text-sm text-gray-600">
                Enter the 6-digit code sent to your registered contact.
              </p>

              {process.env.NODE_ENV !== 'production' && otpCode && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <p className="text-xs font-medium text-amber-700">Dev mode — OTP: <span className="font-bold tracking-widest">{otpCode}</span></p>
                </div>
              )}

              <div className="mb-5 flex justify-center gap-2 mt-4">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="h-12 w-10 rounded-xl border-2 border-gray-200 text-center text-lg font-bold text-gray-900 focus:border-blue-500 focus:outline-none transition-colors"
                  />
                ))}
              </div>

              {error && (
                <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>
              )}

              <div className="mb-4 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {countdown > 0
                    ? `Expires in ${minutes}:${String(seconds).padStart(2, '0')}`
                    : 'OTP expired'}
                </span>
                <button
                  onClick={handleSendOTP}
                  disabled={countdown > 540}
                  className="flex items-center gap-1 font-medium text-blue-600 disabled:opacity-40 hover:text-blue-700 transition-colors"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend
                </button>
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || digits.join('').length !== 6}
                className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
