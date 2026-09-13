// lib/onboarding/mapConnectSourceCards.ts
/**
 * Pure mapping from source truth + transient action → Connect card state.
 * Keeps Connect UI free of effect-driven presence mirroring.
 */

import type { ConnectSourceCardState, ConnectSourceId } from "./types";

export type OuraPresenceSnapshot =
  | { status: "partial" }
  | { status: "ready"; connected: boolean }
  | { status: "error" };

export type AppleHealthSnapshot =
  | { status: "loading" }
  | { status: "unavailable"; reason: string }
  | { status: "ready"; connected: boolean };

export type SourceActionOverlay =
  | { kind: "none" }
  | { kind: "connecting" }
  | { kind: "error"; message: string };

export function mapOuraConnectCard(
  presence: OuraPresenceSnapshot,
  action: SourceActionOverlay,
): ConnectSourceCardState {
  const id: ConnectSourceId = "oura";
  if (action.kind === "connecting") {
    return { id, status: "connecting" };
  }
  if (action.kind === "error") {
    return { id, status: "error", message: action.message };
  }
  if (presence.status === "ready" && presence.connected) {
    return { id, status: "connected" };
  }
  if (presence.status === "error") {
    return { id, status: "error", message: "Could not check Oura status." };
  }
  return { id, status: "idle" };
}

export function mapAppleHealthConnectCard(
  snapshot: AppleHealthSnapshot,
  action: SourceActionOverlay,
): ConnectSourceCardState {
  const id: ConnectSourceId = "apple_health";
  if (action.kind === "connecting") {
    return { id, status: "connecting" };
  }
  if (action.kind === "error") {
    return { id, status: "error", message: action.message };
  }
  if (snapshot.status === "unavailable") {
    return { id, status: "unavailable", reason: snapshot.reason };
  }
  if (snapshot.status === "ready" && snapshot.connected) {
    return { id, status: "connected" };
  }
  return { id, status: "idle" };
}

export function connectSourceCardsEqual(
  a: ConnectSourceCardState,
  b: ConnectSourceCardState,
): boolean {
  if (a.id !== b.id || a.status !== b.status) return false;
  if (a.status === "unavailable" && b.status === "unavailable") {
    return a.reason === b.reason;
  }
  if (a.status === "error" && b.status === "error") {
    return a.message === b.message;
  }
  return true;
}
