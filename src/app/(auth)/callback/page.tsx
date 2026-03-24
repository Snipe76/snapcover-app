'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      // Attempt to get the session — Supabase auto-detects PKCE callback from URL
      // and exchanges the code for a session if present
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[callback] getSession error:', error.message, error.code);
        setErrorMessage(error.message);
        setStatus('error');
        setTimeout(() => {
          window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
        }, 2000);
        return;
      }

      if (session) {
        console.log('[callback] Session found, user:', session.user.id);
        setStatus('success');
        setTimeout(() => { window.location.href = '/'; }, 500);
      } else {
        // No session — try getUser which forces a server check
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('[callback] getUser error:', userError.message);
          setErrorMessage(userError.message);
          setStatus('error');
          setTimeout(() => {
            window.location.href = `/login?error=${encodeURIComponent(userError.message)}`;
          }, 2000);
          return;
        }
        if (user) {
          console.log('[callback] User found via getUser:', user.id);
          setStatus('success');
          setTimeout(() => { window.location.href = '/'; }, 500);
        } else {
          setErrorMessage('Authentication did not create a session');
          setStatus('error');
          setTimeout(() => { window.location.href = '/login?error=no_session'; }, 2000);
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
