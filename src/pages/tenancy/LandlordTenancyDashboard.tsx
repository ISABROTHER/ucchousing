import { useState, useEffect } from 'react';
import { Users, FileText, CreditCard, CheckCircle, Clock, ChevronRight, Plus, Building2, AlertCircle } from 'lucide-react';
import {
  TenancyAgreement, TenantApplication, RentInvoice,
  getLandlordAgreements, getLandlordApplications, getLandlordInvoices,
  updateApplicationStatus, createAgreement, autoGenerateInvoices,
  getAgreementStatusColor, getAgreementStatusLabel, getTemplates, fillTemplate,
  updateAgreementContent,
} from '../../lib/tenancy';
import ESignStepper from './ESignStepper';

interface LandlordTenancyDashboardProps {
  userId: string;
}

type Tab = 'applications' | 'agreements' | 'invoices';

const STATUS_PIPELINE = ['draft', 'sent', 'student_signed', 'landlord_signed', 'active'];

export default function LandlordTenancyDashboard({ userId }: LandlordTenancyDashboardProps) {
  const [tab, setTab] = useState<Tab>('applications');
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [agreements, setAgreements] = useState<TenancyAgreement[]>([]);
  const [invoices, setInvoices] = useState<RentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);
  const [signingAgreement, setSigningAgreement] = useState<TenancyAgreement | null>(null);

  useEffect(() => { loadAll(); }, [userId]);

  async function loadAll() {
    setLoading(true);
    const [apps, agrs, invs] = await Promise.all([
      getLandlordApplications(userId),
      getLandlordAgreements(userId),
      getLandlordInvoices(userId),
    ]);
    setApplications(apps);
    setAgreements(agrs);
    setInvoices(invs);
    setLoading(false);
  }

  async function handleApprove(app: TenantApplication) {
    setApproving(app.id);
    await updateApplicationStatus(app.id, 'approved');

    const templates = await getTemplates();
    const template = templates[0];
    let content = template?.content || 'Standard tenancy agreement content.';

    const now = new Date();
    const endDate = new Date(now);
    endDate.setFullYear(endDate.getFullYear() + 1);

    content = await fillTemplate(content, {
      agreement_date: now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      landlord_name: 'Property Owner',
      landlord_phone: '',
      hostel_address: app.hostels?.location || '',
      student_name: app.student?.full_name || 'Student',
      student_id: app.student_id.slice(0, 8),
      university: 'University of Cape Coast',
      student_phone: app.student?.phone || '',
      hostel_name: app.hostels?.name || 'Hostel',
      room_number: app.room_number,
      start_date: now.toLocaleDateString('en-GB'),
      end_date: endDate.toLocaleDateString('en-GB'),
      duration_months: '12',
      monthly_rent: '800',
      deposit_amount: '1600',
      student_signature: '[Pending]',
      student_signed_date: '[Pending]',
      landlord_signature: '[Pending]',
      landlord_signed_date: '[Pending]',
    });

    const agr = await createAgreement({
      hostel_id: app.hostel_id,
      student_id: app.student_id,
      owner_id: userId,
      landlord_id: userId,
      application_id: app.id,
      template_id: template?.id,
      start_date: now.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      monthly_rent: 800,
      deposit_amount: 1600,
      room_number: app.room_number,
      agreement_content: content,
    });

    await updateAgreementContent(agr.id, content);
    await autoGenerateInvoices(agr.id, app.student_id, 800, agr.start_date, agr.end_date);
    setApproving(null);
    loadAll();
  }

  async function handleReject(app: TenantApplication) {
    await updateApplicationStatus(app.id, 'rejected');
    loadAll();
  }

  const pendingApps = applications.filter(a => a.status === 'pending');
  const needsCountersign = agreements.filter(a => a.status === 'student_signed');
  const paidInvoices = invoices.filter(i => i.status === 'paid');

  const tabs: { key: Tab; label: string; icon: React.ElementType; badge?: number }[] = [
    { key: 'applications', label: 'Applications', icon: Users, badge: pendingApps.length },
    { key: 'agreements', label: 'Agreements', icon: FileText, badge: needsCountersign.length },
    { key: 'invoices', label: 'Invoices', icon: CreditCard },
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
      <div className="flex items-center gap-4 border-b border-gray-100 px-4">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
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

      <div className="p-4 space-y-3">
        {tab === 'applications' && (
          <>
            {needsCountersign.length > 0 && (
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <AlertCircle className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-blue-800 text-sm">{needsCountersign.length} agreement{needsCountersign.length > 1 ? 's' : ''} awaiting your signature</p>
                  <button onClick={() => setTab('agreements')} className="text-xs text-blue-600 underline mt-0.5">Go to Agreements</button>
                </div>
              </div>
            )}
            {applications.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No applications yet</p>
                <p className="mt-1 text-xs text-gray-400">Students will appear here when they apply to your hostels</p>
              </div>
            ) : applications.map(app => (
              <div key={app.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                        {(app.student?.full_name || 'S')[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{app.student?.full_name || 'Student'}</p>
                        <p className="text-[11px] text-gray-500">{app.student?.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5">{app.hostels?.name || 'Hostel'}</span>
                      {app.room_number && <span className="rounded-md bg-gray-100 px-2 py-0.5">Room {app.room_number}</span>}
                    </div>
                    {app.message && <p className="mt-2 text-xs text-gray-500 italic">"{app.message}"</p>}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold border ${
                    app.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                    app.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {app.status}
                  </span>
                </div>
                {app.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => handleApprove(app)}
                      disabled={approving === app.id}
                      className="flex-1 rounded-lg bg-green-600 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                    >
                      {approving === app.id ? 'Approving...' : 'Approve & Generate Agreement'}
                    </button>
                    <button
                      onClick={() => handleReject(app)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'agreements' && (
          <>
            <div className="mb-4 overflow-x-auto">
              <div className="flex gap-1 min-w-max">
                {STATUS_PIPELINE.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div className={`rounded-full px-3 py-1 text-[10px] font-bold border ${getAgreementStatusColor(s)}`}>
                      {getAgreementStatusLabel(s)}
                    </div>
                    {i < STATUS_PIPELINE.length - 1 && <ChevronRight className="h-3 w-3 text-gray-300 shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
            {agreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No agreements yet</p>
              </div>
            ) : agreements.map(agr => (
              <div key={agr.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{agr.student?.full_name || 'Student'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {agr.hostels?.name}{agr.room_number ? ` • Room ${agr.room_number}` : ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(agr.start_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} —
                      {new Date(agr.end_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })} •
                      GHS {Number(agr.monthly_rent).toLocaleString()}/mo
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getAgreementStatusColor(agr.status)}`}>
                    {getAgreementStatusLabel(agr.status)}
                  </span>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  {agr.student_signed_at && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />Tenant signed
                    </span>
                  )}
                  {(agr.owner_signed_at || agr.landlord_signed_at) && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3.5 w-3.5" />You signed
                    </span>
                  )}
                  {agr.status === 'student_signed' && !(agr.owner_signed_at || agr.landlord_signed_at) && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Clock className="h-3.5 w-3.5" />Awaiting your signature
                    </span>
                  )}
                </div>
                {agr.status === 'student_signed' && !(agr.owner_signed_at || agr.landlord_signed_at) && (
                  <button
                    onClick={() => setSigningAgreement(agr)}
                    className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                  >
                    Countersign Agreement
                  </button>
                )}
              </div>
            ))}
          </>
        )}

        {tab === 'invoices' && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-green-50 border border-green-100 p-4">
                <p className="text-xs text-green-700 font-medium">Collected</p>
                <p className="text-xl font-bold text-green-800 mt-1">
                  GHS {paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-4">
                <p className="text-xs text-amber-700 font-medium">Pending</p>
                <p className="text-xl font-bold text-amber-800 mt-1">
                  GHS {invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + Number(i.amount), 0).toLocaleString()}
                </p>
              </div>
            </div>
            {invoices.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No invoices yet</p>
              </div>
            ) : invoices.slice(0, 20).map(inv => (
              <div key={inv.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{inv.invoice_number || 'Invoice'}</p>
                  <p className="text-xs text-gray-500">Due {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-gray-900">GHS {Number(inv.amount).toLocaleString()}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                    inv.status === 'paid' ? 'bg-green-50 text-green-700 border-green-200' :
                    inv.status === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-amber-50 text-amber-700 border-amber-200'
                  }`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {signingAgreement && (
        <ESignStepper
          agreement={signingAgreement}
          role="landlord"
          onSigned={() => { setSigningAgreement(null); loadAll(); }}
          onClose={() => setSigningAgreement(null)}
        />
      )}
    </div>
  );
}
