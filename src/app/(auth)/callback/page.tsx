'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function exchangeCode() {
      // Clear any stale auth cookies from previous flows
      document.cookie = 'sb-access-token=; path=/; max-age=0';
      document.cookie = 'sb-refresh-token=; path=/; max-age=0';

      const supabase = createClient();
      const params = new URL(window.location.href);

      // Get the code from URL params (PKCE flow from Supabase magic link)
      const code = params.searchParams.get('code');

      if (!code) {
        // No code in URL — try getSession which may auto-detect the session
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('[callback] getSession error:', error.message);
          setErrorMessage(error.message);
          setStatus('error');
          setTimeout(() => {
            window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
          }, 2000);
          return;
        }
        if (session) {
          console.log('[callback] Session from getSession:', session.user.id);
          setStatus('success');
          setTimeout(() => { window.location.href = '/'; }, 500);
        } else {
          setErrorMessage('No session found');
          setStatus('error');
          setTimeout(() => { window.location.href = '/login?error=no_session'; }, 2000);
        }
        return;
      }

      // We have a code — this is PKCE callback. Explicitly exchange it.
      console.log('[callback] Exchanging PKCE code:', code.slice(0, 20) + '...');
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('[callback] exchangeCodeForSession error:', error.message, error.code);
        setErrorMessage(error.message);
        setStatus('error');
        setTimeout(() => {
          window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
        }, 2000);
        return;
      }

      if (data.session) {
        console.log('[callback] Session created via exchange:', data.session.user.id);
        setStatus('success');
        setTimeout(() => { window.location.href = '/'; }, 500);
      } else {
        setErrorMessage('No session returned after code exchange');
        setStatus('error');
        setTimeout(() => { window.location.href = '/login?error=no_session'; }, 2000);
      }
    }

    exchangeCode();
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100dvh',
      fontFamily: '-apple-system, system-ui, sans-serif',
      background: '#f5f5f7',
      gap: '16px',
    }}>
      {status === 'loading' && (
        <>
          <div style={{
            width: 32, height: 32,
            border: '3px solid #d2d2d7',
            borderTopColor: '#007aff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <p style={{ color: '#6e6e73', fontSize: 15, margin: 0 }}>Signing in…</p>
        </>
      )}
      {status === 'error' && (
        <p style={{ color: '#ff3b30', fontSize: 15, margin: 0, textAlign: 'center', maxWidth: 280, padding: '0 24px' }}>
          Sign-in failed: {errorMessage}
        </p>
      )}
      {status === 'success' && (
        <p style={{ color: '#34c759', fontSize: 15, margin: 0 }}>Signed in! Redirecting…</p>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
