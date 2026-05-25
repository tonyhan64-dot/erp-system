import Link from 'next/link';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Cookies from 'js-cookie';

const NAV_SUPER_ADMIN = [
  { section:'MAIN', items:[{ href:'/', icon:'▦', label:'Dashboard' }]},
  { section:'BRANCHES', items:[{ href:'/branches', icon:'🏢', label:'Branches' }]},
  { section:'TRANSACTIONS', items:[
    { href:'/sales', icon:'🧾', label:'Sales' },
    { href:'/purchases', icon:'🛒', label:'Purchases' },
    { href:'/quotations', icon:'📋', label:'Quotations' },
    { href:'/invoices', icon:'📄', label:'Invoices' },
    { href:'/payments', icon:'💳', label:'Payments' },
  ]},
  { section:'STOCK', items:[
    { href:'/inventory', icon:'📦', label:'Inventory' },
    { href:'/products', icon:'🔧', label:'Products' },
    { href:'/categories', icon:'🗂', label:'Categories' },
  ]},
  { section:'FINANCE', items:[
    { href:'/accounting', icon:'📒', label:'Accounting' },
    { href:'/expenses', icon:'💸', label:'Expenses' },
  ]},
  { section:'CRM', items:[
    { href:'/customers', icon:'👥', label:'Customers' },
    { href:'/suppliers', icon:'🚚', label:'Suppliers' },
  ]},
  { section:'ADMIN', items:[
    { href:'/reports', icon:'📊', label:'Reports' },
    { href:'/permissions', icon:'🔐', label:'User Permissions' },
    { href:'/print-settings', icon:'🖨', label:'Print Settings' },
    { href:'/system-config', icon:'⚙️', label:'System Config' },
  ]},
];

const NAV_BRANCH = [
  { section:'MAIN', items:[{ href:'/', icon:'▦', label:'Dashboard' }]},
  { section:'TRANSACTIONS', items:[
    { href:'/sales', icon:'🧾', label:'Sales' },
    { href:'/purchases', icon:'🛒', label:'Purchases' },
    { href:'/quotations', icon:'📋', label:'Quotations' },
  ]},
  { section:'STOCK', items:[
    { href:'/inventory', icon:'📦', label:'Inventory' },
  ]},
  { section:'CRM', items:[
    { href:'/customers', icon:'👥', label:'Customers' },
  ]},
  { section:'REPORTS', items:[
    { href:'/reports', icon:'📊', label:'Reports' },
  ]},
];

export default function Layout({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [pendingQuotes, setPendingQuotes] = useState(0);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('erp_user')||'null');
    setUser(u);
    // Load pending quotation count
    import('../../lib/api').then(({ default: api }) => {
      api.get('/quotations').then(r => {
        const data = r.data.data||r.data||[];
        setPendingQuotes(data.filter(q=>q.status==='Draft'||q.status==='Sent').length);
      }).catch(()=>{});
    });
  }, [router.pathname]);

  const logout = () => {
    Cookies.remove('token');
    localStorage.removeItem('erp_user');
    router.push('/login');
  };

  const isSuperAdmin = user?.role === 'Super Admin';
  const NAV = isSuperAdmin ? NAV_SUPER_ADMIN : NAV_BRANCH;
  const currentLabel = NAV.flatMap(g=>g.items).find(i=>i.href===router.pathname)?.label || 'ERP';

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className="w-52 bg-white border-r border-gray-200 flex flex-col">
        {/* Logo */}
        <div className="px-4 py-3 border-b border-gray-100" style={{background:'#185FA5'}}>
          <div className="font-bold text-white flex items-center gap-2">
            <span style={{fontSize:18}}>🔧</span>
            <div>
              <div style={{fontSize:13,lineHeight:1}}>AMIPARTS</div>
              <div style={{fontSize:9,opacity:0.8,letterSpacing:1}}>AUTO PARTS ERP</div>
            </div>
          </div>
          {user && (
            <div className="mt-2 px-2 py-1 rounded text-xs"
              style={{background:'rgba(255,255,255,0.15)',color:'white'}}>
              {isSuperAdmin ? '⭐ Super Admin' : `📍 ${user.branchName||'Branch'}`}
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          {NAV.map(group => (
            <div key={group.section}>
              <div className="px-4 py-1.5 font-semibold tracking-widest" style={{color:'#9ca3af',fontSize:9}}>
                {group.section}
              </div>
              {group.items.map(item => {
                const active = router.pathname === item.href;
                return (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-4 py-2 text-sm transition-all ${
                      active ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600' : 'text-gray-600 hover:bg-gray-50'
                    }`}>
                    <span style={{fontSize:14}}>{item.icon}</span>
                    <span style={{fontSize:12}}>{item.label}</span>
                    {/* Pending quotations badge */}
                    {item.href === '/quotations' && pendingQuotes > 0 && (
                      <span style={{marginLeft:'auto',background:'#EF9F27',color:'white',fontSize:9,padding:'1px 5px',borderRadius:10,fontWeight:600}}>
                        {pendingQuotes}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
              <div style={{width:28,height:28,borderRadius:'50%',background:'#185FA5',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,flexShrink:0}}>
                {user.name?.[0]||'?'}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-700">{user.name}</div>
                <div style={{fontSize:9,color:'#9ca3af'}}>{user.email}</div>
              </div>
            </div>
          )}
          <button onClick={logout}
            className="w-full text-left px-2 py-1.5 text-xs text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
            🚪 Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="text-sm font-medium text-gray-700">{currentLabel}</div>
          <div className="flex items-center gap-3">
            {user?.branchName && !isSuperAdmin && (
              <span className="text-xs px-2 py-1 rounded-md font-medium" style={{background:'#E1F5EE',color:'#085041'}}>
                📍 {user.branchName}
              </span>
            )}
            <div className="text-xs text-gray-400">{new Date().toLocaleDateString('en-ZA')}</div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
