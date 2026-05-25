import '../styles/globals.css';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Cookies from 'js-cookie';
import Layout from '../components/layout/Layout';

const PUBLIC_PAGES = ['/login'];

export default function App({ Component, pageProps }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = Cookies.get('token');
    if (!token && !PUBLIC_PAGES.includes(router.pathname)) {
      router.replace('/login');
    } else {
      setReady(true);
    }
  }, [router.pathname]);

  if (!ready) return null;
  if (PUBLIC_PAGES.includes(router.pathname)) return <Component {...pageProps} />;
  return <Layout><Component {...pageProps} /></Layout>;
}
