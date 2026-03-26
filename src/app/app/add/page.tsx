'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractReceiptData } from '@/lib/ocr';
import { useRouter, useSearchParams } from 'next/navigation';
import { logger, addBreadcrumb, withPerformance, logSupabaseError } from '@/lib/logger';
import { ErrorBoundary } from '@/components/ErrorBoundary';
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

type WarrantyUnit = 'days' | 'months' | 'years';

function AddPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');
  const formRef = useRef<HTMLDivElement>(null);

  const [step, setStep]         = useState<Step>('idle');
  const [wizardStep, setWizardStep] = useState<WizardStep>(1);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [warrantyUnit, setWarrantyUnit] = useState<WarrantyUnit>('months');
  const [hasWarranty, setHasWarranty] = useState(true);
  const [form, setForm]         = useState(DEFAULT_FORM);
  const [newDayInput, setNewDayInput] = useState('');
  const [libraryInputKey, setLibraryInputKey] = useState(0);
  const supabase = createClient();

  const scrollToTop = () => {
    // Use multiple methods for broad browser compatibility
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    formRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
  };

  useEffect(() => {
    if (source === 'manual') {
      setStep('idle');
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
    addBreadcrumb('AddPage', 'Processing receipt image', { source });
    setImageDataUrl(dataUrl);
    setStep('processing');
    setError(null);

    const endPerformance = withPerformance('OCR', 'extractReceiptData');

    try {
      const result = await extractReceiptData(dataUrl);
      endPerformance({
        itemName: result.item_name,
        storeName: result.store_name,
        hasDate: !!result.purchase_date,
      });

      addBreadcrumb('AddPage', 'OCR completed successfully', {
        itemName: result.item_name,
        storeName: result.store_name,
      });

      setForm({
        ...DEFAULT_FORM,
        item_name:     result.item_name,
        store_name:    result.store_name,
        purchase_date: result.purchase_date,
      });
      setWizardStep(1);
      setStep('idle');
    } catch (err) {
      endPerformance({ error: true });
      logger.error('AddPage', 'OCR processing failed', {
        source,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
      setForm({ ...DEFAULT_FORM, item_name: '', store_name: '', purchase_date: '' });
      setWizardStep(1);
      setStep('idle');
    }
  };

  const handleFileFromLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addBreadcrumb('AddPage', 'Selected image from library', { fileName: file.name, fileSize: file.size });
    logger.info('AddPage', 'File selected from library', { fileName: file.name, fileSize: file.size, fileType: file.type });

    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      processImage(dataUrl);
    };
    reader.readAsDataURL(file);
    // Reset so the same file can be re-selected
    setLibraryInputKey((k) => k + 1);
  };

  const handleNext = () => {
    if (wizardStep === 1) {
      if (!form.item_name.trim()) { setError('Item name is required'); return; }
      if (!form.store_name.trim()) { setError('Store is required'); return; }
      if (!form.purchase_date) { setError('Purchase date is required'); return; }
      setError(null);

      addBreadcrumb('AddPage', 'Proceeding to step 2 - Warranty details', {
        itemName: form.item_name,
        storeName: form.store_name,
        hasWarranty,
        category: form.category,
      });

      setWizardStep(2);
      // Scroll to top after state update
      queueMicrotask(() => scrollToTop());
      return;
    }
    handleSave();
  };

  const handleSave = async () => {
    if (hasWarranty) {
      if (form.warranty_months < 1) { setError('Warranty length must be at least 1'); return; }
    }

    addBreadcrumb('AddPage', 'Saving warranty/receipt', {
      itemName: form.item_name,
      storeName: form.store_name,
      hasWarranty,
      hasReceipt: !!imageDataUrl,
      warrantyMonths: form.warranty_months,
      warrantyUnit,
      notificationDays: form.notificationDays,
    });

    const endPerformance = withPerformance('AddPage', 'handleSave');
    setStep('saving');

    try {
      let receiptUrl: string | null = null;

      if (imageDataUrl) {
        const uploadEnd = withPerformance('Supabase', 'storage.upload');
        const filename = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
        const res = await fetch(imageDataUrl);
        const blob = await res.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('receipts')
          .upload(filename, blob, { contentType: 'image/jpeg' });

        if (uploadError) {
          uploadEnd({ error: true });
          logSupabaseError('upload', 'receipts', uploadError, { filename });
          // Non-fatal - continue without receipt URL
        } else {
          uploadEnd({ success: true, path: uploadData?.path });
          const { data: urlData } = supabase.storage.from('receipts').getPublicUrl(uploadData.path);
          receiptUrl = urlData.publicUrl;
        }
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        addBreadcrumb('AddPage', 'Save failed - not authenticated', {});
        setError('You must be signed in.');
        setStep('idle');
        return;
      }

      const priceNum = form.price_paid
        ? parseFloat(form.price_paid.replace(/[^0-9.]/g, ''))
        : null;

      if (!hasWarranty) {
        const insertEnd = withPerformance('Supabase', 'insert.receipt');
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

        if (insertError) {
          insertEnd({ error: true });
          logSupabaseError('insert', 'warranties', insertError, { type: 'receipt', userId: user.id });
          setError(`Failed: ${insertError.message}`);
          setStep('idle');
          return;
        }
        insertEnd({ success: true });
      } else {
        const purchaseDate = new Date(form.purchase_date);
        const expiryDate  = new Date(purchaseDate);
        if (warrantyUnit === 'days') {
          expiryDate.setDate(expiryDate.getDate() + form.warranty_months);
        } else if (warrantyUnit === 'years') {
          expiryDate.setFullYear(expiryDate.getFullYear() + form.warranty_months);
        } else {
          expiryDate.setMonth(expiryDate.getMonth() + form.warranty_months);
        }
        const expiryDateStr = expiryDate.toISOString().split('T')[0];

        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const expiry = new Date(expiryDateStr);
        expiry.setHours(0, 0, 0, 0);
        const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const status: 'active' | 'expiring' = daysUntil <= 30 ? 'expiring' : 'active';

        const insertEnd = withPerformance('Supabase', 'insert.warranty');
        const { error: insertError } = await supabase.from('warranties').insert({
          user_id:          user.id,
          item_name:        form.item_name,
          store_name:       form.store_name,
          purchase_date:    form.purchase_date,
          warranty_months:  form.warranty_months,
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

        if (insertError) {
          insertEnd({ error: true });
          logSupabaseError('insert', 'warranties', insertError, { type: 'warranty', userId: user.id });
          setError(`Failed: ${insertError.message}`);
          setStep('idle');
          return;
        }
        insertEnd({ success: true });
      }

      addBreadcrumb('AddPage', 'Save succeeded - navigating to app', { hasReceiptUrl: !!receiptUrl });
      endPerformance({ success: true });
      router.push('/app?saved=true');
    } catch (err) {
      endPerformance({ error: true });
      logger.error('AddPage', 'handleSave threw unexpectedly', {
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      });
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
        if (warrantyUnit === 'days') d.setDate(d.getDate() + form.warranty_months);
        else if (warrantyUnit === 'years') d.setFullYear(d.getFullYear() + form.warranty_months);
        else d.setMonth(d.getMonth() + form.warranty_months);
        return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      })()
    : null;

  // Show processing spinner when reading a receipt image
  if (step === 'processing') {
    return (
      <div className={styles.processing}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.processingText}>Reading your receipt…</p>
        <p className={styles.processingSubtext}>Usually takes 3–5 seconds</p>
      </div>
    );
  }

  // Main form render (step === 'idle' or 'saving')
  const isSaving = step === 'saving';
  const showForm = step === 'idle' || step === 'saving';

  if (!showForm) return null;

  return (
    <div ref={formRef}>
      <div className={styles.confirm}>
        {/* Wizard header */}
        <div className={styles.wizardHeader}>
          <div className={styles.wizardSteps} aria-label="Progress">
            <span className={`${styles.wizardDot} ${wizardStep === 1 ? styles.wizardDotActive : ''}`} />
            <span className={styles.wizardLine} />
            <span className={`${styles.wizardDot} ${wizardStep === 2 ? styles.wizardDotActive : ''}`} />
          </div>
          <h2 className={styles.wizardTitle}>
            {wizardStep === 1 ? 'Receipt details' : 'Warranty & alerts'}
          </h2>
        </div>

        {/* Receipt preview + lightbox */}
        {imageDataUrl && (
          <>
            <div className={styles.receiptPreview}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageDataUrl}
                alt="Captured receipt"
                className={styles.receiptThumb}
                onClick={() => setLightboxOpen(true)}
              />
              <button
                type="button"
                className={styles.receiptTap}
                onClick={() => setLightboxOpen(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)', fontSize: '12px' }}
              >
                Tap to enlarge
              </button>
            </div>
            {lightboxOpen && (
              <div
                className={styles.lightbox}
                role="dialog"
                aria-modal="true"
                aria-label="Receipt full view"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  type="button"
                  className={styles.lightboxClose}
                  onClick={() => setLightboxOpen(false)}
                  aria-label="Close"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageDataUrl}
                  alt="Receipt full view"
                  className={styles.lightboxImg}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}
          </>
        )}

        <div className={styles.form}>
          {wizardStep === 1 ? (
            <>
              {/* Add photo button — for manual entry, allow adding a photo mid-form */}
              {source === 'manual' && !imageDataUrl && (
                <div className={styles.field}>
                  <p className={styles.label}>Receipt photo <span className={styles.optional}>(optional)</span></p>
                  {/* Hidden camera input */}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    id="add-camera-input"
                    className={styles.hiddenInput}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = (ev) => processImage(ev.target?.result as string);
                      reader.readAsDataURL(file);
                    }}
                  />
                  {/* Library input (keyed to allow re-selection) */}
                  <input
                    key={libraryInputKey}
                    type="file"
                    accept="image/*"
                    id="add-library-input"
                    className={styles.hiddenInput}
                    onChange={handleFileFromLibrary}
                  />
                  <div className={styles.photoActions}>
                    <label htmlFor="add-camera-input" className={styles.photoBtn}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                        <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.75" />
                      </svg>
                      Use camera
                    </label>
                    <label htmlFor="add-library-input" className={styles.photoBtn}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
                        <circle cx="8.5" cy="8.5" r="1.5" stroke="currentColor" strokeWidth="1.75" />
                        <polyline points="21 15 16 10 5 21" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Choose from library
                    </label>
                  </div>
                </div>
              )}

              {/* Item name */}
              <div className={styles.field}>
                <label htmlFor="item_name" className={styles.label}>
                  Item name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input id="item_name" type="text" value={form.item_name}
                  onChange={(e) => setForm((f) => ({ ...f, item_name: e.target.value }))}
                  placeholder="e.g. MacBook Pro 14-inch" className={styles.input} disabled={isSaving} />
              </div>

              {/* Store */}
              <div className={styles.field}>
                <label htmlFor="store_name" className={styles.label}>
                  Store <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input id="store_name" type="text" value={form.store_name}
                  onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
                  placeholder="e.g. Apple Store" className={styles.input} disabled={isSaving} />
              </div>

              {/* Category */}
              <div className={styles.field}>
                <label htmlFor="category" className={styles.label}>Category</label>
                <select id="category" value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={styles.input} disabled={isSaving}>
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>

              {/* Purchase date */}
              <div className={styles.field}>
                <label htmlFor="purchase_date" className={styles.label}>
                  Purchase date <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input id="purchase_date" type="date" value={form.purchase_date}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_date: e.target.value }))}
                  className={styles.input} disabled={isSaving} />
              </div>

              {/* Price */}
              <div className={styles.field}>
                <label htmlFor="price_paid" className={styles.label}>
                  Price paid <span className={styles.optional}>(optional)</span>
                </label>
                <input id="price_paid" type="text" inputMode="decimal" value={form.price_paid}
                  onChange={(e) => setForm((f) => ({ ...f, price_paid: e.target.value }))}
                  placeholder="e.g. 1299.00" className={styles.input} disabled={isSaving} />
              </div>

              {/* Order number */}
              <div className={styles.field}>
                <label htmlFor="order_number" className={styles.label}>
                  Order / receipt number <span className={styles.optional}>(optional)</span>
                </label>
                <input id="order_number" type="text" value={form.order_number}
                  onChange={(e) => setForm((f) => ({ ...f, order_number: e.target.value }))}
                  placeholder="e.g. ORD-20240315-001" className={styles.input} disabled={isSaving} />
              </div>

              {/* Serial number */}
              <div className={styles.field}>
                <label htmlFor="serial_number" className={styles.label}>
                  Serial / model number <span className={styles.optional}>(optional)</span>
                </label>
                <input id="serial_number" type="text" value={form.serial_number}
                  onChange={(e) => setForm((f) => ({ ...f, serial_number: e.target.value }))}
                  placeholder="e.g. SN123456789" className={styles.input} disabled={isSaving} />
              </div>

              {/* Include warranty? */}
              <div className={styles.field}>
                <p className={styles.label}>Includes warranty?</p>
                <div className={styles.yesNoGroup}>
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
            </>
          ) : (
            <>
              {hasWarranty && (
                <>
                  {/* Warranty length */}
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Warranty length <span style={{ color: 'var(--danger)' }}>*</span>
                    </label>
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
                        {(['days', 'months', 'years'] as WarrantyUnit[]).map((u) => (
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
                      <p className={styles.expiryPreview}>Expires <strong>{expiryPreview}</strong></p>
                    )}
                  </div>

                  {/* Reminder time */}
                  <div className={styles.field}>
                    <label htmlFor="reminder_time" className={styles.label}>
                      Reminder time <span className={styles.optional}>(optional)</span>
                    </label>
                    <input id="reminder_time" type="time" value={form.reminder_time}
                      onChange={(e) => setForm((f) => ({ ...f, reminder_time: e.target.value }))}
                      className={styles.input} disabled={isSaving} />
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
                          <button type="button"
                            onClick={() => setForm((f) => ({ ...f, notificationDays: f.notificationDays.filter((d) => d !== days) }))}
                            className={styles.notifyRemove} aria-label={`Remove ${days}d reminder`} disabled={isSaving}>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                      ))}
                      <div className={styles.notifyAddRow}>
                        <input type="number" min="0" max="365" placeholder="Days before expiry"
                          value={newDayInput}
                          onChange={(e) => setNewDayInput(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDay(); } }}
                          className={styles.notifyAddInput} disabled={isSaving} />
                        <button type="button" onClick={addDay} className={styles.notifyAddBtn}
                          disabled={isSaving || !newDayInput.trim()}>Add</button>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Notes */}
              <div className={styles.field}>
                <label htmlFor="notes" className={styles.label}>
                  Notes <span className={styles.optional}>(optional)</span>
                </label>
                <textarea id="notes" value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Extended warranty info, gift recipient…" className={styles.textarea}
                  rows={3} disabled={isSaving} />
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
            <button type="button" className={styles.btnSecondary}
              onClick={() => { setWizardStep(1); queueMicrotask(() => scrollToTop()); }}
              disabled={isSaving}>
              Back
            </button>
          )}
          <button type="button" className={styles.btnPrimary}
            onClick={handleNext}
            disabled={isSaving}>
            {isSaving ? 'Saving…' : wizardStep === 1 ? (hasWarranty ? 'Next: Warranty →' : 'Save receipt') : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AddPage() {
  return (
    <ErrorBoundary namespace="AddPage">
      <Suspense fallback={null}>
        <AddPageInner />
      </Suspense>
    </ErrorBoundary>
  );
}
