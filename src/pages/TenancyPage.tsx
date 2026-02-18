import { FileText, ShieldCheck, Building2, Lock } from 'lucide-react';
import { PageType } from '../App';
import StudentTenancyDashboard from './tenancy/StudentTenancyDashboard';
import LandlordTenancyDashboard from './tenancy/LandlordTenancyDashboard';
import AdminTenancyDashboard from './tenancy/AdminTenancyDashboard';

interface TenancyPageProps {
  user: { id: string; email: string } | null;
  userProfile: { user_type: string; full_name: string } | null;
  onNavigate: (page: PageType) => void;
}

export default function TenancyPage({ user, userProfile, onNavigate }: TenancyPageProps) {
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
            <Lock className="h-8 w-8 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Sign In Required</h2>
          <p className="mt-2 text-sm text-gray-500">Please sign in to access your tenancy dashboard.</p>
          <button
            onClick={() => onNavigate('auth')}
            className="mt-6 w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  const isOwner = userProfile?.user_type === 'owner';
  const isAdmin = userProfile?.user_type === 'admin';

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="bg-white border-b border-gray-100 px-4 py-5 sticky top-16 z-10">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${
              isAdmin ? 'bg-slate-100' : isOwner ? 'bg-amber-50' : 'bg-blue-50'
            }`}>
              {isAdmin
                ? <ShieldCheck className="h-5 w-5 text-slate-600" />
                : isOwner
                ? <Building2 className="h-5 w-5 text-amber-600" />
                : <FileText className="h-5 w-5 text-blue-600" />
              }
            </div>
            <div>
              <h1 className="font-bold text-gray-900 text-lg">
                {isAdmin ? 'Admin Console' : isOwner ? 'Landlord Portal' : 'My Tenancy'}
              </h1>
              <p className="text-xs text-gray-500">
                {isAdmin
                  ? 'Manage templates, agreements & audit trail'
                  : isOwner
                  ? 'Manage applications, agreements & rent collection'
                  : 'Your agreements, invoices & payment history'
                }
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-4 text-[11px] text-gray-400">
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-green-400" />
              <span>Ghana Rent Act 1963 Compliant</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>OTP E-Signature</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>Paystack Payments</span>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-sm">
          {isAdmin
            ? <AdminTenancyDashboard />
            : isOwner
            ? <LandlordTenancyDashboard userId={user.id} />
            : <StudentTenancyDashboard userId={user.id} userEmail={user.email} />
          }
        </div>
      </div>
    </div>
  );
}
