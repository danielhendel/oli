// File: apps/mobile/__tests__/volume.spec.ts
import {
    computeExerciseVolumeKg,
    computeWorkoutVolumeKg,
  } from '@/lib/utils/volume';
  import { ExerciseEntry } from '@/types/workout';
  
  describe('volume utils', () => {
    test('computes exercise volume (kg)', () => {
      const ex: ExerciseEntry = {
        name: 'Bench Press',
        muscleGroups: ['chest', 'triceps', 'shoulders'],
        sets: [
          { setNumber: 1, reps: 10, weight: 80 },
          { setNumber: 2, reps: 8, weight: 85 },
          { setNumber: 3, reps: 6, weight: 90 },
        ],
      };
      expect(computeExerciseVolumeKg(ex)).toBe(10 * 80 + 8 * 85 + 6 * 90);
    });
  
    test('computes workout volume across sections', () => {
      const exA: ExerciseEntry = {
        name: 'Squat',
        muscleGroups: ['quads', 'glutes'],
        sets: [{ setNumber: 1, reps: 5, weight: 120 }],
      };
      const exB: ExerciseEntry = {
        name: 'RDL',
        muscleGroups: ['hamstrings', 'glutes'],
        sets: [{ setNumber: 1, reps: 8, weight: 90 }],
      };
      const sections = [{ exercises: [exA] }, { exercises: [exB] }];
      expect(computeWorkoutVolumeKg(sections)).toBe(5 * 120 + 8 * 90);
    });
  });
  