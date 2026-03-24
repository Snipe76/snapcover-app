'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import styles from './Dialog.module.css';

interface Action {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'destructive';
  loading?: boolean;
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actions: Action[];
  children: React.ReactNode;
}

export function Dialog({ isOpen, onClose, title, actions, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<Element | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement;
      const firstButton = dialogRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      firstButton?.focus();
    } else {
      (previousFocus.current as HTMLElement)?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last  = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <>
      <div
        className={styles.scrim}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={styles.dialog}
      >
        <div className={styles.content}>
          <h2 id="dialog-title" className={styles.title}>{title}</h2>
          <div className={styles.body}>{children}</div>
        </div>

        <div className={styles.actions}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              disabled={action.loading}
              className={`${styles.actionBtn} ${styles[action.variant ?? 'secondary']}`}
            >
              {action.loading ? '…' : action.label}
            </button>
          ))}
        </div>
      </div>
    </>,
    document.body
  );
}
