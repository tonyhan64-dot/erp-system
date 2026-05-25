import { useEffect, useState } from 'react';
import api from '../lib/api';
import { printPDF } from '../lib/printHelper';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const COLORS = ['#185FA5','#0F6E56','#854F0B','#534AB7','#E24B4A'];

export default function Reports() {
  const [tab, setTab] = useState('sales');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [monthlySales, setMonthlySales] = useState([]);
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [topProducts, setTopProducts] = useState([]);
  const [dashStats, setDashStats] = useState(null);

  useEffect(() => {
    api.get('/inventory/warehouses').then(r => setBranches(r.data));
    api.get('/reports/monthly-sales').then(r => setMonthlySales(r.data));
    api.get('/reports/dashboard').then(r => setDashStats(r.data));
  }, []);

  const search = () => {
    setLoading(true);
    api.get('/reports/sales', { params:{ from, to } })
      .then(r => {
        setResult(r.data);
        // Top products from results
        const productMap = {};
        r.data.data?.forEach(sale => {
          sale.items?.forEach(item => {
            const key = item.product?.partNo || item.productId;
            if (!productMap[key]) productMap[key] = { name: item.product?.name||key, partNo: item.product?.partNo||key, total: 0, qty: 0 };
            productMap[key].total += Number(item.subtotal);
            productMap[key].qty += Number(item.quantity);
          });
        });
        setTopProducts(Object.values(productMap).sort((a,b)=>b.total-a.total).slice(0,10));
      })
      .finally(() => setLoading(false));
  };

  const printInventory = () => {
    const params = selectedBranch ? `?warehouseId=${selectedBranch}` : '';
    printPDF(`/pdf/inventory${params}`);
  };

  const printSalesReport = () => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    printPDF(`/pdf/sales-report?${params.toString()}`);
  };

  return (
    <div>
      <h1 className="page-title">Reports & Analytics</h1>

      {/* Quick Stats */}
      {dashStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label:"Today's Sales",    value:fmt(dashStats.todaySales?.amount||0), sub:`${dashStats.todaySales?.count||0} transactions`, color:'#185FA5' },
            { label:'Monthly Revenue',  value:fmt(dashStats.monthSales?.amount||0), sub:`${dashStats.monthSales?.count||0} sales`, color:'#0F6E56' },
            { label:'Total Customers',  value:dashStats.totalCustomers||0,          sub:'active clients', color:'#534AB7' },
            { label:'Low Stock Items',  value:dashStats.lowStockCount||0,           sub:'need reorder', color:'#E24B4A' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="text-xs text-gray-500 mb-1">{s.label}</div>
              <div style={{fontSize:18,fontWeight:700,color:s.color}}>{s.value}</div>
              <div className="text-xs text-gray-400">{s.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-5 overflow-x-auto">
        {[
          ['sales','📊 Sales Report'],
          ['monthly','📈 Monthly Trends'],
          ['products','🔧 Top Products'],
          ['stock','📦 Stock Report'],
        ].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors ${tab===k?'border-blue-500 text-blue-600 font-medium':'border-transparent text-gray-500'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Sales Report Tab */}
      {tab === 'sales' && (
        <div>
          <div className="card p-4 mb-4">
            <div className="flex gap-3 items-end flex-wrap">
              <div><label className="label">From Date</label>
                <input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
              <div><label className="label">To Date</label>
                <input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
              <button onClick={search} className="btn-primary">Search</button>
              {result && <button onClick={printSalesReport} className="btn-secondary btn-sm">🖨 Print PDF</button>}
            </div>
          </div>

          {result && (
            <div>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Total Sales</div><div className="text-2xl font-bold text-blue-600">{fmt(result.total)}</div></div>
                <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Transactions</div><div className="text-2xl font-bold text-green-600">{result.count}</div></div>
                <div className="stat-card"><div className="text-xs text-gray-500 mb-1">Avg per Sale</div><div className="text-2xl font-bold text-purple-600">{result.count>0?fmt(result.total/result.count):'R 0.00'}</div></div>
              </div>
              <div className="card">
                <div className="card-header">
                  Sales Detail
                  <span className="text-xs text-gray-400 font-normal">{result.count} records</span>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Sale No</th><th>Customer</th><th>Date</th><th>Items</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>
                      {loading ? <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
                      : result.data?.map(s => (
                        <tr key={s.id}>
                          <td className="font-mono text-blue-600">{s.saleNo}</td>
                          <td>{s.customer?.name}</td>
                          <td className="text-gray-500">{new Date(s.saleDate||s.createdAt).toLocaleDateString('en-ZA')}</td>
                          <td className="text-gray-500">{s.items?.length||0}</td>
                          <td className="font-medium">{fmt(s.totalAmount)}</td>
                          <td><span className="badge badge-green">{s.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {!result && !loading && <div className="text-center text-gray-400 py-12">Select a date range and click Search</div>}
        </div>
      )}

      {/* Monthly Trends Tab */}
      {tab === 'monthly' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card">
            <div className="card-header">Monthly Sales Revenue</div>
            <div className="p-3" style={{height:260}}>
              {monthlySales.length>0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlySales} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="month" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                    <Tooltip formatter={v=>[`R ${Number(v).toLocaleString('en-ZA')}`,'Revenue']}/>
                    <Bar dataKey="amount" fill="#185FA5" radius={[4,4,0,0]} name="Revenue"/>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-sm text-gray-400">No sales data available</div>}
            </div>
          </div>
          <div className="card">
            <div className="card-header">Revenue vs Expenses</div>
            <div className="p-3" style={{height:260}}>
              {monthlySales.length>0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlySales} margin={{top:5,right:10,left:0,bottom:5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="month" tick={{fontSize:11}}/>
                    <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                    <Tooltip formatter={v=>`R ${Number(v).toLocaleString('en-ZA')}`}/>
                    <Legend/>
                    <Line type="monotone" dataKey="amount" stroke="#185FA5" name="Revenue" strokeWidth={2} dot={{r:3}}/>
                    <Line type="monotone" dataKey="expense" stroke="#E24B4A" name="Expenses" strokeWidth={2} dot={{r:3}}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : <div className="flex items-center justify-center h-full text-sm text-gray-400">No data available</div>}
            </div>
          </div>
          <div className="card md:col-span-2 p-4">
            <div className="text-sm font-medium text-gray-700 mb-3">Monthly Summary Table</div>
            <div className="table-wrap">
              <table>
                <thead><tr><th>Month</th><th className="text-right">Revenue</th><th className="text-right">Expenses</th><th className="text-right">Net Profit</th></tr></thead>
                <tbody>
                  {monthlySales.map(m => {
                    const profit = m.amount - (m.expense||0);
                    return (
                      <tr key={m.month}>
                        <td className="font-medium">{m.month}</td>
                        <td className="text-right text-green-600 font-medium">{fmt(m.amount)}</td>
                        <td className="text-right text-red-500">{fmt(m.expense||0)}</td>
                        <td className={`text-right font-medium ${profit>=0?'text-blue-600':'text-red-500'}`}>{fmt(profit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Top Products Tab */}
      {tab === 'products' && (
        <div>
          {topProducts.length === 0 ? (
            <div className="card p-4 mb-4">
              <div className="flex gap-3 items-end">
                <div><label className="label">From Date</label><input className="input" type="date" value={from} onChange={e=>setFrom(e.target.value)}/></div>
                <div><label className="label">To Date</label><input className="input" type="date" value={to} onChange={e=>setTo(e.target.value)}/></div>
                <button onClick={search} className="btn-primary">Load Data</button>
              </div>
            </div>
          ) : null}
          {topProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="card">
                <div className="card-header">Top Parts by Revenue</div>
                <div className="p-3" style={{height:280}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProducts.slice(0,7)} layout="vertical" margin={{top:5,right:20,left:60,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                      <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                      <YAxis dataKey="partNo" type="category" tick={{fontSize:10}} width={55}/>
                      <Tooltip formatter={v=>[`R ${Number(v).toLocaleString('en-ZA')}`,'Revenue']}/>
                      <Bar dataKey="total" fill="#185FA5" radius={[0,4,4,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header">Top 10 Parts — Detail</div>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Part No</th><th>Part Name</th><th className="text-right">Qty Sold</th><th className="text-right">Revenue</th></tr></thead>
                    <tbody>
                      {topProducts.map((p,i) => (
                        <tr key={p.partNo}>
                          <td className="text-gray-400">{i+1}</td>
                          <td className="font-mono text-blue-600">{p.partNo}</td>
                          <td>{p.name}</td>
                          <td className="text-right">{p.qty}</td>
                          <td className="text-right font-medium text-green-600">{fmt(p.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 py-12">Select a date range above and click Load Data to see top products</div>
          )}
        </div>
      )}

      {/* Stock Report Tab */}
      {tab === 'stock' && (
        <div className="card p-5">
          <div className="text-sm font-medium text-gray-800 mb-4">📦 Stock Level Report</div>
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <label className="label">Branch</label>
              <select className="input" value={selectedBranch} onChange={e=>setSelectedBranch(e.target.value)}>
                <option value="">All Branches</option>
                {branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <button onClick={printInventory} className="btn-primary">🖨 Print Stock PDF</button>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
            Click "Print Stock PDF" to generate a full stock report for the selected branch (or all branches).
          </div>
        </div>
      )}
    </div>
  );
}
