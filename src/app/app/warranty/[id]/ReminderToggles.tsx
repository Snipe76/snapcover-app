'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import styles from './warranty.module.css';

interface Props {
  warrantyId: string;
  initialDays: number[];
  reminderTime: string | null;
}

export function ReminderToggles({ warrantyId, initialDays, reminderTime }: Props) {
  const supabase = createClient();
  const [days, setDays]     = useState<number[]>(initialDays ?? []);
  const [newDay, setNewDay] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (updatedDays: number[]) => {
    setSaving(true);
    await supabase
      .from('warranties')
      .update({ notification_days: updatedDays })
      .eq('id', warrantyId);
    setDays(updatedDays);
    setSaving(false);
  };

  const remove = (day: number) => {
    save(days.filter((d) => d !== day));
  };

  const add = () => {
    const raw = newDay.trim();
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0 || n > 365) return;
    if (days.includes(n)) { setNewDay(''); return; }
    save([...days, n].sort((a, b) => b - a));
    setNewDay('');
  };

  return (
    <>
      <div className={styles.reminderList}>
        {days.length === 0 && (
          <p className={styles.noReminders}>No reminders set</p>
        )}
        {[...days].sort((a, b) => b - a).map((day) => (
          <div key={day} className={styles.reminderRow}>
            <span className={styles.reminderChip}>
              {day === 0 ? 'On expiry day' : `${day} day${day !== 1 ? 's' : ''} before`}
            </span>
            <button
              type="button"
              className={styles.reminderRemove}
              onClick={() => remove(day)}
              disabled={saving}
              aria-label={`Remove ${day} day reminder`}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <div className={styles.reminderAdd}>
        <input
          type="number"
          min="0"
          max="365"
          placeholder="Days before expiry"
          value={newDay}
          onChange={(e) => setNewDay(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          className={styles.reminderInput}
          disabled={saving}
        />
        <button type="button" onClick={add} className={styles.reminderAddBtn} disabled={saving || !newDay.trim()}>
          {saving ? '…' : 'Add reminder'}
        </button>
      </div>
    </>
  );
}
