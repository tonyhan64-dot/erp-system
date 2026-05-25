import { useEffect, useState } from 'react';
import api from '../lib/api';
export default function Permissions() {
  const [users,setUsers]=useState([]); const [roles,setRoles]=useState([]);
  const [loading,setLoading]=useState(true); const [showModal,setShowModal]=useState(false);
  const [form,setForm]=useState({name:'',email:'',password:'',roleId:'',branchId:''});
  const [branches,setBranches]=useState([]); const [saving,setSaving]=useState(false);
  const load=()=>{setLoading(true);api.get('/users').then(r=>setUsers(r.data)).finally(()=>setLoading(false));};
  useEffect(()=>{load();api.get('/users/roles').then(r=>setRoles(r.data));api.get('/branches').then(r=>setBranches(r.data));},[]);
  const submit=async(e)=>{e.preventDefault();setSaving(true);try{await api.post('/users',{...form,roleId:Number(form.roleId),branchId:form.branchId?Number(form.branchId):null});setShowModal(false);load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  const ROLE_BADGE={'Super Admin':'badge-amber','Branch Manager':'badge-blue','Branch Staff':'badge-gray'};
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="page-title mb-0">User Permissions</h1><button onClick={()=>setShowModal(true)} className="btn-primary btn-sm">+ Add User</button></div>
      <div className="card"><div className="card-header">Users <span className="text-xs text-gray-400 font-normal">Total: {users.length}</span></div>
        <div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Branch</th><th>Status</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={5} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :users.map(u=>(<tr key={u.id}><td className="font-medium">{u.name}</td><td className="text-gray-500">{u.email}</td>
              <td><span className={`badge ${ROLE_BADGE[u.role?.name]||'badge-gray'}`}>{u.role?.name}</span></td>
              <td>{u.branch?.name||<span className="text-gray-400">HQ (All Branches)</span>}</td>
              <td><span className={`badge ${u.isActive?'badge-green':'badge-gray'}`}>{u.isActive?'Active':'Inactive'}</span></td>
            </tr>))}
            {!loading&&users.length===0&&<tr><td colSpan={5} className="text-center py-8 text-gray-400">No users found</td></tr>}
          </tbody>
        </table></div>
      </div>
      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">Add User <button onClick={()=>setShowModal(false)}>✕</button></div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} required/></div>
          <div><label className="label">Password *</label><input className="input" type="password" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} required/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Role *</label><select className="input" value={form.roleId} onChange={e=>setForm(f=>({...f,roleId:e.target.value}))} required><option value="">Select</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
            <div><label className="label">Branch</label><select className="input" value={form.branchId} onChange={e=>setForm(f=>({...f,branchId:e.target.value}))}><option value="">All (Super Admin)</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Add User'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
