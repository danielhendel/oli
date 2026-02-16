// lib/db/converters.ts
import type {
    FirestoreDataConverter,
    QueryDocumentSnapshot,
    SnapshotOptions,
  } from "firebase/firestore";
  import type { Event, Fact, UserProfile } from "../types/domain";
  
  const withId = <T extends object>(snap: QueryDocumentSnapshot, data: T) =>
    ({ id: snap.id, ...data }) as T & { id: string };
  
  const stripUndefined = <T>(v: T): T =>
    JSON.parse(JSON.stringify(v)) as T;
  
  export const eventConverter: FirestoreDataConverter<Event> = {
    toFirestore(m: Event) {
      return stripUndefined(m);
    },
    fromFirestore(s: QueryDocumentSnapshot, o: SnapshotOptions) {
      const d = s.data(o) as Event;
      return withId(s, d);
    },
  };
  
  export const factConverter: FirestoreDataConverter<Fact> = {
    toFirestore(m: Fact) {
      return stripUndefined(m);
    },
    fromFirestore(s, o) {
      const d = s.data(o) as Fact;
      return withId(s, d);
    },
  };
  
  export const profileConverter: FirestoreDataConverter<UserProfile> = {
    toFirestore(m: UserProfile) {
      return stripUndefined(m);
    },
    fromFirestore(s, o) {
      const d = s.data(o) as UserProfile;
      return withId(s, d) as UserProfile & { id: string };
    },
  };
  