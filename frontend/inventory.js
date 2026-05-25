import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Inventory() {
  const [warehouses, setWarehouses] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedWh, setSelectedWh] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showAddWh, setShowAddWh] = useState(false);
  const [transfer, setTransfer] = useState({ productId:'', fromWarehouseId:'', toWarehouseId:'', quantity:1 });
  const [newWh, setNewWh] = useState({ name:'', location:'', manager:'' });
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('stock');

  const loadWarehouses = () =>
    api.get('/inventory/warehouses').then(r => {
      setWarehouses(r.data);
      if (!selectedWh && r.data.length > 0) setSelectedWh(r.data[0].id);
    });

  const loadInventory = () => {
    setLoading(true);
    api.get('/inventory').then(r => {
      setInventory(r.data);
      setProducts([...new Map(r.data.map(i => [i.product.id, i.product])).values()]);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadWarehouses(); loadInventory(); }, []);

  const filteredInv = selectedWh
    ? inventory.filter(i => i.warehouseId === selectedWh)
    : inventory;

  const getStatus = (qty, min) => {
    if (qty === 0) return { label: '품절', cls: 'bg-red-50 text-red-700' };
    if (qty <= min) return { label: '부족', cls: 'bg-amber-50 text-amber-700' };
    return { label: '정상', cls: 'bg-green-50 text-green-700' };
  };

  const getBarColor = (qty, min) => {
    const pct = Math.min((qty / (min * 3)) * 100, 100);
    if (pct < 20) return { pct, color: '#E24B4A' };
    if (pct < 50) return { pct, color: '#EF9F27' };
    return { pct, color: '#1D9E75' };
  };

  const doTransfer = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/inventory/transfer', {
        productId: Number(transfer.productId),
        fromWarehouseId: Number(transfer.fromWarehouseId),
        toWarehouseId: Number(transfer.toWarehouseId),
        quantity: Number(transfer.quantity),
      });
      setShowTransfer(false);
      setTransfer({ productId:'', fromWarehouseId:'', toWarehouseId:'', quantity:1 });
      loadInventory();
      alert('✅ 재고 이동 완료');
    } catch (err) { alert(err.response?.data?.error || '오류 발생'); }
    finally { setSaving(false); }
  };

  const doAddWh = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/inventory/warehouses', newWh);
      setShowAddWh(false);
      setNewWh({ name:'', location:'', manager:'' });
      loadWarehouses();
      loadInventory();
    } catch (err) { alert(err.response?.data?.error || '오류 발생'); }
    finally { setSaving(false); }
  };

  // 창고별 요약 통계
  const whStats = (whId) => {
    const items = inventory.filter(i => i.warehouseId === whId);
    return {
      total: items.length,
      lowStock: items.filter(i => i.quantity > 0 && i.quantity <= i.product.minStock).length,
      outOfStock: items.filter(i => i.quantity === 0).length,
    };
  };

  // 창고 간 비교 데이터
  const comparisonData = products.slice(0, 5).map(p => ({
    name: p.name,
    values: warehouses.map(w => {
      const inv = inventory.find(i => i.productId === p.id && i.warehouseId === w.id);
      return { wh: w.name.replace(' Warehouse', ''), qty: inv?.quantity || 0, min: p.minStock };
    }),
  }));

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="page-title mb-0">Inventory</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowTransfer(true)} className="btn-secondary btn-sm">
            ⇄ 창고 간 이동
          </button>
          <button onClick={() => setShowAddWh(true)} className="btn-primary btn-sm">
            + 창고 추가
          </button>
        </div>
      </div>

      {/* 창고 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {warehouses.map(w => {
          const st = whStats(w.id);
          const active = selectedWh === w.id;
          return (
            <div
              key={w.id}
              onClick={() => setSelectedWh(active ? null : w.id)}
              className={`cursor-pointer rounded-xl p-4 border transition-all ${
                active
                  ? 'border-blue-400 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium text-sm text-gray-900">{w.name}</div>
                <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${
                  st.outOfStock > 0 ? 'bg-red-50 text-red-700' :
                  st.lowStock > 0 ? 'bg-amber-50 text-amber-700' :
                  'bg-green-50 text-green-700'
                }`}>
                  {st.outOfStock > 0 ? `품절 ${st.outOfStock}개` :
                   st.lowStock > 0 ? `부족 ${st.lowStock}개` : '정상'}
                </span>
              </div>
              <div className="text-xs text-gray-400 mb-3">
                {w.location}{w.manager ? ` · 담당: ${w.manager}` : ''}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['품목', `${st.total}종`],
                  ['부족', `${st.lowStock}개`],
                  ['품절', `${st.outOfStock}개`],
                ].map(([l, v]) => (
                  <div key={l} className="bg-gray-50 rounded-lg p-2 text-center">
                    <div className="text-xs text-gray-400">{l}</div>
                    <div className="text-sm font-semibold text-gray-800">{v}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        {warehouses.length === 0 && (
          <div className="col-span-3 text-center text-gray-400 text-sm py-6">
            창고가 없습니다. 창고를 추가해주세요.
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-gray-200 mb-4">
        {[['stock','재고 현황'], ['compare','창고별 비교']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm border-b-2 -mb-px transition-colors ${
              tab === key
                ? 'border-blue-500 text-blue-600 font-medium'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 재고 현황 탭 */}
      {tab === 'stock' && (
        <div className="card">
          <div className="card-header">
            <span>
              {selectedWh
                ? `${warehouses.find(w => w.id === selectedWh)?.name} 재고`
                : '전체 창고 재고'}
              <span className="ml-2 text-xs text-gray-400 font-normal">
                {filteredInv.length}종
              </span>
            </span>
            {selectedWh && (
              <button
                onClick={() => setSelectedWh(null)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                전체 보기
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>상품명</th>
                  {!selectedWh && <th>창고</th>}
                  <th>재고</th>
                  <th>최소재고</th>
                  <th>상태</th>
                  <th>용량</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={selectedWh ? 5 : 6} className="text-center py-8 text-gray-400">불러오는 중...</td></tr>
                ) : filteredInv.length === 0 ? (
                  <tr><td colSpan={selectedWh ? 5 : 6} className="text-center py-8 text-gray-400">재고 데이터가 없습니다</td></tr>
                ) : filteredInv.map(i => {
                  const st = getStatus(i.quantity, i.product.minStock);
                  const bar = getBarColor(i.quantity, i.product.minStock);
                  return (
                    <tr key={i.id}>
                      <td className="font-medium text-gray-800">{i.product.name}</td>
                      {!selectedWh && (
                        <td>
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md">
                            {i.warehouse?.name?.replace(' Warehouse', '') || '-'}
                          </span>
                        </td>
                      )}
                      <td className="font-semibold">{i.quantity}개</td>
                      <td className="text-gray-400">{i.product.minStock}개</td>
                      <td>
                        <span className={`badge text-xs px-2 py-0.5 rounded-md font-medium ${st.cls}`}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ minWidth: 100 }}>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-100 rounded h-1.5 overflow-hidden">
                            <div
                              className="h-full rounded transition-all"
                              style={{ width: `${bar.pct}%`, background: bar.color }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 w-8 text-right">
                            {Math.round(bar.pct)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 창고별 비교 탭 */}
      {tab === 'compare' && (
        <div className="card">
          <div className="card-header">창고별 재고 비교</div>
          <div className="p-4 space-y-4">
            {comparisonData.length === 0 ? (
              <div className="text-center text-gray-400 text-sm py-4">데이터 없음</div>
            ) : comparisonData.map(p => (
              <div key={p.name}>
                <div className="text-sm font-medium text-gray-800 mb-2">{p.name}</div>
                {p.values.map(v => {
                  const bar = getBarColor(v.qty, p.values[0]?.min || 10);
                  return (
                    <div key={v.wh} className="flex items-center gap-3 mb-1.5">
                      <div className="text-xs text-gray-500 w-24 truncate">{v.wh}</div>
                      <div className="flex-1 bg-gray-100 rounded h-2 overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${bar.pct}%`, background: bar.color }}
                        />
                      </div>
                      <div className="text-xs text-gray-400 w-10 text-right">{v.qty}개</div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 창고 간 이동 모달 */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
              창고 간 재고 이동
              <button onClick={() => setShowTransfer(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={doTransfer} className="p-4 space-y-3">
              <div>
                <label className="label">상품 *</label>
                <select className="input" value={transfer.productId}
                  onChange={e => setTransfer(f => ({ ...f, productId: e.target.value }))} required>
                  <option value="">선택하세요</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">출발 창고 *</label>
                  <select className="input" value={transfer.fromWarehouseId}
                    onChange={e => setTransfer(f => ({ ...f, fromWarehouseId: e.target.value }))} required>
                    <option value="">선택</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">도착 창고 *</label>
                  <select className="input" value={transfer.toWarehouseId}
                    onChange={e => setTransfer(f => ({ ...f, toWarehouseId: e.target.value }))} required>
                    <option value="">선택</option>
                    {warehouses.filter(w => w.id !== Number(transfer.fromWarehouseId))
                      .map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">이동 수량 *</label>
                <input className="input" type="number" min={1} value={transfer.quantity}
                  onChange={e => setTransfer(f => ({ ...f, quantity: e.target.value }))} required />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowTransfer(false)} className="btn-secondary btn-sm">취소</button>
                <button type="submit" disabled={saving} className="btn-primary btn-sm">
                  {saving ? '처리중...' : '이동 확정'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 창고 추가 모달 */}
      {showAddWh && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="p-4 border-b font-semibold flex justify-between items-center">
              새 창고 추가
              <button onClick={() => setShowAddWh(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={doAddWh} className="p-4 space-y-3">
              <div>
                <label className="label">창고명 *</label>
                <input className="input" placeholder="예: Cape Town Warehouse"
                  value={newWh.name} onChange={e => setNewWh(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="label">위치</label>
                <input className="input" placeholder="예: Western Cape"
                  value={newWh.location} onChange={e => setNewWh(f => ({ ...f, location: e.target.value }))} />
              </div>
              <div>
                <label className="label">담당자</label>
                <input className="input" placeholder="담당자 이름"
                  value={newWh.manager} onChange={e => setNewWh(f => ({ ...f, manager: e.target.value }))} />
              </div>
              <div className="flex gap-2 justify-end pt-2 border-t">
                <button type="button" onClick={() => setShowAddWh(false)} className="btn-secondary btn-sm">취소</button>
                <button type="submit" disabled={saving} className="btn-primary btn-sm">
                  {saving ? '저장중...' : '창고 추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
