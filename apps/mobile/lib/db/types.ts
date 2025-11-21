// Shared data contracts (app-facing types)

export type UserGeneralProfile = {
    firstName?: string;
    lastName?: string;
    displayName?: string;
    avatarUrl?: string;
    // add minimal fields needed in Sprint 3
    updatedAt: number; // ms
    createdAt: number; // ms
  };
  