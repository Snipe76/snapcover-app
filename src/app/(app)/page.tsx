import { createClient } from '@/lib/supabase/server';
import { WarrantyList } from '@/components/features/WarrantyList';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import type { Warranty } from '@/lib/db/types';

// Force dynamic rendering so auth cookies are always read
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createClient();
  
  // Try getSession first (reads cookie directly, no JWT validation)
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  console.log('[home] getSession:', !!session, 'error:', sessionError?.message);
  
  // getUser() makes an API call to validate the JWT
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  console.log('[home] getUser:', !!user, 'error:', userError?.message);

  if (!user) {
    console.log('[home] No user, redirecting to /login');
    redirect('/login');
  }

  const { data: warranties } = await supabase
    .from('warranties')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('expiry_date', { ascending: true });

  return (
    <div style={{ maxWidth: 'var(--content-max)', margin: '0 auto', padding: 'var(--space-4)' }}>
      <WarrantyList
        initialWarranties={(warranties ?? []) as Warranty[]}
        userId={user.id}
      />
    </div>
  );
}
