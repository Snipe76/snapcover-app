import styles from './ExpiryBadge.module.css';
import type { WarrantyStatus } from '@/lib/db/types';

interface Props {
  expiryDate: string;
  status: WarrantyStatus;
}

export function ExpiryBadge({ expiryDate, status }: Props) {
  const { text, variant } = getBadgeContent(expiryDate, status);

  return (
    <span
      className={`${styles.badge} ${styles[variant]}`}
      aria-label={`Status: ${text}`}
    >
      {text}
    </span>
  );
}

function getBadgeContent(expiryDate: string, _status: WarrantyStatus): {
  text: string;
  variant: 'active' | 'expiring' | 'expired';
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  const diff = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Always derive status from actual date — don't trust the DB field
  if (diff < 0) {
    if (diff === -1) return { text: 'Expired yesterday', variant: 'expired' };
    return { text: `Expired ${Math.abs(diff)}d ago`, variant: 'expired' };
  }

  if (diff === 0)  return { text: 'Expires today',  variant: 'expired'  };
  if (diff === 1)  return { text: 'Tomorrow',      variant: 'expiring' };
  if (diff <= 7)   return { text: `${diff} days`,   variant: 'expiring' };
  if (diff <= 30)  return { text: `${diff} days`,   variant: 'expiring' };
  if (diff <= 90)  return { text: `${diff} days`,   variant: 'active'   };

  const months = Math.round(diff / 30);
  return { text: `${months}mo left`, variant: 'active' };
}
