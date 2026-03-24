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
      <h2 className={styles.title}>Settings</h2>

      <section className={styles.section} aria-labelledby="account-heading">
        <h3 id="account-heading" className={styles.sectionTitle}>Account</h3>
        <div className={styles.card}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>Email</span>
            <span className={styles.rowValue}>{user.email}</span>
          </div>
        </div>
      </section>

      <SettingsClient userId={user.id} />
    </div>
  );
}
