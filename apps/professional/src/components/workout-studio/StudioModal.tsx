"use client";

import { useEffect, useRef, type ReactNode } from "react";

import styles from "./StudioModal.module.css";

type StudioModalProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export function StudioModal({ open, title, onClose, children }: StudioModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    dialogRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.backdrop} onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-modal-title"
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <header className={styles.header}>
          <h2 id="studio-modal-title" className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}
