'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractReceiptData } from '@/lib/ocr';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './add.module.css';

type Step = 'capture' | 'processing' | 'confirm' | 'saving';

const WarrantySchema = z.object({
  item_name:       z.string().min(1, 'Item name is required'),
  store_name:      z.string().min(1, 'Store name is required'),
  purchase_date:  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  warranty_months: z.number().min(1).max(120),
  notes:           z.string().optional(),
});

export default function AddPage() {
  return (
    <Suspense fallback={null}>
      <AddPageInner />
    </Suspense>
  );
}

function AddPageInner() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('capture');
  const [ocrResult, setOcrResult] = useState<{
    item_name: string;
    store_name: string;
    purchase_date: string;
    total: string;
  } | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    item_name: '',
    store_name: '',
    purchase_date: '',
    warranty_months: 12,
    notes: '',
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const source = searchParams.get('source');

  // ─── Camera auto-start ─────────────────────────────────────────────────
  // Uses step as trigger (avoids stale ref on first render)
  useEffect(() => {
    if (step === 'capture' && source === 'camera' && !streamRef.current) {
      startCamera();
    }
  }, [step, source]);

  useEffect(() => {
    // Play video once stream is attached
    if (streamRef.current && videoRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [streamRef.current]);

  // ─── Handle source param on mount ──────────────────────────────────────
  useEffect(() => {
    if (source === 'library') {
      fileInputRef.current?.click();
    } else if (source === 'manual') {
      setOcrResult({ item_name: '', store_name: '', purchase_date: '', total: '' });
      setStep('confirm');
    }
  }, [source]);

  // ─── Camera ─────────────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setStep('capture');
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setStep('capture');
      setError('Camera access denied. Please allow camera access or select a photo from your library.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    stopCamera();
    processImage(dataUrl);
  }, [stopCamera]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      stopCamera();
      processImage(result);
    };
    reader.readAsDataURL(file);
  }, [stopCamera]);

  const processImage = async (dataUrl: string) => {
    setImageDataUrl(dataUrl);
    setStep('processing');
    setError(null);

    try {
      const result = await extractReceiptData(dataUrl);
      setOcrResult(result);
      setForm({
        item_name:       result.item_name,
        store_name:      result.store_name,
        purchase_date:   result.purchase_date,
        warranty_months: 12,
        notes: '',
      });
      setStep('confirm');
    } catch {
      // OCR failed — go to form anyway with empty fields
      setOcrResult({ item_name: '', store_name: '', purchase_date: '', total: '' });
      setStep('confirm');
    }
  };

  // ─── Save ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setStep('saving');
    setError(null);

    // Validate
    const parsed = WarrantySchema.safeParse(form);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      setStep('confirm');
      return;
    }

    try {
      // Upload image to Supabase Storage
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

      // Calculate expiry
      const purchaseDate = new Date(form.purchase_date);
      const expiryDate   = new Date(purchaseDate);
      expiryDate.setMonth(expiryDate.getMonth() + form.warranty_months);
      const expiryDateStr = expiryDate.toISOString().split('T')[0];

      // Determine status
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const expiry = new Date(expiryDateStr);
      expiry.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const status: 'active' | 'expiring' = daysUntil <= 30 ? 'expiring' : 'active';

      // Insert
      const { error: insertError } = await supabase.from('warranties').insert({
        item_name:       form.item_name,
        store_name:      form.store_name,
        purchase_date:   form.purchase_date,
        warranty_months: form.warranty_months,
        expiry_date:     expiryDateStr,
        notes:           form.notes || null,
        receipt_url:     receiptUrl,
        status,
      });

      if (insertError) throw insertError;

      router.push('/?saved=true');
    } catch (err) {
      console.error('Save error:', err);
      setError('Failed to save warranty. Please try again.');
      setStep('confirm');
    }
  };

  // ─── Step: Capture ─────────────────────────────────────────────────────
  if (step === 'capture') {
    const hasStream = !!streamRef.current;

    return (
      <div className={styles.capture}>
        <div className={styles.camera}>
          <video
            ref={videoRef}
            className={styles.video}
            playsInline
            muted
            autoPlay
            aria-label="Camera preview"
          />
        </div>

        <div className={styles.captureControls}>
          {hasStream ? (
            <button className={styles.captureBtn} onClick={capturePhoto} aria-label="Take photo">
              <div className={styles.captureBtnInner} />
            </button>
          ) : (
            <button
              className={styles.startCameraBtn}
              onClick={startCamera}
              aria-label="Start camera"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.75" />
              </svg>
              Start camera
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className={styles.fileInput}
          aria-hidden="true"
          tabIndex={-1}
        />

        {error && (
          <div className={styles.errorBanner} role="alert">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ─── Step: Processing ───────────────────────────────────────────────────
  if (step === 'processing') {
    return (
      <div className={styles.processing}>
        <div className={styles.spinner} aria-hidden="true" />
        <p className={styles.processingText}>Reading your receipt…</p>
        <p className={styles.processingSubtext}>This usually takes 3–5 seconds</p>
      </div>
    );
  }

  // ─── Step: Confirm ──────────────────────────────────────────────────────
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

          <div className={styles.field}>
            <label htmlFor="notes" className={styles.label}>Notes <span className={styles.optional}>(optional)</span></label>
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
            onClick={() => {
              stopCamera();
              setStep('capture');
              setImageDataUrl(null);
              setOcrResult(null);
            }}
            disabled={isSaving}
          >
            Retake photo
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
