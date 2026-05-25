import { useEffect, useState } from 'react';
import api from '../lib/api';
const fmt = n => 'R '+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const CATS = ['Rent','Salaries','Utilities','Logistics','Marketing','Office Supplies','Meals','Maintenance','Insurance','Other'];
export default function Expenses() {
  const [expenses,setExpenses]=useState([]); const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false); const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({date:new Date().toISOString().slice(0,10),category:'Rent',description:'',amount:0});
  const load=()=>{setLoading(true);api.get('/accounting/expenses').then(r=>setExpenses(r.data)).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const submit=async(e)=>{e.preventDefault();setSaving(true);try{await api.post('/accounting/expenses',{...form,amount:Number(form.amount)});setShowModal(false);setForm({date:new Date().toISOString().slice(0,10),category:'Rent',description:'',amount:0});load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  const total=expenses.reduce((s,e)=>s+Number(e.amount),0);
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="page-title mb-0">Expenses</h1><button onClick={()=>setShowModal(true)} className="btn-primary btn-sm">+ Add Expense</button></div>
      <div className="stat-card mb-4"><div className="text-xs text-gray-500 mb-1">Total Expenses</div><div className="text-2xl font-semibold text-red-500">{fmt(total)}</div><div className="text-xs text-gray-400">{expenses.length} records</div></div>
      <div className="card"><div className="card-header">Expense Records</div>
        <div className="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Amount</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :expenses.map(e=>(<tr key={e.id}><td className="text-gray-500">{new Date(e.date).toLocaleDateString('en-ZA')}</td><td><span className="badge badge-gray">{e.category}</span></td><td>{e.description}</td><td className="text-red-500 font-medium">{fmt(e.amount)}</td></tr>))}
            {!loading&&expenses.length===0&&<tr><td colSpan={4} className="text-center py-8 text-gray-400">No expense records</td></tr>}
          </tbody>
        </table></div>
      </div>
      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">Add Expense <button onClick={()=>setShowModal(false)}>✕</button></div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Date *</label><input className="input" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} required/></div>
          <div><label className="label">Category *</label><select className="input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>{CATS.map(c=><option key={c}>{c}</option>)}</select></div></div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} required/></div>
          <div><label className="label">Amount (R) *</label><input className="input" type="number" min={0} value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} required/></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Add Expense'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
