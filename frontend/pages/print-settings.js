import { useEffect, useState } from 'react';
import api from '../lib/api';

const FONT_SIZES = ['8','9','10','11','12','14'];
const FONT_FAMILIES = ['Helvetica','Courier','Times-Roman'];
const PAPER_SIZES = ['A4','A5','Letter','80mm (POS)','58mm (POS)'];

export default function PrintSettings() {
  const [settings, setSettings] = useState({
    print_paper_size: 'A4',
    print_font_family: 'Helvetica',
    print_font_size: '10',
    print_company_name: '',
    print_company_address: '',
    print_company_phone: '',
    print_company_email: '',
    print_footer_text: 'Thank you for your business!',
    print_primary_color: '#185FA5',
    print_default_printer: 'pdf',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewType, setPreviewType] = useState('quotation');

  useEffect(() => {
    api.get('/settings').then(r => setSettings(f => ({ ...f, ...r.data }))).finally(() => setLoading(false));
  }, []);

  const save = async (e) => {
    e.preventDefault(); setSaving(true); setSaved(false);
    try {
      await api.put('/settings', settings);
      setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch(err) { alert(err.response?.data?.error || 'Error saving settings'); }
    finally { setSaving(false); }
  };

  const isPOS = settings.print_paper_size.includes('POS') || settings.print_paper_size.includes('mm');

  if (loading) return <div className="text-sm text-gray-400 p-8">Loading...</div>;

  return (
    <div>
      <h1 className="page-title">Print Settings</h1>
      <p className="text-xs text-gray-400 -mt-3 mb-5">Super Admin Only — Applied to all receipts, quotations and invoices</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Left: Settings */}
        <form onSubmit={save} className="space-y-4">

          {/* Printer Settings */}
          <div className="card p-4">
            <div className="text-sm font-medium text-gray-800 mb-3">🖨 Printer Settings</div>
            <div className="space-y-3">
              <div>
                <label className="label">Paper Size</label>
                <select className="input" value={settings.print_paper_size}
                  onChange={e => setSettings(f => ({...f, print_paper_size: e.target.value}))}>
                  {PAPER_SIZES.map(s => <option key={s}>{s}</option>)}
                </select>
                {isPOS && (
                  <p className="text-xs text-amber-600 mt-1">⚠️ POS Mode — Thermal printer receipt format</p>
                )}
              </div>
              <div>
                <label className="label">Default Output Method</label>
                <select className="input" value={settings.print_default_printer}
                  onChange={e => setSettings(f => ({...f, print_default_printer: e.target.value}))}>
                  <option value="pdf">PDF (Open in browser)</option>
                  <option value="browser_print">Browser Print Dialog (Ctrl+P)</option>
                  <option value="pos_direct">POS Direct Print</option>
                </select>
              </div>
            </div>
          </div>

          {/* Font Style */}
          <div className="card p-4">
            <div className="text-sm font-medium text-gray-800 mb-3">🔤 Font Style</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Font Family</label>
                <select className="input" value={settings.print_font_family}
                  onChange={e => setSettings(f => ({...f, print_font_family: e.target.value}))}>
                  {FONT_FAMILIES.map(f => <option key={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Font Size</label>
                <select className="input" value={settings.print_font_size}
                  onChange={e => setSettings(f => ({...f, print_font_size: e.target.value}))}>
                  {FONT_SIZES.map(s => <option key={s}>{s}pt</option>)}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="label">Theme Color</label>
              <div className="flex items-center gap-3">
                <input type="color" value={settings.print_primary_color}
                  onChange={e => setSettings(f => ({...f, print_primary_color: e.target.value}))}
                  style={{width:40,height:36,padding:2,border:'0.5px solid #ddd',borderRadius:6,cursor:'pointer'}}/>
                <span className="text-xs text-gray-500">{settings.print_primary_color}</span>
                <div className="flex gap-2">
                  {['#185FA5','#0F6E56','#000000','#E24B4A','#854F0B'].map(c => (
                    <div key={c} onClick={() => setSettings(f=>({...f,print_primary_color:c}))}
                      style={{width:20,height:20,background:c,borderRadius:4,cursor:'pointer',
                        border:settings.print_primary_color===c?'2px solid #333':'none'}}/>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Company Info on Prints */}
          <div className="card p-4">
            <div className="text-sm font-medium text-gray-800 mb-3">🏢 Company Info on Prints</div>
            <div className="space-y-3">
              <div><label className="label">Company Name</label>
                <input className="input" value={settings.print_company_name||''}
                  onChange={e=>setSettings(f=>({...f,print_company_name:e.target.value}))}
                  placeholder="Name shown on printed documents"/></div>
              <div><label className="label">Address</label>
                <input className="input" value={settings.print_company_address||''}
                  onChange={e=>setSettings(f=>({...f,print_company_address:e.target.value}))}
                  placeholder="Company address"/></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Phone</label>
                  <input className="input" value={settings.print_company_phone||''}
                    onChange={e=>setSettings(f=>({...f,print_company_phone:e.target.value}))}/></div>
                <div><label className="label">Email</label>
                  <input className="input" value={settings.print_company_email||''}
                    onChange={e=>setSettings(f=>({...f,print_company_email:e.target.value}))}/></div>
              </div>
              <div><label className="label">Footer Text</label>
                <input className="input" value={settings.print_footer_text||''}
                  onChange={e=>setSettings(f=>({...f,print_footer_text:e.target.value}))}
                  placeholder="Thank you for your business!"/></div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Saving...' : '💾 Save Settings'}
            </button>
            {saved && <span className="text-sm text-green-600">✓ Settings saved!</span>}
          </div>
        </form>

        {/* Right: Preview */}
        <div>
          <div className="flex gap-2 mb-3">
            {[['quotation','Quotation'],['invoice','Invoice'],['receipt','Receipt']].map(([t,l]) => (
              <button key={t} onClick={() => setPreviewType(t)}
                className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  previewType===t ? 'bg-blue-50 border-blue-300 text-blue-700' : 'border-gray-200 text-gray-500'
                }`}>
                {l}
              </button>
            ))}
          </div>

          {/* Preview Card */}
          <div style={{border:`2px solid ${settings.print_primary_color}`,borderRadius:8,overflow:'hidden',background:'white',maxWidth:isPOS?240:'100%',margin:isPOS?'0 auto':0}}>
            {/* Header */}
            <div style={{background:settings.print_primary_color,padding:isPOS?'8px 10px':'12px 16px'}}>
              <div style={{color:'white',fontFamily:settings.print_font_family==='Courier'?'Courier New,monospace':settings.print_font_family==='Times-Roman'?'Times New Roman,serif':'Arial,sans-serif',fontSize:isPOS?11:Number(settings.print_font_size)+4,fontWeight:'bold'}}>
                {previewType==='quotation'?'QUOTATION':previewType==='invoice'?'INVOICE':'RECEIPT'}
              </div>
              <div style={{color:'rgba(255,255,255,0.8)',fontSize:isPOS?9:10,marginTop:2}}>
                {settings.print_company_name||'AMIPARTS AUTO PARTS'}
              </div>
            </div>

            {/* Body */}
            <div style={{padding:isPOS?'8px 10px':'12px 16px',fontFamily:settings.print_font_family==='Courier'?'Courier New,monospace':settings.print_font_family==='Times-Roman'?'Times New Roman,serif':'Arial,sans-serif',fontSize:Number(settings.print_font_size)}}>
              {!isPOS&&(
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:Number(settings.print_font_size)-1,color:'#666'}}>
                  <div><div>Date: {new Date().toLocaleDateString('en-ZA')}</div><div>No: QT-12345678</div></div>
                  <div style={{textAlign:'right'}}><div style={{fontWeight:500}}>ABC Motors</div><div>011-123-4567</div></div>
                </div>
              )}
              {isPOS&&(
                <div style={{textAlign:'center',marginBottom:8,fontSize:9,borderBottom:'1px dashed #ccc',paddingBottom:6}}>
                  <div>{settings.print_company_address||'123 Main Street'}</div>
                  <div>{settings.print_company_phone||'011-000-0000'}</div>
                  <div style={{marginTop:4,fontWeight:'bold'}}>{previewType==='quotation'?'QUOTATION':'RECEIPT'} #12345</div>
                  <div>{new Date().toLocaleDateString('en-ZA')}</div>
                </div>
              )}
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:isPOS?9:Number(settings.print_font_size)-1}}>
                <thead>
                  <tr style={{background:isPOS?'#f0f0f0':settings.print_primary_color+'22',borderBottom:`1px solid ${settings.print_primary_color}`}}>
                    <th style={{padding:isPOS?'3px 4px':'4px 6px',textAlign:'left',color:isPOS?'#333':settings.print_primary_color}}>Item</th>
                    {!isPOS&&<th style={{padding:'4px 6px',color:settings.print_primary_color}}>Qty</th>}
                    <th style={{padding:isPOS?'3px 4px':'4px 6px',textAlign:'right',color:isPOS?'#333':settings.print_primary_color}}>Amt</th>
                  </tr>
                </thead>
                <tbody>
                  {[['Engine Oil Filter','2','R 215.06'],['Brake Pad Front','1','R 404.80']].map(([n,q,a],i)=>(
                    <tr key={i} style={{borderBottom:'0.5px solid #eee'}}>
                      <td style={{padding:isPOS?'3px 4px':'4px 6px'}}>{isPOS?n.substring(0,14):n}</td>
                      {!isPOS&&<td style={{padding:'4px 6px',textAlign:'center'}}>{q}</td>}
                      <td style={{padding:isPOS?'3px 4px':'4px 6px',textAlign:'right'}}>{a}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div style={{borderTop:`1px solid ${settings.print_primary_color}`,marginTop:6,paddingTop:6,textAlign:'right',fontSize:isPOS?9:Number(settings.print_font_size)-1}}>
                <div>Subtotal: R 619.86</div>
                <div>VAT (15%): R 92.98</div>
                <div style={{fontWeight:'bold',color:settings.print_primary_color,fontSize:isPOS?10:Number(settings.print_font_size)}}>TOTAL: R 712.84</div>
              </div>
              <div style={{textAlign:'center',marginTop:8,fontSize:isPOS?8:9,color:'#999',borderTop:'1px dashed #ddd',paddingTop:6}}>
                {settings.print_footer_text||'Thank you for your business!'}
              </div>
            </div>
          </div>

          <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs text-gray-500">
            <div className="font-medium mb-1">Current Settings</div>
            <div>Paper: {settings.print_paper_size} · Font: {settings.print_font_family} {settings.print_font_size}pt</div>
            <div>Output: {settings.print_default_printer==='pdf'?'PDF':settings.print_default_printer==='browser_print'?'Browser Print':'POS Direct'}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
