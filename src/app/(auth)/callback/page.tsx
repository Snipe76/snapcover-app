'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const [debug, setDebug] = useState<{ ts: string; msg: string }[]>([]);

  const log = (msg: string) => setDebug((d) => [...d, { ts: new Date().toISOString(), msg }]);

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();
      const params = new URL(window.location.href);

      // Log all URL params
      log(`URL: ${window.location.href}`);
      log(`Search params: ${params.searchParams.toString()}`);

      const code = params.searchParams.get('code');
      const token = params.searchParams.get('token');
      const error = params.searchParams.get('error');
      const errorDesc = params.searchParams.get('error_description');

      log(`code: ${code ? 'present (' + code.slice(0, 20) + '...)' : 'ABSENT'}`);
      log(`token: ${token ? 'present' : 'ABSENT'}`);
      log(`error: ${error}, desc: ${errorDesc}`);

      if (error) {
        log(`Auth error from Supabase: ${error} - ${errorDesc}`);
        setDebug((d) => [...d, { ts: new Date().toISOString(), msg: 'Redirecting to login...' }]);
        setTimeout(() => { window.location.href = `/login?error=${encodeURIComponent(error + ': ' + (errorDesc || ''))}`; }, 2000);
        return;
      }

      if (!code && !token) {
        log('No code or token in URL - trying getSession anyway');
      }

      // Log cookies
      log(`Cookies: ${document.cookie.slice(0, 200)}`);

      // Attempt getSession
      log('Calling getSession...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      log(`getSession result: session=${!!session}, error=${!!sessionError}`);
      if (sessionError) log(`getSession error: ${sessionError.message} (${sessionError.code})`);
      if (session) log(`Session user: ${session.user.id}`);

      if (session) {
        setDebug((d) => [...d, { ts: new Date().toISOString(), msg: 'SUCCESS - redirecting to home!' }]);
        setTimeout(() => { window.location.href = '/'; }, 500);
      } else {
        log('No session - trying getUser...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        log(`getUser result: user=${!!user}, error=${!!userError}`);
        if (userError) log(`getUser error: ${userError.message}`);
        if (user) {
          setDebug((d) => [...d, { ts: new Date().toISOString(), msg: 'SUCCESS via getUser - redirecting!' }]);
          setTimeout(() => { window.location.href = '/'; }, 500);
        } else {
          setDebug((d) => [...d, { ts: new Date().toISOString(), msg: 'FAILED - redirecting to login' }]);
          setTimeout(() => { window.location.href = '/login?error=auth_failed'; }, 2000);
        }
      }
    }

    handleCallback();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100dvh',
      fontFamily: '-apple-system, system-ui, sans-serif',
      background: '#f5f5f7',
      padding: '24px',
      gap: '12px',
    }}>
      <h2 style={{ color: '#1D1D1F', margin: 0, fontSize: 20 }}>Auth Debug</h2>
      <div style={{
        background: '#fff',
        border: '1px solid #d2d2d7',
        borderRadius: 12,
        padding: '16px',
        width: '100%',
        maxWidth: 480,
        fontFamily: 'ui-monospace, monospace',
        fontSize: 12,
        color: '#333',
      }}>
        {debug.map((d, i) => (
          <div key={i} style={{ marginBottom: 6 }}>
            <span style={{ color: '#6e6e73' }}>{d.ts.slice(11, 23)}</span>{' '}
            {d.msg}
          </div>
        ))}
        {debug.length === 0 && <div style={{ color: '#6e6e73' }}>Loading...</div>}
      </div>
    </div>
  );
}
