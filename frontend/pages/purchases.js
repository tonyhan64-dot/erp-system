import { useEffect, useState } from 'react';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const STATUS = { 입고완료:'badge-green', 배송중:'badge-blue', 대기:'badge-amber', 취소:'badge-red' };

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ supplierId:'', items:[{productId:'',quantity:1,unitPrice:0}], notes:'' });
  const [saving, setSaving] = useState(false);

  const load = () => { setLoading(true); api.get('/purchases').then(r=>setPurchases(r.data.data)).finally(()=>setLoading(false)); };
  useEffect(()=>{ load(); api.get('/suppliers').then(r=>setSuppliers(r.data.data)); api.get('/products').then(r=>setProducts(r.data.data)); },[]);

  const updateItem = (i,field,val) => {
    const items=[...form.items]; items[i]={...items[i],[field]:val};
    if(field==='productId'){const p=products.find(p=>p.id===Number(val));if(p)items[i].unitPrice=Number(p.cost);}
    setForm(f=>({...f,items}));
  };

  const submit = async(e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/purchases',{...form,supplierId:Number(form.supplierId),items:form.items.map(i=>({...i,productId:Number(i.productId),quantity:Number(i.quantity),unitPrice:Number(i.unitPrice)}))});
      setShowModal(false); setForm({supplierId:'',items:[{productId:'',quantity:1,unitPrice:0}],notes:''}); load();
    } catch(err){alert(err.response?.data?.error||'Error');} finally{setSaving(false);}
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Purchases</h1>
        <button onClick={()=>setShowModal(true)} className="btn-primary btn-sm">+ New Purchase</button>
      </div>
      <div className="card">
        <div className="card-header">Purchase Orders</div>
        <div className="table-wrap"><table>
          <thead><tr><th>PO No</th><th>Supplier</th><th>Date</th><th>Amount</th><th>Status</th><th>Print</th></tr></thead>
          <tbody>
            {loading?<tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            :purchases.map(p=>(<tr key={p.id}>
              <td className="text-blue-600 font-medium">{p.purchaseNo}</td>
              <td>{p.supplier?.name}</td>
              <td className="text-gray-500">{new Date(p.purchaseDate).toLocaleDateString('en-ZA')}</td>
              <td>{fmt(p.totalAmount)}</td>
              <td><span className={`badge ${STATUS[p.status]||'badge-gray'}`}>{p.status}</span></td>
              <td><button onClick={()=>printPDF(`/pdf/purchase/${p.id}`)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">🖨 PO</button></td>
            </tr>))}
            {!loading&&purchases.length===0&&<tr><td colSpan={6} className="text-center py-8 text-gray-400">No purchase orders</td></tr>}
          </tbody>
        </table></div>
      </div>

      {showModal&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
          <div className="p-4 border-b font-semibold flex justify-between">New Purchase Order <button onClick={()=>setShowModal(false)}>✕</button></div>
          <form onSubmit={submit} className="p-4 space-y-4">
            <div><label className="label">Supplier *</label>
              <select className="input" value={form.supplierId} onChange={e=>setForm(f=>({...f,supplierId:e.target.value}))} required>
                <option value="">Select supplier</option>{suppliers.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between mb-2"><label className="label mb-0">Products *</label><button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,{productId:'',quantity:1,unitPrice:0}]}))} className="text-xs text-blue-600">+ Add Item</button></div>
              {form.items.map((item,i)=>(<div key={i} className="flex gap-2 mb-2">
                <select className="input flex-1" value={item.productId} onChange={e=>updateItem(i,'productId',e.target.value)} required><option value="">Select product</option>{products.map(p=><option key={p.id} value={p.id}>{p.partNo} — {p.name}</option>)}</select>
                <input className="input w-16 text-center" type="number" min={1} value={item.quantity} onChange={e=>updateItem(i,'quantity',e.target.value)}/>
                <input className="input w-24" type="number" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',e.target.value)}/>
                {form.items.length>1&&<button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))} className="text-red-400">✕</button>}
              </div>))}
            </div>
            <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
            <div className="flex gap-2 justify-end pt-2 border-t">
              <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Register Purchase'}</button>
            </div>
          </form>
        </div>
      </div>)}
    </div>
  );
}
