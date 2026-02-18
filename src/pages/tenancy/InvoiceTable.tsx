import { CreditCard, CheckCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { RentInvoice, getInvoiceStatusColor } from '../../lib/tenancy';

interface InvoiceTableProps {
  invoices: RentInvoice[];
  onPay?: (invoice: RentInvoice) => void;
  loading?: boolean;
  showHostel?: boolean;
}

export default function InvoiceTable({ invoices, onPay, loading, showHostel }: InvoiceTableProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-gray-100" />
        ))}
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 py-10 text-center">
        <CreditCard className="mx-auto mb-2 h-8 w-8 text-gray-300" />
        <p className="text-sm text-gray-500">No invoices yet</p>
      </div>
    );
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'overdue': return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-amber-500" />;
    }
  }

  function isOverdue(invoice: RentInvoice) {
    return invoice.status === 'pending' && new Date(invoice.due_date) < new Date();
  }

  return (
    <div className="space-y-2">
      {invoices.map(inv => {
        const overdue = isOverdue(inv);
        const effectiveStatus = overdue ? 'overdue' : inv.status;
        return (
          <div
            key={inv.id}
            className="flex items-center justify-between rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50">
                {getStatusIcon(effectiveStatus)}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {inv.invoice_number || `Invoice`}
                  {showHostel && inv.tenancy_agreements?.hostels?.name && (
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      — {inv.tenancy_agreements.hostels.name}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  Due: {new Date(inv.due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {inv.paid_at && <span className="ml-2 text-green-600">Paid {new Date(inv.paid_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-bold text-gray-900">GHS {Number(inv.amount).toLocaleString()}</p>
                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${getInvoiceStatusColor(effectiveStatus)}`}>
                  {effectiveStatus}
                </span>
              </div>
              {inv.status === 'pending' && onPay && (
                <button
                  onClick={() => onPay(inv)}
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition-colors"
                >
                  Pay
                </button>
              )}
              {inv.status === 'paid' && (
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50">
                  <Download className="h-3.5 w-3.5 text-green-600" />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
