import { createClient } from '@/lib/supabase/server';
import { WarrantyList } from '@/components/features/WarrantyList';
import { redirect } from 'next/navigation';
import type { Warranty } from '@/lib/db/types';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

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
