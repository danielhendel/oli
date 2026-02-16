// lib/db/facts.ts
import { getDocs, query, setDoc, Timestamp, where } from "firebase/firestore";
import { factsCol, factDoc } from "./paths";
import { factConverter } from "./converters";
import type { Fact, NewFact } from "../types/domain";

const mapErr = (e: unknown) =>
  e instanceof Error ? new Error(`facts: ${e.message}`) : new Error("facts: unknown error");

export async function upsertFact<T = Record<string, unknown>>(
  uid: string,
  id: string,
  fact: NewFact<T>
): Promise<void> {
  try {
    await setDoc(factDoc(uid, id).withConverter(factConverter), {
      ...fact,
      uid,
      version: 1,
      ts: fact.ts ?? Timestamp.now(),
      source: (fact as Fact).source ?? "derived",
    } as Fact);
  } catch (e) {
    throw mapErr(e);
  }
}

export async function findFactsByKindAndDate(
  uid: string,
  kind: string,
  date: string
): Promise<Fact[]> {
  try {
    const q = query(
      factsCol(uid).withConverter(factConverter),
      where("kind", "==", kind),
      where("date", "==", date)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
  } catch (e) {
    throw mapErr(e);
  }
}
