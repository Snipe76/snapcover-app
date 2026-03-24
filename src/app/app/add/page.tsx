'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractReceiptData } from '@/lib/ocr';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './add.module.css';

const WarrantySchema = z.object({
  item_name:       z.string().min(1, 'Item name is required'),
  store_name:      z.string().min(1, 'Store name is required'),
  purchase_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  warranty_months: z.number().min(1).max(120),
  notes:           z.string().optional(),
});

type Step = 'idle' | 'processing' | 'confirm' | 'saving';

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');

  const [step, setStep] = useState<Step>('idle');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_name:       '',
    store_name:      '',
    purchase_date:   '',
    warranty_months: 12,
    notes:           '',
    notify_30_days:   true,
    notify_7_days:    true,
    notify_1_day:     true,
    notify_expired:   true,
  });
  const supabase = createClient();

  useEffect(() => {
    if (source === 'manual') {
      setStep('confirm');
      return;
    }

    if (source === 'camera' || source === 'library') {
      const stored = sessionStorage.getItem('pending_warranty_image');
      if (stored) {
        sessionStorage.removeItem('pending_warranty_image');
        processImage(stored);
      } else {
        setStep('confirm');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  const processImage = async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setStep('processing');
    setError(null);

    try {
      const result = await extractReceiptData(dataUrl);
      setForm({
        item_name:       result.item_name,
        store_name:      result.store_name,
        purchase_date:   result.purchase_date,
        warranty_months: 12,
        notes:           '',
        notify_30_days:  true,
        notify_7_days:  true,
        notify_1_day:   true,
        notify_expired:  true,
      });
      setStep('confirm');
    } catch {
      setForm((f) => ({ ...f, item_name: '', store_name: '', purchase_date: '' }));
      setStep('confirm');
    }
  };

  const handleSave = async () => {
    setStep('saving');
    setError(null);

    const parsed = WarrantySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setStep('confirm');
      return;
    }

    try {
      let receiptUrl: string | null = null;
      if (imageDataUrl) {
        const filename = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filename, blob, { contentType: 'image/jpeg' });

        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('receipts')
            .getPublicUrl(uploadData.path);
          receiptUrl = urlData.publicUrl;
        }
      }

      const purchaseDate = new Date(form.purchase_date);
      const expiryDate   = new Date(purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + form.warranty_months);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDateStr);
      expiry.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const status: 'active' | 'expiring' = daysUntil <= 30 ? 'expiring' : 'active';

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError('You must be signed in to add a warranty.');
        setStep('confirm');
        return;
      }

      const { error: insertError } = await supabase.from('warranties').insert({
        user_id:         user.id,
        item_name:       form.item_name,
        store_name:      form.store_name,
        purchase_date:   form.purchase_date,
        warranty_months:  form.warranty_months,
        expiry_date:     expiryDateStr,
        notes:           form.notes || null,
        receipt_url:     receiptUrl,
        status,
        notify_30_days:  form.notify_30_days,
        notify_7_days:   form.notify_7_days,
        notify_1_day:    form.notify_1_day,
        notify_expired:  form.notify_expired,
      });

      if (insertError) {
        console.error('[add] insert error:', insertError);
        setError(`Failed to save: ${insertError.message}`);
        setStep('confirm');
        return;
      }

      router.push('/app?saved=true');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save warranty. Please try again.');
      setStep('confirm');
    }
  };

  if (step === 'idle') {
    return (
      <div className={styles.idle}>
        <p>Opening camera…</p>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className={styles.processing}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.processingText}>Reading your receipt…</p>
        <p className={styles.processingSubtext}>This usually takes 3–5 seconds</p>
      </div>
    );
  }

  if (step === 'confirm' || step === 'saving') {
    const isSaving = step === 'saving';
    const expiryDate = form.purchase_date
      ? (() => {
          const d = new Date(form.purchase_date);
          d.setMonth(d.getMonth() + form.warranty_months);
          return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        })()
      : null;

    return (
      <div className={styles.confirm}>
        <h2 className={styles.confirmTitle}>Confirm details</h2>
        <p className={styles.confirmSubtitle}>
          We extracted what we could. Correct anything that looks wrong.
        </p>

        <div className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="item_name" className={styles.label}>Item name *</label>
            <input
              id="item_name"
              type="text"
              value={form.item_name}
              onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
              placeholder="e.g. MacBook Pro 14-inch"
              className={styles.input}
              required
              aria-required="true"
              disabled={isSaving}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="store_name" className={styles.label}>Store *</label>
            <input
              id="store_name"
              type="text"
              value={form.store_name}
              onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
              placeholder="e.g. Apple Store"
              className={styles.input}
              required
              aria-required="true"
              disabled={isSaving}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="purchase_date" className={styles.label}>Purchase date *</label>
            <input
              id="purchase_date"
              type="date"
              value={form.purchase_date}
              onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
              className={styles.input}
              required
              aria-required="true"
              disabled={isSaving}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Warranty length *</label>
            <div className={styles.segmented} role="group" aria-label="Warranty length">
              {[6, 12, 24, 36].map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, warranty_months: months }))}
                  className={`${styles.segment} ${form.warranty_months === months ? styles.segmentActive : ''}`}
                  disabled={isSaving}
                  aria-pressed={form.warranty_months === months}
                >
                  {months < 12 ? `${months}mo` : `${months / 12}yr`}
                </button>
              ))}
            </div>
          </div>

          {expiryDate && (
            <p className={styles.expiryPreview}>
              Expires: <strong>{expiryDate}</strong>
            </p>
          )}

          {/* Notification preferences */}
          <div className={styles.field}>
            <p className={styles.label}>When to remind me</p>
            <div className={styles.notifyCard}>
              {[
                { key: 'notify_30_days',  label: '30 days before expiry' },
                { key: 'notify_7_days',  label: '7 days before expiry'  },
                { key: 'notify_1_day',    label: '1 day before expiry'    },
                { key: 'notify_expired',  label: 'On expiry day'          },
              ].map(({ key, label }) => (
                <div key={key} className={styles.notifyRow}>
                  <span className={styles.notifyLabel}>{label}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form[key as keyof typeof form] as boolean}
                    className={`${styles.toggle} ${form[key as keyof typeof form] ? styles.toggleOn : ''}`}
                    onClick={() => setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                    disabled={isSaving}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>
              Notes <span className={styles.optional}>(optional)</span>
            </label>
            <textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Serial number, model, extended warranty info…"
              className={styles.textarea}
              rows={3}
              disabled={isSaving}
            />
          </div>

          {imageDataUrl && (
            <div className={styles.receiptPreview}>
              <p className={styles.label}>Receipt photo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageDataUrl} alt="Captured receipt" className={styles.receiptThumb} />
            </div>
          )}

          {error && (
            <div className={styles.errorBanner} role="alert">
              {error}
            </div>
          )}
        </div>

        <div className={styles.formActions}>
          <button
            className={styles.btnSecondary}
            onClick={() => router.push('/app')}
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            className={styles.btnPrimary}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save warranty'}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddPageInner />
    </Suspense>
  );
}
