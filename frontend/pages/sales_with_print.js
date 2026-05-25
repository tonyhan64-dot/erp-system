import { useEffect, useState } from 'react';
import api from '../lib/api';

const fmt = n => Number(n||0).toLocaleString('ko-KR');
const STATUS_BADGE = { 완료:'badge-green', 처리중:'badge-blue', 대기:'badge-amber', 취소:'badge-red' };

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customerId:'', items:[{productId:'',quantity:1,unitPrice:0}], notes:'' });
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    api.get('/sales').then(r => { setSales(r.data.data); setTotal(r.data.total); }).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    api.get('/customers').then(r => setCustomers(r.data.data));
    api.get('/products').then(r => setProducts(r.data.data));
  }, []);

  const addItem = () => setForm(f => ({ ...f, items:[...f.items,{productId:'',quantity:1,unitPrice:0}] }));
  const removeItem = i => setForm(f => ({ ...f, items:f.items.filter((_,idx)=>idx!==i) }));
  const updateItem = (i, field, val) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]:val };
    if (field==='productId') { const p=products.find(p=>p.id===Number(val)); if(p) items[i].unitPrice=Number(p.salePrice); }
    setForm(f => ({ ...f, items }));
  };
  const totalAmount = form.items.reduce((s,i) => s+(i.quantity*i.unitPrice),0);

  const submit = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/sales', { ...form, customerId:Number(form.customerId), items:form.items.map(i=>({...i,productId:Number(i.productId),quantity:Number(i.quantity),unitPrice:Number(i.unitPrice)})) });
      setShowModal(false);
      setForm({ customerId:'', items:[{productId:'',quantity:1,unitPrice:0}], notes:'' });
      load();
    } catch(err) { alert(err.response?.data?.error||'오류 발생'); }
    finally { setSaving(false); }
  };

  // PDF 출력 — 새 탭에서 바로 열림
  const printInvoice = (saleId) => {
    const token = document.cookie.split(';').find(c=>c.trim().startsWith('token='))?.split('=')[1];
    fetch(`http://localhost:4000/api/pdf/invoice/${saleId}`, {
      headers: { Authorization: `Bearer ${token}` }
    }).then(r => r.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Sales</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary btn-sm">+ 새 판매</button>
      </div>

      <div className="card">
        <div className="card-header">
          판매 목록 <span className="text-xs text-gray-400 font-normal">총 {total}건</span>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>주문번호</th><th>고객</th><th>날짜</th><th>금액</th><th>상태</th><th>출력</th></tr></thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">불러오는 중...</td></tr>
              ) : sales.map(s => (
                <tr key={s.id}>
                  <td className="text-blue-600 font-medium">{s.saleNo}</td>
                  <td>{s.customer.name}</td>
                  <td className="text-gray-500">{new Date(s.saleDate).toLocaleDateString('ko-KR')}</td>
                  <td>R {fmt(s.totalAmount)}</td>
                  <td><span className={`badge ${STATUS_BADGE[s.status]||'badge-gray'}`}>{s.status}</span></td>
                  <td>
                    <button
                      onClick={() => printInvoice(s.id)}
                      className="text-xs px-2 py-1 rounded border border-gray-300 hover:bg-gray-50 text-gray-600 flex items-center gap-1"
                    >
                      🖨 인보이스
                    </button>
                  </td>
                </tr>
              ))}
              {!loading && sales.length===0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">판매 내역이 없습니다</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
              새 판매 등록
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={submit} className="p-4 space-y-4">
              <div>
                <label className="label">고객 *</label>
                <select className="input" value={form.customerId} onChange={e=>setForm(f=>({...f,customerId:e.target.value}))} required>
                  <option value="">선택하세요</option>
                  {customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">상품 *</label>
                  <button type="button" onClick={addItem} className="text-xs text-blue-600 hover:underline">+ 추가</button>
                </div>
                {form.items.map((item,i) => (
                  <div key={i} className="flex gap-2 mb-2 items-end">
                    <div className="flex-1">
                      <select className="input" value={item.productId} onChange={e=>updateItem(i,'productId',e.target.value)} required>
                        <option value="">상품 선택</option>
                        {products.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div className="w-16"><input className="input text-center" type="number" min={1} value={item.quantity} onChange={e=>updateItem(i,'quantity',Number(e.target.value))} /></div>
                    <div className="w-24"><input className="input" type="number" value={item.unitPrice} onChange={e=>updateItem(i,'unitPrice',Number(e.target.value))} /></div>
                    {form.items.length>1 && <button type="button" onClick={()=>removeItem(i)} className="text-red-400 hover:text-red-600 pb-2">✕</button>}
                  </div>
                ))}
              </div>
              <div>
                <label className="label">메모</label>
                <textarea className="input" rows={2} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} />
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <div className="font-semibold text-gray-900">합계: R {fmt(totalAmount)}</div>
                <div className="flex gap-2">
                  <button type="button" onClick={()=>setShowModal(false)} className="btn-secondary btn-sm">취소</button>
                  <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving?'저장중...':'판매 등록'}</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
