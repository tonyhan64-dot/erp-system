import { useEffect, useState } from 'react';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';
import QuotationPanel, { addToQuotation } from '../components/QuotationPanel';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const qtyClass = (qty,min) => qty===0?'text-red-500 font-semibold':qty<=min?'text-amber-500 font-semibold':'text-green-600 font-semibold';
const qtyBadge = (qty,min) => qty===0?'badge-red':qty<=min?'badge-amber':'badge-green';

export default function Inventory() {
  const [matrix, setMatrix] = useState({ products:[], branches:[], matrix:[], raw:null });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [transfer, setTransfer] = useState({ productId:'', fromBranchId:'', toBranchId:'', quantity:1 });
  const [adjust, setAdjust] = useState({ productId:'', branchId:'', quantity:0, location:'' });
  const [saving, setSaving] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('erp_user')||'null');
    setUser(u);
    loadData(u);
    api.get('/categories').then(r=>setCategories(r.data));
    api.get('/customers').then(r=>setCustomers(r.data.data||[]));
  }, []);

  const loadData = async(u) => {
    setLoading(true);
    try {
      const role = u?.role||JSON.parse(localStorage.getItem('erp_user')||'null')?.role;
      if (role==='Super Admin') { const r=await api.get('/inventory/matrix'); setMatrix(r.data); }
      else { const r=await api.get('/inventory'); setMatrix({products:[],branches:[],matrix:[],raw:r.data}); }
    } finally { setLoading(false); }
  };

  const isSuperAdmin = user?.role==='Super Admin';

  const handleAddToQuotation = (product) => {
    addToQuotation(product);
    setAddedMsg(`✅ ${product.partNo} added to quotation`);
    setTimeout(()=>setAddedMsg(''), 2500);
  };

  const handleAddToSale = (product) => {
    localStorage.setItem('pending_sale_product', JSON.stringify(product));
    window.location.href='/sales?addProduct=1';
  };

  const filteredMatrix = matrix.matrix.filter(m=>{
    const p=m.product; const s=search.toLowerCase();
    const matchS=!s||p.partNo.toLowerCase().includes(s)||p.name.toLowerCase().includes(s)||(p.brand||'').toLowerCase().includes(s)||(p.carBrand||'').toLowerCase().includes(s)||(p.carModel||'').toLowerCase().includes(s);
    const matchC=!catFilter||p.category?.name===catFilter;
    const matchSt=!stockFilter||(stockFilter==='low'&&m.branches.some(b=>b.quantity<=p.minStock));
    return matchS&&matchC&&matchSt;
  });

  const doTransfer = async(e)=>{ e.preventDefault();setSaving(true);try{await api.post('/inventory/transfer',{...transfer,productId:Number(transfer.productId),fromBranchId:Number(transfer.fromBranchId),toBranchId:Number(transfer.toBranchId),quantity:Number(transfer.quantity)});setShowTransfer(false);loadData(user);alert('✅ Transfer complete');}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);} };
  const doAdjust = async(e)=>{ e.preventDefault();setSaving(true);try{await api.patch('/inventory/adjust',{...adjust,productId:Number(adjust.productId),branchId:Number(adjust.branchId||user?.branchId),quantity:Number(adjust.quantity)});setShowAdjust(false);loadData(user);}catch(err){alert(err.response?.data?.error||'Error');}finally{setSaving(false);} };

  // Table cell styles
  const th = (extra={}) => ({ padding:'6px 8px', fontSize:10, fontWeight:500, color:'var(--color-text-secondary)', borderBottom:'0.5px solid var(--color-border-tertiary)', whiteSpace:'nowrap', background:'var(--color-background-secondary)', ...extra });
  const td = (extra={}) => ({ padding:'6px 8px', fontSize:11, borderBottom:'0.5px solid var(--color-border-tertiary)', verticalAlign:'middle', ...extra });

  return (
    <div>
      <QuotationPanel customers={customers} branchId={user?.branchId||matrix.branches?.[0]?.id}/>

      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={()=>setShowAdjust(true)} className="btn-secondary btn-sm">Adjust Stock</button>
          {isSuperAdmin&&<button onClick={()=>setShowTransfer(true)} className="btn-secondary btn-sm">⇄ Transfer</button>}
          <button onClick={()=>printPDF('/pdf/inventory')} className="btn-secondary btn-sm">🖨 PDF</button>
        </div>
      </div>

      {addedMsg&&<div style={{padding:'8px 14px',marginBottom:10,background:'#EAF3DE',color:'#3B6D11',borderRadius:8,fontSize:12,fontWeight:500}}>{addedMsg}</div>}

      <div className="flex gap-2 mb-4 items-center">
        <div className="relative flex-1">
          <input className="input pl-8" placeholder="Part No / Brand / Car Brand / Model / Part Name..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <span className="absolute left-2.5 top-2.5 text-gray-400 text-xs">🔍</span>
        </div>
        <select className="input" style={{width:160}} value={catFilter} onChange={e=>setCatFilter(e.target.value)}>
          <option value="">All Categories</option>{categories.map(c=><option key={c.id}>{c.name}</option>)}
        </select>
        <select className="input" style={{width:150}} value={stockFilter} onChange={e=>setStockFilter(e.target.value)}>
          <option value="">All Stock</option><option value="low">Low / Out of Stock</option>
        </select>
      </div>

      {/* ── Super Admin: Full Matrix Table ── */}
      {isSuperAdmin && (
        <div className="card">
          <div className="card-header">
            All Branch Stock
            <span className="text-xs text-gray-400 font-normal">{filteredMatrix.length} items · {matrix.branches.map(b=>b.name).join(' · ')}</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',width:'100%',minWidth:900,fontSize:12}}>
              <thead>
                {/* ── Row 1: Group headers ── */}
                <tr>
                  <th rowSpan={2} style={{padding:'6px 8px',fontSize:10,fontWeight:600,background:'#EAF3DE',color:'#3B6D11',textAlign:'center',borderRight:'2px solid #185FA5',borderBottom:'0.5px solid var(--color-border-tertiary)',whiteSpace:'nowrap',verticalAlign:'middle',width:90}}>
                    <div style={{fontWeight:600,marginBottom:3}}>Action</div>
                    <div style={{fontSize:9,color:'#3B6D11',fontWeight:400}}>+ QT &nbsp;&nbsp; + Sale</div>
                  </th>
                  <th style={{...th({textAlign:'center'}), borderRight:'1px solid var(--color-border-secondary)'}} colSpan={5}>Basic Info</th>
                  <th style={{...th({background:'#E6F1FB',color:'#0C447C',textAlign:'center',borderRight:'1px solid var(--color-border-secondary)'})}} colSpan={3}>Pricing</th>
                  {matrix.branches.map((b,i)=>(
                    <th key={b.id} colSpan={2}
                      style={{...th({textAlign:'center',
                        background:i===0?'#E6F1FB':i===1?'#E1F5EE':'#FAEEDA',
                        color:i===0?'#0C447C':i===1?'#085041':'#633806',
                        borderRight:'1px solid var(--color-border-secondary)'})}}>
                      {b.name}
                    </th>
                  ))}
                </tr>
                {/* ── Row 2: Column headers ── */}
                <tr>
                  <th style={th({borderRight:'none'})}>Part No</th>
                  <th style={th()}>Brand</th>
                  <th style={th({minWidth:140})}>Part Name</th>
                  <th style={th()}>Category</th>
                  <th style={th({borderRight:'1px solid var(--color-border-secondary)'})}>Vehicle</th>
                  <th style={th({textAlign:'right'})}>Cost</th>
                  <th style={th({textAlign:'right',color:'#185FA5'})}>A Price</th>
                  <th style={th({textAlign:'right',color:'#1D9E75',borderRight:'1px solid var(--color-border-secondary)'})}>B Price</th>
                  {matrix.branches.map(b=>[
                    <th key={b.id+'q'} style={th({textAlign:'center'})}>Qty</th>,
                    <th key={b.id+'l'} style={th({borderRight:'1px solid var(--color-border-secondary)'})}>Loc</th>
                  ])}
                </tr>
              </thead>
              <tbody>
                {loading?(
                  <tr><td colSpan={8+matrix.branches.length*2+1} style={{textAlign:'center',padding:32,color:'var(--color-text-tertiary)'}}>Loading...</td></tr>
                ):filteredMatrix.map(m=>(
                  <tr key={m.product.id} onMouseEnter={e=>e.currentTarget.style.background='var(--color-background-secondary)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    {/* Action — FIRST */}
                    <td style={{...td({textAlign:'center',borderRight:'2px solid #185FA5',background:'#f9fbf7',verticalAlign:'middle'})}}>
                      <div style={{display:'flex',flexDirection:'row',gap:3,alignItems:'center',justifyContent:'center'}}>
                        <button onClick={()=>handleAddToQuotation(m.product)}
                          style={{fontSize:10,padding:'3px 10px',borderRadius:5,border:'none',background:'#EAF3DE',color:'#3B6D11',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                          + QT
                        </button>
                        <button onClick={()=>handleAddToSale(m.product)}
                          style={{fontSize:10,padding:'3px 10px',borderRadius:5,border:'none',background:'#E6F1FB',color:'#0C447C',cursor:'pointer',fontWeight:600,whiteSpace:'nowrap'}}>
                          + Sale
                        </button>
                      </div>
                    </td>
                    {/* Basic Info */}
                    <td style={td({fontFamily:'monospace',color:'var(--color-text-info)',fontWeight:600})}>{m.product.partNo}</td>
                    <td style={td({fontWeight:500})}>{m.product.brand||'-'}</td>
                    <td style={td({fontWeight:500,minWidth:140})}>{m.product.name}</td>
                    <td style={td()}>
                      <span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'var(--color-background-secondary)',color:'var(--color-text-secondary)'}}>{m.product.category?.name||'-'}</span>
                    </td>
                    <td style={td({fontSize:10,color:'var(--color-text-secondary)',borderRight:'1px solid var(--color-border-secondary)'})}>
                      {[m.product.carBrand,m.product.carModel,m.product.carYear].filter(Boolean).join(' ')||'-'}
                    </td>
                    {/* Pricing */}
                    <td style={td({textAlign:'right',color:'var(--color-text-secondary)'})}>{fmt(m.product.cost)}</td>
                    <td style={td({textAlign:'right',color:'#185FA5',fontWeight:500})}>{fmt(m.product.aPrice)}</td>
                    <td style={td({textAlign:'right',color:'#1D9E75',fontWeight:500,borderRight:'1px solid var(--color-border-secondary)'})}>{fmt(m.product.bPrice)}</td>
                    {/* Branch Qty + Loc */}
                    {m.branches.map(b=>[
                      <td key={'q'+b.branch.id} style={td({textAlign:'center'})}>
                        <span className={qtyClass(b.quantity,m.product.minStock)}>{b.quantity}</span>
                      </td>,
                      <td key={'l'+b.branch.id} style={td({fontFamily:'monospace',fontSize:10,color:'var(--color-text-tertiary)',borderRight:'1px solid var(--color-border-secondary)'})}>
                        {b.location||'-'}
                      </td>
                    ])}
                  </tr>
                ))}
                {!loading&&filteredMatrix.length===0&&(
                  <tr><td colSpan={8+matrix.branches.length*2+1} style={{textAlign:'center',padding:32,color:'var(--color-text-tertiary)'}}>No parts found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Branch Manager: Own Branch Only ── */}
      {!isSuperAdmin&&matrix.raw&&(
        <div className="card">
          <div className="card-header">{user?.branchName} Stock</div>
          <div style={{overflowX:'auto'}}>
            <table style={{borderCollapse:'collapse',width:'100%',minWidth:700,fontSize:12}}>
              <thead>
                <tr>
                  <th style={th({background:'#EAF3DE',color:'#3B6D11',textAlign:'center',borderRight:'2px solid #185FA5'})}>Action</th>
                  {['Part No','Brand','Part Name','Category','Vehicle','Qty','Location','A Price','B Price','Min','Status'].map(h=>(
                    <th key={h} style={th({textAlign:['A Price','B Price'].includes(h)?'right':'left'})}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading?<tr><td colSpan={12} style={{textAlign:'center',padding:32,color:'var(--color-text-tertiary)'}}>Loading...</td></tr>
                :matrix.raw.filter(i=>{
                  const p=i.product; const s=search.toLowerCase();
                  return (!s||p.partNo.toLowerCase().includes(s)||p.name.toLowerCase().includes(s)||(p.brand||'').toLowerCase().includes(s))&&(!catFilter||p.category?.name===catFilter);
                }).map(i=>(
                  <tr key={i.id} onMouseEnter={e=>e.currentTarget.style.background='var(--color-background-secondary)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={td({textAlign:'center',borderRight:'2px solid #185FA5',background:'#f9fbf7',verticalAlign:'middle'})}>
                      <div style={{display:'flex',flexDirection:'row',gap:3,alignItems:'center',justifyContent:'center'}}>
                        <button onClick={()=>handleAddToQuotation(i.product)} style={{fontSize:10,padding:'3px 10px',borderRadius:5,border:'none',background:'#EAF3DE',color:'#3B6D11',cursor:'pointer',fontWeight:600}}>+ QT</button>
                        <button onClick={()=>handleAddToSale(i.product)} style={{fontSize:10,padding:'3px 10px',borderRadius:5,border:'none',background:'#E6F1FB',color:'#0C447C',cursor:'pointer',fontWeight:600}}>+ Sale</button>
                      </div>
                    </td>
                    <td style={td({fontFamily:'monospace',color:'var(--color-text-info)',fontWeight:600})}>{i.product.partNo}</td>
                    <td style={td({fontWeight:500})}>{i.product.brand||'-'}</td>
                    <td style={td({fontWeight:500,minWidth:140})}>{i.product.name}</td>
                    <td style={td()}><span style={{fontSize:10,padding:'2px 6px',borderRadius:4,background:'var(--color-background-secondary)',color:'var(--color-text-secondary)'}}>{i.product.category?.name||'-'}</span></td>
                    <td style={td({fontSize:10,color:'var(--color-text-secondary)'})}>{[i.product.carBrand,i.product.carModel,i.product.carYear].filter(Boolean).join(' ')||'-'}</td>
                    <td style={td({textAlign:'center'})}><span className={qtyClass(i.quantity,i.product.minStock)}>{i.quantity}</span></td>
                    <td style={td({fontFamily:'monospace',fontSize:10,color:'var(--color-text-tertiary)'})}>{i.location||'-'}</td>
                    <td style={td({textAlign:'right',color:'#185FA5',fontWeight:500})}>{fmt(i.product.aPrice)}</td>
                    <td style={td({textAlign:'right',color:'#1D9E75',fontWeight:500})}>{fmt(i.product.bPrice)}</td>
                    <td style={td({textAlign:'center',color:'var(--color-text-tertiary)'})}>{i.product.minStock}</td>
                    <td style={td()}><span className={`badge ${qtyBadge(i.quantity,i.product.minStock)}`}>{i.quantity===0?'Out of Stock':i.quantity<=i.product.minStock?'Low Stock':'In Stock'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Transfer Modal */}
      {showTransfer&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">Stock Transfer <button onClick={()=>setShowTransfer(false)}>✕</button></div>
        <form onSubmit={doTransfer} className="p-4 space-y-3">
          <div><label className="label">Product *</label><select className="input" value={transfer.productId} onChange={e=>setTransfer(f=>({...f,productId:e.target.value}))} required><option value="">Select</option>{matrix.products.map(p=><option key={p.id} value={p.id}>{p.partNo} — {p.name}</option>)}</select></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">From Branch</label><select className="input" value={transfer.fromBranchId} onChange={e=>setTransfer(f=>({...f,fromBranchId:e.target.value}))} required><option value="">Select</option>{matrix.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
            <div><label className="label">To Branch</label><select className="input" value={transfer.toBranchId} onChange={e=>setTransfer(f=>({...f,toBranchId:e.target.value}))} required><option value="">Select</option>{matrix.branches.filter(b=>b.id!==Number(transfer.fromBranchId)).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>
          </div>
          <div><label className="label">Quantity *</label><input className="input" type="number" min={1} value={transfer.quantity} onChange={e=>setTransfer(f=>({...f,quantity:e.target.value}))} required/></div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowTransfer(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Processing...':'Confirm'}</button></div>
        </form>
      </div></div>)}

      {/* Adjust Modal */}
      {showAdjust&&(<div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="bg-white rounded-xl w-full max-w-md">
        <div className="p-4 border-b font-semibold flex justify-between">Stock Adjustment <button onClick={()=>setShowAdjust(false)}>✕</button></div>
        <form onSubmit={doAdjust} className="p-4 space-y-3">
          <div><label className="label">Product *</label><select className="input" value={adjust.productId} onChange={e=>setAdjust(f=>({...f,productId:e.target.value}))} required><option value="">Select</option>{(matrix.products.length?matrix.products:matrix.raw?.map(i=>i.product)||[]).map(p=><option key={p.id} value={p.id}>{p.partNo} — {p.name}</option>)}</select></div>
          {isSuperAdmin&&<div><label className="label">Branch *</label><select className="input" value={adjust.branchId} onChange={e=>setAdjust(f=>({...f,branchId:e.target.value}))} required><option value="">Select</option>{matrix.branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Quantity *</label><input className="input" type="number" min={0} value={adjust.quantity} onChange={e=>setAdjust(f=>({...f,quantity:e.target.value}))} required/></div>
            <div><label className="label">Location</label><input className="input" placeholder="e.g. A1-01" value={adjust.location} onChange={e=>setAdjust(f=>({...f,location:e.target.value}))}/></div>
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t"><button type="button" onClick={()=>setShowAdjust(false)} className="btn-secondary btn-sm">Cancel</button><button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'Saving...':'Save'}</button></div>
        </form>
      </div></div>)}
    </div>
  );
}
