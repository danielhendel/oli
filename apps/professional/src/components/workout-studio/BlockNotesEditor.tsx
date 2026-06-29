"use client";

import { useEffect, useState } from "react";

import { StudioModal } from "@/components/workout-studio/StudioModal";
import styles from "./BlockNotesEditor.module.css";

type BlockNotesEditorProps = {
  open: boolean;
  notes: string;
  blockTitle: string;
  onSave: (notes: string) => void;
  onClose: () => void;
};

export function BlockNotesEditor({
  open,
  notes,
  blockTitle,
  onSave,
  onClose,
}: BlockNotesEditorProps) {
  const [draft, setDraft] = useState(notes);

  useEffect(() => {
    if (open) setDraft(notes);
  }, [open, notes]);

  return (
    <StudioModal open={open} title={`${blockTitle} — Block Notes`} onClose={onClose}>
      <div className={styles.editor}>
        <textarea
          rows={8}
          value={draft}
          placeholder="Focus for this block, pacing, coaching intent, sequencing, or fatigue management."
          onChange={(event) => {
            setDraft(event.target.value);
          }}
        />
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => {
              onSave(draft);
              onClose();
            }}
          >
            Done
          </button>
          <button
            type="button"
            className={styles.ghostButton}
            onClick={() => {
              setDraft("");
              onSave("");
              onClose();
            }}
          >
            Clear notes
          </button>
          <button type="button" className={styles.ghostButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </StudioModal>
  );
}
