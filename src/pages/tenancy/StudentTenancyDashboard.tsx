import { useState, useEffect } from 'react';
import { FileText, CreditCard, Receipt as ReceiptIcon, Home, CheckCircle, Clock, AlertCircle, Download, Building2, ExternalLink } from 'lucide-react';
import {
  TenancyAgreement, RentInvoice, Receipt,
  getStudentAgreements, getStudentInvoices, getReceipts,
  getAgreementStatusColor, getAgreementStatusLabel,
} from '../../lib/tenancy';
import { initializePaystackPayment, markInvoicePaidLocally } from '../../lib/paystack';
import ESignStepper from './ESignStepper';

interface StudentTenancyDashboardProps {
  userId: string;
  userEmail: string;
}

type Tab = 'overview' | 'agreements' | 'invoices' | 'receipts';

export default function StudentTenancyDashboard({ userId, userEmail }: StudentTenancyDashboardProps) {
  const [tab, setTab] = useState<Tab>('overview');
  const [agreements, setAgreements] = useState<TenancyAgreement[]>([]);
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingAgreement, setSigningAgreement] = useState<TenancyAgreement | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<RentInvoice | null>(null);
  const [payLoading, setPayLoading] = useState(false);

  useEffect(() => {
    loadAll();
  }, [userId]);

  async function loadAll() {
    setLoading(true);
    const [agrs, invs, recs] = await Promise.all([
      getStudentAgreements(userId),
      getStudentInvoices(userId),
      getReceipts(userId),
    ]);
    setAgreements(agrs);
    setInvoices(invs);
    setReceipts(recs);
    setLoading(false);
  }

  const activeAgreement = agreements.find(a => a.status === 'active') || agreements[0];
  const pendingInvoices = invoices.filter(i => i.status === 'pending');
  const overdueInvoices = invoices.filter(i => i.status === 'pending' && new Date(i.due_date) < new Date());

  async function handlePay(invoice: RentInvoice) {
    setPayingInvoice(invoice);
    setPayLoading(true);
    const result = await initializePaystackPayment(invoice.id, userEmail);
    setPayLoading(false);
    if (result?.authorization_url) {
      const popup = window.open(result.authorization_url, '_blank', 'width=600,height=700');
      const pollTimer = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(pollTimer);
          await markInvoicePaidLocally(invoice.id, result.reference);
          setPayingInvoice(null);
          loadAll();
        }
      }, 1000);
    } else {
      await markInvoicePaidLocally(invoice.id, `DEMO-${Date.now()}`);
      setPayingInvoice(null);
      loadAll();
    }
  }

  function handleDownload(agreement: TenancyAgreement) {
    const content = agreement.agreement_content || agreement.terms_and_conditions || 'Agreement content not available.';
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agreement-${agreement.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Home },
    { key: 'agreements', label: 'Agreements', icon: FileText, badge: agreements.filter(a => a.status === 'sent').length },
    { key: 'invoices', label: 'Invoices', icon: CreditCard, badge: pendingInvoices.length },
    { key: 'receipts', label: 'Receipts', icon: ReceiptIcon },
  ];

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2, 3].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-100 px-4 overflow-x-auto">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex shrink-0 items-center gap-1.5 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
              {t.badge && t.badge > 0 ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="p-4 space-y-4">
        {tab === 'overview' && (
          <>
            {overdueInvoices.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-red-700 text-sm">Overdue Rent</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    You have {overdueInvoices.length} overdue invoice{overdueInvoices.length > 1 ? 's' : ''}. Please pay to avoid penalties.
                  </p>
                </div>
              </div>
            )}

            {activeAgreement ? (
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{activeAgreement.hostels?.name || 'Your Hostel'}</p>
                      <p className="text-xs text-gray-500">{activeAgreement.hostels?.location}</p>
                    </div>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getAgreementStatusColor(activeAgreement.status)}`}>
                    {getAgreementStatusLabel(activeAgreement.status)}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: 'Monthly Rent', value: `GHS ${Number(activeAgreement.monthly_rent).toLocaleString()}` },
                    { label: 'Start Date', value: new Date(activeAgreement.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                    { label: 'End Date', value: new Date(activeAgreement.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) },
                  ].map(stat => (
                    <div key={stat.label} className="rounded-lg bg-gray-50 p-3">
                      <p className="text-[10px] text-gray-500">{stat.label}</p>
                      <p className="mt-0.5 font-bold text-gray-900 text-sm">{stat.value}</p>
                    </div>
                  ))}
                </div>
                {(activeAgreement.status === 'sent') && (
                  <button
                    onClick={() => setSigningAgreement(activeAgreement)}
                    className="mt-4 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    Sign Agreement
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-gray-200 py-10 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="font-medium text-gray-600">No active tenancy</p>
                <p className="mt-1 text-xs text-gray-400">Apply to a hostel to get started</p>
              </div>
            )}

            {pendingInvoices.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="font-semibold text-amber-800 text-sm">Upcoming Payments</p>
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800">{pendingInvoices.length} due</span>
                </div>
                {pendingInvoices.slice(0, 2).map(inv => (
                  <div key={inv.id} className="flex items-center justify-between rounded-lg bg-white p-3 mb-2 last:mb-0">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{inv.invoice_number || 'Rent Invoice'}</p>
                      <p className="text-xs text-gray-500">Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900">GHS {Number(inv.amount).toLocaleString()}</span>
                      <button
                        onClick={() => handlePay(inv)}
                        disabled={payLoading && payingInvoice?.id === inv.id}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {payLoading && payingInvoice?.id === inv.id ? '...' : 'Pay'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'agreements' && (
          <div className="space-y-3">
            {agreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No agreements found</p>
              </div>
            ) : agreements.map(agr => (
              <div key={agr.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{agr.hostels?.name || 'Hostel'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(agr.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} —
                      {new Date(agr.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                      {agr.room_number && ` • Room ${agr.room_number}`}
                    </p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold shrink-0 ${getAgreementStatusColor(agr.status)}`}>
                    {getAgreementStatusLabel(agr.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  {agr.status === 'sent' && !agr.student_signed_at && (
                    <button
                      onClick={() => setSigningAgreement(agr)}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                    >
                      Sign Now
                    </button>
                  )}
                  {agr.student_signed_at && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>You signed on {new Date(agr.student_signed_at).toLocaleDateString()}</span>
                    </div>
                  )}
                  <button
                    onClick={() => handleDownload(agr)}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'invoices' && (
          <div className="space-y-3">
            {invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No invoices yet</p>
              </div>
            ) : invoices.map(inv => {
              const overdue = inv.status === 'pending' && new Date(inv.due_date) < new Date();
              return (
                <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${overdue ? 'bg-red-50' : inv.status === 'paid' ? 'bg-green-50' : 'bg-amber-50'}`}>
                      {inv.status === 'paid'
                        ? <CheckCircle className="h-5 w-5 text-green-600" />
                        : overdue
                        ? <AlertCircle className="h-5 w-5 text-red-500" />
                        : <Clock className="h-5 w-5 text-amber-500" />
                      }
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number || 'Rent Invoice'}</p>
                      <p className="text-xs text-gray-500">Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-gray-900">GHS {Number(inv.amount).toLocaleString()}</p>
                      {inv.paid_at && <p className="text-[10px] text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString()}</p>}
                    </div>
                    {inv.status === 'pending' && (
                      <button
                        onClick={() => handlePay(inv)}
                        disabled={payLoading && payingInvoice?.id === inv.id}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {payLoading && payingInvoice?.id === inv.id ? '...' : 'Pay Now'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'receipts' && (
          <div className="space-y-3">
            {receipts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <ReceiptIcon className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No payment receipts yet</p>
              </div>
            ) : receipts.map(r => (
              <div key={r.id} className="rounded-xl border border-green-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {r.rent_invoices?.tenancy_agreements?.hostels?.name || 'Rent Payment'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {r.rent_invoices?.invoice_number} •
                      Paid {new Date(r.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {r.paystack_reference && (
                      <p className="text-[10px] text-gray-400 mt-1 font-mono">Ref: {r.paystack_reference}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600 text-lg">GHS {Number(r.amount_paid).toLocaleString()}</p>
                    <span className="text-[10px] font-medium text-gray-400 capitalize">{r.payment_channel || r.payment_method}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {signingAgreement && (
        <ESignStepper
          agreement={signingAgreement}
          role="student"
          onSigned={() => {
            setSigningAgreement(null);
            loadAll();
          }}
          onClose={() => setSigningAgreement(null)}
        />
      )}
    </div>
  );
}
