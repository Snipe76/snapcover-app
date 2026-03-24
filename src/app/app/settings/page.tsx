import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SettingsClient } from './SettingsClient';
import styles from './settings.module.css';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  return (
    <div className={styles.container}>
      <SettingsClient userId={user.id} email={user.email ?? ''} />
    </div>
  );
}
