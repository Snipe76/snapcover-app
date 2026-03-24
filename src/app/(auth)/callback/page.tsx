'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();

      // getSession auto-detects PKCE callback and exchanges the code
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[callback] error:', error.message);
        window.location.href = '/login?error=' + encodeURIComponent(error.message);
        return;
      }

      if (session) {
        window.location.href = '/';
      } else {
        // Try one more approach
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          window.location.href = '/';
        } else {
          window.location.href = '/login?error=auth_failed';
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
      <div style={{
        width: 32, height: 32,
        border: '3px solid #d2d2d7',
        borderTopColor: '#007aff',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <p style={{ color: '#6e6e73', fontSize: 15, margin: 0 }}>Signing in…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
