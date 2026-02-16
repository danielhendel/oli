import type { CollectionReference } from "firebase-admin/firestore";
import type { RawEvent, CanonicalEvent, DailyFacts, Insight, UserSourceConnection } from "../types/health";
export declare function userSourcesCol(userId: string): CollectionReference<UserSourceConnection>;
export declare function userRawEventsCol(userId: string): CollectionReference<RawEvent>;
export declare function userEventsCol(userId: string): CollectionReference<CanonicalEvent>;
export declare function userDailyFactsCol(userId: string): CollectionReference<DailyFacts>;
export declare function userInsightsCol(userId: string): CollectionReference<Insight>;
export declare const userSourceDoc: (userId: string, sourceId: string) => FirebaseFirestore.DocumentReference<UserSourceConnection, FirebaseFirestore.DocumentData>;
export declare const rawEventDoc: (userId: string, rawEventId: string) => FirebaseFirestore.DocumentReference<RawEvent, FirebaseFirestore.DocumentData>;
export declare const canonicalEventDoc: (userId: string, eventId: string) => FirebaseFirestore.DocumentReference<CanonicalEvent, FirebaseFirestore.DocumentData>;
export declare const dailyFactsDoc: (userId: string, ymd: string) => FirebaseFirestore.DocumentReference<DailyFacts, FirebaseFirestore.DocumentData>;
export declare const insightDoc: (userId: string, insightId: string) => FirebaseFirestore.DocumentReference<Insight, FirebaseFirestore.DocumentData>;
//# sourceMappingURL=collections.d.ts.map