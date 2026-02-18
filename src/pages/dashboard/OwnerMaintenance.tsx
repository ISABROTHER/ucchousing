import { useState, useEffect } from 'react';
import { Wrench, AlertCircle } from 'lucide-react';
import {
  getOwnerMaintenanceRequests,
  updateMaintenanceStatus,
  MaintenanceRequest,
  getPriorityColor,
  getStatusColor,
} from '../../lib/maintenance';

interface OwnerMaintenanceProps {
  userId: string;
}

export default function OwnerMaintenance({ userId }: OwnerMaintenanceProps) {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    loadRequests();
  }, [userId]);

  async function loadRequests() {
    try {
      const data = await getOwnerMaintenanceRequests(userId);
      setRequests(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(id: string, status: 'open' | 'in_progress' | 'resolved' | 'closed') {
    setUpdating(id);
    setError('');
    try {
      await updateMaintenanceStatus(id, status, notes[id]);
      setRequests(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                status,
                owner_notes: notes[id] || r.owner_notes,
                resolved_at: (status === 'resolved' || status === 'closed') ? new Date().toISOString() : r.resolved_at,
              }
            : r
        )
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update');
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-[#DC143C] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex gap-2 text-sm text-red-600">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
          <Wrench className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500">No maintenance requests</p>
        </div>
      ) : (
        requests.map(req => (
          <div key={req.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-gray-900">{req.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {req.hostels?.name} · {req.student?.full_name}
                </p>
              </div>
              <div className="flex gap-2">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${getPriorityColor(req.priority)}`}>
                  {req.priority}
                </span>
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border capitalize ${getStatusColor(req.status)}`}>
                  {req.status.replace('_', ' ')}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4 leading-relaxed">{req.description}</p>

            {req.status !== 'resolved' && req.status !== 'closed' && (
              <div className="space-y-3 border-t border-gray-50 pt-4">
                <textarea
                  value={notes[req.id] || req.owner_notes || ''}
                  onChange={e => setNotes(prev => ({ ...prev, [req.id]: e.target.value }))}
                  placeholder="Add response notes..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-[#DC143C]/20"
                />
                <div className="flex gap-2 flex-wrap">
                  {([
                    { value: 'in_progress', label: 'In Progress', color: 'border-amber-300 text-amber-700 hover:bg-amber-50' },
                    { value: 'resolved', label: 'Mark Resolved', color: 'border-green-300 text-green-700 hover:bg-green-50' },
                    { value: 'closed', label: 'Close', color: 'border-gray-300 text-gray-600 hover:bg-gray-50' },
                  ] as const).map(action => (
                    <button
                      key={action.value}
                      onClick={() => handleStatusUpdate(req.id, action.value)}
                      disabled={updating === req.id || req.status === action.value}
                      className={`px-4 py-2 text-sm font-semibold rounded-xl border transition-colors disabled:opacity-50 ${action.color}`}
                    >
                      {updating === req.id ? 'Updating...' : action.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {req.owner_notes && req.status !== 'in_progress' && (
              <div className="mt-3 p-3 bg-blue-50 rounded-xl">
                <p className="text-xs font-semibold text-blue-700 mb-1">Your Response</p>
                <p className="text-sm text-blue-600">{req.owner_notes}</p>
              </div>
            )}

            <p className="text-xs text-gray-400 mt-3">
              Submitted {new Date(req.created_at).toLocaleDateString()}
            </p>
          </div>
        ))
      )}
    </div>
  );
}
