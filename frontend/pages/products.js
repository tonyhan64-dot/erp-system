import { useEffect, useState } from 'react';
import api from '../lib/api';
const fmt = n => 'R '+Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
export default function Products() {
  const [products,setProducts]=useState([]); const [categories,setCategories]=useState([]); const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true); const [search,setSearch]=useState(''); const [showModal,setShowModal]=useState(false);
  const [editing,setEditing]=useState(null); const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({partNo:'',brand:'',name:'',categoryId:'',unit:'Each',cost:0,minStock:10,carBrand:'',carModel:'',carYear:'',notes:''});
  const [preview,setPreview]=useState({aPrice:0,bPrice:0,cPrice:0});
  const [settings,setSettings]=useState({vat_rate:15,a_markup:10,b_markup:35});
  const load=()=>{setLoading(true);api.get('/products',{params:{search}}).then(r=>{setProducts(r.data.data);setTotal(r.data.total);}).finally(()=>setLoading(false));};
  useEffect(()=>{load();api.get('/categories').then(r=>setCategories(r.data));api.get('/settings').then(r=>setSettings({vat_rate:Number(r.data.vat_rate||15),a_markup:Number(r.data.a_markup||10),b_markup:Number(r.data.b_markup||35)}));},[search]);
  const calcPreview=(cost)=>{const c=Number(cost||0);const w=c*(1+settings.vat_rate/100);setPreview({aPrice:Math.round(w*(1+settings.a_markup/100)*100)/100,bPrice:Math.round(w*(1+settings.b_markup/100)*100)/100,cPrice:Math.round(w*(1+settings.b_markup/100)*(1+settings.vat_rate/100)*100)/100});};
  const openAdd=()=>{setEditing(null);setForm({partNo:'',brand:'',name:'',categoryId:'',unit:'Each',cost:0,minStock:10,carBrand:'',carModel:'',carYear:'',notes:''});setPreview({aPrice:0,bPrice:0,cPrice:0});setShowModal(true);};
  const openEdit=(p)=>{setEditing(p);setForm({partNo:p.partNo,brand:p.brand||'',name:p.name,categoryId:p.categoryId||'',unit:p.unit,cost:Number(p.cost),minStock:p.minStock,carBrand:p.carBrand||'',carModel:p.carModel||'',carYear:p.carYear||'',notes:p.notes||''});calcPreview(p.cost);setShowModal(true);};
  const submit=async(e)=>{e.preventDefault();setSaving(true);try{const data={...form,categoryId:form.categoryId?Number(form.categoryId):null,cost:Number(form.cost),minStock:Number(form.minStock)};if(editing)await api.put(`/products/${editing.id}`,data);else await api.post('/products',data);setShowModal(false);load();}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);}};
  return (
    <div>
      <div className="flex items-center justify-between mb-4"><h1 className="page-title mb-0">Products</h1><button onClick={openAdd} className="btn-primary btn-sm">+ Add Part</button></div>
      <div className="mb-4"><div className="relative max-w-sm"><input className="input pl-8" placeholder="Part No / Brand / Car Brand / Model..." value={search} onChange={e=>setSearch(e.target.value)}/><span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span></div></div>
      <div className="card">
        <div className="card-header">Parts List <span className="text-xs text-gray-400 font-normal">Total: {total}</span></div>
        <div style={{overflowX:'auto'}}><table style={{borderCollapse:'collapse',width:'100%',fontSize:12,minWidth:900}}>
          <thead><tr style={{background:'var(--color-background-secondary)'}}>
            {['Part No','Brand','Part Name','Category','Vehicle','Cost','A Price','B Price','C Price','Min Stock','Action'].map(h=>(
              <th key={h} style={{padding:'6px 10px',fontSize:10,fontWeight:500,color:'var(--color-text-secondary)',borderBottom:'0.5px solid var(--color-border-tertiary)',whiteSpace:'nowrap',textAlign:['Cost','A Price','B Price','C Price'].includes(h)?'right':'left'}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {loading?<tr><td colSpan={11} style={{textAlign:'center',padding:32,color:'var(--color-text-tertiary)'}}>Loading...</td></tr>
            :products.map(p=>(<tr key={p.id} onMouseEnter={e=>e.currentTarget.style.background='var(--color-background-secondary)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
              <td style={{padding:'6px 10px',fontFamily:'monospace',fontSize:11,color:'var(--color-text-info)'}}>{p.partNo}</td>
              <td style={{padding:'6px 10px',fontWeight:500}}>{p.brand||'-'}</td>
              <td style={{padding:'6px 10px',fontWeight:500,minWidth:140}}>{p.name}</td>
              <td style={{padding:'6px 10px'}}><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'var(--color-background-secondary)',color:'var(--color-text-secondary)'}}>{p.category?.name||'-'}</span></td>
              <td style={{padding:'6px 10px',fontSize:10,color:'var(--color-text-secondary)'}}>{[p.carBrand,p.carModel,p.carYear].filter(Boolean).join(' ')||'-'}</td>
              <td style={{padding:'6px 10px',textAlign:'right',color:'var(--color-text-secondary)'}}>{fmt(p.cost)}</td>
              <td style={{padding:'6px 10px',textAlign:'right',color:'#185FA5',fontWeight:500}}>{fmt(p.aPrice)}</td>
              <td style={{padding:'6px 10px',textAlign:'right',color:'#1D9E75',fontWeight:500}}>{fmt(p.bPrice)}</td>
              <td style={{padding:'6px 10px',textAlign:'right',color:'#854F0B',fontWeight:500}}>{fmt(p.cPrice)}</td>
              <td style={{padding:'6px 10px',textAlign:'center',color:'var(--color-text-tertiary)'}}>{p.minStock}</td>
              <td style={{padding:'6px 10px'}}><div style={{display:'flex',gap:4}}>
                <button onClick={()=>openEdit(p)} style={{fontSize:11,padding:'3px 8px',borderRadius:6,border:'0.5px solid var(--color-border-secondary)',background:'transparent',cursor:'pointer'}}>Edit</button>
                <button onClick={()=>{if(confirm('Deactivate this part?'))api.delete(`/products/${p.id}`).then(load)}} style={{fontSize:11,padding:'3px 8px',borderRadius:6,border:'0.5px solid #F09595',background:'transparent',cursor:'pointer',color:'#E24B4A'}}>Delete</button>
              </div></td>
            </tr>))}
            {!loading&&products.length===0&&<tr><td colSpan={11} style={{textAlign:'center',padding:32,color:'var(--color-text-tertiary)'}}>No parts found</td></tr>}
          </tbody>
        </table></div>
      </div>
      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b font-semibold flex justify-between">{editing?'Edit Part':'Add Part'} <button onClick={()=>setShowModal(false)}>✕</button></div>
        <form onSubmit={submit} className="p-4 space-y-3">
          <div className="text-xs font-medium text-gray-600">Basic Information</div>
          <div className="grid grid-cols-2 gap-3"><div><label className="label">Part No *</label><input className="input" value={form.partNo} onChange={e=>setForm(f=>({...f,partNo:e.target.value}))} placeholder="e.g. OF-001" required/></div><div><label className="label">Brand</label><input className="input" value={form.brand} onChange={e=>setForm(f=>({...f,brand:e.target.value}))} placeholder="e.g. Bosch"/></div></div>
          <div><label className="label">Part Name *</label><input className="input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} required/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Category</label><select className="input" value={form.categoryId} onChange={e=>setForm(f=>({...f,categoryId:e.target.value}))}><option value="">Select</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="label">Unit</label><select className="input" value={form.unit} onChange={e=>setForm(f=>({...f,unit:e.target.value}))}>{['Each','Set','Box','L','kg','m'].map(u=><option key={u}>{u}</option>)}</select></div>
          </div>
          <div className="text-xs font-medium text-gray-600 mt-1">Vehicle Fitment (Optional)</div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Car Brand</label><input className="input" value={form.carBrand} onChange={e=>setForm(f=>({...f,carBrand:e.target.value}))} placeholder="Toyota"/></div>
            <div><label className="label">Model</label><input className="input" value={form.carModel} onChange={e=>setForm(f=>({...f,carModel:e.target.value}))} placeholder="Hilux"/></div>
            <div><label className="label">Year</label><input className="input" value={form.carYear} onChange={e=>setForm(f=>({...f,carYear:e.target.value}))} placeholder="2018-2023"/></div>
          </div>
          <div className="text-xs font-medium text-gray-600 mt-1">Pricing</div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Cost Price (R) *</label><input className="input" type="number" min={0} step="0.01" value={form.cost} onChange={e=>{setForm(f=>({...f,cost:e.target.value}));calcPreview(e.target.value);}} required/></div>
            <div><label className="label">Min Stock</label><input className="input" type="number" min={0} value={form.minStock} onChange={e=>setForm(f=>({...f,minStock:e.target.value}))}/></div>
          </div>
          {form.cost>0&&(<div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-blue-50 rounded p-2"><div className="text-xs text-blue-600">A Price</div><div className="font-semibold text-blue-800 text-sm">{fmt(preview.aPrice)}</div></div>
            <div className="bg-green-50 rounded p-2"><div className="text-xs text-green-600">B Price</div><div className="font-semibold text-green-800 text-sm">{fmt(preview.bPrice)}</div></div>
            <div className="bg-amber-50 rounded p-2"><div className="text-xs text-amber-600">C Price</div><div className="font-semibold text-amber-800 text-sm">{fmt(preview.cPrice)}</div></div>
          </div>)}
          <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':editing?'Save Changes':'Add Part'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
