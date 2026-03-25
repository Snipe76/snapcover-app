'use client';

import { useState } from 'react';
import styles from './ReceiptLightbox.module.css';

interface ReceiptLightboxProps {
  src: string;
  alt: string;
}

export function ReceiptLightbox({ src, alt }: ReceiptLightboxProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={styles.thumbBtn}
        onClick={() => setOpen(true)}
        aria-label="View receipt full screen"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className={styles.thumb} />
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
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Receipt full screen"
        >
          <button
            type="button"
            className={styles.closeBtn}
            onClick={() => setOpen(false)}
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
          />
        </div>
      )}
    </>
  );
}
