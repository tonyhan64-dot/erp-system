import { useEffect, useState, useRef } from 'react';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const STATUS_BADGE = { 완료:'badge-green', 처리중:'badge-blue', 대기:'badge-amber', 취소:'badge-red', Completed:'badge-green', Processing:'badge-blue', Pending:'badge-amber', Cancelled:'badge-red' };

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId:'', items:[{productId:'',productInfo:null,quantity:1,unitPrice:0,priceType:'A'}], notes:'' });
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [activeItemIndex, setActiveItemIndex] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [emailTo, setEmailTo] = useState('');
  const [sending, setSending] = useState(false);
  const [emailResult, setEmailResult] = useState('');
  const searchRef = useRef(null);

  const load = () => { setLoading(true); api.get('/sales').then(r=>{ setSales(r.data.data); setTotal(r.data.total); }).finally(()=>setLoading(false)); };
  useEffect(() => { load(); api.get('/customers').then(r=>setCustomers(r.data.data)); api.get('/products').then(r=>setProducts(r.data.data)); }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 1) { setSearchResults([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try { const r = await api.get('/products',{params:{search:searchQuery,limit:20}}); setSearchResults(r.data.data||[]); setShowDropdown(true); }
      catch { setSearchResults([]); } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handler = (e) => { if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectProduct = (product) => {
    const items = [...form.items];
    const priceType = items[activeItemIndex]?.priceType || 'A';
    const unitPrice = priceType==='A'?Number(product.aPrice):priceType==='B'?Number(product.bPrice):Number(product.cPrice);
    items[activeItemIndex] = { ...items[activeItemIndex], productId:product.id, productInfo:product, unitPrice };
    setForm(f=>({...f,items})); setSearchQuery(''); setShowDropdown(false); setActiveItemIndex(null);
  };

  const updateItem = (i, field, val) => {
    const items = [...form.items]; items[i] = {...items[i],[field]:val};
    if (field==='priceType' && items[i].productInfo) {
      const p=items[i].productInfo;
      items[i].unitPrice = val==='A'?Number(p.aPrice):val==='B'?Number(p.bPrice):Number(p.cPrice);
    }
    setForm(f=>({...f,items}));
  };

  const totalAmount = form.items.reduce((s,i)=>s+(Number(i.quantity)*Number(i.unitPrice)),0);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/sales',{ customerId:Number(form.customerId), notes:form.notes,
        items:form.items.filter(i=>i.productId).map(i=>({productId:Number(i.productId),quantity:Number(i.quantity),unitPrice:Number(i.unitPrice)}))
      });
      setShowModal(false); setForm({customerId:'',items:[{productId:'',productInfo:null,quantity:1,unitPrice:0,priceType:'A'}],notes:''}); load();
    } catch(err){ alert(err.response?.data?.error||'Error occurred'); } finally{ setSaving(false); }
  };

  const sendEmail = async () => {
    if (!emailTo) { alert('Please enter an email address'); return; }
    setSending(true); setEmailResult('');
    try { const r=await api.post(`/email/invoice/${selectedSale.id}`,{toEmail:emailTo}); setEmailResult('✅ '+r.data.message); }
    catch(err){ setEmailResult('❌ '+(err.response?.data?.error||'Failed to send')); } finally{ setSending(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Sales</h1>
        <button onClick={()=>setShowModal(true)} className="btn-primary btn-sm">+ New Sale</button>
      </div>
      <div className="card">
        <div className="card-header">Sales List <span className="text-xs text-gray-400 font-normal">Total: {total}</span></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Sale No</th><th>Customer</th><th>Date</th><th>Amount</th><th>Status</th><th>Print</th><th>Email</th></tr></thead>
            <tbody>
              {loading?<tr><td colSpan={7} className="text-center py-8 text-gray-400">Loading...</td></tr>
              :sales.map(s=>(
                <tr key={s.id}>
                  <td className="text-blue-600 font-medium">{s.saleNo}</td>
                  <td>{s.customer?.name}</td>
                  <td className="text-gray-500">{new Date(s.saleDate).toLocaleDateString('en-ZA')}</td>
                  <td>{fmt(s.totalAmount)}</td>
                  <td><span className={`badge ${STATUS_BADGE[s.status]||'badge-gray'}`}>{s.status}</span></td>
                  <td><button onClick={()=>printPDF(`/pdf/invoice/${s.id}`)} className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50">🖨 PDF</button></td>
                  <td><button onClick={()=>{setSelectedSale(s);setEmailTo(s.customer?.email||'');setEmailResult('');setShowEmailModal(true);}} className="text-xs px-2 py-1 rounded border border-blue-200 hover:bg-blue-50 text-blue-600">📧</button></td>
                </tr>
              ))}
              {!loading&&sales.length===0&&<tr><td colSpan={7} className="text-center py-8 text-gray-400">No sales records found</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
              New Sale Registration <button onClick={()=>setShowModal(false)} className="text-gray-400">✕</button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="label">Customer *</label>
                <select className="input" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} required>
                  <option value="">Select customer</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Products *</label>
                  <button type="button" onClick={()=>setForm(f=>({...f,items:[...f.items,{productId:'',productInfo:null,quantity:1,unitPrice:0,priceType:'A'}]}))} className="text-xs text-blue-600">+ Add Item</button>
                </div>
                {form.items.map((item,i)=>(
                  <div key={i} className="border border-gray-100 rounded-lg p-3 mb-3 bg-gray-50">
                    {item.productInfo ? (
                      <div className="flex items-center justify-between mb-2 p-2 bg-blue-50 rounded-lg">
                        <div>
                          <div className="text-xs font-semibold text-blue-800">{item.productInfo.partNo} — {item.productInfo.name}</div>
                          <div className="text-xs text-blue-600">{item.productInfo.brand||''} · {item.productInfo.category?.name||''}</div>
                        </div>
                        <button type="button" onClick={()=>{const items=[...form.items];items[i]={...items[i],productId:'',productInfo:null};setForm(f=>({...f,items}));}} className="text-xs text-red-400 ml-2">Change</button>
                      </div>
                    ):(
                      <div ref={i===activeItemIndex?searchRef:null} className="relative mb-2">
                        <input className="input pr-8" placeholder="Search Part No / Car Brand / Model / Part Name..."
                          value={activeItemIndex===i?searchQuery:''}
                          onFocus={()=>{setActiveItemIndex(i);setShowDropdown(searchResults.length>0);}}
                          onChange={e=>{setActiveItemIndex(i);setSearchQuery(e.target.value);}}/>
                        {searching&&<span className="absolute right-3 top-2 text-xs text-gray-400">Searching...</span>}
                        {showDropdown&&activeItemIndex===i&&searchResults.length>0&&(
                          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                            {searchResults.map(p=>(
                              <div key={p.id} onClick={()=>selectProduct(p)} className="px-3 py-2.5 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-mono font-semibold text-blue-700">{p.partNo}</span>
                                  <span className="text-xs text-gray-400">{p.brand||''}</span>
                                  <span className="text-xs text-blue-600 font-medium">{fmt(p.aPrice)}</span>
                                </div>
                                <div className="text-xs font-medium text-gray-800 mt-0.5">{p.name}</div>
                                {(p.carBrand||p.carModel)&&<div className="text-xs text-gray-400">{[p.carBrand,p.carModel,p.carYear].filter(Boolean).join(' ')}</div>}
                              </div>
                            ))}
                          </div>
                        )}
                        {showDropdown&&activeItemIndex===i&&searchQuery&&searchResults.length===0&&!searching&&(
                          <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-lg shadow mt-1 p-3 text-xs text-gray-400 text-center">No results found</div>
                        )}
                      </div>
                    )}
                    <div className="grid grid-cols-4 gap-2">
                      <div><div className="text-xs text-gray-500 mb-1">Qty</div><input className="input text-center" type="number" min={1} value={item.quantity} onChange={e=>updateItem(i,'quantity',Number(e.target.value))}/></div>
                      <div><div className="text-xs text-gray-500 mb-1">Price Type</div>
                        <select className="input" value={item.priceType} onChange={e=>updateItem(i,'priceType',e.target.value)}>
                          <option value="A">A {item.productInfo?`(${fmt(item.productInfo.aPrice)})`:''}</option>
                          <option value="B">B {item.productInfo?`(${fmt(item.productInfo.bPrice)})`:''}</option>
                          <option value="C">C {item.productInfo?`(${fmt(item.productInfo.cPrice)})`:''}</option>
                        </select>
                      </div>
                      <div><div className="text-xs text-gray-500 mb-1">Unit Price</div><input className="input" type="number" min={0} step="0.01" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',Number(e.target.value))}/></div>
                      <div><div className="text-xs text-gray-500 mb-1">Subtotal</div><div className="input bg-gray-50 text-right text-blue-600 font-medium">{fmt(item.quantity*item.unitPrice)}</div></div>
                    </div>
                    {form.items.length>1&&<button type="button" onClick={()=>setForm(f=>({...f,items:f.items.filter((_,idx)=>idx!==i)}))} className="mt-2 text-xs text-red-400">− Remove</button>}
                  </div>
                ))}
              </div>
              <div><label className="label">Notes</label><textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))}/></div>
              <div className="flex justify-between items-center pt-3 border-t">
                <div><div className="text-xs text-gray-500">Total</div><div className="text-lg font-semibold text-gray-900">{fmt(totalAmount)}</div></div>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">Cancel</button>
                  <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Register Sale'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEmailModal&&selectedSale&&(
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold flex justify-between">📧 Send Invoice Email <button onClick={()=>setShowEmailModal(false)}>✕</button></div>
            <div className="p-4 space-y-3">
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <div className="font-medium">{selectedSale.saleNo} — {selectedSale.customer?.name}</div>
                <div className="text-gray-500">{fmt(selectedSale.totalAmount)}</div>
              </div>
              <div><label className="label">Recipient Email *</label><input className="input" type="email" value={emailTo} onChange={e=>setEmailTo(e.target.value)}/></div>
              {emailResult&&<div className={`p-3 rounded-lg text-sm ${emailResult.startsWith('✅')?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>{emailResult}</div>}
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button onClick={()=>setShowEmailModal(false)} className="btn-secondary btn-sm">Close</button>
                <button onClick={sendEmail} disabled={sending} className="btn-primary btn-sm">{sending?'Sending...':'📧 Send Email'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
