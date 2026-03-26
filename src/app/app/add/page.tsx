'use client';

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractReceiptData } from '@/lib/ocr';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './add.module.css';

type Step = 'idle' | 'processing' | 'saving';
type WizardStep = 1 | 2;

const CATEGORIES = [
  { value: 'Electronics', label: 'Electronics' },
  { value: 'Appliances', label: 'Appliances' },
  { value: 'Tools', label: 'Tools' },
  { value: 'Vehicles', label: 'Vehicles' },
  { value: 'Clothing', label: 'Clothing' },
  { value: 'Home', label: 'Home & Garden' },
  { value: 'Other', label: 'Other' },
];

const DEFAULT_FORM = {
  item_name:       '',
  store_name:      '',
  purchase_date:   '',
  warranty_months: 12,
  notes:           '',
  price_paid:      '',
  order_number:    '',
  serial_number:   '',
  category:        'Other',
  reminder_time:   '09:00',
  notificationDays: [30, 7, 1] as number[],
};

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');

  const [step, setStep]         = useState<Step>('idle');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const [warrantyUnit, setWarrantyUnit] = useState<'months' | 'years'>('months');
  const [hasWarranty, setHasWarranty] = useState(true);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [newDayInput, setNewDayInput] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (source === 'manual') {
      setStep('processing');
      setWizardStep(1);
      // Short delay to show processing state
      setTimeout(() => setStep('idle'), 300);
      return;
    }
    if (source === 'camera' || source === 'library') {
      const stored = sessionStorage.getItem('pending_warranty_image');
      if (stored) {
        sessionStorage.removeItem('pending_warranty_image');
        processImage(stored);
      } else {
        setStep('idle');
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
        ...DEFAULT_FORM,
        item_name:     result.item_name,
        store_name:    result.store_name,
        purchase_date: result.purchase_date,
      });
      setWizardStep(1);
      setStep('idle');
    } catch {
      setForm({ ...DEFAULT_FORM, item_name: '', store_name: '', purchase_date: '' });
      setWizardStep(1);
      setStep('idle');
    }
  };

  const handleSave = async () => {
    // Validate step 1 fields
    if (wizardStep === 1) {
      if (!form.item_name.trim()) { setError('Item name is required'); return; }
      if (!form.store_name.trim()) { setError('Store is required'); return; }
      if (!form.purchase_date) { setError('Purchase date is required'); return; }
      setError(null);
      setWizardStep(2);
      return;
    }

    // Validate step 2
    if (hasWarranty) {
      if (form.warranty_months < 1) { setError('Warranty length must be at least 1'); return; }
    }

    setStep('saving');

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
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
          receiptUrl = urlData.publicUrl;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError('You must be signed in.'); setStep('idle'); return; }

      const priceNum = form.price_paid
        ? parseFloat(form.price_paid.replace(/[^0-9.]/g, ''))
        : null;

      if (!hasWarranty) {
        // ── Receipt only ─────────────────────────────────────────────
        const { error: insertError } = await supabase.from('warranties').insert({
          user_id:       user.id,
          item_name:     form.item_name,
          store_name:    form.store_name,
          purchase_date: form.purchase_date,
          notes:         form.notes || null,
          receipt_url:   receiptUrl,
          price_paid:    priceNum || null,
          order_number:  form.order_number || null,
          serial_number: form.serial_number || null,
          category:      form.category,
          reminder_time: null,
          notification_days: [],
          status:        'active',
          type:          'receipt',
          warranty_months: 0,
          expiry_date:   null,
        });
        if (insertError) { console.error('[add] insert receipt:', insertError); setError(`Failed: ${insertError.message}`); setStep('idle'); return; }
      } else {
        // ── Receipt + Warranty ───────────────────────────────────────
        const totalMonths = warrantyUnit === 'years' ? form.warranty_months * 12 : form.warranty_months;
        const purchaseDate = new Date(form.purchase_date);
        const expiryDate  = new Date(purchaseDate);
        expiryDate.setMonth(expiryDate.getMonth() + totalMonths);
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDateStr);
        expiry.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const status: 'active' | 'expiring' = daysUntil <= 30 ? 'expiring' : 'active';

        const { error: insertError } = await supabase.from('warranties').insert({
          user_id:          user.id,
          item_name:        form.item_name,
          store_name:       form.store_name,
          purchase_date:    form.purchase_date,
          warranty_months:  totalMonths,
          expiry_date:      expiryDateStr,
          notes:            form.notes || null,
          receipt_url:      receiptUrl,
          status,
          notification_days: form.notificationDays,
          price_paid:       priceNum || null,
          order_number:     form.order_number || null,
          serial_number:     form.serial_number || null,
          category:         form.category,
          reminder_time:     form.reminder_time,
          type:             'warranty',
        });
        if (insertError) { console.error('[add] insert warranty:', insertError); setError(`Failed: ${insertError.message}`); setStep('idle'); return; }
      }

      router.push('/app?saved=true');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save. Please try again.');
      setStep('idle');
    }
  };

  const addDay = () => {
    const raw = newDayInput.trim();
    if (!raw) return;
    const n = parseInt(raw, 10);
    if (isNaN(n) || n < 0 || n > 365) return;
    if (form.notificationDays.includes(n)) { setNewDayInput(''); return; }
    setForm((f) => ({
      ...f,
      notificationDays: [...f.notificationDays, n].sort((a, b) => b - a),
    }));
    setNewDayInput('');
  };

  // Compute expiry preview
  const expiryPreview = hasWarranty && form.purchase_date && form.warranty_months > 0
    ? (() => {
        const d = new Date(form.purchase_date);
        const total = warrantyUnit === 'years' ? form.warranty_months * 12 : form.warranty_months;
        d.setMonth(d.getMonth() + total);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      })()
    : null;

  if (step === 'idle' && wizardStep === 1 && !imageDataUrl && source !== 'camera' && source !== 'library') {
    return (
      <div className={styles.processing}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.processingText}>Opening camera…</p>
      </div>
    );
  }

  if (step === 'processing') {
    return (
      <div className={styles.processing}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.processingText}>Reading your receipt…</p>
        <p className={styles.processingSubtext}>Usually takes 3–5 seconds</p>
      </div>
    );
  }

  if (step === 'saving' || step === 'idle') {
    const isSaving = step === 'saving';

    return (
      <div className={styles.confirm}>
        {/* Wizard header */}
        <div className={styles.wizardHeader}>
          <h2 className={styles.wizardTitle}>
            {wizardStep === 1 ? 'Receipt details' : 'Warranty & alerts'}
          </h2>
          <div className={styles.wizardSteps} aria-label="Progress">
            <span className={`${styles.wizardDot} ${wizardStep === 1 ? styles.wizardDotActive : ''}`} />
            <span className={styles.wizardLine} />
            <span className={`${styles.wizardDot} ${wizardStep === 2 ? styles.wizardDotActive : ''}`} />
          </div>
        </div>

        {/* Receipt preview thumbnail */}
        {imageDataUrl && (
          <div className={styles.receiptPreview}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageDataUrl} alt="Captured receipt" className={styles.receiptThumb} />
          </div>
        )}

        <div className={styles.form}>
          {wizardStep === 1 ? (
            <>
              {/* Item name */}
              <div className={styles.field}>
                <label htmlFor="item_name" className={styles.label}>
                  Item name <span className={styles.required}>*</span>
                </label>
                <input
                  id="item_name"
                  type="text"
                  value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. MacBook Pro 14-inch"
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Store */}
              <div className={styles.field}>
                <label htmlFor="store_name" className={styles.label}>
                  Store <span className={styles.required}>*</span>
                </label>
                <input
                  id="store_name"
                  type="text"
                  value={form.store_name}
                  onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
                  placeholder="e.g. Apple Store"
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Category */}
              <div className={styles.field}>
                <label htmlFor="category" className={styles.label}>Category</label>
                <select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={styles.input}
                  disabled={isSaving}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Purchase date */}
              <div className={styles.field}>
                <label htmlFor="purchase_date" className={styles.label}>
                  Purchase date <span className={styles.required}>*</span>
                </label>
                <input
                  id="purchase_date"
                  type="date"
                  value={form.purchase_date}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Price */}
              <div className={styles.field}>
                <label htmlFor="price_paid" className={styles.label}>
                  Price paid <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="price_paid"
                  type="text"
                  inputMode="decimal"
                  value={form.price_paid}
                  onChange={(e) => setForm((f) => ({ ...f, price_paid: e.target.value }))}
                  placeholder="e.g. 1299.00"
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Order number */}
              <div className={styles.field}>
                <label htmlFor="order_number" className={styles.label}>
                  Order / receipt number <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="order_number"
                  type="text"
                  value={form.order_number}
                  onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))}
                  placeholder="e.g. ORD-20240315-001"
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Serial number */}
              <div className={styles.field}>
                <label htmlFor="serial_number" className={styles.label}>
                  Serial / model number <span className={styles.optional}>(optional)</span>
                </label>
                <input
                  id="serial_number"
                  type="text"
                  value={form.serial_number}
                  onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                  placeholder="e.g. SN123456789"
                  className={styles.input}
                  disabled={isSaving}
                />
              </div>

              {/* Warranty toggle */}
              <div className={styles.field}>
                <label className={styles.label}>Includes warranty?</label>
                <div className={styles.warrantyCustom}>
                  <div className={styles.warrantyCustom}>
                    <button
                      type="button"
                      className={`${styles.warrantyToggleBtn} ${hasWarranty ? styles.warrantyToggleBtnActive : ''}`}
                      onClick={() => setHasWarranty(true)}
                      disabled={isSaving}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={`${styles.warrantyToggleBtn} ${!hasWarranty ? styles.warrantyToggleBtnActive : ''}`}
                      onClick={() => setHasWarranty(false)}
                      disabled={isSaving}
                    >
                      No
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Warranty length — only if hasWarranty */}
              {hasWarranty && (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>Warranty length <span className={styles.required}>*</span></label>
                    <div className={styles.warrantyCustom}>
                      <input
                        type="number"
                        min="1"
                        max="120"
                        value={form.warranty_months}
                        onChange={(e) => setForm((f) => ({ ...f, warranty_months: parseInt(e.target.value) || 1 }))}
                        className={`${styles.input} ${styles.warrantyNum}`}
                        disabled={isSaving}
                        aria-label="Warranty duration number"
                      />
                      <div className={styles.unitToggle} role="group" aria-label="Warranty unit">
                        {(['months', 'years'] as const).map((u) => (
                          <button
                            key={u}
                            type="button"
                            onClick={() => setWarrantyUnit(u)}
                            className={`${styles.unitBtn} ${warrantyUnit === u ? styles.unitBtnActive : ''}`}
                            disabled={isSaving}
                            aria-pressed={warrantyUnit === u}
                          >
                            {u}
                          </button>
                        ))}
                      </div>
                    </div>
                    {expiryPreview && (
                      <p className={styles.expiryPreview}>
                        Expires <strong>{expiryPreview}</strong>
                      </p>
                    )}
                  </div>

                  {/* Reminder time */}
                  <div className={styles.field}>
                    <label htmlFor="reminder_time" className={styles.label}>
                      Reminder time <span className={styles.optional}>(optional)</span>
                    </label>
                    <input
                      id="reminder_time"
                      type="time"
                      value={form.reminder_time}
                      onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value }))}
                      className={styles.input}
                      disabled={isSaving}
                    />
                  </div>

                  {/* Notification days */}
                  <div className={styles.field}>
                    <p className={styles.label}>Remind me before expiry</p>
                    <div className={styles.notifyCard}>
                      {form.notificationDays.length === 0 && (
                        <p className={styles.notifyEmpty}>No reminders. Add one below.</p>
                      )}
                      {form.notificationDays.slice().sort((a, b) => b - a).map((days) => (
                        <div key={days} className={styles.notifyRow}>
                          <span className={styles.notifyLabel}>
                            {days === 0 ? 'On expiry day' : `${days}d before`}
                          </span>
                          <button
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, notificationDays: f.notificationDays.filter((d) => d !== days) }))}
                            className={styles.notifyRemove}
                            aria-label={`Remove ${days}d reminder`}
                            disabled={isSaving}
                          >
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div className={styles.notifyAddRow}>
                        <input
                          type="number"
                          min="0"
                          max="365"
                          placeholder="Days before expiry"
                          value={newDayInput}
                          onChange={(e) => setNewDayInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDay(); } }}
                          className={styles.notifyAddInput}
                          disabled={isSaving}
                        />
                        <button type="button" onClick={addDay} className={styles.notifyAddBtn} disabled={isSaving || !newDayInput.trim()}>
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes — always shown */}
              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>
                  Notes <span className={styles.optional}>(optional)</span>
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Extended warranty info, gift recipient…"
                  className={styles.textarea}
                  rows={3}
                  disabled={isSaving}
                />
              </div>
            </>
          )}

          {error && (
            <div role="alert" className={styles.errorBanner}>{error}</div>
          )}
        </div>

        {/* Form actions */}
        <div className={styles.formActions}>
          {wizardStep === 2 && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setWizardStep(1)}
              disabled={isSaving}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className={hasWarranty && wizardStep === 1 ? styles.btnPrimary : styles.btnPrimary}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : wizardStep === 1 ? (hasWarranty ? 'Next: Warranty →' : 'Save receipt') : 'Save'}
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
