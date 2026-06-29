"use client";

import {
  addDesignedSet,
  applySetDesignToAllSets,
  duplicateDesignedSet,
  duplicateLastDesignedSet,
  moveDesignedSet,
  removeDesignedSet,
  updateDesignedSet,
} from "@/features/workout-studio/designedSetUtils";
import type { WorkoutExerciseCard } from "@/features/workout-studio/types";
import { TabPanelShell } from "./TabPanelShell";
import styles from "./exerciseCard.module.css";

type ExerciseSetsTabProps = {
  exercise: WorkoutExerciseCard;
  onUpdate: (patch: Partial<WorkoutExerciseCard>) => void;
};

export function ExerciseSetsTab({ exercise, onUpdate }: ExerciseSetsTabProps) {
  const firstSetId = exercise.designedSets[0]?.setId;

  return (
    <TabPanelShell tab="sets" icon="◎">
      <div className={styles.cardGroup}>
        <div className={styles.subcard}>
          <div className={styles.toolbarRow}>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => {
                onUpdate({ designedSets: addDesignedSet(exercise.designedSets) });
              }}
            >
              + Quick Add
            </button>
            <button
              type="button"
              className={styles.toolbarButton}
              onClick={() => {
                onUpdate({ designedSets: duplicateLastDesignedSet(exercise.designedSets) });
              }}
            >
              Duplicate Last
            </button>
            {firstSetId ? (
              <button
                type="button"
                className={styles.toolbarButton}
                onClick={() => {
                  onUpdate({
                    designedSets: applySetDesignToAllSets(exercise.designedSets, firstSetId),
                  });
                }}
              >
                Apply to All
              </button>
            ) : null}
          </div>

          <div className={styles.setsTableWrap}>
            <div className={styles.setsTable}>
              <div className={styles.setsTableHead}>
                <span>Set</span>
                <span>Rep Range</span>
                <span>Load Guidance</span>
                <span>Tempo</span>
                <span>Rest</span>
                <span>RPE</span>
                <span>RIR</span>
                <span>Notes</span>
                <span />
              </div>
              {exercise.designedSets.map((set) => (
                <div key={set.setId} className={styles.setRow}>
                  <span className={styles.setNumber}>{set.setNumber}</span>
                  <input
                    className={styles.setInput}
                    value={set.repRange}
                    aria-label={`Set ${set.setNumber} rep range`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          repRange: event.target.value,
                        }),
                      });
                    }}
                  />
                  <input
                    className={styles.setInput}
                    value={set.loadGuidance}
                    placeholder="Load guidance"
                    aria-label={`Set ${set.setNumber} load guidance`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          loadGuidance: event.target.value,
                        }),
                      });
                    }}
                  />
                  <input
                    className={styles.setInput}
                    value={set.tempo}
                    placeholder="3-1-1"
                    aria-label={`Set ${set.setNumber} tempo`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          tempo: event.target.value,
                        }),
                      });
                    }}
                  />
                  <input
                    className={styles.setInput}
                    type="number"
                    min={0}
                    value={set.restSeconds ?? ""}
                    aria-label={`Set ${set.setNumber} rest seconds`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          restSeconds: event.target.value ? Number(event.target.value) : null,
                        }),
                      });
                    }}
                  />
                  <input
                    className={styles.setInput}
                    type="number"
                    min={0}
                    max={10}
                    step={0.5}
                    value={set.rpeTarget ?? ""}
                    aria-label={`Set ${set.setNumber} RPE`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          rpeTarget: event.target.value ? Number(event.target.value) : null,
                        }),
                      });
                    }}
                  />
                  <input
                    className={styles.setInput}
                    type="number"
                    min={0}
                    max={5}
                    value={set.rirTarget ?? ""}
                    aria-label={`Set ${set.setNumber} RIR`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          rirTarget: event.target.value ? Number(event.target.value) : null,
                        }),
                      });
                    }}
                  />
                  <textarea
                    className={styles.setNotesInput}
                    rows={2}
                    value={set.notes}
                    placeholder="Set note"
                    aria-label={`Set ${set.setNumber} notes`}
                    onChange={(event) => {
                      onUpdate({
                        designedSets: updateDesignedSet(exercise.designedSets, set.setId, {
                          notes: event.target.value,
                        }),
                      });
                    }}
                  />
                  <div className={styles.setRowActions}>
                    <button
                      type="button"
                      className={styles.miniButton}
                      title="Apply to all sets"
                      onClick={() => {
                        onUpdate({
                          designedSets: applySetDesignToAllSets(exercise.designedSets, set.setId),
                        });
                      }}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      className={styles.miniButton}
                      onClick={() => {
                        onUpdate({
                          designedSets: duplicateDesignedSet(exercise.designedSets, set.setId),
                        });
                      }}
                    >
                      Dup
                    </button>
                    <button
                      type="button"
                      className={styles.miniButton}
                      onClick={() => {
                        onUpdate({
                          designedSets: moveDesignedSet(exercise.designedSets, set.setId, "up"),
                        });
                      }}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className={styles.miniButton}
                      onClick={() => {
                        onUpdate({
                          designedSets: moveDesignedSet(exercise.designedSets, set.setId, "down"),
                        });
                      }}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      className={styles.miniButtonDanger}
                      onClick={() => {
                        onUpdate({
                          designedSets: removeDesignedSet(exercise.designedSets, set.setId),
                        });
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TabPanelShell>
  );
}
