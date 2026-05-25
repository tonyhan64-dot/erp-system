import { useEffect, useState } from 'react';
import api from '../lib/api';

const fmt = n => 'R ' + Number(n||0).toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2});

export default function Accounting() {
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState({ totalCredit:0, totalDebit:0 });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('ledger');

  useEffect(() => {
    api.get('/accounting/ledger').then(r => {
      setLedger(r.data);
      const totalCredit = r.data.reduce((s,l)=>s+Number(l.credit||0),0);
      const totalDebit  = r.data.reduce((s,l)=>s+Number(l.debit||0),0);
      setSummary({ totalCredit, totalDebit });
    }).finally(() => setLoading(false));
  }, []);

  const TYPE_BADGE = {
    '수입':'badge-green','지출':'badge-red','판매':'badge-green','구매':'badge-red',
    'Income':'badge-green','Expense':'badge-red','Sale':'badge-green','Purchase':'badge-red',
  };

  return (
    <div>
      <h1 className="page-title">Accounting</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">📥 Total Income</div>
          <div className="text-2xl font-semibold text-green-600">{fmt(summary.totalCredit)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">📤 Total Expenses</div>
          <div className="text-2xl font-semibold text-red-500">{fmt(summary.totalDebit)}</div>
        </div>
        <div className="stat-card">
          <div className="text-xs text-gray-500 mb-1">💰 Net Balance</div>
          <div className={`text-2xl font-semibold ${summary.totalCredit-summary.totalDebit>=0?'text-blue-600':'text-red-500'}`}>
            {fmt(summary.totalCredit - summary.totalDebit)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-4">
        {[['ledger','📒 General Ledger'],['income','📈 Income'],['expense','📉 Expenses']].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab===k?'border-blue-500 text-blue-600 font-medium':'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* Ledger Table */}
      <div className="card">
        <div className="card-header">
          {tab==='ledger'?'General Ledger':tab==='income'?'Income Records':'Expense Records'}
          <span className="text-xs text-gray-400 font-normal">
            {tab==='ledger'?ledger.length:tab==='income'?ledger.filter(l=>Number(l.credit)>0).length:ledger.filter(l=>Number(l.debit)>0).length} records
          </span>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th className="text-right">Income</th>
                <th className="text-right">Expense</th>
                <th className="text-right">Balance</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
              ) : ledger
                  .filter(l => {
                    if (tab==='income') return Number(l.credit)>0;
                    if (tab==='expense') return Number(l.debit)>0;
                    return true;
                  })
                  .map(l => (
                <tr key={l.id}>
                  <td className="text-gray-500 whitespace-nowrap">
                    {new Date(l.date||l.createdAt).toLocaleDateString('en-ZA')}
                  </td>
                  <td>
                    <span className={`badge ${TYPE_BADGE[l.type]||'badge-gray'}`}>
                      {l.type==='수입'?'Income':l.type==='지출'?'Expense':l.type==='판매'?'Sale':l.type==='구매'?'Purchase':l.type}
                    </span>
                  </td>
                  <td className="text-gray-700">{l.description}</td>
                  <td className="text-right font-medium text-green-600">
                    {Number(l.credit)>0 ? fmt(l.credit) : '-'}
                  </td>
                  <td className="text-right font-medium text-red-500">
                    {Number(l.debit)>0 ? fmt(l.debit) : '-'}
                  </td>
                  <td className="text-right font-medium text-gray-700">
                    {fmt(l.balance||0)}
                  </td>
                </tr>
              ))}
              {!loading && ledger.length===0 && (
                <tr><td colSpan={6} className="text-center py-8 text-gray-400">No accounting records found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
