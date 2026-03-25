'use client';

import { useState, useEffect } from 'react';
import styles from './ExpiryBadge.module.css';
import type { WarrantyStatus } from '@/lib/db/types';

interface Props {
  expiryDate: string;
  status: WarrantyStatus;
}

export function ExpiryBadge({ expiryDate, status }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { text, variant } = mounted
    ? getBadgeContent(expiryDate, status)
    : { text: status === 'expired' ? 'Expired' : status === 'expiring' ? 'Expiring' : 'Active', variant: status };

  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      aria-label={`Status: ${text}`}
      suppressHydrationWarning
    >
      {text}
    </span>
  );
}

function getBadgeContent(expiryDate: string, status: WarrantyStatus): {
  text: string;
  variant: 'urgent' | 'expiring' | 'active' | 'expired';
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Expired — gray
  if (diff < 0) {
    if (diff === -1) return { text: 'Expired yesterday', variant: 'expired' };
    return { text: `Expired ${Math.abs(diff)}d ago`, variant: 'expired' };
  }

  // 0–7 days — red
  if (diff === 0)  return { text: 'Expires today',  variant: 'urgent' };
  if (diff <= 7)   return { text: `${diff}d left`,  variant: 'urgent' };

  // 8–30 days — orange
  if (diff <= 30)  return { text: `${diff}d left`,  variant: 'expiring' };

  // 30+ days — green
  if (diff <= 365) return { text: `${diff}d left`,  variant: 'active'   };

  const months = Math.round(diff / 30);
  return { text: `${months}mo left`, variant: 'active' };
}
