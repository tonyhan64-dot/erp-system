import { useState, useRef, useEffect } from 'react';
import api from '../lib/api';

let globalQuotation = { items:[], customerId:'', notes:'', validDays:15 };
let globalListeners = [];
const setGlobal = (updater) => {
  globalQuotation = typeof updater==='function'?updater(globalQuotation):{...globalQuotation,...updater};
  globalListeners.forEach(fn=>fn(globalQuotation));
};
export const addToQuotation = (product, priceType='A') => {
  const unitPrice = priceType==='A'?Number(product.aPrice):priceType==='B'?Number(product.bPrice):Number(product.cPrice);
  setGlobal(prev => {
    const existing = prev.items.findIndex(i=>i.productId===product.id);
    if (existing>=0) { const items=[...prev.items]; items[existing]={...items[existing],quantity:items[existing].quantity+1,subtotal:(items[existing].quantity+1)*items[existing].unitPrice}; return {...prev,items}; }
    return {...prev,items:[...prev.items,{productId:product.id,product,quantity:1,unitPrice,subtotal:unitPrice,priceType}]};
  });
};

export default function QuotationPanel({ customers=[], branchId }) {
  const [qt,setQt]=useState(globalQuotation);
  const [isOpen,setIsOpen]=useState(false);
  const [saving,setSaving]=useState(false); const [converting,setConverting]=useState(false);
  const [savedId,setSavedId]=useState(null); const [msg,setMsg]=useState('');
  const panelRef=useRef(null);
  const [size,setSize]=useState({w:480,h:560});
  const [pos,setPos]=useState({x:null,y:null});
  const dragging=useRef(false); const resizing=useRef(null); const startPos=useRef({});

  useEffect(()=>{ const l=(n)=>setQt({...n}); globalListeners.push(l); return()=>{globalListeners=globalListeners.filter(x=>x!==l);}; },[]);

  const totalAmount=qt.items.reduce((s,i)=>s+Number(i.quantity)*Number(i.unitPrice),0);
  const vatAmount=totalAmount*0.15;
  const grandTotal=totalAmount+vatAmount;

  const updateItem=(idx,field,val)=>{setGlobal(prev=>{const items=[...prev.items];items[idx]={...items[idx],[field]:val};if(field==='quantity')items[idx].subtotal=Number(val)*Number(items[idx].unitPrice);if(field==='unitPrice')items[idx].subtotal=Number(items[idx].quantity)*Number(val);if(field==='priceType'){const p=items[idx].product;items[idx].unitPrice=val==='A'?Number(p.aPrice):val==='B'?Number(p.bPrice):Number(p.cPrice);items[idx].subtotal=items[idx].quantity*items[idx].unitPrice;}return{...prev,items};});};
  const removeItem=(idx)=>{setGlobal(prev=>({...prev,items:prev.items.filter((_,i)=>i!==idx)}));};
  const save=async()=>{if(!qt.items.length){setMsg('❌ Please add items first');return;}setSaving(true);setMsg('');try{const payload={customerId:qt.customerId||null,branchId,validDays:qt.validDays,notes:qt.notes,items:qt.items.map(i=>({productId:i.productId,quantity:i.quantity,unitPrice:i.unitPrice}))};let res;if(savedId)res=await api.put(`/quotations/${savedId}`,payload);else res=await api.post('/quotations',payload);setSavedId(res.data.id);setMsg('✅ Quotation saved — '+res.data.quoteNo);}catch(err){setMsg('❌ '+(err.response?.data?.error||'Save failed'));}finally{setSaving(false);}};
  const convertToSale=async()=>{if(!savedId){setMsg('❌ Please save first');return;}if(!qt.customerId){setMsg('❌ Please select a customer');return;}if(!confirm('Convert this quotation to a sale?'))return;setConverting(true);try{const res=await api.post(`/quotations/${savedId}/convert`);setMsg(`✅ Sale created — ${res.data.sale.saleNo}`);setGlobal({items:[],customerId:'',notes:'',validDays:15});setSavedId(null);}catch(err){setMsg('❌ '+(err.response?.data?.error||'Failed'));}finally{setConverting(false);}};
  const printPDF=()=>{if(!savedId){setMsg('❌ Please save first');return;}const token=document.cookie.split(';').find(c=>c.trim().startsWith('token='))?.split('=')[1];fetch(`http://localhost:4000/api/pdf/quotation/${savedId}`,{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.blob()).then(blob=>{window.open(URL.createObjectURL(blob),'_blank');});};
  const clear=()=>{if(!confirm('Clear quotation?'))return;setGlobal({items:[],customerId:'',notes:'',validDays:15});setSavedId(null);setMsg('');};
  const onDragStart=(e)=>{if(e.target.closest('.resize-handle'))return;dragging.current=true;startPos.current={mx:e.clientX,my:e.clientY,px:pos.x??window.innerWidth-size.w-20,py:pos.y??window.innerHeight-size.h-20};e.preventDefault();};
  const onResizeStart=(e,dir)=>{resizing.current=dir;startPos.current={mx:e.clientX,my:e.clientY,w:size.w,h:size.h,px:pos.x??window.innerWidth-size.w-20,py:pos.y??window.innerHeight-size.h-20};e.preventDefault();e.stopPropagation();};
  useEffect(()=>{const onMove=(e)=>{if(dragging.current){const dx=e.clientX-startPos.current.mx,dy=e.clientY-startPos.current.my;setPos({x:Math.max(0,startPos.current.px+dx),y:Math.max(0,startPos.current.py+dy)});}if(resizing.current){const dx=e.clientX-startPos.current.mx,dy=e.clientY-startPos.current.my,dir=resizing.current;let nw=startPos.current.w,nh=startPos.current.h,nx=startPos.current.px,ny=startPos.current.py;if(dir.includes('e'))nw=Math.max(320,startPos.current.w+dx);if(dir.includes('s'))nh=Math.max(300,startPos.current.h+dy);if(dir.includes('w')){nw=Math.max(320,startPos.current.w-dx);nx=startPos.current.px+dx;}if(dir.includes('n')){nh=Math.max(300,startPos.current.h-dy);ny=startPos.current.py+dy;}setSize({w:nw,h:nh});if(dir.includes('w')||dir.includes('n'))setPos({x:nx,y:ny});}};const onUp=()=>{dragging.current=false;resizing.current=null;};window.addEventListener('mousemove',onMove);window.addEventListener('mouseup',onUp);return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp);};},[]);

  const fmt=n=>'R '+Number(n||0).toFixed(2);
  const panelStyle={position:'fixed',right:pos.x!==null?'auto':20,bottom:pos.y!==null?'auto':20,left:pos.x!==null?pos.x:'auto',top:pos.y!==null?pos.y:'auto',width:size.w,height:isOpen?size.h:48,zIndex:999,background:'#ffffff',border:'1.5px solid #185FA5',borderRadius:12,boxShadow:'0 8px 48px rgba(0,0,0,0.28)',display:'flex',flexDirection:'column',overflow:'hidden',transition:isOpen?'none':'height 0.2s',userSelect:'none'};

  return (
    <div ref={panelRef} style={panelStyle}>
      {isOpen&&<>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'n')} style={{position:'absolute',top:0,left:8,right:8,height:4,cursor:'n-resize',zIndex:10}}/>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'s')} style={{position:'absolute',bottom:0,left:8,right:8,height:4,cursor:'s-resize',zIndex:10}}/>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'e')} style={{position:'absolute',top:8,bottom:8,right:0,width:4,cursor:'e-resize',zIndex:10}}/>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'w')} style={{position:'absolute',top:8,bottom:8,left:0,width:4,cursor:'w-resize',zIndex:10}}/>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'se')} style={{position:'absolute',bottom:0,right:0,width:12,height:12,cursor:'se-resize',zIndex:10,background:'#185FA5',borderRadius:'0 0 10px 0',opacity:0.5}}/>
        <div className="resize-handle" onMouseDown={e=>onResizeStart(e,'sw')} style={{position:'absolute',bottom:0,left:0,width:12,height:12,cursor:'sw-resize',zIndex:10,background:'#185FA5',borderRadius:'0 0 0 10px',opacity:0.5}}/>
      </>}
      <div onMouseDown={onDragStart} style={{padding:'0 12px',height:48,display:'flex',alignItems:'center',justifyContent:'space-between',background:'#185FA5',cursor:'grab',flexShrink:0,borderRadius:isOpen?'10px 10px 0 0':10}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:14}}>📋</span>
          <span style={{fontSize:13,fontWeight:500,color:'white'}}>Quotation</span>
          {qt.items.length>0&&<span style={{background:'white',color:'#185FA5',fontSize:11,fontWeight:600,padding:'1px 7px',borderRadius:10}}>{qt.items.length}</span>}
          {savedId&&<span style={{fontSize:10,color:'#B5D4F4'}}>Saved</span>}
        </div>
        <div style={{display:'flex',gap:6,alignItems:'center'}}>
          <button onClick={clear} style={{background:'none',border:'none',color:'rgba(255,255,255,0.7)',cursor:'pointer',fontSize:12,padding:'2px 6px'}}>Clear</button>
          <button onClick={()=>setIsOpen(!isOpen)} style={{background:'rgba(255,255,255,0.2)',border:'none',color:'white',cursor:'pointer',fontSize:14,width:24,height:24,borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}>{isOpen?'▼':'▲'}</button>
        </div>
      </div>
      {isOpen&&(<div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'8px 12px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,borderBottom:'0.5px solid #eee',flexShrink:0}}>
          <div><div style={{fontSize:10,color:'#9ca3af',marginBottom:2}}>Customer</div>
            <select style={{width:'100%',padding:'4px 6px',border:'0.5px solid #ddd',borderRadius:6,fontSize:11,background:'white',color:'#333'}} value={qt.customerId} onChange={e=>setGlobal(p=>({...p,customerId:e.target.value}))}>
              <option value="">Select (optional)</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><div style={{fontSize:10,color:'#9ca3af',marginBottom:2}}>Valid Days</div>
            <select style={{width:'100%',padding:'4px 6px',border:'0.5px solid #ddd',borderRadius:6,fontSize:11,background:'white',color:'#333'}} value={qt.validDays} onChange={e=>setGlobal(p=>({...p,validDays:Number(e.target.value)}))}>
              {[7,15,30,60].map(d=><option key={d} value={d}>{d} days</option>)}
            </select>
          </div>
        </div>
        <div style={{flex:1,overflowY:'auto'}}>
          {qt.items.length===0?(<div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#9ca3af',fontSize:12,gap:6}}>
            <span style={{fontSize:28}}>📋</span><span>Click + QT on any part in Inventory</span>
          </div>):(
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead style={{position:'sticky',top:0}}>
                <tr style={{background:'#f9fafb'}}><th style={{padding:'5px 8px',fontWeight:500,color:'#6b7280',textAlign:'left',fontSize:10}}>Part No / Name</th><th style={{padding:'5px 4px',fontWeight:500,color:'#6b7280',fontSize:10,width:36}}>Qty</th><th style={{padding:'5px 4px',fontWeight:500,color:'#6b7280',fontSize:10,width:46}}>Type</th><th style={{padding:'5px 8px',fontWeight:500,color:'#6b7280',textAlign:'right',fontSize:10}}>Subtotal</th><th style={{width:20}}></th></tr>
              </thead>
              <tbody>{qt.items.map((item,i)=>(
                <tr key={i} style={{borderBottom:'0.5px solid #f3f4f6'}}>
                  <td style={{padding:'6px 8px'}}><div style={{fontSize:11,fontWeight:500,fontFamily:'monospace',color:'#185FA5'}}>{item.product?.partNo}</div><div style={{fontSize:10,color:'#6b7280',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',maxWidth:120}}>{item.product?.name}</div></td>
                  <td style={{padding:'4px'}}><input type="number" min={1} value={item.quantity} onChange={e=>updateItem(i,'quantity',Number(e.target.value))} style={{width:36,padding:'3px 4px',border:'0.5px solid #ddd',borderRadius:4,fontSize:11,textAlign:'center',background:'white',color:'#333'}}/></td>
                  <td style={{padding:'4px'}}><select value={item.priceType} onChange={e=>updateItem(i,'priceType',e.target.value)} style={{width:46,padding:'3px 2px',border:'0.5px solid #ddd',borderRadius:4,fontSize:10,background:'white',color:'#333'}}><option value="A">A</option><option value="B">B</option><option value="C">C</option></select></td>
                  <td style={{padding:'6px 8px',textAlign:'right',fontWeight:500,color:'#185FA5',whiteSpace:'nowrap'}}>{fmt(item.quantity*item.unitPrice)}</td>
                  <td style={{padding:'4px 6px 4px 0'}}><button onClick={()=>removeItem(i)} style={{border:'none',background:'none',color:'#E24B4A',cursor:'pointer',fontSize:13,lineHeight:1}}>✕</button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        {qt.items.length>0&&(<div style={{padding:'8px 12px',borderTop:'0.5px solid #eee',background:'#f9fafb',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9ca3af',marginBottom:2}}><span>Subtotal</span><span>{fmt(totalAmount)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:10,color:'#9ca3af',marginBottom:4}}><span>VAT (15%)</span><span>{fmt(vatAmount)}</span></div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13,fontWeight:500,color:'#111827'}}><span>Total</span><span style={{color:'#185FA5'}}>{fmt(grandTotal)}</span></div>
        </div>)}
        <div style={{padding:'6px 12px',borderTop:'0.5px solid #eee',flexShrink:0}}>
          <textarea value={qt.notes} onChange={e=>setGlobal(p=>({...p,notes:e.target.value}))} placeholder="Notes (optional)" style={{width:'100%',padding:'4px 8px',border:'0.5px solid #ddd',borderRadius:6,fontSize:11,resize:'none',background:'white',color:'#333'}} rows={2}/>
        </div>
        {msg&&<div style={{padding:'4px 12px',fontSize:11,color:msg.startsWith('✅')?'#1D9E75':'#E24B4A',flexShrink:0}}>{msg}</div>}
        <div style={{padding:'8px 12px',display:'flex',gap:6,flexShrink:0,borderTop:'0.5px solid #eee'}}>
          <button onClick={save} disabled={saving} style={{flex:1,padding:'7px',border:'0.5px solid #185FA5',borderRadius:6,fontSize:11,fontWeight:500,color:'#185FA5',background:'white',cursor:'pointer'}}>{saving?'Saving...':'💾 Save'}</button>
          <button onClick={printPDF} style={{padding:'7px 10px',border:'0.5px solid #ddd',borderRadius:6,fontSize:11,color:'#6b7280',background:'white',cursor:'pointer'}}>🖨 PDF</button>
          <button onClick={convertToSale} disabled={converting} style={{flex:1,padding:'7px',border:'none',borderRadius:6,fontSize:11,fontWeight:500,color:'white',background:'#1D9E75',cursor:'pointer'}}>{converting?'Converting...':'→ Convert to Sale'}</button>
        </div>
      </div>)}
    </div>
  );
}
