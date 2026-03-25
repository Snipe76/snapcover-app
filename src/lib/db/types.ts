export type WarrantyStatus = 'active' | 'expiring' | 'expired' | 'archived';
export type ItemType = 'warranty' | 'receipt';

export interface Warranty {
  id: string;
  user_id: string;
  item_name: string;
  store_name: string;
  purchase_date: string; // ISO date string YYYY-MM-DD
  warranty_months: number;
  expiry_date: string;  // ISO date string YYYY-MM-DD
  notes: string | null;
  receipt_url: string | null;
  status: WarrantyStatus;
  created_at: string;
  updated_at: string;
  // New fields
  price_paid: number | null;
  order_number: string | null;
  serial_number: string | null;
  category: string;
  reminder_time: string;
  notification_days: number[];
  type: ItemType;
  sort_order?: number;
  sort_by?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  warranty_id: string;
  type: 'expiry_30' | 'expiry_7' | 'expiry_1' | 'expired';
  sent_at: string;
  channel: 'push' | 'email';
  read_at: string | null;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
}
