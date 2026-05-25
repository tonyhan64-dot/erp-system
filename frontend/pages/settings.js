import { useEffect, useState } from 'react';
import api from '../lib/api';

const CURRENCIES = ['ZAR','USD','KRW','EUR','GBP','CNY'];
const EMAIL_SERVICES = ['gmail','outlook','yahoo','hotmail'];

export default function Settings() {
  const [form, setForm] = useState({
    company_name:'', company_reg_no:'', company_address:'', company_phone:'',
    currency:'ZAR', tax_rate:'15',
    email_service:'gmail', email_user:'', email_pass:'',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState('');
  const [rates, setRates] = useState(null);
  const [converting, setConverting] = useState({ amount:1000, from:'ZAR', to:'USD', result:null });
  const [tab, setTab] = useState('company');

  useEffect(() => {
    api.get('/settings').then(r => setForm(f => ({ ...f, ...r.data }))).finally(() => setLoading(false));
    api.get('/currency/rates').then(r => setRates(r.data)).catch(() => {});
  }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    try { await api.put('/settings', form); setSaved(true); setTimeout(() => setSaved(false), 3000); }
    catch (err) { alert(err.response?.data?.error || '오류'); }
    finally { setSaving(false); }
  };

  const testEmail = async () => {
    setTestingEmail(true); setEmailResult('');
    try {
      // 먼저 저장
      await api.put('/settings', form);
      const r = await api.post('/email/test');
      setEmailResult('✅ ' + r.data.message);
    } catch (err) {
      setEmailResult('❌ ' + (err.response?.data?.error || '연결 실패'));
    } finally { setTestingEmail(false); }
  };

  const convert = async () => {
    try {
      const r = await api.post('/currency/convert', { amount: Number(converting.amount), from: converting.from, to: converting.to });
      setConverting(f => ({ ...f, result: r.data.result }));
    } catch { setConverting(f => ({ ...f, result: null })); }
  };

  if (loading) return <div className="text-sm text-gray-400 p-8">불러오는 중...</div>;

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-gray-200 mb-5">
        {[['company','🏢 회사 정보'],['email','📧 이메일 설정'],['currency','💱 환율 설정']].map(([key,label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-5 py-2.5 text-sm border-b-2 -mb-px transition-colors ${tab===key ? 'border-blue-500 text-blue-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={save}>
        {/* 회사 정보 탭 */}
        {tab === 'company' && (
          <div className="card p-5 max-w-lg space-y-4">
            <div className="text-sm font-medium text-gray-800 mb-2">회사 기본 정보</div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">회사명</label><input className="input" value={form.company_name} onChange={e=>setForm(f=>({...f,company_name:e.target.value}))} /></div>
              <div><label className="label">사업자번호</label><input className="input" value={form.company_reg_no} onChange={e=>setForm(f=>({...f,company_reg_no:e.target.value}))} /></div>
            </div>
            <div><label className="label">주소</label><input className="input" value={form.company_address||''} onChange={e=>setForm(f=>({...f,company_address:e.target.value}))} /></div>
            <div><label className="label">전화번호</label><input className="input" value={form.company_phone||''} onChange={e=>setForm(f=>({...f,company_phone:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">기본 통화</label>
                <select className="input" value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className="label">부가세율 (%)</label><input className="input" type="number" value={form.tax_rate} onChange={e=>setForm(f=>({...f,tax_rate:e.target.value}))} /></div>
            </div>
          </div>
        )}

        {/* 이메일 설정 탭 */}
        {tab === 'email' && (
          <div className="card p-5 max-w-lg space-y-4">
            <div className="text-sm font-medium text-gray-800 mb-1">이메일 발송 설정</div>
            <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 leading-relaxed">
              💡 Gmail 사용 시: Google 계정 → 보안 → <strong>앱 비밀번호</strong> 생성 후 아래에 입력하세요.<br/>
              일반 Gmail 비밀번호는 작동하지 않습니다.
            </div>
            <div>
              <label className="label">이메일 서비스</label>
              <select className="input" value={form.email_service||'gmail'} onChange={e=>setForm(f=>({...f,email_service:e.target.value}))}>
                {EMAIL_SERVICES.map(s=><option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="label">발신 이메일 주소</label><input className="input" type="email" placeholder="your@gmail.com" value={form.email_user||''} onChange={e=>setForm(f=>({...f,email_user:e.target.value}))} /></div>
            <div><label className="label">앱 비밀번호</label><input className="input" type="password" placeholder="Gmail 앱 비밀번호 16자리" value={form.email_pass||''} onChange={e=>setForm(f=>({...f,email_pass:e.target.value}))} /></div>
            <div className="flex gap-2 items-center">
              <button type="button" onClick={testEmail} disabled={testingEmail} className="btn-secondary btn-sm">
                {testingEmail ? '테스트 중...' : '📧 연결 테스트'}
              </button>
              {emailResult && <span className={`text-xs ${emailResult.startsWith('✅') ? 'text-green-600' : 'text-red-500'}`}>{emailResult}</span>}
            </div>
          </div>
        )}

        {/* 환율 설정 탭 */}
        {tab === 'currency' && (
          <div className="max-w-lg space-y-4">
            {/* 현재 환율 */}
            <div className="card p-4">
              <div className="text-sm font-medium text-gray-800 mb-3">
                현재 환율 (ZAR 기준)
                {rates?.updatedAt && <span className="text-xs text-gray-400 ml-2">업데이트: {new Date(rates.updatedAt).toLocaleTimeString('ko-KR')}</span>}
              </div>
              <div className="grid grid-cols-3 gap-3">
                {rates ? Object.entries(rates.rates).filter(([k])=>k!=='ZAR').map(([currency, rate]) => (
                  <div key={currency} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-xs text-gray-500 mb-1">{currency}</div>
                    <div className="text-sm font-semibold text-gray-800">{Number(rate).toFixed(4)}</div>
                    <div className="text-xs text-gray-400">1 ZAR</div>
                  </div>
                )) : (
                  <div className="col-span-3 text-center text-sm text-gray-400 py-4">환율 불러오는 중...</div>
                )}
              </div>
              <button type="button" onClick={() => api.get('/currency/rates').then(r=>setRates(r.data))}
                className="mt-3 text-xs text-blue-600 hover:underline">🔄 새로고침</button>
            </div>

            {/* 환율 계산기 */}
            <div className="card p-4">
              <div className="text-sm font-medium text-gray-800 mb-3">💱 환율 계산기</div>
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <label className="label">금액</label>
                  <input className="input w-28" type="number" value={converting.amount} onChange={e=>setConverting(f=>({...f,amount:e.target.value,result:null}))} />
                </div>
                <div>
                  <label className="label">통화</label>
                  <select className="input" value={converting.from} onChange={e=>setConverting(f=>({...f,from:e.target.value,result:null}))}>
                    {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="text-gray-400 pb-2">→</div>
                <div>
                  <label className="label">변환</label>
                  <select className="input" value={converting.to} onChange={e=>setConverting(f=>({...f,to:e.target.value,result:null}))}>
                    {CURRENCIES.map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <button type="button" onClick={convert} className="btn-primary btn-sm pb-2">계산</button>
              </div>
              {converting.result !== null && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm">
                  <span className="font-semibold text-blue-700">
                    {Number(converting.amount).toLocaleString()} {converting.from} = {Number(converting.result).toLocaleString()} {converting.to}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 저장 버튼 */}
        <div className="flex items-center gap-3 mt-5">
          <button type="submit" disabled={saving} className="btn-primary">{saving ? '저장중...' : '설정 저장'}</button>
          {saved && <span className="text-sm text-green-600">✓ 저장되었습니다</span>}
        </div>
      </form>
    </div>
  );
}
