// apps/mobile/types/user.ts
import { BaseDoc, UID, UnitSystem } from './common';

export interface UserCore extends BaseDoc {
  uid: UID;
  email?: string;
  displayName?: string;
  photoURL?: string;
  // reserved for identity mirror fields
}

export interface UserPrefs extends BaseDoc {
  unitSystem: UnitSystem;
  timezone?: string; // e.g., "America/New_York"
  locale?: string;   // e.g., "en-US"
  marketingOptIn?: boolean;
}

export interface DeviceLink extends BaseDoc {
  provider: 'apple-health' | 'oura' | 'withings' | 'fitbit';
  connected: boolean;
  lastSyncAt?: number;
  scopes?: string[];
}

export interface PermissionGrant extends BaseDoc {
  // future: granular share scopes
  grantedTo: UID | string; // could be email or link-share principal
  scopes: string[];        // e.g., ['logs.read', 'facts.read']
  expiresAt?: number;
}
