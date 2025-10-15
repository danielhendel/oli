// File: apps/mobile/lib/paths.ts
import { UID, ISODate } from '@/types';

export const col = {
  users: () => `users`,
  user: (uid: UID) => `users/${uid}`,
  profile: (uid: UID) => `users/${uid}/profile`,
  profileDoc: (
    uid: UID,
    name: 'general' | 'trainingGoals' | 'trainingExperience' | 'metabolicActivity'
  ) => `users/${uid}/profile/${name}`,
  devices: (uid: UID) => `users/${uid}/devices`,
  permissions: (uid: UID) => `users/${uid}/permissions`,
  logs: (uid: UID) => `users/${uid}/logs`,
  workoutLogs: (uid: UID) => `users/${uid}/logs/workouts`,
  cardioLogs: (uid: UID) => `users/${uid}/logs/cardio`,
  nutritionLogs: (uid: UID) => `users/${uid}/logs/nutrition`,
  recoveryLogs: (uid: UID) => `users/${uid}/logs/recovery`,
  uploads: (uid: UID) => `users/${uid}/uploads`,
  factsDaily: (uid: UID) => `users/${uid}/facts/daily`,
  factsWeekly: (uid: UID) => `users/${uid}/facts/weekly`,
  analytics: (uid: UID) => `users/${uid}/analytics`,
  insights: (uid: UID) => `users/${uid}/insights`,
  audit: (uid: UID) => `users/${uid}/audit`,
  shares: () => `shares`,
  events: () => `events`,
};

export const doc = {
  factDaily: (uid: UID, date: ISODate) => `${col.factsDaily(uid)}/${date}`,
  factWeekly: (uid: UID, isoWeek: string) => `${col.factsWeekly(uid)}/${isoWeek}`,
};
