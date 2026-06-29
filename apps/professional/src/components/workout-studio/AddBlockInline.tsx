"use client";

import type { WorkoutBlockType } from "@/features/workout-studio/types";
import { WORKOUT_BLOCK_TYPES, WORKOUT_BLOCK_TYPE_LABELS } from "@/features/workout-studio/types";
import styles from "./AddBlockInline.module.css";

type AddBlockInlineProps = {
  defaultBlockType?: WorkoutBlockType;
  onAddBlock: (blockType: WorkoutBlockType) => void;
  centered?: boolean;
};

export function AddBlockInline({
  defaultBlockType = "set",
  onAddBlock,
  centered = false,
}: AddBlockInlineProps) {
  const selectId = centered ? "add-block-type-empty" : "add-block-type-inline";

  return (
    <div className={`${styles.zone} ${centered ? styles.zoneCentered : ""}`}>
      <div className={styles.controls}>
        <select id={selectId} defaultValue={defaultBlockType} className={styles.select}>
          {WORKOUT_BLOCK_TYPES.map((blockType) => (
            <option key={blockType} value={blockType}>
              {WORKOUT_BLOCK_TYPE_LABELS[blockType]}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={styles.addButton}
          onClick={() => {
            const select = document.getElementById(selectId) as HTMLSelectElement | null;
            const blockType = (select?.value ?? defaultBlockType) as WorkoutBlockType;
            onAddBlock(blockType);
          }}
        >
          + Add block
        </button>
      </div>
      {!centered ? (
        <p className={styles.hint}>Drop exercises from the library into blocks above.</p>
      ) : null}
    </div>
  );
}
