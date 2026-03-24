'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  useEffect(() => {
    const params = new URL(window.location.href);

    // Extract token from hash (Supabase magic link format)
    const hash = params.hash.substring(1); // remove leading #
    const hashParams = new URLSearchParams(hash);
    const token = hashParams.get('access_token');
    const type = hashParams.get('type');
    const email = params.searchParams.get('email') || hashParams.get('email');

    // Fallback: check search params (PKCE format)
    const searchToken = params.searchParams.get('token');
    const searchType = params.searchParams.get('type');

    const finalToken = token || searchToken;
    const finalType = type || searchType;

    async function handleCallback() {
      const supabase = createClient();

      if (finalToken && finalType === 'magiclink' && email) {
        // Magic link with token in URL — use verifyOtp
        const { error } = await supabase.auth.verifyOtp({
          email,
          token: finalToken,
          type: 'magiclink',
        });

        if (error) {
          console.error('[callback] verifyOtp error:', error.message);
          window.location.href = '/login?error=' + encodeURIComponent(error.message);
        } else {
          window.location.href = '/';
        }
        return;
      }

      // Standard PKCE exchange via getSession
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[callback] getSession error:', sessionError.message);
        window.location.href = '/login?error=' + encodeURIComponent(sessionError.message);
        return;
      }

      if (session) {
        window.location.href = '/';
      } else {
        // Try getUser as fallback
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          window.location.href = '/login?error=auth_failed';
        } else {
          window.location.href = '/';
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
