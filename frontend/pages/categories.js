import { useEffect, useState } from 'react';
import api from '../lib/api';
export default function Categories() {
  const [categories,setCategories]=useState([]); const [loading,setLoading]=useState(true);
  const [showModal,setShowModal]=useState(false); const [editing,setEditing]=useState(null);
  const [form,setForm]=useState({name:''}); const [saving,setSaving]=useState(false);
  const load=()=>{setLoading(true);api.get('/categories').then(r=>setCategories(r.data)).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const submit=async(e)=>{e.preventDefault();setSaving(true);try{if(editing)await api.put(`/categories/${editing.id}`,form);else await api.post('/categories',form);setShowModal(false);load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="page-title mb-0">Categories</h1><button onClick={()=>{setEditing(null);setForm({name:''});setShowModal(true);}} className="btn-primary btn-sm">+ Add Category</button></div>
      <div className="card"><div className="card-header">Category List <span className="text-xs text-gray-400 font-normal">Total: {categories.length}</span></div>
        <div className="table-wrap"><table><thead><tr><th>Category Name</th><th>No. of Parts</th><th>Action</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={3} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :categories.map(c=>(<tr key={c.id}><td className="font-medium">{c.name}</td><td>{c._count?.products||0} parts</td>
              <td><button onClick={()=>{setEditing(c);setForm({name:c.name});setShowModal(true);}} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">Edit</button></td>
            </tr>))}
            {!loading&&categories.length===0&&<tr><td colSpan={3} className="text-center py-8 text-gray-400">No categories found</td></tr>}
          </tbody>
        </table></div>
      </div>
      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-sm">
        <div className="p-4 border-b font-semibold flex justify-between">{editing?'Edit Category':'Add Category'} <button onClick={()=>setShowModal(false)}>✕</button></div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div><label className="label">Category Name *</label><input className="input" value={form.name} onChange={e=>setForm({name:e.target.value})} required/></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':editing?'Save':'Add'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
