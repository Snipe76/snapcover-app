'use client';

import { useState } from 'react';
import { logger, addBreadcrumb } from '@/lib/logger';
import styles from './ReceiptLightbox.module.css';

interface ReceiptLightboxProps {
  src: string;
  alt: string;
}

export function ReceiptLightbox({ src, alt }: ReceiptLightboxProps) {
  const [open, setOpen] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleOpen = () => {
    addBreadcrumb('ReceiptLightbox', 'Opening lightbox', { src: src.slice(0, 50) });
    setOpen(true);
  };

  const handleClose = () => {
    addBreadcrumb('ReceiptLightbox', 'Closing lightbox', {});
    setOpen(false);
  };

  const handleImgError = () => {
    setImgError(true);
    logger.warn('ReceiptLightbox', 'Failed to load receipt image', { src: src.slice(0, 100) });
  };

  if (imgError) {
    return (
      <div
        style={{
          padding: '16px',
          background: 'rgba(239,68,68,0.08)',
          border: '1.5px solid rgba(239,68,68,0.35)',
          borderRadius: '8px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: '13px', color: 'var(--danger)', margin: 0 }}>
          ⚠️ Could not load receipt image
        </p>
        <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          The image may have been deleted from storage.
        </p>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className={styles.thumbBtn}
        onClick={handleOpen}
        aria-label="View receipt full screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={styles.thumb}
          onError={handleImgError}
        />
        <span className={styles.thumbOverlay}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          View full size
        </span>
      </button>

      {open && (
        <div
          className={styles.overlay}
          onClick={handleClose}
          role="dialog"
          aria-modal="true"
          aria-label="Receipt full screen"
        >
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={styles.fullImage}
            onClick={(e) => e.stopPropagation()}
            onError={handleImgError}
          />
        </div>
      )}
    </>
  );
}
