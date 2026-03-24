'use client';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function ConfirmPage() {
  useEffect(() => {
    const params = new URL(window.location.href);
    const token = params.searchParams.get('token');
    const email = params.searchParams.get('email');

    if (token && email) {
      // Magic link confirmation — exchange for session
      createClient().auth.verifyOtp({ email, token, type: 'email' }).then(({ error }) => {
        if (!error) {
          window.location.href = '/';
        } else {
          window.location.href = '/login?error=' + encodeURIComponent(error.message);
        }
      });
    } else {
      window.location.href = '/login';
    }
  }, []);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', fontFamily: 'system-ui, sans-serif', color: '#6e6e73' }}>
      Signing you in…
    </div>
  );
}
