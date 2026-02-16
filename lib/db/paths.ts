// lib/db/paths.ts
import {
  collection,
  doc,
  type CollectionReference,
  type DocumentReference,
} from "firebase/firestore";
import { getDb } from "../firebaseConfig";
import type { Event, Fact, UserProfile } from "../types/domain";

/**
 * Root document for a user: /users/{uid}
 * This path matches your Firestore rules:
 *   match /users/{uid} { allow read, write: if isOwner(uid); }
 */
export const userRoot = (uid: string): DocumentReference<UserProfile> =>
  doc(getDb(), "users", uid) as DocumentReference<UserProfile>;

/**
 * User profile lives on the user document itself.
 * Avoids subcollection rule gaps and keeps reads/writes simple.
 * Path: /users/{uid}
 */
export const profileDoc = (uid: string): DocumentReference<UserProfile> =>
  doc(getDb(), "users", uid) as DocumentReference<UserProfile>;

/**
 * Events collection for a user.
 * Path: /users/{uid}/events
 */
export const eventsCol = (uid: string): CollectionReference<Event> =>
  collection(userRoot(uid), "events") as CollectionReference<Event>;

/**
 * A specific event document.
 * Path: /users/{uid}/events/{eventId}
 */
export const eventDoc = (uid: string, eventId: string): DocumentReference<Event> =>
  doc(eventsCol(uid), eventId) as DocumentReference<Event>;

/**
 * Facts collection for a user.
 * Path: /users/{uid}/facts
 */
export const factsCol = (uid: string): CollectionReference<Fact> =>
  collection(userRoot(uid), "facts") as CollectionReference<Fact>;

/**
 * A specific fact document.
 * Path: /users/{uid}/facts/{factId}
 */
export const factDoc = (uid: string, factId: string): DocumentReference<Fact> =>
  doc(factsCol(uid), factId) as DocumentReference<Fact>;
