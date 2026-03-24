import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { AppShell } from '@/components/features/AppShell';

// Force dynamic — auth depends on incoming request cookies
export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Explicitly touch cookies to ensure dynamic
  const cookieStore = await cookies();
  cookieStore.getAll();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <AppShell>
      {children}
    </AppShell>
  );
}
