import { useEffect, useState } from 'react';
import api from '../lib/api';
export default function Branches() {
  const [branches,setBranches]=useState([]); const [roles,setRoles]=useState([]);
  const [loading,setLoading]=useState(true); const [showBranchModal,setShowBranchModal]=useState(false);
  const [showUserModal,setShowUserModal]=useState(false); const [editingBranch,setEditingBranch]=useState(null);
  const [selectedBranch,setSelectedBranch]=useState(null); const [saving,setSaving]=useState(false);
  const [branchForm,setBranchForm]=useState({name:'',address:'',phone:'',email:'',manager:''});
  const [userForm,setUserForm]=useState({name:'',email:'',password:'',roleId:''});
  const load=()=>{setLoading(true);Promise.all([api.get('/branches'),api.get('/users/roles')]).then(([b,r])=>{setBranches(b.data);setRoles(r.data.filter(r=>r.name!=='Super Admin'));}).finally(()=>setLoading(false));};
  useEffect(()=>{load();},[]);
  const saveBranch=async(e)=>{e.preventDefault();setSaving(true);try{if(editingBranch)await api.put(`/branches/${editingBranch.id}`,branchForm);else await api.post('/branches',branchForm);setShowBranchModal(false);load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  const saveUser=async(e)=>{e.preventDefault();setSaving(true);try{await api.post(`/branches/${selectedBranch.id}/manager`,{...userForm,roleId:Number(userForm.roleId)});setShowUserModal(false);setUserForm({name:'',email:'',password:'',roleId:''});load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  const COLORS=[{bg:'#E6F1FB',border:'#185FA5',text:'#0C447C'},{bg:'#E1F5EE',border:'#0F6E56',text:'#085041'},{bg:'#FAEEDA',border:'#854F0B',text:'#633806'},{bg:'#EEEDFE',border:'#534AB7',text:'#3C3489'}];
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div><h1 className="page-title mb-0">Branches</h1><p className="text-xs text-gray-400 mt-0.5">Super Admin Only — Manage branches and assign managers</p></div>
        <button onClick={()=>{setEditingBranch(null);setBranchForm({name:'',address:'',phone:'',email:'',manager:''});setShowBranchModal(true);}} className="btn-primary btn-sm">+ New Branch</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading?<div className="text-sm text-gray-400 col-span-2 py-8 text-center">Loading...</div>
        :branches.map((b,i)=>{const c=COLORS[i%COLORS.length];return(
          <div key={b.id} className="card" style={{borderTop:`3px solid ${c.border}`}}>
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div><div className="font-medium text-gray-900">{b.name}</div><div className="text-xs text-gray-400 mt-0.5">{b.address||'Address not set'}</div></div>
                <span className={`badge ${b.isActive?'badge-green':'badge-gray'}`}>{b.isActive?'Active':'Inactive'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {[['Users',b._count?.users||0],['Stock',b._count?.inventory||0],['Sales',b._count?.sales||0]].map(([l,v])=>(
                  <div key={l} style={{background:c.bg,borderRadius:8,padding:'6px 8px',textAlign:'center'}}><div style={{fontSize:10,color:c.text}}>{l}</div><div style={{fontSize:14,fontWeight:500,color:c.text}}>{v}</div></div>
                ))}
              </div>
              <div className="text-xs text-gray-500 mb-3 space-y-1">
                {b.phone&&<div>📞 {b.phone}</div>}{b.email&&<div>📧 {b.email}</div>}{b.manager&&<div>👤 Manager: {b.manager}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={()=>{setSelectedBranch(b);setShowUserModal(true);}} className="btn-primary btn-sm flex-1">+ Add User</button>
                <button onClick={()=>{setEditingBranch(b);setBranchForm({name:b.name,address:b.address||'',phone:b.phone||'',email:b.email||'',manager:b.manager||''});setShowBranchModal(true);}} className="btn-secondary btn-sm">Edit</button>
              </div>
            </div>
          </div>
        );})}
        <div onClick={()=>{setEditingBranch(null);setBranchForm({name:'',address:'',phone:'',email:'',manager:''});setShowBranchModal(true);}} className="card flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors" style={{minHeight:180,border:'1.5px dashed var(--color-border-secondary)'}}>
          <div className="text-center text-gray-400"><div className="text-3xl mb-2">+</div><div className="text-sm font-medium">Add New Branch</div><div className="text-xs mt-1">Super Admin only</div></div>
        </div>
      </div>

      {showBranchModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">{editingBranch?'Edit Branch':'New Branch'} <button onClick={()=>setShowBranchModal(false)}>✕</button></div>
        <form onSubmit={saveBranch} className="p-4 space-y-3">
          <div><label className="label">Branch Name *</label><input className="input" value={branchForm.name} onChange={e=>setBranchForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Branch 3 — Durban"/></div>
          <div><label className="label">Address</label><input className="input" value={branchForm.address} onChange={e=>setBranchForm(f=>({...f,address:e.target.value}))} placeholder="e.g. Durban, KwaZulu-Natal"/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={branchForm.phone} onChange={e=>setBranchForm(f=>({...f,phone:e.target.value}))}/></div>
            <div><label className="label">Email</label><input className="input" type="email" value={branchForm.email} onChange={e=>setBranchForm(f=>({...f,email:e.target.value}))}/></div>
          </div>
          <div><label className="label">Manager Name</label><input className="input" value={branchForm.manager} onChange={e=>setBranchForm(f=>({...f,manager:e.target.value}))}/></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowBranchModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':editingBranch?'Save Changes':'Create Branch'}</button></div>
        </form>
      </div></div>)}

      {showUserModal&&selectedBranch&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-sm">
        <div className="p-4 border-b font-semibold flex justify-between">{selectedBranch.name} — Add User <button onClick={()=>setShowUserModal(false)}>✕</button></div>
        <form onSubmit={saveUser} className="p-4 space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={userForm.name} onChange={e=>setUserForm(f=>({...f,name:e.target.value}))} required/></div>
          <div><label className="label">Email *</label><input className="input" type="email" value={userForm.email} onChange={e=>setUserForm(f=>({...f,email:e.target.value}))} required/></div>
          <div><label className="label">Password *</label><input className="input" type="password" value={userForm.password} onChange={e=>setUserForm(f=>({...f,password:e.target.value}))} required/></div>
          <div><label className="label">Role *</label><select className="input" value={userForm.roleId} onChange={e=>setUserForm(f=>({...f,roleId:e.target.value}))} required><option value="">Select role</option>{roles.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></div>
          <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">This user will only have access to <strong>{selectedBranch.name}</strong>.</div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowUserModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Add User'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
