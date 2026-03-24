'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function CallbackPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleCallback() {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[callback] error:', error.message);
        router.push('/login?error=' + encodeURIComponent(error.message));
        return;
      }

      if (session) {
        router.push('/app');
      } else {
        router.push('/login?error=auth_failed');
      }
    }

    handleCallback();
  }, [router]);

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
