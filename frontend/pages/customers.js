import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const GRADE_BADGE = { A:'badge-amber', B:'badge-blue', C:'badge-gray', D:'badge-gray', VIP:'badge-amber' };

export default function Customers() {
  const router = useRouter();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', contact:'', phone:'', email:'', address:'', grade:'C' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/customers', { params:{ search } })
      .then(r => { setCustomers(r.data.data); setTotal(r.data.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search]);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/customers', form);
      setShowModal(false);
      setForm({ name:'', contact:'', phone:'', email:'', address:'', grade:'C' });
      load();
    } catch(err) { alert(err.response?.data?.error || 'Error'); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Customers</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary btn-sm">+ Add Customer</button>
      </div>

      <div className="mb-4">
        <input className="input max-w-xs" placeholder="Search by name, phone or email..."
          value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      <div className="card">
        <div className="card-header">
          Customer List
          <span className="text-xs text-gray-400 font-normal">Total: {total}</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Branch</th>
                <th>Grade</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : customers.map(c => (
                <tr key={c.id} className="cursor-pointer" onClick={() => router.push(`/customers/${c.id}`)}>
                  <td className="font-medium text-blue-600 hover:underline">{c.name}</td>
                  <td>{c.contact || '-'}</td>
                  <td>{c.phone || '-'}</td>
                  <td className="text-gray-500">{c.email || '-'}</td>
                  <td className="text-gray-500">{c.branch?.name || 'HQ'}</td>
                  <td><span className={`badge ${GRADE_BADGE[c.grade]||'badge-gray'}`}>{c.grade}</span></td>
                  <td><span className={`badge ${c.isActive?'badge-green':'badge-gray'}`}>{c.isActive?'Active':'Inactive'}</span></td>
                  <td onClick={e => e.stopPropagation()}>
                    <button onClick={() => router.push(`/customers/${c.id}`)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">
                      View History
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && customers.length === 0 && (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No customers found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold flex justify-between">
              Add Customer <button onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-3">
              <div><label className="label">Company Name *</label>
                <input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Contact Person</label>
                  <input className="input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))}/></div>
                <div><label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div>
              </div>
              <div><label className="label">Email</label>
                <input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              <div><label className="label">Address</label>
                <input className="input" value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/></div>
              <div><label className="label">Grade</label>
                <select className="input" value={form.grade} onChange={e=>setForm(f=>({...f,grade:e.target.value}))}>
                  {['A','B','C','D','VIP'].map(g=><option key={g}>{g}</option>)}
                </select>
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary btn-sm">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Add Customer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
