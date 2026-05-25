import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import api from '../lib/api';
import QuotationPanel, { addToQuotation } from '../components/QuotationPanel';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtK = n => { const v=Number(n||0); return v>=1000000?'R '+(v/1000000).toFixed(1)+'M':v>=1000?'R '+(v/1000).toFixed(1)+'K':'R '+v.toFixed(0); };
const STATUS_BADGE = { Completed:'badge-green', Processing:'badge-blue', Pending:'badge-amber', Cancelled:'badge-red', 완료:'badge-green', 처리중:'badge-blue', 대기:'badge-amber', 취소:'badge-red' };
const COLORS = ['#185FA5','#0F6E56','#854F0B','#534AB7','#E24B4A'];

export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [monthlySales, setMonthlySales] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [branches, setBranches] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('erp_user')||'null');
    setUser(u);
    const h = new Date().getHours();
    setGreeting(h<12?'Good Morning':h<17?'Good Afternoon':'Good Evening');

    Promise.all([
      api.get('/reports/dashboard'),
      api.get('/reports/monthly-sales'),
      api.get('/inventory/low-stock'),
      api.get('/branches'),
      api.get('/quotations'),
      api.get('/customers'),
    ]).then(([s,m,l,b,q,c]) => {
      setStats(s.data);
      setMonthlySales(m.data);
      setLowStock(l.data);
      setBranches(b.data);
      setQuotations(q.data.data||q.data||[]);
      setCustomers(c.data.data||[]);
    }).catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div style={{width:40,height:40,border:'3px solid #E6F1FB',borderTop:'3px solid #185FA5',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
      <div className="text-sm text-gray-400">Loading AMIPARTS HQ...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
  if (!stats) return null;

  const profit = Number(stats.totalRevenue) - Number(stats.totalExpense);
  const profitRate = stats.totalRevenue > 0 ? Math.round((profit/stats.totalRevenue)*100) : 0;
  const pendingQuotes = quotations.filter(q=>q.status==='Draft'||q.status==='Sent').length;
  const pendingQuoteValue = quotations.filter(q=>q.status==='Draft'||q.status==='Sent').reduce((s,q)=>s+Number(q.totalAmount),0);

  return (
    <div>
      {/* Quotation Panel — always visible */}
      <QuotationPanel customers={customers} branchId={user?.branchId||branches?.[0]?.id}/>

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-xs text-gray-400">{greeting}, {user?.name||'Admin'}</div>
          <h1 className="text-xl font-bold text-gray-900 mt-0.5">AMIPARTS HQ Dashboard</h1>
          <div className="text-xs text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('en-ZA',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {lowStock.length > 0 && (
            <div onClick={()=>router.push('/inventory')}
              style={{background:'#FCEBEB',border:'1px solid #F09595',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}>
              <div className="text-xs font-medium text-red-700">⚠️ {lowStock.length} Low Stock Items</div>
              <div className="text-xs text-red-500">Click to view</div>
            </div>
          )}
          {/* Quotation Quick Badge */}
          {pendingQuotes > 0 && (
            <div onClick={()=>router.push('/quotations')}
              style={{background:'#FAEEDA',border:'1px solid #DBA96E',borderRadius:8,padding:'6px 12px',cursor:'pointer'}}>
              <div className="text-xs font-medium text-amber-700">📋 {pendingQuotes} Pending Quotes</div>
              <div className="text-xs text-amber-500">{fmt(pendingQuoteValue)} value</div>
            </div>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:"Today's Sales",    value:fmtK(stats.todaySales?.amount||0), sub:`${stats.todaySales?.count||0} transactions`, color:'#185FA5', bg:'#E6F1FB', icon:'🧾' },
          { label:'Monthly Revenue',  value:fmtK(stats.monthSales?.amount||0), sub:`${stats.monthSales?.count||0} sales`, color:'#0F6E56', bg:'#E1F5EE', icon:'📈' },
          { label:'Net Profit',       value:fmtK(profit), sub:`${profitRate}% margin`, color:profit>=0?'#1D9E75':'#E24B4A', bg:profit>=0?'#EAF3DE':'#FCEBEB', icon:'💰' },
          { label:'Pending Quotes',   value:pendingQuotes, sub:fmt(pendingQuoteValue), color:'#854F0B', bg:'#FAEEDA', icon:'📋',
            onClick:()=>router.push('/quotations') },
        ].map(c => (
          <div key={c.label} onClick={c.onClick}
            className="rounded-xl p-4 border border-gray-100 bg-white hover:shadow-sm transition-shadow"
            style={{cursor:c.onClick?'pointer':'default'}}>
            <div className="flex items-center justify-between mb-2">
              <span style={{fontSize:20}}>{c.icon}</span>
            </div>
            <div style={{fontSize:20,fontWeight:700,color:c.color}}>{c.value}</div>
            <div style={{fontSize:11,color:'#6b7280',marginTop:2}}>{c.label}</div>
            <div style={{fontSize:10,color:'#9ca3af'}}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label:'Total Customers', value:stats.totalCustomers||0,            icon:'👥', color:'#534AB7' },
          { label:'Total Revenue',   value:fmtK(stats.totalRevenue||0),        icon:'📥', color:'#185FA5' },
          { label:'Total Expenses',  value:fmtK(stats.totalExpense||0),        icon:'📤', color:'#E24B4A' },
          { label:'Active Branches', value:branches.length,                    icon:'🏢', color:'#0F6E56' },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <div className="flex items-center gap-2 mb-1"><span>{c.icon}</span><div className="text-xs text-gray-500">{c.label}</div></div>
            <div style={{fontSize:17,fontWeight:600,color:c.color}}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Monthly Sales Chart */}
        <div className="card md:col-span-2">
          <div className="card-header">Monthly Sales & Expenses <span className="text-xs text-gray-400 font-normal">Last 6 months</span></div>
          <div className="p-3" style={{height:200}}>
            {monthlySales.length>0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlySales} margin={{top:5,right:10,left:0,bottom:5}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:10}} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
                  <Tooltip formatter={v=>`R ${Number(v).toLocaleString('en-ZA')}`}/>
                  <Bar dataKey="amount" fill="#185FA5" radius={[4,4,0,0]} name="Sales"/>
                  <Bar dataKey="expense" fill="#FCEBEB" radius={[4,4,0,0]} name="Expenses"/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-sm text-gray-400">No sales data yet</div>}
          </div>
        </div>

        {/* Category Pie */}
        <div className="card">
          <div className="card-header">Sales by Category</div>
          <div className="p-3" style={{height:200}}>
            {(stats.categoryStats||[]).length>0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats.categoryStats} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={70}
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={9}>
                    {(stats.categoryStats||[]).map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`R ${Number(v).toLocaleString('en-ZA')}`}/>
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="flex items-center justify-center h-full text-sm text-gray-400">No data</div>}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* Pending Quotations */}
        <div className="card">
          <div className="card-header">
            📋 Pending Quotations
            <button onClick={()=>router.push('/quotations')} className="text-xs text-blue-600 hover:underline font-normal">View all</button>
          </div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {quotations.filter(q=>q.status==='Draft'||q.status==='Sent').length===0 ? (
              <div className="text-center text-sm text-gray-400 py-6">No pending quotations</div>
            ) : quotations.filter(q=>q.status==='Draft'||q.status==='Sent').slice(0,5).map(q=>(
              <div key={q.id} className="flex items-center justify-between px-4 py-2.5 border-b border-gray-50 last:border-0">
                <div>
                  <div className="text-xs font-mono font-medium text-blue-600">{q.quoteNo}</div>
                  <div className="text-xs text-gray-500">{q.customer?.name||'No customer'}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold text-amber-600">{fmt(q.totalAmount)}</div>
                  <span className={`badge text-xs ${STATUS_BADGE[q.status]}`}>{q.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <div className="card-header">
            ⚠️ Low Stock Alert
            <span className={`badge ${lowStock.length>0?'badge-red':'badge-green'}`}>{lowStock.length}</span>
          </div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {lowStock.length===0 ? (
              <div className="text-center text-sm text-gray-400 py-6">✅ All stock normal</div>
            ) : lowStock.slice(0,5).map(i=>(
              <div key={i.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div style={{fontSize:11,fontWeight:500,fontFamily:'monospace',color:'#185FA5'}}>{i.product?.partNo}</div>
                  <div style={{fontSize:10,color:'#6b7280'}}>{i.product?.name?.substring(0,20)} · {i.branch?.name}</div>
                </div>
                <div className="text-right">
                  <div style={{fontSize:12,fontWeight:600,color:i.quantity===0?'#E24B4A':'#EF9F27'}}>{i.quantity}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>min {i.product?.minStock}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Sales */}
        <div className="card">
          <div className="card-header">Recent Sales</div>
          <div style={{maxHeight:200,overflowY:'auto'}}>
            {(stats.recentSales||[]).length===0 ? (
              <div className="text-center text-sm text-gray-400 py-6">No recent sales</div>
            ) : (stats.recentSales||[]).map(s=>(
              <div key={s.id} className="flex items-center justify-between px-4 py-2 border-b border-gray-50 last:border-0">
                <div>
                  <div style={{fontSize:11,fontWeight:500,color:'#374151'}}>{s.customer?.name||'-'}</div>
                  <div style={{fontSize:10,color:'#9ca3af'}}>{new Date(s.saleDate||s.createdAt).toLocaleDateString('en-ZA')}</div>
                </div>
                <div className="text-right">
                  <div style={{fontSize:12,fontWeight:600,color:'#185FA5'}}>{fmt(s.totalAmount)}</div>
                  <span className={`badge text-xs ${STATUS_BADGE[s.status]||'badge-gray'}`}>{s.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
