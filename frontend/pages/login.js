import { useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import api from '../lib/api';

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: 'admin@erp.com', password: 'admin1234' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      Cookies.set('token', data.token, { expires: 1 });
      localStorage.setItem('erp_user', JSON.stringify(data.user));
      router.push('/');
    } catch(err) { setError(err.response?.data?.error || 'Login failed. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div style={{fontSize:40,marginBottom:8}}>🔧</div>
          <h1 className="text-2xl font-bold text-gray-900">AMIPARTS ERP</h1>
          <p className="text-sm text-gray-500 mt-1">Auto Parts Management System</p>
        </div>
        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Email Address</label>
              <input className="input" type="email" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full btn-primary py-2.5 rounded-lg text-sm font-medium">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <div>⭐ Super Admin: admin@erp.com</div>
            <div>📍 Branch 1: branch1@erp.com</div>
            <div>📍 Branch 2: branch2@erp.com</div>
            <div className="text-gray-400">Password: admin1234</div>
          </div>
        </div>
      </div>
    </div>
  );
}
