import {
  normalizePathname,
  shouldShowStackFloatingNavForPathname,
} from "@/components/navigation/stackFloatingNavVisibility";

describe("shouldShowStackFloatingNavForPathname", () => {
  it("allows main category landing paths only", () => {
    expect(shouldShowStackFloatingNavForPathname("/body")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/activity")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/workouts")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/workouts/overview")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/cardio")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/nutrition")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/nutrition/overview")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/recovery")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/recovery/sleep")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/labs")).toBe(true);
    expect(shouldShowStackFloatingNavForPathname("/dna")).toBe(true);
  });

  it("hides on tab roots (floating chrome lives in Tabs layout, not stack overlay)", () => {
    expect(shouldShowStackFloatingNavForPathname("/dash")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/timeline")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/library")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/profile")).toBe(false);
  });

  it("hides on analytics, logging, history, and nested module routes", () => {
    expect(shouldShowStackFloatingNavForPathname("/activity/analytics")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/workouts/analytics-detail")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/cardio/analytics-detail")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/nutrition/analytics-detail")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/workouts/log")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/workouts/history")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/body/calendar")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/body/weight")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/recovery/sleep/calendar")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/labs/upload")).toBe(false);
    expect(shouldShowStackFloatingNavForPathname("/settings")).toBe(false);
  });

  it("normalizes trailing slashes", () => {
    expect(shouldShowStackFloatingNavForPathname("/activity/")).toBe(true);
    expect(normalizePathname("/cardio///")).toBe("/cardio");
  });
});
