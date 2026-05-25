import { useEffect, useState } from 'react';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';
const fmt = n => 'R '+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function Invoices() {
  const [invoices,setInvoices]=useState([]); const [loading,setLoading]=useState(true);
  useEffect(()=>{api.get('/accounting/invoices').then(r=>setInvoices(r.data)).finally(()=>setLoading(false));},[]);
  const totalUnpaid=invoices.filter(i=>i.status==='미결제'||i.status==='Unpaid').reduce((s,i)=>s+Number(i.amount),0);
  const totalPaid=invoices.filter(i=>i.status==='결제완료'||i.status==='Paid').reduce((s,i)=>s+Number(i.amount),0);
  return (
    <div>
      <h1 className="page-title">Invoices</h1>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Total Invoices</div><div className="text-xl font-semibold text-blue-600">{invoices.length}</div></div>
        <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Outstanding</div><div className="text-xl font-semibold text-amber-600">{fmt(totalUnpaid)}</div></div>
        <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Paid</div><div className="text-xl font-semibold text-green-600">{fmt(totalPaid)}</div></div>
      </div>
      <div className="card"><div className="card-header">Invoice List</div>
        <div className="table-wrap"><table><thead><tr><th>Invoice No</th><th>Customer</th><th>Amount</th><th>Due Date</th><th>Status</th><th>Print</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :invoices.map(inv=>(<tr key={inv.id}>
              <td className="text-blue-600 font-medium">{inv.invoiceNo}</td>
              <td>{inv.customer?.name||'-'}</td>
              <td>{fmt(inv.amount)}</td>
              <td className="text-gray-500">{new Date(inv.dueDate).toLocaleDateString('en-ZA')}</td>
              <td><span className={`badge ${inv.status==='결제완료'||inv.status==='Paid'?'badge-green':inv.status==='미결제'||inv.status==='Unpaid'?'badge-amber':'badge-red'}`}>{inv.status==='결제완료'?'Paid':inv.status==='미결제'?'Unpaid':inv.status}</span></td>
              <td><button onClick={()=>printPDF(`/pdf/invoice/${inv.saleId}`)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">🖨 PDF</button></td>
            </tr>))}
            {!loading&&invoices.length===0&&<tr><td colSpan={6} className="text-center py-8 text-gray-400">No invoices found</td></tr>}
          </tbody>
        </table></div>
      </div>
    </div>
  );
}
