import { useEffect, useState } from 'react';
import api from '../lib/api';
const fmt = n => Number(n||0).toLocaleString('ko-KR');

export default function Reports() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedWh, setSelectedWh] = useState('');

  useEffect(() => { api.get('/inventory/warehouses').then(r=>setWarehouses(r.data)); }, []);

  const search = () => {
    setLoading(true);
    api.get('/reports/sales',{params:{from,to}}).then(r=>setResult(r.data)).finally(()=>setLoading(false));
  };

  const getToken = () => document.cookie.split(';').find(c=>c.trim().startsWith('token='))?.split('=')[1];

  const printSalesReport = () => {
    const params = new URLSearchParams();
    if(from) params.set('from',from);
    if(to) params.set('to',to);
    fetch(`http://localhost:4000/api/pdf/sales-report?${params}`,{headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.blob()).then(blob=>{window.open(URL.createObjectURL(blob),'_blank');});
  };

  const printInventory = () => {
    const params = selectedWh ? `?warehouseId=${selectedWh}` : '';
    fetch(`http://localhost:4000/api/pdf/inventory${params}`,{headers:{Authorization:`Bearer ${getToken()}`}})
      .then(r=>r.blob()).then(blob=>{window.open(URL.createObjectURL(blob),'_blank');});
  };

  return (
    <div>
      <h1 className="page-title">Reports</h1>

      {/* 매출 리포트 */}
      <div className="card p-4 mb-4">
        <div className="text-sm font-medium text-gray-800 mb-3">매출 리포트</div>
        <div className="flex gap-3 items-end flex-wrap">
          <div><label className="label">시작일</label><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
          <div><label className="label">종료일</label><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
          <button onClick={search} className="btn-primary">조회</button>
          <button onClick={printSalesReport} className="btn-secondary btn-sm flex items-center gap-1">🖨 PDF 출력</button>
        </div>
      </div>

      {result&&(
        <div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="stat-card"><div className="text-xs text-gray-500 mb-1">총 판매 건수</div><div className="text-2xl font-semibold text-blue-600">{result.count}건</div></div>
            <div className="stat-card"><div className="text-xs text-gray-500 mb-1">총 매출</div><div className="text-2xl font-semibold text-green-600">R {fmt(result.total)}</div></div>
          </div>
          <div className="card">
            <div className="card-header">판매 상세</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>주문번호</th><th>고객</th><th>날짜</th><th>금액</th></tr></thead>
                <tbody>
                  {loading?<tr><td colSpan={4} className="text-center py-8 text-gray-400">불러오는 중...</td></tr>
                  :result.data.map(s=>(
                    <tr key={s.id}>
                      <td className="text-blue-600">{s.saleNo}</td>
                      <td>{s.customer.name}</td>
                      <td className="text-gray-500">{new Date(s.saleDate).toLocaleDateString('ko-KR')}</td>
                      <td>R {fmt(s.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 재고 리포트 */}
      <div className="card p-4 mt-4">
        <div className="text-sm font-medium text-gray-800 mb-3">재고 현황 리포트</div>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label className="label">창고 선택</label>
            <select className="input" value={selectedWh} onChange={e=>setSelectedWh(e.target.value)}>
              <option value="">전체 창고</option>
              {warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <button onClick={printInventory} className="btn-primary flex items-center gap-1">🖨 재고 PDF 출력</button>
        </div>
      </div>

      {!result&&!loading&&<div className="text-sm text-gray-400 mt-8 text-center">날짜를 선택하고 조회를 누르세요</div>}
    </div>
  );
}
