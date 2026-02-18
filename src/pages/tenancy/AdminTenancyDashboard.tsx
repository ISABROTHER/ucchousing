import { useState, useEffect } from 'react';
import { FileText, Activity, Edit3, Save, Plus, Eye } from 'lucide-react';
import { AgreementTemplate, getTemplates, getAgreementStatusColor, getAgreementStatusLabel } from '../../lib/tenancy';
import { supabase } from '../../lib/supabase';

type Tab = 'templates' | 'agreements' | 'audit';

interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export default function AdminTenancyDashboard() {
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [allAgreements, setAllAgreements] = useState<{ id: string; status: string; created_at: string; student_id: string; hostel_id: string }[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<AgreementTemplate | null>(null);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const tmps = await getTemplates();
    setTemplates(tmps);

    const { data: logs } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAuditLogs(logs || []);

    const { data: agrs } = await supabase
      .from('tenancy_agreements')
      .select('id, status, created_at, student_id, hostel_id')
      .order('created_at', { ascending: false })
      .limit(50);
    setAllAgreements(agrs || []);

    setLoading(false);
  }

  function handleEdit(template: AgreementTemplate) {
    setEditingTemplate(template);
    setEditContent(template.content);
  }

  async function handleSave() {
    if (!editingTemplate) return;
    setSaving(true);
    await supabase
      .from('agreement_templates')
      .update({ content: editContent, updated_at: new Date().toISOString() })
      .eq('id', editingTemplate.id);
    setSaving(false);
    setEditingTemplate(null);
    loadAll();
  }

  async function handleNewTemplate() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
      .from('agreement_templates')
      .insert({
        created_by: user?.id,
        title: 'New Template',
        content: 'Enter template content here. Use {{placeholder}} for dynamic values.',
        category: 'custom',
        is_active: true,
      })
      .select()
      .single();
    if (data) {
      loadAll();
      handleEdit(data as AgreementTemplate);
    }
  }

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'templates', label: 'Templates', icon: Edit3 },
    { key: 'agreements', label: 'All Agreements', icon: FileText },
    { key: 'audit', label: 'Audit Log', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-100" />)}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2 border-b border-gray-100 px-4">
        {tabs.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-3 text-sm font-medium transition-colors ${
                tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="p-4">
        {tab === 'templates' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-600">Manage agreement templates used to auto-generate tenancy contracts.</p>
              <button
                onClick={handleNewTemplate}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                New Template
              </button>
            </div>

            {editingTemplate ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <input
                    value={editingTemplate.title}
                    onChange={e => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="font-bold text-gray-900 text-sm border-0 outline-none bg-transparent w-full"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingTemplate(null)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      <Save className="h-3 w-3" />
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
                <div className="mb-2 rounded-lg bg-amber-50 border border-amber-100 p-2 text-xs text-amber-700">
                  Use <code className="font-mono bg-amber-100 px-1 rounded">{'{{placeholder}}'}</code> for dynamic values: student_name, hostel_name, monthly_rent, start_date, etc.
                </div>
                <textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full rounded-lg border border-gray-200 p-3 font-mono text-xs text-gray-700 focus:border-blue-400 focus:outline-none resize-none"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(t => (
                  <div key={t.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{t.title}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Category: {t.category} • v{t.version} •
                          Updated {new Date(t.updated_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <button
                          onClick={() => handleEdit(t)}
                          className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                          <Edit3 className="h-3 w-3" />
                          Edit
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-gray-400 font-mono truncate">{t.content.slice(0, 80)}...</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'agreements' && (
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm text-gray-600">{allAgreements.length} total agreements</p>
            </div>
            {allAgreements.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <FileText className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No agreements found</p>
              </div>
            ) : allAgreements.map(agr => (
              <div key={agr.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div>
                  <p className="font-mono text-xs text-gray-700">{agr.id.slice(0, 16)}...</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {new Date(agr.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getAgreementStatusColor(agr.status)}`}>
                  {getAgreementStatusLabel(agr.status)}
                </span>
              </div>
            ))}
          </div>
        )}

        {tab === 'audit' && (
          <div className="space-y-2">
            <p className="text-sm text-gray-600 mb-3">Immutable log of all tenancy-related actions.</p>
            {auditLogs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
                <Activity className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                <p className="text-sm text-gray-500">No audit logs yet</p>
              </div>
            ) : auditLogs.map(log => (
              <div key={log.id} className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-mono font-bold text-gray-600">
                        {log.entity_type}
                      </span>
                      <span className="text-xs font-semibold text-gray-900">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1 font-mono truncate">
                      Entity: {log.entity_id?.slice(0, 12)}...
                    </p>
                    {Object.keys(log.metadata).length > 0 && (
                      <p className="text-[10px] text-gray-400 mt-0.5 font-mono truncate">
                        {JSON.stringify(log.metadata).slice(0, 60)}...
                      </p>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 shrink-0">
                    {new Date(log.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
