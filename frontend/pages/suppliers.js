import { useEffect, useState } from 'react';
import api from '../lib/api';
export default function Suppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name:'', contact:'', phone:'', email:'', paymentTerms:'30 Days' });
  const [saving, setSaving] = useState(false);
  const load = () => { setLoading(true); api.get('/suppliers').then(r=>setSuppliers(r.data.data)).finally(()=>setLoading(false)); };
  useEffect(()=>{load();},[]);
  const submit = async(e)=>{ e.preventDefault();setSaving(true);try{await api.post('/suppliers',form);setShowModal(false);load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);} };
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="page-title mb-0">Suppliers</h1><button onClick={()=>setShowModal(true)} className="btn-primary btn-sm">+ Add Supplier</button></div>
      <div className="card">
        <div className="card-header">Supplier List</div>
        <div className="table-wrap"><table>
          <thead><tr><th>Company</th><th>Contact</th><th>Phone</th><th>Payment Terms</th><th>Status</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :suppliers.map(s=>(<tr key={s.id}><td className="font-medium text-blue-600">{s.name}</td><td>{s.contact||'-'}</td><td>{s.phone||'-'}</td><td>{s.paymentTerms}</td><td><span className={`badge ${s.isActive?'badge-green':'badge-gray'}`}>{s.isActive?'Active':'Inactive'}</span></td></tr>))}
          </tbody>
        </table></div>
      </div>
      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">Add Supplier <button onClick={()=>setShowModal(false)}>✕</button></div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div><label className="label">Company Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Contact</label><input className="input" value={form.contact} onChange={e=>setForm(f=>({...f,contact:e.target.value}))}/></div><div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/></div></div>
          <div><label className="label">Payment Terms</label><select className="input" value={form.paymentTerms} onChange={e=>setForm(f=>({...f,paymentTerms:e.target.value}))}>{['Immediate','15 Days','30 Days','60 Days'].map(t=><option key={t}>{t}</option>)}</select></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Add Supplier'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
