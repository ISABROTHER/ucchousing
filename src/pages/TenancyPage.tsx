import { useState, useEffect } from 'react';
import {
  FileText, CheckCircle, Clock, AlertCircle, Plus, Download,
  PenTool, X, DollarSign, Calendar, Building2, ShieldCheck
} from 'lucide-react';
import {
  getStudentAgreements, getOwnerAgreements, getStudentInvoices,
  signAgreement, markInvoicePaid,
  TenancyAgreement, RentInvoice,
  getAgreementStatusColor, getInvoiceStatusColor, generateRentControlText
} from '../lib/tenancy';
import { PageType } from '../App';

interface TenancyPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

function AgreementCard({
  agreement,
  role,
  onSign,
  onDownload,
}: {
  agreement: TenancyAgreement;
  role: 'student' | 'owner';
  onSign: (id: string) => void;
  onDownload: (agreement: TenancyAgreement) => void;
}) {
  const hasUserSigned = role === 'student' ? !!agreement.student_signed_at : !!agreement.owner_signed_at;
  const bothSigned = !!agreement.student_signed_at && !!agreement.owner_signed_at;
  const canSign = !hasUserSigned && agreement.status !== 'terminated' && agreement.status !== 'expired';

  const durationMonths = Math.round(
    (new Date(agreement.end_date).getTime() - new Date(agreement.start_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
  );

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{agreement.hostels?.name}</h3>
            <p className="text-sm text-gray-500">{agreement.hostels?.location}</p>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getAgreementStatusColor(agreement.status)}`}>
          {agreement.status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Monthly Rent</p>
          <p className="text-sm font-bold text-gray-900">GHS {agreement.monthly_rent.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Deposit</p>
          <p className="text-sm font-bold text-gray-900">GHS {agreement.deposit_amount.toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Duration</p>
          <p className="text-sm font-bold text-gray-900">{durationMonths} months</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400">Period</p>
          <p className="text-xs font-semibold text-gray-700">
            {new Date(agreement.start_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })} –{' '}
            {new Date(agreement.end_date).toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4 text-xs">
        <div className={`flex items-center gap-1.5 ${agreement.student_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
          {agreement.student_signed_at ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          Tenant: {agreement.student?.full_name?.split(' ')[0]}
          {agreement.student_signed_at ? ` (signed ${new Date(agreement.student_signed_at).toLocaleDateString()})` : ' (pending)'}
        </div>
        <div className={`flex items-center gap-1.5 ${agreement.owner_signed_at ? 'text-green-600' : 'text-gray-400'}`}>
          {agreement.owner_signed_at ? <CheckCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
          Owner: {agreement.owner?.full_name?.split(' ')[0]}
          {agreement.owner_signed_at ? ` (signed ${new Date(agreement.owner_signed_at).toLocaleDateString()})` : ' (pending)'}
        </div>
      </div>

      {agreement.rent_control_reference && (
        <div className="mb-4 flex items-center gap-2 text-xs text-teal-700 bg-teal-50 rounded-xl px-3 py-2">
          <ShieldCheck className="w-3.5 h-3.5 flex-shrink-0" />
          Rent Control Ref: {agreement.rent_control_reference}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-50">
        {canSign && (
          <button
            onClick={() => onSign(agreement.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors"
          >
            <PenTool className="w-4 h-4" />
            Sign Agreement
          </button>
        )}
        <button
          onClick={() => onDownload(agreement)}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export
        </button>
      </div>
    </div>
  );
}

export default function TenancyPage({ user, userProfile, onNavigate }: TenancyPageProps) {
  const [agreements, setAgreements] = useState<TenancyAgreement[]>([]);
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'agreements' | 'invoices'>('agreements');
  const [signing, setSigning] = useState<string | null>(null);
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRentControl, setShowRentControl] = useState<TenancyAgreement | null>(null);

  const role = userProfile?.user_type as 'student' | 'owner';

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    try {
      const [agreeData, invoiceData] = await Promise.all([
        role === 'owner' ? getOwnerAgreements(user.id) : getStudentAgreements(user.id),
        role === 'student' ? getStudentInvoices(user.id) : Promise.resolve([]),
      ]);
      setAgreements(agreeData);
      setInvoices(invoiceData);
    } finally {
      setLoading(false);
    }
  }

  async function handleSign(agreementId: string) {
    setSigning(agreementId);
    setError('');
    try {
      await signAgreement(agreementId, role);
      const updated = agreements.map(a => {
        if (a.id !== agreementId) return a;
        const now = new Date().toISOString();
        const updated = {
          ...a,
          student_signed_at: role === 'student' ? now : a.student_signed_at,
          owner_signed_at: role === 'owner' ? now : a.owner_signed_at,
        };
        const bothSigned = !!updated.student_signed_at && !!updated.owner_signed_at;
        return { ...updated, status: bothSigned ? 'active' as const : 'pending_signature' as const };
      });
      setAgreements(updated);
      setSuccess('Agreement signed successfully!');
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to sign agreement');
    } finally {
      setSigning(null);
    }
  }

  async function handlePayInvoice(invoiceId: string) {
    setPaying(invoiceId);
    try {
      await markInvoicePaid(invoiceId);
      setInvoices(prev => prev.map(i => i.id === invoiceId ? { ...i, status: 'paid' as const, paid_at: new Date().toISOString() } : i));
      setSuccess('Invoice marked as paid!');
      setTimeout(() => setSuccess(''), 4000);
    } finally {
      setPaying(null);
    }
  }

  function handleDownload(agreement: TenancyAgreement) {
    const text = generateRentControlText(agreement);
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tenancy-agreement-${agreement.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const activeAgreements = agreements.filter(a => a.status === 'active').length;
  const pendingInvoices = invoices.filter(i => i.status === 'pending').length;
  const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
  const totalOwed = invoices.filter(i => ['pending', 'overdue'].includes(i.status)).reduce((sum, i) => sum + i.amount, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <button onClick={() => onNavigate('auth')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-xl">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            Tenancy & Rent
          </h1>
          <p className="text-gray-500 mt-2">Digital tenancy agreements, e-signatures and rent invoices</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 text-sm font-medium">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {role === 'student' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Active Agreements', value: activeAgreements, icon: FileText, color: 'bg-blue-50 text-blue-600' },
              { label: 'Pending Invoices', value: pendingInvoices, icon: Clock, color: 'bg-amber-50 text-amber-600' },
              { label: 'Overdue', value: overdueInvoices, icon: AlertCircle, color: 'bg-red-50 text-red-600' },
              { label: 'Amount Owed', value: `GHS ${totalOwed.toLocaleString()}`, icon: DollarSign, color: 'bg-emerald-50 text-emerald-600' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 ${stat.color}`}>
                  <stat.icon className="w-4.5 h-4.5" />
                </div>
                <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Ghana Rent Control Compliance</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Under the Rent Act 1963 (Act 220), all tenancy agreements must be registered with the Rent Control Department.
              Use the Export button on any active agreement to download a summary document for registration.
            </p>
          </div>
        </div>

        {role === 'student' && (
          <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-6">
            {(['agreements', 'invoices'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-[#DC143C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                {t === 'agreements' ? `Agreements (${agreements.length})` : `Invoices (${invoices.filter(i => i.status !== 'cancelled').length})`}
              </button>
            ))}
          </div>
        )}

        {(tab === 'agreements' || role === 'owner') && (
          <div className="space-y-4">
            {agreements.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <Building2 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">No Tenancy Agreements</h3>
                <p className="text-gray-500 text-sm">
                  {role === 'owner'
                    ? 'Create tenancy agreements for your tenants from the booking management section'
                    : 'Your hostel owner will create a tenancy agreement once your booking is confirmed'}
                </p>
                {role === 'student' && (
                  <button onClick={() => onNavigate('search')} className="mt-4 px-5 py-2 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors">
                    Find Accommodation
                  </button>
                )}
              </div>
            ) : (
              agreements.map(agreement => (
                <AgreementCard
                  key={agreement.id}
                  agreement={agreement}
                  role={role}
                  onSign={handleSign}
                  onDownload={handleDownload}
                />
              ))
            )}
          </div>
        )}

        {tab === 'invoices' && role === 'student' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-500">No rent invoices yet</p>
              </div>
            ) : (
              invoices.map(invoice => (
                <div key={invoice.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-4 h-4 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{invoice.invoice_number}</p>
                        <p className="text-sm text-gray-500">{invoice.tenancy_agreements?.hostels?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Due: {new Date(invoice.due_date).toLocaleDateString()}
                          {invoice.paid_at && ` · Paid: ${new Date(invoice.paid_at).toLocaleDateString()}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xl font-bold text-gray-900">GHS {invoice.amount.toLocaleString()}</p>
                      <span className={`inline-block mt-1 px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${getInvoiceStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                  {invoice.notes && (
                    <p className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-xl px-3 py-2">{invoice.notes}</p>
                  )}
                  {['pending', 'overdue'].includes(invoice.status) && (
                    <button
                      onClick={() => handlePayInvoice(invoice.id)}
                      disabled={paying === invoice.id}
                      className="mt-3 w-full py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      {paying === invoice.id ? 'Processing...' : 'Mark as Paid'}
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
