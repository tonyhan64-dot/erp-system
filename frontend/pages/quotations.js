import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const STATUS_BADGE = {
  Draft:'badge-gray', Sent:'badge-amber', Accepted:'badge-green',
  Declined:'badge-red', Converted:'badge-blue'
};

export default function Quotations() {
  const router = useRouter();
  const [quotations, setQuotations] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = () => {
    setLoading(true);
    api.get('/quotations')
      .then(r => { setQuotations(r.data.data||r.data); setTotal(r.data.total||r.data.length); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.patch(`/quotations/${id}/status`, { status });
      load();
    } catch(err) { alert(err.response?.data?.error || 'Error'); }
  };

  const convertToSale = async (q) => {
    if (!q.customerId) { alert('Please assign a customer to this quotation first.'); return; }
    if (!confirm(`Convert quotation ${q.quoteNo} to a sale?`)) return;
    try {
      const r = await api.post(`/quotations/${q.id}/convert`);
      alert(`✅ Sale created: ${r.data.sale.saleNo}`);
      load();
    } catch(err) { alert(err.response?.data?.error || 'Conversion failed'); }
  };

  const deleteQuotation = async (id) => {
    if (!confirm('Delete this quotation?')) return;
    try { await api.delete(`/quotations/${id}`); load(); }
    catch(err) { alert(err.response?.data?.error || 'Error'); }
  };

  const filtered = filter === 'all' ? quotations : quotations.filter(q => q.status === filter);

  const counts = {
    all: quotations.length,
    Draft: quotations.filter(q=>q.status==='Draft').length,
    Sent: quotations.filter(q=>q.status==='Sent').length,
    Accepted: quotations.filter(q=>q.status==='Accepted').length,
    Converted: quotations.filter(q=>q.status==='Converted').length,
  };

  const totalValue = quotations.filter(q=>q.status!=='Declined').reduce((s,q)=>s+Number(q.totalAmount),0);
  const convertedValue = quotations.filter(q=>q.status==='Converted').reduce((s,q)=>s+Number(q.totalAmount),0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title mb-0">Quotations</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage all customer quotations</p>
        </div>
        <button onClick={() => router.push('/inventory')} className="btn-primary btn-sm">
          + New Quotation
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Total Quotations</div>
          <div className="text-2xl font-bold text-blue-600">{counts.all}</div>
          <div className="text-xs text-gray-400">{fmt(totalValue)} value</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Pending</div>
          <div className="text-2xl font-bold text-amber-500">{counts.Draft + counts.Sent}</div>
          <div className="text-xs text-gray-400">Draft + Sent</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Accepted</div>
          <div className="text-2xl font-bold text-green-600">{counts.Accepted}</div>
          <div className="text-xs text-gray-400">Awaiting conversion</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Converted to Sales</div>
          <div className="text-2xl font-bold text-blue-700">{counts.Converted}</div>
          <div className="text-xs text-gray-400">{fmt(convertedValue)}</div>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex border-b border-gray-200 mb-4 overflow-x-auto">
        {[['all','All'],['Draft','Draft'],['Sent','Sent'],['Accepted','Accepted'],['Converted','Converted'],['Declined','Declined']].map(([k,l])=>(
          <button key={k} onClick={()=>setFilter(k)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${
              filter===k?'border-blue-500 text-blue-600 font-medium':'border-transparent text-gray-500'
            }`}>
            {l}
            <span className="ml-1 text-xs text-gray-400">({k==='all'?counts.all:quotations.filter(q=>q.status===k).length})</span>
          </button>
        ))}
      </div>

      {/* Quotations Table */}
      <div className="card">
        <div className="card-header">
          Quotation List
          <span className="text-xs text-gray-400 font-normal">{filtered.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Quote No</th>
                <th>Customer</th>
                <th>Branch</th>
                <th>Date</th>
                <th>Expires</th>
                <th>Items</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filtered.map(q => (
                <tr key={q.id}>
                  <td className="font-mono text-blue-600 font-medium">{q.quoteNo}</td>
                  <td>{q.customer?.name || <span className="text-gray-400 italic">No customer</span>}</td>
                  <td className="text-gray-500">{q.branch?.name || '-'}</td>
                  <td className="text-gray-500">{new Date(q.createdAt).toLocaleDateString('en-ZA')}</td>
                  <td className={`text-sm ${q.expiresAt && new Date(q.expiresAt) < new Date() ? 'text-red-500' : 'text-gray-500'}`}>
                    {q.expiresAt ? new Date(q.expiresAt).toLocaleDateString('en-ZA') : '-'}
                    {q.expiresAt && new Date(q.expiresAt) < new Date() && q.status==='Draft' && (
                      <span className="ml-1 text-xs text-red-400">Expired</span>
                    )}
                  </td>
                  <td className="text-gray-500">{q.items?.length || 0}</td>
                  <td className="text-right font-medium">{fmt(q.totalAmount)}</td>
                  <td><span className={`badge ${STATUS_BADGE[q.status]||'badge-gray'}`}>{q.status}</span></td>
                  <td>
                    <div className="flex gap-1 flex-wrap">
                      {/* Print PDF */}
                      <button onClick={() => printPDF(`/pdf/quotation/${q.id}`)}
                        className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">
                        🖨
                      </button>

                      {/* Mark as Sent */}
                      {q.status === 'Draft' && (
                        <button onClick={() => updateStatus(q.id, 'Sent')}
                          className="text-xs px-2 py-1 rounded border border-amber-200 hover:bg-amber-50 text-amber-600">
                          Send
                        </button>
                      )}

                      {/* Mark as Accepted */}
                      {(q.status === 'Sent' || q.status === 'Draft') && (
                        <button onClick={() => updateStatus(q.id, 'Accepted')}
                          className="text-xs px-2 py-1 rounded border border-green-200 hover:bg-green-50 text-green-600">
                          Accept
                        </button>
                      )}

                      {/* Convert to Sale */}
                      {(q.status === 'Accepted' || q.status === 'Sent') && (
                        <button onClick={() => convertToSale(q)}
                          className="text-xs px-2 py-1 rounded border-none bg-green-500 hover:bg-green-600 text-white">
                          → Sale
                        </button>
                      )}

                      {/* Decline */}
                      {(q.status === 'Draft' || q.status === 'Sent') && (
                        <button onClick={() => updateStatus(q.id, 'Declined')}
                          className="text-xs px-2 py-1 rounded border border-red-200 hover:bg-red-50 text-red-500">
                          Decline
                        </button>
                      )}

                      {/* Delete */}
                      {(q.status === 'Draft' || q.status === 'Declined') && (
                        <button onClick={() => deleteQuotation(q.id)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 hover:bg-red-50 text-red-400">
                          🗑
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-gray-400">
                    <div className="text-3xl mb-2">📋</div>
                    <div>No quotations found</div>
                    <button onClick={() => router.push('/inventory')}
                      className="mt-3 btn-primary btn-sm">
                      Create Quotation from Inventory
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
