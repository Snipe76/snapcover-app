'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    async function exchangeCode() {
      const supabase = createClient();
      
      // getSession auto-exchanges the PKCE token from the URL
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[callback] Auth error:', error.message);
        setErrorMessage(error.message);
        setStatus('error');
        // Redirect to login after short delay
        setTimeout(() => {
          window.location.href = `/login?error=${encodeURIComponent(error.message)}`;
        }, 2000);
        return;
      }

      if (session) {
        console.log('[callback] Session obtained, user:', session.user.id);
        setStatus('success');
        // Redirect to home
        setTimeout(() => {
          window.location.href = '/';
        }, 500);
      } else {
        // No session and no error — might be a token without a session yet
        setErrorMessage('No session returned');
        setStatus('error');
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
        <p style={{ color: '#ff3b30', fontSize: 15, margin: 0 }}>
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
