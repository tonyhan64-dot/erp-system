import { useEffect, useState } from 'react';
import api from '../lib/api';

const TABS = [
  { id:'company',  label:'System Setting',           icon:'⚙️' },
  { id:'grade',    label:'Customer Grade Setting',    icon:'👥' },
  { id:'price',    label:'Base Price Section Setting',icon:'💰' },
  { id:'email',    label:'Email Smtp Setting',        icon:'📧' },
  { id:'terms',    label:'Terms of Sale',             icon:'📋' },
  { id:'bank',     label:'Bank & Payment',            icon:'🏦' },
];

const DEFAULT_TERMS = `1. Any electrical goods return is not accepted and do not carry any guarantees.
2. No goods will be accepted for exchange/refund after 7 days.
3. Damaged / Used parts will not be accepted for returns. 20% handling fee will be charged on goods correctly supplied.
4. No returns accepted if there is: No invoice / Special orders / No original packaging.
5. Card payment can only be refunded back by card or EFT. No cash refunds.
6. DISCLAIMER: The authorized South African distributor of these products "Hyundai South Africa" and "Kia Motors South Africa" is under no obligation to honor the manufacturer's guarantee / warranties or to provide after-sales services.`;

export default function SystemConfig() {
  const [tab, setTab] = useState('company');
  const [form, setForm] = useState({
    company_name:'AMI ELECTRONICS CC PARTS',
    company_reg_no:'1995/029029/23',
    company_vat_no:'4510151923',
    company_address:'Cnr Nut Ave & Industry Rd, Clayville Industrial, Olifantsfontein 1666',
    company_zip:'2128',
    company_tel:'010 900 3321',
    company_whatsapp:'+27639728095',
    company_email:'pmtembisa@gmail.com',
    company_website:'www.partskorea.co.za',
    company_logo_url:'',
    currency:'ZAR',
    vat_rate:'15',
    date_format:'yyyy-MM-dd',
    invoice_print_type:'A4',
    print_paper_size:'A4',
    print_font_family:'Helvetica',
    print_font_size:'10',
    print_primary_color:'#185FA5',
    print_footer_text:'Thank you for your business!',
    default_valid_days:'15',
    duplicate_id_block:'true',
    // Email SMTP
    smtp_host:'',
    smtp_port:'587',
    smtp_user:'',
    smtp_pass:'',
    smtp_ssl:'false',
    // Bank
    bank_name:'FIRST NATIONAL BANK',
    bank_account_name:'AMI ELECTRONICS CC PARTS-MALL TEMBISA',
    bank_account_no:'62808558483',
    bank_branch:'RIVONIA',
    // Terms
    terms_of_sale: DEFAULT_TERMS,
  });

  // Customer Grade — 최대 9개
  const [grades, setGrades] = useState([
    { type:'Type A', markup:'15.00', remarks:'', na:false },
    { type:'Type B', markup:'30.00', remarks:'', na:false },
    { type:'Type C', markup:'39.14', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
    { type:'', markup:'', remarks:'', na:false },
  ]);

  // Base Price Section — 가격대 + 브랜드
  const [priceSections, setPriceSections] = useState([
    { price:'200.00',  brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'300.00',  brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'500.00',  brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'1000.00', brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'2000.00', brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'3000.00', brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'30000.00',brand:'', markup:'7.00',  remarks:'', na:false },
    { price:'',        brand:'DAC',      markup:'10.00', remarks:'무조건 Brand가 우선 - 가격대는 무', na:false },
    { price:'',        brand:'NIPPARTS', markup:'15.00', remarks:'', na:false },
    { price:'',        brand:'rik',      markup:'15.00', remarks:'', na:false },
    { price:'',        brand:'SPC',      markup:'15.00', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
    { price:'', brand:'', markup:'', remarks:'', na:false },
  ]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState('');

  useEffect(() => {
    api.get('/settings').then(r => {
      const d = r.data;
      setForm(f => ({ ...f, ...d }));
      if (d.customer_grades) {
        try { setGrades(JSON.parse(d.customer_grades)); } catch{}
      }
      if (d.price_sections) {
        try { setPriceSections(JSON.parse(d.price_sections)); } catch{}
      }
    }).finally(() => setLoading(false));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async (e) => {
    if (e) e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      await api.put('/settings', {
        ...form,
        customer_grades: JSON.stringify(grades),
        price_sections: JSON.stringify(priceSections),
      });
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch(err) { alert(err.response?.data?.error || '저장 오류'); }
    finally { setSaving(false); }
  };

  const testEmail = async () => {
    setTestingEmail(true); setEmailResult('');
    try {
      await api.put('/settings', { ...form, customer_grades: JSON.stringify(grades), price_sections: JSON.stringify(priceSections) });
      const r = await api.post('/email/test');
      setEmailResult('✅ ' + r.data.message);
    } catch(err) { setEmailResult('❌ ' + (err.response?.data?.error || '연결 실패')); }
    finally { setTestingEmail(false); }
  };

  const updateGrade = (i, k, v) => {
    const g = [...grades]; g[i] = { ...g[i], [k]: v }; setGrades(g);
  };
  const updateSection = (i, k, v) => {
    const s = [...priceSections]; s[i] = { ...s[i], [k]: v }; setPriceSections(s);
  };

  const gradeCount = grades.filter(g => g.type).length;
  const sectionCount = priceSections.filter(s => s.price || s.brand).length;
  const sectionMarkupSum = priceSections.filter(s=>s.markup).reduce((a,b)=>a+Number(b.markup||0),0).toFixed(0);

  if (loading) return <div className="text-sm text-gray-400 p-8">불러오는 중...</div>;

  const tdStyle = { padding:'4px 6px', borderBottom:'0.5px solid var(--color-border-tertiary)', fontSize:12 };
  const thStyle = { padding:'5px 6px', fontSize:11, fontWeight:500, color:'var(--color-text-tertiary)', background:'var(--color-background-secondary)', borderBottom:'0.5px solid var(--color-border-tertiary)', textAlign:'left', whiteSpace:'nowrap' };
  const cellInput = { width:'100%', padding:'3px 5px', border:'0.5px solid var(--color-border-secondary)', borderRadius:4, fontSize:11, background:'var(--color-background-primary)', color:'var(--color-text-primary)' };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="page-title mb-0">System Configuration</h1>
          <p className="text-xs text-gray-400 mt-1">AMIPARTS HQ — Super Admin Only</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✓ Saved!</span>}
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : '💾 Save Settings'}
          </button>
        </div>
      </div>

      {/* 회사 정보 카드 */}
      <div className="card p-4 mb-4" style={{borderLeft:'4px solid #185FA5'}}>
        <div className="flex items-center gap-4">
          <div style={{width:48,height:48,background:'#185FA5',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🔧</div>
          <div className="flex-1">
            <div className="font-bold text-gray-900">{form.company_name}</div>
            <div className="text-xs text-gray-500">Reg: {form.company_reg_no} · VAT: {form.company_vat_no}</div>
            <div className="text-xs text-gray-400">{form.company_address}</div>
          </div>
          <div className="text-right text-xs text-gray-500">
            <div>Tel: {form.company_tel}</div>
            <div>WhatsApp: {form.company_whatsapp}</div>
            <div className="text-blue-600">{form.company_email}</div>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex border-b border-gray-200 mb-5 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm border-b-2 -mb-px whitespace-nowrap flex items-center gap-1.5 transition-colors ${
              tab===t.id ? 'border-blue-500 text-blue-600 font-medium bg-blue-50' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {/* ── System Setting ── */}
      {tab === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="card p-4 space-y-3">
            <div className="text-sm font-semibold text-gray-700 mb-2">🏢 Company Information</div>
            <div><label className="label">Company Name</label><input className="input" value={form.company_name} onChange={e=>set('company_name',e.target.value)}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Reg No</label><input className="input" value={form.company_reg_no} onChange={e=>set('company_reg_no',e.target.value)}/></div>
              <div><label className="label">VAT No</label><input className="input" value={form.company_vat_no} onChange={e=>set('company_vat_no',e.target.value)}/></div>
            </div>
            <div><label className="label">Physical Address</label><input className="input" value={form.company_address} onChange={e=>set('company_address',e.target.value)}/></div>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">Zip</label><input className="input" value={form.company_zip} onChange={e=>set('company_zip',e.target.value)}/></div>
              <div className="col-span-2"><label className="label">Tel No</label><input className="input" value={form.company_tel} onChange={e=>set('company_tel',e.target.value)}/></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">WhatsApp</label><input className="input" value={form.company_whatsapp} onChange={e=>set('company_whatsapp',e.target.value)}/></div>
              <div><label className="label">Email</label><input className="input" value={form.company_email} onChange={e=>set('company_email',e.target.value)}/></div>
            </div>
            <div><label className="label">Home Page</label><input className="input" value={form.company_website} onChange={e=>set('company_website',e.target.value)}/></div>
            <div><label className="label">Logo URL</label><input className="input" placeholder="https://..." value={form.company_logo_url||''} onChange={e=>set('company_logo_url',e.target.value)}/></div>
          </div>
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">⚙️ System Options</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Currency</label>
                  <select className="input" value={form.currency} onChange={e=>set('currency',e.target.value)}>
                    {['ZAR','USD','EUR','GBP'].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">VAT Rate (%)</label><input className="input" type="number" value={form.vat_rate} onChange={e=>set('vat_rate',e.target.value)}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Date Format</label>
                  <select className="input" value={form.date_format} onChange={e=>set('date_format',e.target.value)}>
                    {['yyyy-MM-dd','dd/MM/yyyy','MM/dd/yyyy'].map(d=><option key={d}>{d}</option>)}
                  </select>
                </div>
                <div><label className="label">Invoice Print Type</label>
                  <select className="input" value={form.invoice_print_type} onChange={e=>set('invoice_print_type',e.target.value)}>
                    {['A4','A5','POS 80mm','POS 58mm'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Quote Valid Days</label><input className="input" type="number" value={form.default_valid_days} onChange={e=>set('default_valid_days',e.target.value)}/></div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="dup" checked={form.duplicate_id_block==='true'} onChange={e=>set('duplicate_id_block',e.target.checked?'true':'false')}/>
                  <label htmlFor="dup" className="text-xs text-gray-600">Duplicate ID Block</label>
                </div>
              </div>
            </div>
            <div className="card p-4 space-y-3">
              <div className="text-sm font-semibold text-gray-700 mb-2">🎨 Print Style</div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Paper Size</label>
                  <select className="input" value={form.print_paper_size} onChange={e=>set('print_paper_size',e.target.value)}>
                    {['A4','A5','Letter','80mm (POS)','58mm (POS)'].map(p=><option key={p}>{p}</option>)}
                  </select>
                </div>
                <div><label className="label">Font Size</label>
                  <select className="input" value={form.print_font_size} onChange={e=>set('print_font_size',e.target.value)}>
                    {['8','9','10','11','12'].map(s=><option key={s}>{s}pt</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Theme Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value={form.print_primary_color} onChange={e=>set('print_primary_color',e.target.value)}
                    style={{width:36,height:32,padding:2,border:'0.5px solid #ddd',borderRadius:6,cursor:'pointer'}}/>
                  <span className="text-xs text-gray-400">{form.print_primary_color}</span>
                  {['#185FA5','#0F6E56','#E24B4A','#854F0B','#000000'].map(c=>(
                    <div key={c} onClick={()=>set('print_primary_color',c)}
                      style={{width:20,height:20,background:c,borderRadius:4,cursor:'pointer',border:form.print_primary_color===c?'2px solid #333':'none'}}/>
                  ))}
                </div>
              </div>
              <div><label className="label">Footer Text</label><input className="input" value={form.print_footer_text} onChange={e=>set('print_footer_text',e.target.value)}/></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Customer Grade Setting ── */}
      {tab === 'grade' && (
        <div className="card overflow-hidden max-w-2xl">
          <table style={{width:'100%',borderCollapse:'collapse'}}>
            <thead>
              <tr>
                <th style={{...thStyle,width:32,textAlign:'center'}}>#</th>
                <th style={thStyle}>Grade Type</th>
                <th style={{...thStyle,width:100}}>Markup (%)</th>
                <th style={thStyle}>Remarks</th>
                <th style={{...thStyle,width:40,textAlign:'center'}}>N/A</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((g,i) => (
                <tr key={i} style={{background:g.type?'var(--color-background-primary)':'var(--color-background-secondary)'}}>
                  <td style={{...tdStyle,textAlign:'center',color:'var(--color-text-tertiary)',fontSize:11}}>{i+1}</td>
                  <td style={tdStyle}>
                    <input style={cellInput} value={g.type} onChange={e=>updateGrade(i,'type',e.target.value)} placeholder="Type A"/>
                  </td>
                  <td style={tdStyle}>
                    <input style={{...cellInput,textAlign:'right'}} type="number" step="0.01" value={g.markup} onChange={e=>updateGrade(i,'markup',e.target.value)} placeholder="0.00"/>
                  </td>
                  <td style={tdStyle}>
                    <input style={cellInput} value={g.remarks} onChange={e=>updateGrade(i,'remarks',e.target.value)}/>
                  </td>
                  <td style={{...tdStyle,textAlign:'center'}}>
                    <input type="checkbox" checked={g.na||false} onChange={e=>updateGrade(i,'na',e.target.checked)}/>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{background:'#FAEEDA'}}>
                <td style={{...tdStyle,fontWeight:500,color:'#633806',fontSize:11}} colSpan={1}>Sum:</td>
                <td style={{...tdStyle,fontWeight:500,color:'#633806'}}>{gradeCount}</td>
                <td style={{...tdStyle,fontWeight:500,color:'#633806',textAlign:'right'}}>{gradeCount}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ── Base Price Section Setting ── */}
      {tab === 'price' && (
        <div className="card overflow-hidden">
          <div className="card-header">
            Base Price Section Setting
            <span className="text-xs text-gray-400 font-normal">브랜드가 가격대보다 우선 적용됩니다</span>
          </div>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',minWidth:600}}>
              <thead>
                <tr>
                  <th style={{...thStyle,width:32,textAlign:'center'}}>#</th>
                  <th style={{...thStyle,width:110}}>Price (R)</th>
                  <th style={{...thStyle,width:120}}>Brand Name OR Type</th>
                  <th style={{...thStyle,width:100}}>Markup (%)</th>
                  <th style={thStyle}>Remarks</th>
                  <th style={{...thStyle,width:40,textAlign:'center'}}>N/A</th>
                </tr>
              </thead>
              <tbody>
                {priceSections.map((s,i) => (
                  <tr key={i} style={{background:(s.price||s.brand)?'var(--color-background-primary)':'var(--color-background-secondary)'}}>
                    <td style={{...tdStyle,textAlign:'center',color:'var(--color-text-tertiary)',fontSize:11}}>{i+1}</td>
                    <td style={tdStyle}>
                      <input style={{...cellInput,textAlign:'right'}} type="number" step="0.01" value={s.price} onChange={e=>updateSection(i,'price',e.target.value)} placeholder="0.00"/>
                    </td>
                    <td style={tdStyle}>
                      <input style={cellInput} value={s.brand} onChange={e=>updateSection(i,'brand',e.target.value)} placeholder="DAC / NIPPARTS..."/>
                    </td>
                    <td style={tdStyle}>
                      <input style={{...cellInput,textAlign:'right'}} type="number" step="0.01" value={s.markup} onChange={e=>updateSection(i,'markup',e.target.value)} placeholder="0.00"/>
                    </td>
                    <td style={tdStyle}>
                      <input style={cellInput} value={s.remarks} onChange={e=>updateSection(i,'remarks',e.target.value)}/>
                    </td>
                    <td style={{...tdStyle,textAlign:'center'}}>
                      <input type="checkbox" checked={s.na||false} onChange={e=>updateSection(i,'na',e.target.checked)}/>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:'#FAEEDA'}}>
                  <td style={{...tdStyle,fontWeight:500,color:'#633806',fontSize:11}}>Sum:</td>
                  <td style={{...tdStyle,fontWeight:500,color:'#633806',textAlign:'right'}}>{sectionCount}</td>
                  <td style={{...tdStyle,fontWeight:500,color:'#633806'}}>{priceSections.filter(s=>s.brand).length}</td>
                  <td style={{...tdStyle,fontWeight:500,color:'#633806',textAlign:'right'}}>{sectionMarkupSum}</td>
                  <td style={{...tdStyle,fontWeight:500,color:'#633806'}}>{priceSections.filter(s=>s.remarks).length}</td>
                  <td/>
                </tr>
              </tfoot>
            </table>
          </div>
          <div className="p-3 bg-amber-50 border-t border-amber-100">
            <div className="text-xs text-amber-700">
              💡 <strong>Brand가 우선:</strong> 같은 부품이라도 Brand가 설정되어 있으면 Brand Markup이 가격대 Markup보다 우선 적용됩니다.
            </div>
          </div>
        </div>
      )}

      {/* ── Email SMTP Setting ── */}
      {tab === 'email' && (
        <div className="card p-5 max-w-lg">
          <div className="text-sm font-semibold text-gray-700 mb-4">📧 Email Smtp Setting</div>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600 text-right">Smtp Server(Host) Address</label>
              <div className="col-span-2 flex items-center gap-2">
                <input className="input flex-1" value={form.smtp_host||''} onChange={e=>set('smtp_host',e.target.value)} placeholder="smtp.gmail.com"/>
                <span className="text-xs text-gray-400">ex) smtp.gmail.com</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600 text-right">Smtp Server Port</label>
              <div className="col-span-2 flex items-center gap-2">
                <input className="input w-24" value={form.smtp_port||'587'} onChange={e=>set('smtp_port',e.target.value)} placeholder="587"/>
                <span className="text-xs text-gray-400">Default 25, ex) 587</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600 text-right">Smtp Server User ID</label>
              <div className="col-span-2 flex items-center gap-2">
                <input className="input flex-1" value={form.smtp_user||''} onChange={e=>set('smtp_user',e.target.value)} placeholder="email@gmail.com"/>
                <span className="text-xs text-gray-400">ex) gmail@gmail.com</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600 text-right">Smtp Server Password</label>
              <div className="col-span-2 flex items-center gap-2">
                <input className="input flex-1" type="password" value={form.smtp_pass||''} onChange={e=>set('smtp_pass',e.target.value)} placeholder="App Password"/>
                <span className="text-xs text-gray-400">ex) Email Password</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <label className="text-xs text-gray-600 text-right">Smtp Server SSL</label>
              <div className="col-span-2 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="ssl" checked={form.smtp_ssl==='true'} onChange={e=>set('smtp_ssl',e.target.checked?'true':'false')}/>
                  <label htmlFor="ssl" className="text-xs text-gray-600">Enable SSL</label>
                </div>
                <button type="button" onClick={testEmail} disabled={testingEmail}
                  className="btn-secondary btn-sm">
                  {testingEmail ? 'Testing...' : 'Send Mail Test'}
                </button>
              </div>
            </div>
            {emailResult && (
              <div className={`p-3 rounded-lg text-xs ${emailResult.startsWith('✅')?'bg-green-50 text-green-700':'bg-red-50 text-red-600'}`}>
                {emailResult}
              </div>
            )}
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-xs text-yellow-700">
              * Gmail 사용: 계정관리 → 보안 → 앱 비밀번호 생성 후 위에 입력하세요
            </div>
          </div>
        </div>
      )}

      {/* ── Terms of Sale ── */}
      {tab === 'terms' && (
        <div className="card p-5 max-w-3xl">
          <div className="text-sm font-semibold text-gray-700 mb-3">📋 Terms of Sale</div>
          <div className="text-xs text-gray-500 mb-3">인보이스/견적서 하단에 자동으로 인쇄됩니다.</div>
          <textarea className="input" rows={12} value={form.terms_of_sale||''}
            onChange={e=>set('terms_of_sale',e.target.value)}
            style={{fontFamily:'monospace',fontSize:12,lineHeight:1.7,resize:'vertical'}}/>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <div className="text-xs font-medium text-gray-600 mb-2">인쇄 미리보기:</div>
            <div className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{form.terms_of_sale}</div>
          </div>
        </div>
      )}

      {/* ── Bank & Payment ── */}
      {tab === 'bank' && (
        <div className="card p-5 max-w-lg space-y-3">
          <div className="text-sm font-semibold text-gray-700 mb-2">🏦 Bank & Payment Setting</div>
          <div><label className="label">Bank Name</label>
            <input className="input" value={form.bank_name||''} onChange={e=>set('bank_name',e.target.value)}/></div>
          <div><label className="label">Account Name</label>
            <input className="input" value={form.bank_account_name||''} onChange={e=>set('bank_account_name',e.target.value)}/></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Account No</label>
              <input className="input" value={form.bank_account_no||''} onChange={e=>set('bank_account_no',e.target.value)}/></div>
            <div><label className="label">Branch Code</label>
              <input className="input" value={form.bank_branch||''} onChange={e=>set('bank_branch',e.target.value)}/></div>
          </div>
          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
            <div className="font-medium">인쇄물 은행 정보:</div>
            <div>Bank: {form.bank_name}</div>
            <div>Account: {form.bank_account_name}</div>
            <div>Acc No: {form.bank_account_no} · Branch: {form.bank_branch}</div>
          </div>
        </div>
      )}

      {/* 저장 */}
      <div className="flex items-center gap-3 mt-6 pt-4 border-t">
        <button onClick={save} disabled={saving} className="btn-primary px-6">
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
        {saved && <span className="text-sm text-green-600 font-medium">✓ All settings saved!</span>}
      </div>
    </div>
  );
}
