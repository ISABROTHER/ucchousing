import { useState, useEffect } from 'react';
import {
  Zap, Droplets, Plus, Trash2, CheckCircle, AlertCircle,
  Clock, Copy, Users, X, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  getUtilityAccounts, createUtilityAccount, deleteUtilityAccount,
  getTopupHistory, initiateTopup, getBillSplits, settleBillSplit,
  UtilityAccount, UtilityTopup, BillSplit,
  PROVIDER_INFO, TOPUP_AMOUNTS, getTopupStatusColor
} from '../lib/utilities';
import { PageType } from '../App';

interface UtilitiesPageProps {
  user: any;
  userProfile: any;
  onNavigate: (page: PageType) => void;
}

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  ecg: Zap,
  gwcl: Droplets,
  other: Zap,
};

export default function UtilitiesPage({ user, userProfile, onNavigate }: UtilitiesPageProps) {
  const [accounts, setAccounts] = useState<UtilityAccount[]>([]);
  const [topups, setTopups] = useState<UtilityTopup[]>([]);
  const [splits, setSplits] = useState<BillSplit[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'topup' | 'history' | 'splits'>('topup');
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<UtilityAccount | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(20);
  const [customAmount, setCustomAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [newAccount, setNewAccount] = useState({
    provider: 'ecg' as 'ecg' | 'gwcl' | 'other',
    meter_number: '',
    account_name: '',
    is_shared: false,
  });

  useEffect(() => {
    if (user) load();
  }, [user]);

  async function load() {
    try {
      const [accts, tops, spls] = await Promise.all([
        getUtilityAccounts(user.id),
        getTopupHistory(user.id),
        getBillSplits(user.id),
      ]);
      setAccounts(accts);
      setTopups(tops);
      setSplits(spls);
      if (accts.length > 0) setSelectedAccount(accts[0]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAccount(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const acct = await createUtilityAccount({ ...newAccount, student_id: user.id });
      setAccounts(prev => [...prev, acct]);
      if (!selectedAccount) setSelectedAccount(acct);
      setShowAddAccount(false);
      setNewAccount({ provider: 'ecg', meter_number: '', account_name: '', is_shared: false });
      setSuccess('Meter account added!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add account');
    }
  }

  async function handleDeleteAccount(id: string) {
    if (!confirm('Remove this meter account?')) return;
    await deleteUtilityAccount(id);
    const remaining = accounts.filter(a => a.id !== id);
    setAccounts(remaining);
    if (selectedAccount?.id === id) setSelectedAccount(remaining[0] || null);
  }

  async function handleTopup() {
    if (!selectedAccount) return;
    const amount = customAmount ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount < 1 || amount > 10000) {
      setError('Please enter a valid amount between GHS 1 and GHS 10,000');
      return;
    }
    setProcessing(true);
    setError('');
    try {
      const topup = await initiateTopup(selectedAccount.id, user.id, amount);
      setTopups(prev => [topup, ...prev]);
      setSuccess(`Top-up of GHS ${amount} initiated! Your token will appear in transaction history.`);
      setCustomAmount('');
      setTab('history');
      setTimeout(() => setSuccess(''), 6000);

      setTimeout(async () => {
        const { data } = await supabase
          .from('utility_topups').select('*').eq('id', topup.id).single();
        if (data?.token_received) {
          setTopups(prev => prev.map(t => t.id === topup.id ? { ...t, ...data } : t));
        }
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Top-up failed');
    } finally {
      setProcessing(false);
    }
  }

  async function handleSettle(splitId: string) {
    await settleBillSplit(splitId);
    setSplits(prev => prev.map(s => s.id === splitId ? { ...s, is_settled: true, settled_at: new Date().toISOString() } : s));
  }

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  }

  const totalSpent = topups.filter(t => t.status === 'success').reduce((sum, t) => sum + t.amount, 0);
  const pendingSplits = splits.filter(s => !s.is_settled && s.owee_id === user.id).reduce((sum, s) => sum + s.amount_owed, 0);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <button onClick={() => onNavigate('auth')} className="px-6 py-2 bg-[#DC143C] text-white font-semibold rounded-xl">Sign In</button>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="w-8 h-8 bg-[#DC143C] rounded-full animate-pulse" /></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-50 rounded-xl flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-600" />
              </div>
              Utility Payments
            </h1>
            <p className="text-gray-500 mt-2">Top-up ECG & GWCL meters, split bills with roommates</p>
          </div>
          <button onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors">
            <Plus className="w-4 h-4" />
            Add Meter
          </button>
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

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Zap className="w-5 h-5 text-yellow-500 mb-2" />
            <p className="text-xl font-bold text-gray-900">{accounts.length}</p>
            <p className="text-xs text-gray-500">Meter accounts</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <RefreshCw className="w-5 h-5 text-emerald-500 mb-2" />
            <p className="text-xl font-bold text-gray-900">GHS {totalSpent.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total topped up</p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <Users className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-xl font-bold text-gray-900">GHS {pendingSplits.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Owed by you</p>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center mb-6">
            <Zap className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">No Meter Accounts</h3>
            <p className="text-gray-500 text-sm mb-4">Add your ECG or GWCL meter number to top up directly</p>
            <button onClick={() => setShowAddAccount(true)} className="px-5 py-2.5 bg-[#DC143C] text-white font-semibold rounded-xl text-sm hover:bg-red-700 transition-colors">
              Add Meter Account
            </button>
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
              {accounts.map(acct => {
                const info = PROVIDER_INFO[acct.provider];
                const Icon = PROVIDER_ICONS[acct.provider];
                return (
                  <button key={acct.id} onClick={() => setSelectedAccount(acct)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border flex-shrink-0 transition-all ${selectedAccount?.id === acct.id ? 'border-[#DC143C] bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${info.color}`}>
                      <Icon className="w-4.5 h-4.5" />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-bold text-gray-900">{acct.account_name}</p>
                      <p className="text-xs text-gray-500">{acct.meter_number}</p>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDeleteAccount(acct.id); }}
                      className="ml-2 p-1 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-1 bg-white rounded-2xl border border-gray-100 p-1.5 mb-6">
              {(['topup', 'history', 'splits'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors capitalize ${tab === t ? 'bg-[#DC143C] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                  {t === 'topup' ? 'Top-Up' : t === 'history' ? 'History' : 'Bill Splits'}
                </button>
              ))}
            </div>

            {tab === 'topup' && selectedAccount && (
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                  {(() => { const Icon = PROVIDER_ICONS[selectedAccount.provider]; return (
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${PROVIDER_INFO[selectedAccount.provider].color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                  ); })()}
                  <div>
                    <h3 className="font-bold text-gray-900">{selectedAccount.account_name}</h3>
                    <p className="text-sm text-gray-500">{PROVIDER_INFO[selectedAccount.provider].name}</p>
                    <p className="text-xs text-gray-400 font-mono">{selectedAccount.meter_number}</p>
                  </div>
                  {selectedAccount.is_shared && (
                    <span className="ml-auto flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      <Users className="w-3 h-3" /> Shared
                    </span>
                  )}
                </div>

                <p className="text-sm font-semibold text-gray-700 mb-3">Select amount (GHS)</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 mb-4">
                  {TOPUP_AMOUNTS.map(amt => (
                    <button key={amt} type="button"
                      onClick={() => { setSelectedAmount(amt); setCustomAmount(''); }}
                      className={`py-2.5 rounded-xl text-sm font-bold border transition-colors ${selectedAmount === amt && !customAmount ? 'bg-[#DC143C] text-white border-[#DC143C]' : 'border-gray-200 text-gray-700 hover:border-gray-300'}`}>
                      {amt}
                    </button>
                  ))}
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Or enter custom amount (GHS)</label>
                  <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
                    placeholder="e.g. 75" min="1" max="10000"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-5 flex justify-between items-center">
                  <span className="text-sm text-gray-600">Top-up amount</span>
                  <span className="text-xl font-bold text-gray-900">
                    GHS {customAmount || selectedAmount}
                  </span>
                </div>

                <button onClick={handleTopup} disabled={processing || !selectedAccount}
                  className="w-full py-3.5 bg-[#DC143C] text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {processing ? (
                    <><RefreshCw className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Top Up Now</>
                  )}
                </button>
                <p className="text-xs text-center text-gray-400 mt-3">
                  Tokens are generated instantly and delivered to your transaction history
                </p>
              </div>
            )}

            {tab === 'history' && (
              <div className="space-y-3">
                {topups.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <RefreshCw className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No top-ups yet</p>
                  </div>
                ) : (
                  topups.map(topup => {
                    const acct = topup.utility_accounts;
                    const info = acct ? PROVIDER_INFO[acct.provider] : PROVIDER_INFO.other;
                    const Icon = acct ? PROVIDER_ICONS[acct.provider] : Zap;
                    return (
                      <div key={topup.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${info.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className="font-semibold text-gray-900 text-sm">{acct?.account_name || 'Meter Top-up'}</p>
                              <span className={`px-2 py-0.5 rounded-lg border text-xs font-semibold capitalize flex-shrink-0 ${getTopupStatusColor(topup.status)}`}>
                                {topup.status}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500">{topup.reference_number} · {new Date(topup.created_at).toLocaleString()}</p>
                            {topup.token_received && (
                              <div className="mt-2 flex items-center gap-2 bg-green-50 rounded-xl px-3 py-2">
                                <p className="text-xs font-mono text-green-700 flex-1 font-semibold">{topup.token_received}</p>
                                <button onClick={() => copyToken(topup.token_received!)}
                                  className="p-1 hover:bg-green-100 rounded-lg transition-colors">
                                  {copiedToken === topup.token_received ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-green-600" />}
                                </button>
                              </div>
                            )}
                          </div>
                          <p className="text-lg font-bold text-gray-900 flex-shrink-0">GHS {topup.amount}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {tab === 'splits' && (
              <div className="space-y-3">
                {splits.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
                    <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                    <p className="text-gray-500">No bill splits yet</p>
                    <p className="text-xs text-gray-400 mt-1">Bill splits are created when shared meters are topped up</p>
                  </div>
                ) : (
                  splits.map(split => {
                    const isOwed = split.owee_id === user.id;
                    const otherName = isOwed ? split.payer?.full_name : split.owee?.full_name;
                    return (
                      <div key={split.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOwed ? 'bg-red-50' : 'bg-green-50'}`}>
                              <Users className={`w-4.5 h-4.5 ${isOwed ? 'text-red-600' : 'text-green-600'}`} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">
                                {isOwed ? `You owe ${otherName?.split(' ')[0]}` : `${otherName?.split(' ')[0]} owes you`}
                              </p>
                              <p className="text-xs text-gray-400">{new Date(split.created_at).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <p className={`text-lg font-bold ${isOwed ? 'text-red-600' : 'text-green-600'}`}>
                              GHS {split.amount_owed.toFixed(2)}
                            </p>
                            {!split.is_settled ? (
                              <button onClick={() => handleSettle(split.id)}
                                className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors">
                                Settle
                              </button>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                                <CheckCircle className="w-3.5 h-3.5" /> Settled
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </>
        )}
      </div>

      {showAddAccount && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Add Meter Account</h2>
              <button onClick={() => setShowAddAccount(false)} className="p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleAddAccount} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Provider *</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ecg', 'gwcl', 'other'] as const).map(p => {
                    const Icon = PROVIDER_ICONS[p];
                    const info = PROVIDER_INFO[p];
                    return (
                      <button key={p} type="button"
                        onClick={() => setNewAccount(prev => ({ ...prev, provider: p }))}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-colors ${newAccount.provider === p ? 'border-[#DC143C] bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${info.color}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 uppercase">{p}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Meter Number *</label>
                <input type="text" value={newAccount.meter_number} onChange={e => setNewAccount(p => ({ ...p, meter_number: e.target.value }))}
                  placeholder="e.g. 01-2345-6789" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Account Name / Label *</label>
                <input type="text" value={newAccount.account_name} onChange={e => setNewAccount(p => ({ ...p, account_name: e.target.value }))}
                  placeholder="e.g. Room 5B ECG Meter" required
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20 focus:border-[#DC143C]" />
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={newAccount.is_shared} onChange={e => setNewAccount(p => ({ ...p, is_shared: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Shared meter (with roommates)</span>
              </label>
              <button type="submit"
                className="w-full py-3 bg-[#DC143C] text-white font-bold rounded-xl hover:bg-red-700 transition-colors">
                Add Account
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
