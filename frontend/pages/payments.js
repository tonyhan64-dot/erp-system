import { useEffect, useState } from 'react';
import api from '../lib/api';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('all');
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0,10),
    type: 'Receipt',
    method: 'Cash',
    amount: 0,
    customerId: '',
  });

  const load = () => {
    setLoading(true);
    setError('');
    api.get('/accounting/payments')
      .then(r => setPayments(Array.isArray(r.data) ? r.data : []))
      .catch(err => setError(err.response?.data?.error || 'Failed to load payments'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/customers')
      .then(r => setCustomers(r.data.data || []))
      .catch(() => setCustomers([]));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/accounting/payments', {
        ...form,
        amount: Number(form.amount),
        customerId: form.customerId ? Number(form.customerId) : null,
      });
      setShowModal(false);
      setForm({ date:new Date().toISOString().slice(0,10), type:'Receipt', method:'Cash', amount:0, customerId:'' });
      load();
    } catch(err) { alert(err.response?.data?.error || 'Error recording payment'); }
    finally { setSaving(false); }
  };

  const filtered = tab === 'all' ? payments
    : payments.filter(p => {
        if (tab === 'Receipt') return p.type === 'Receipt' || p.type === '수금';
        if (tab === 'Payment') return p.type === 'Payment' || p.type === '지급';
        return true;
      });

  const totalIn  = payments.filter(p => p.type === 'Receipt' || p.type === '수금').reduce((s,p)=>s+Number(p.amount),0);
  const totalOut = payments.filter(p => p.type === 'Payment' || p.type === '지급').reduce((s,p)=>s+Number(p.amount),0);

  const typeLabel = (t) => t === '수금' ? 'Receipt' : t === '지급' ? 'Payment' : t;
  const typeBadge = (t) => (t==='Receipt'||t==='수금') ? 'badge-green' : 'badge-red';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Payments</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary btn-sm">+ Record Payment</button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Total Received</div>
          <div className="text-xl font-semibold text-green-600">{fmt(totalIn)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Total Paid Out</div>
          <div className="text-xl font-semibold text-red-500">{fmt(totalOut)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">Net Cash Flow</div>
          <div className={`text-xl font-semibold ${totalIn-totalOut>=0?'text-blue-600':'text-red-500'}`}>
            {fmt(totalIn - totalOut)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[['all','All'],['Receipt','Receipts'],['Payment','Payments']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab===k ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-500'
            }`}>{l}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          ⚠️ {error} — <button onClick={load} className="underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <div className="card">
        <div className="card-header">
          Payment Records
          <span className="text-xs text-gray-400 font-normal">{filtered.length} records</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Customer</th>
                <th>Method</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id}>
                  <td className="text-gray-500">{new Date(p.date||p.createdAt).toLocaleDateString('en-ZA')}</td>
                  <td><span className={`badge ${typeBadge(p.type)}`}>{typeLabel(p.type)}</span></td>
                  <td>{p.customer?.name || '-'}</td>
                  <td>{p.method}</td>
                  <td className={`text-right font-medium ${typeBadge(p.type)==='badge-green'?'text-green-600':'text-red-500'}`}>
                    {fmt(p.amount)}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No payment records</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold flex justify-between">
              Record Payment <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date *</label>
                  <input className="input" type="date" value={form.date}
                    onChange={e=>setForm(f=>({...f,date:e.target.value}))} required/>
                </div>
                <div><label className="label">Type *</label>
                  <select className="input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                    <option value="Receipt">Receipt (from Customer)</option>
                    <option value="Payment">Payment (to Supplier)</option>
                  </select>
                </div>
              </div>
              <div><label className="label">Customer</label>
                <select className="input" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))}>
                  <option value="">Select (optional)</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Payment Method *</label>
                  <select className="input" value={form.method} onChange={e=>setForm(f=>({...f,method:e.target.value}))}>
                    {['Cash','Card','EFT','Cheque','Other'].map(m=><option key={m}>{m}</option>)}
                  </select>
                </div>
                <div><label className="label">Amount (R) *</label>
                  <input className="input" type="number" min={0} step="0.01" value={form.amount}
                    onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required/>
                </div>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary btn-sm">
                  {saving ? 'Saving...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
