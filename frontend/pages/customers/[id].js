import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../../lib/api';
import { printPDF } from '../../lib/printHelper';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const STATUS = { Completed:'badge-green', Processing:'badge-blue', Pending:'badge-amber', Cancelled:'badge-red', 완료:'badge-green', 처리중:'badge-blue', 대기:'badge-amber', 취소:'badge-red' };

export default function CustomerDetail() {
  const router = useRouter();
  const { id } = router.query;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('sales');

  useEffect(() => {
    if (!id) return;
    api.get(`/customers/${id}`)
      .then(r => setCustomer(r.data))
      .catch(() => router.push('/customers'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex items-center justify-center h-64 text-sm text-gray-400">Loading...</div>;
  if (!customer) return null;

  const GRADE_COLOR = { A:'#185FA5', B:'#0F6E56', C:'#854F0B', D:'#888780', VIP:'#534AB7' };

  return (
    <div>
      {/* Back Button */}
      <button onClick={() => router.push('/customers')}
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4">
        ← Back to Customers
      </button>

      {/* Customer Header */}
      <div className="card p-5 mb-4" style={{borderLeft:`4px solid ${GRADE_COLOR[customer.grade]||'#888'}`}}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div style={{width:52,height:52,borderRadius:12,background:GRADE_COLOR[customer.grade]+'22',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>👥</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{customer.name}</h1>
              <div className="text-sm text-gray-500">{customer.contact || '-'}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                {customer.phone && <span>📞 {customer.phone}</span>}
                {customer.email && <span>📧 {customer.email}</span>}
                {customer.branch && <span>📍 {customer.branch.name}</span>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:GRADE_COLOR[customer.grade]+'22',color:GRADE_COLOR[customer.grade],fontWeight:600}}>
              Grade {customer.grade}
            </span>
            <div className="mt-2">
              <span className={`badge ${customer.isActive?'badge-green':'badge-gray'}`}>
                {customer.isActive?'Active':'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="stat-card text-center">
          <div className="text-xs text-gray-500 mb-1">Total Purchased</div>
          <div className="text-xl font-bold text-blue-600">{fmt(customer.totalPurchased)}</div>
          <div className="text-xs text-gray-400">{customer.sales?.length||0} transactions</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xs text-gray-500 mb-1">Total Paid</div>
          <div className="text-xl font-bold text-green-600">{fmt(customer.totalPaid)}</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-xs text-gray-500 mb-1">Outstanding Balance</div>
          <div className={`text-xl font-bold ${customer.outstanding>0?'text-red-500':'text-green-600'}`}>
            {fmt(customer.outstanding)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[['sales','Sales History'],['invoices','Invoices'],['payments','Payments']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab===k?'border-blue-500 text-blue-600 font-medium':'border-transparent text-gray-500'}`}>
            {l}
            <span className="ml-1 text-xs text-gray-400">
              ({k==='sales'?customer.sales?.length:k==='invoices'?customer.invoices?.length:customer.payments?.length})</span>
          </button>
        ))}
      </div>

      {/* Sales History */}
      {tab === 'sales' && (
        <div className="card">
          <div className="card-header">Sales History</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Sale No</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th><th>Print</th></tr></thead>
              <tbody>
                {customer.sales?.length===0 ? (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400">No sales history</td></tr>
                ) : customer.sales?.map(s => (
                  <tr key={s.id}>
                    <td className="text-blue-600 font-medium font-mono">{s.saleNo}</td>
                    <td className="text-gray-500">{new Date(s.saleDate||s.createdAt).toLocaleDateString('en-ZA')}</td>
                    <td className="text-gray-500">{s.items?.length||0} items</td>
                    <td className="font-medium">{fmt(s.totalAmount)}</td>
                    <td><span className={`badge ${STATUS[s.status]||'badge-gray'}`}>{s.status}</span></td>
                    <td><button onClick={()=>printPDF(`/pdf/invoice/${s.id}`)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">🖨 PDF</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Invoices */}
      {tab === 'invoices' && (
        <div className="card">
          <div className="card-header">Invoices</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice No</th><th>Amount</th><th>Due Date</th><th>Status</th></tr></thead>
              <tbody>
                {customer.invoices?.length===0 ? (
                  <tr><td colSpan={4} className="text-center py-8 text-gray-400">No invoices</td></tr>
                ) : customer.invoices?.map(inv => (
                  <tr key={inv.id}>
                    <td className="font-medium text-blue-600">{inv.invoiceNo}</td>
                    <td>{fmt(inv.amount)}</td>
                    <td className="text-gray-500">{new Date(inv.dueDate).toLocaleDateString('en-ZA')}</td>
                    <td><span className={`badge ${inv.status==='Paid'||inv.status==='결제완료'?'badge-green':'badge-amber'}`}>{inv.status==='결제완료'?'Paid':inv.status==='미결제'?'Unpaid':inv.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments */}
      {tab === 'payments' && (
        <div className="card">
          <div className="card-header">Payment History</div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead>
              <tbody>
                {customer.payments?.length===0 ? (
                  <tr><td colSpan={3} className="text-center py-8 text-gray-400">No payment records</td></tr>
                ) : customer.payments?.map(p => (
                  <tr key={p.id}>
                    <td className="text-gray-500">{new Date(p.date||p.createdAt).toLocaleDateString('en-ZA')}</td>
                    <td>{p.method}</td>
                    <td className="font-medium text-green-600">{fmt(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
