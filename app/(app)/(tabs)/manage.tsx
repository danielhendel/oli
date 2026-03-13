// app/(app)/(tabs)/manage.tsx
// Manage tab: full health record (16 categories, 3 groups) with accordion interaction.
// Specs: docs/90_audits/MANAGE_SCREEN_SPEC.md, docs/90_audits/MANAGE_ACCORDION_SPEC.md

import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ScreenContainer } from "@/lib/ui/ScreenStates";
import { PageTitleRow } from "@/lib/ui/PageTitleRow";
import { SettingsGearButton } from "@/lib/ui/SettingsGearButton";
import { getTodayDayKey } from "@/lib/time/dayKey";
import { useDailyFacts } from "@/lib/data/useDailyFacts";
import { useLabResults } from "@/lib/data/useLabResults";
import { useUploadsPresence } from "@/lib/data/useUploadsPresence";
import { useFailuresRange } from "@/lib/data/useFailuresRange";
import {
  formatMetricValue,
  getBarProgress,
  getMetricNumericForBar,
  type MetricDataContext,
} from "@/lib/metrics/metricDisplay";
import { METRIC_BAR_RANGES } from "@/lib/metrics/metricRanges";
import { formatSleepMinutes } from "@/lib/metrics/metricUnits";

const FALLBACK_NO_DATA = "No data in record";
const FALLBACK_NO_UPLOADS = "No uploads";
const FALLBACK_NONE = "None";
const FALLBACK_MISSING = "Not yet available in Oli";

type RecordState = "Implemented" | "Partial" | "Missing";
type Group = "Health Systems" | "Clinical Records" | "Record Integrity";

type HealthRecordCategory = {
  id: string;
  title: string;
  group: Group;
  recordState: RecordState;
  route?: string;
};

const HEALTH_RECORD_CATEGORIES: HealthRecordCategory[] = [
  { id: "body", title: "Body & structural", group: "Health Systems", recordState: "Implemented", route: "/(app)/body" },
  { id: "cardiovascular", title: "Cardiovascular", group: "Health Systems", recordState: "Partial", route: "/(app)/recovery/readiness" },
  { id: "respiratory", title: "Respiratory", group: "Health Systems", recordState: "Missing" },
  { id: "digestive", title: "Digestive", group: "Health Systems", recordState: "Missing" },
  { id: "endocrine", title: "Endocrine & hormonal", group: "Health Systems", recordState: "Missing" },
  { id: "musculoskeletal", title: "Musculoskeletal", group: "Health Systems", recordState: "Implemented", route: "/(app)/workouts" },
  { id: "sleep", title: "Sleep & circadian", group: "Health Systems", recordState: "Implemented", route: "/(app)/recovery/sleep" },
  { id: "nutrition", title: "Nutrition & metabolism", group: "Health Systems", recordState: "Implemented", route: "/(app)/nutrition" },
  { id: "recovery", title: "Recovery & autonomic", group: "Health Systems", recordState: "Implemented", route: "/(app)/recovery/readiness" },
  { id: "labs", title: "Labs & biomarkers", group: "Health Systems", recordState: "Implemented", route: "/(app)/labs" },
  { id: "immune", title: "Immune & inflammation", group: "Health Systems", recordState: "Missing" },
  { id: "mental", title: "Mental & cognitive", group: "Health Systems", recordState: "Missing" },
  { id: "medications", title: "Medications & supplements", group: "Clinical Records", recordState: "Missing" },
  { id: "conditions", title: "Conditions & diagnoses", group: "Clinical Records", recordState: "Missing" },
  { id: "imaging", title: "Imaging & documents", group: "Clinical Records", recordState: "Partial", route: "/(app)/labs/upload" },
  { id: "data-quality", title: "Data quality", group: "Record Integrity", recordState: "Implemented", route: "/(app)/failures" },
];

type MetricSource =
  | { type: "dailyFacts"; path: string }
  | { type: "labResults"; path: string }
  | { type: "uploadsPresence"; path: string }
  | { type: "failuresRange"; path: string };

type MetricPriority = "core" | "secondary";

type ManageMetricConfig = {
  id: string;
  label: string;
  priority: MetricPriority;
  supportedNow: boolean;
  source: MetricSource | null;
  unit: string;
  emptyLabel: string;
  unavailableLabel: string;
  detailRoute: string;
};

type ManageMetricCategoryConfig = {
  categoryId: string;
  title: string;
  group: "HEALTH SYSTEMS" | "CLINICAL RECORDS" | "RECORD INTEGRITY";
  metrics: ManageMetricConfig[];
};

const MANAGE_METRIC_MAP: ManageMetricCategoryConfig[] = [
  {
    categoryId: "body-structural",
    title: "Body & structural",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "weight", label: "Weight", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "body.weightKg" }, unit: "kg", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/weight" },
      { id: "body-fat-percent", label: "Body fat", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "body.bodyFatPercent" }, unit: "%", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/body-fat-percent" },
      { id: "height", label: "Height", priority: "core", supportedNow: false, source: null, unit: "cm", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/height" },
      { id: "bmi", label: "BMI", priority: "core", supportedNow: false, source: null, unit: "kg/m²", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/bmi" },
      { id: "waist-circumference", label: "Waist circumference", priority: "core", supportedNow: false, source: null, unit: "cm", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/waist-circumference" },
      { id: "lean-mass", label: "Lean mass", priority: "secondary", supportedNow: false, source: null, unit: "kg", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/lean-mass" },
      { id: "bone-density", label: "Bone density / DEXA", priority: "secondary", supportedNow: false, source: null, unit: "report", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/bone-density" },
    ],
  },
  {
    categoryId: "cardiovascular",
    title: "Cardiovascular",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "blood-pressure", label: "Blood pressure", priority: "core", supportedNow: false, source: null, unit: "mmHg", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/blood-pressure" },
      { id: "resting-heart-rate", label: "Resting heart rate", priority: "core", supportedNow: false, source: null, unit: "bpm", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/resting-heart-rate" },
      { id: "hrv", label: "Heart rate variability", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "recovery.hrvRmssd" }, unit: "ms", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/hrv" },
      { id: "steps", label: "Steps", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "activity.steps" }, unit: "steps", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/steps" },
      { id: "activity-minutes", label: "Activity minutes", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "activity.moveMinutes" }, unit: "min", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/activity-minutes" },
      { id: "vo2max", label: "VO₂ max / fitness", priority: "secondary", supportedNow: false, source: null, unit: "mL/kg/min", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/vo2max" },
      { id: "lipids-link", label: "Blood lipids", priority: "secondary", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/blood-lipids" },
    ],
  },
  {
    categoryId: "respiratory",
    title: "Respiratory",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "respiratory-rate", label: "Respiratory rate", priority: "core", supportedNow: false, source: null, unit: "breaths/min", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/respiratory-rate" },
      { id: "spo2", label: "Oxygen saturation", priority: "core", supportedNow: false, source: null, unit: "%", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/spo2" },
      { id: "fev1", label: "FEV1", priority: "secondary", supportedNow: false, source: null, unit: "L", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fev1" },
      { id: "fvc", label: "FVC", priority: "secondary", supportedNow: false, source: null, unit: "L", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fvc" },
      { id: "sleep-apnea-status", label: "Sleep apnea / breathing study", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-apnea-status" },
    ],
  },
  {
    categoryId: "digestive",
    title: "Digestive",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "bowel-pattern", label: "Bowel pattern", priority: "core", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/bowel-pattern" },
      { id: "gi-symptoms", label: "GI symptoms", priority: "core", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/gi-symptoms" },
      { id: "reflux", label: "Reflux / upper GI", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/reflux" },
      { id: "colorectal-screening", label: "Colorectal screening", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/colorectal-screening" },
    ],
  },
  {
    categoryId: "endocrine-hormonal",
    title: "Endocrine & hormonal",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "tsh", label: "TSH", priority: "core", supportedNow: false, source: null, unit: "mIU/L", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/tsh" },
      { id: "free-t4", label: "Free T4", priority: "core", supportedNow: false, source: null, unit: "ng/dL", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/free-t4" },
      { id: "sex-hormones", label: "Sex hormones", priority: "secondary", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sex-hormones" },
      { id: "cortisol", label: "Cortisol", priority: "secondary", supportedNow: false, source: null, unit: "µg/dL", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/cortisol" },
    ],
  },
  {
    categoryId: "musculoskeletal",
    title: "Musculoskeletal",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "workouts-count", label: "Workouts", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "strength.workoutsCount" }, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/workouts-count" },
      { id: "total-sets", label: "Sets", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "strength.totalSets" }, unit: "sets", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/total-sets" },
      { id: "total-reps", label: "Reps", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "strength.totalReps" }, unit: "reps", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/total-reps" },
      { id: "training-volume", label: "Training volume", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "strength.totalVolumeByUnit" }, unit: "volume", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/training-volume" },
      { id: "injury-status", label: "Injury / rehab status", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/injury-status" },
    ],
  },
  {
    categoryId: "sleep-circadian",
    title: "Sleep & circadian",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "sleep-duration", label: "Sleep duration", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "sleep.totalMinutes" }, unit: "min", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-duration" },
      { id: "sleep-quality", label: "Sleep quality", priority: "secondary", supportedNow: false, source: null, unit: "score", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-quality" },
      { id: "sleep-regularity", label: "Sleep regularity", priority: "secondary", supportedNow: false, source: null, unit: "score", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-regularity" },
      { id: "sleep-timing", label: "Sleep timing", priority: "secondary", supportedNow: false, source: null, unit: "time", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-timing" },
      { id: "sleep-apnea-status", label: "Sleep apnea / breathing study", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sleep-apnea-status" },
    ],
  },
  {
    categoryId: "nutrition-metabolism",
    title: "Nutrition & metabolism",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "calories", label: "Calories", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "nutrition.totalKcal" }, unit: "kcal", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/calories" },
      { id: "protein", label: "Protein", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "nutrition.proteinG" }, unit: "g", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/protein" },
      { id: "carbs", label: "Carbs", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "nutrition.carbsG" }, unit: "g", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/carbs" },
      { id: "fat", label: "Fat", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "nutrition.fatG" }, unit: "g", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fat" },
      { id: "fiber", label: "Fiber", priority: "secondary", supportedNow: false, source: null, unit: "g", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fiber" },
      { id: "fasting-glucose", label: "Fasting glucose", priority: "secondary", supportedNow: false, source: null, unit: "mg/dL", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fasting-glucose" },
      { id: "a1c", label: "HbA1c", priority: "secondary", supportedNow: false, source: null, unit: "%", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/a1c" },
    ],
  },
  {
    categoryId: "recovery-autonomic",
    title: "Recovery & autonomic",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "recovery-hrv", label: "HRV", priority: "core", supportedNow: true, source: { type: "dailyFacts", path: "recovery.hrvRmssd" }, unit: "ms", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/recovery-hrv" },
      { id: "hrv-baseline", label: "HRV baseline", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "recovery.hrvRmssdBaseline" }, unit: "ms", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/hrv-baseline" },
      { id: "hrv-deviation", label: "HRV deviation", priority: "secondary", supportedNow: true, source: { type: "dailyFacts", path: "recovery.hrvRmssdDeviation" }, unit: "%", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/hrv-deviation" },
      { id: "fatigue-readiness", label: "Fatigue / readiness", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fatigue-readiness" },
    ],
  },
  {
    categoryId: "labs-biomarkers",
    title: "Labs & biomarkers",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "lab-results-count", label: "Lab results", priority: "core", supportedNow: true, source: { type: "labResults", path: "items.length" }, unit: "results", emptyLabel: "No results", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/lab-results-count" },
      { id: "lipid-panel", label: "Lipid profile", priority: "core", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/lipid-panel" },
      { id: "a1c", label: "HbA1c", priority: "core", supportedNow: false, source: null, unit: "%", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/a1c" },
      { id: "fasting-glucose", label: "Fasting glucose", priority: "core", supportedNow: false, source: null, unit: "mg/dL", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fasting-glucose" },
      { id: "cbc", label: "CBC", priority: "secondary", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/cbc" },
      { id: "cmp", label: "CMP", priority: "secondary", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/cmp" },
      { id: "hs-crp", label: "hs-CRP", priority: "secondary", supportedNow: false, source: null, unit: "mg/L", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/hs-crp" },
      { id: "creatinine-egfr", label: "Creatinine / eGFR", priority: "secondary", supportedNow: false, source: null, unit: "lab", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/creatinine-egfr" },
      { id: "thyroid-panel", label: "Thyroid panel", priority: "secondary", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/thyroid-panel" },
    ],
  },
  {
    categoryId: "immune-inflammation",
    title: "Immune & inflammation",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "inflammation", label: "Inflammation markers", priority: "core", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/inflammation" },
      { id: "immune-markers", label: "Immune markers", priority: "core", supportedNow: false, source: null, unit: "panel", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/immune-markers" },
      { id: "illness-status", label: "Illness status", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/illness-status" },
      { id: "vaccination-status", label: "Vaccination status", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/vaccination-status" },
    ],
  },
  {
    categoryId: "mental-cognitive",
    title: "Mental & cognitive",
    group: "HEALTH SYSTEMS",
    metrics: [
      { id: "mood", label: "Mood", priority: "core", supportedNow: false, source: null, unit: "score", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/mood" },
      { id: "fatigue", label: "Fatigue", priority: "core", supportedNow: false, source: null, unit: "score", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/fatigue" },
      { id: "cognitive-status", label: "Cognitive status", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/cognitive-status" },
      { id: "depression-anxiety", label: "Depression / anxiety symptoms", priority: "secondary", supportedNow: false, source: null, unit: "score", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/depression-anxiety" },
    ],
  },
  {
    categoryId: "medications-supplements",
    title: "Medications & supplements",
    group: "CLINICAL RECORDS",
    metrics: [
      { id: "active-medications", label: "Active medications", priority: "core", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/active-medications" },
      { id: "supplements", label: "Supplements", priority: "core", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/supplements" },
      { id: "adherence", label: "Adherence", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/adherence" },
      { id: "side-effects", label: "Side effects", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/side-effects" },
    ],
  },
  {
    categoryId: "conditions-diagnoses",
    title: "Conditions & diagnoses",
    group: "CLINICAL RECORDS",
    metrics: [
      { id: "active-conditions", label: "Active conditions", priority: "core", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/active-conditions" },
      { id: "diagnoses", label: "Diagnoses", priority: "core", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/diagnoses" },
      { id: "care-plan", label: "Care plan", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/care-plan" },
      { id: "alerts-restrictions", label: "Alerts / restrictions", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/alerts-restrictions" },
    ],
  },
  {
    categoryId: "imaging-documents",
    title: "Imaging & documents",
    group: "CLINICAL RECORDS",
    metrics: [
      { id: "uploads", label: "Uploads", priority: "core", supportedNow: true, source: { type: "uploadsPresence", path: "count" }, unit: "uploads", emptyLabel: "No uploads", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/uploads" },
      { id: "latest-upload", label: "Latest upload", priority: "secondary", supportedNow: true, source: { type: "uploadsPresence", path: "latest.observedAt" }, unit: "date", emptyLabel: "No uploads", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/latest-upload" },
      { id: "dexa-reports", label: "DEXA reports", priority: "secondary", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/dexa-reports" },
      { id: "lab-pdfs", label: "Lab PDFs / reports", priority: "secondary", supportedNow: false, source: null, unit: "count", emptyLabel: "Not yet recorded", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/lab-pdfs" },
    ],
  },
  {
    categoryId: "data-quality",
    title: "Data quality",
    group: "RECORD INTEGRITY",
    metrics: [
      { id: "open-issues", label: "Open issues", priority: "core", supportedNow: true, source: { type: "failuresRange", path: "items.length" }, unit: "issues", emptyLabel: "None", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/open-issues" },
      { id: "uncertain-records", label: "Uncertain records", priority: "secondary", supportedNow: false, source: null, unit: "count", emptyLabel: "None", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/uncertain-records" },
      { id: "missing-core-fields", label: "Missing core fields", priority: "secondary", supportedNow: false, source: null, unit: "count", emptyLabel: "None", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/missing-core-fields" },
      { id: "sync-status", label: "Sync / import status", priority: "secondary", supportedNow: false, source: null, unit: "status", emptyLabel: "None", unavailableLabel: "Not yet available in Oli", detailRoute: "/manage/metric/sync-status" },
    ],
  },
];

function getRange90Days(): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

type RowProps = {
  title: string;
  subtitle: string;
  isExpanded: boolean;
  muted?: boolean;
  onPress: () => void;
  accessibilityLabel: string;
};

function RecordRow({ title, subtitle, isExpanded, muted = false, onPress, accessibilityLabel }: RowProps) {
  const content = (
    <View style={styles.rowInner}>
      <View style={styles.rowLeft}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={[styles.rowSubtitle, muted && styles.rowSubtitleMuted]}>{subtitle}</Text>
      </View>
      <Ionicons
        name={isExpanded ? "chevron-up" : "chevron-down"}
        size={20}
        color="#8E8E93"
      />
    </View>
  );
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      {content}
    </Pressable>
  );
}

export default function ManageScreen() {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const day = useMemo(() => getTodayDayKey(), []);
  const range = useMemo(() => getRange90Days(), []);

  const dailyFacts = useDailyFacts(day);
  const labResults = useLabResults({ limit: 50 });
  const uploads = useUploadsPresence();
  const failures = useFailuresRange(
    { start: range.start, end: range.end, limit: 500 },
    { mode: "page" },
  );

  useEffect(() => {
    if (__DEV__) {
      console.log("[Manage] hook statuses:", {
        dailyFacts: dailyFacts.status,
        labResults: labResults.status,
        uploads: uploads.status,
        failures: failures.status,
      });
    }
  }, [dailyFacts.status, labResults.status, uploads.status, failures.status]);

  const metricDataContext: MetricDataContext = useMemo(
    () => ({
      dailyFacts: {
        status: dailyFacts.status,
        data: (dailyFacts as { data?: unknown }).data,
      },
      labResults: {
        status: labResults.status,
        data: (labResults as { data?: unknown }).data,
      },
      uploads: {
        status: uploads.status,
        data: (uploads as { data?: unknown }).data,
      },
      failures: {
        status: failures.status,
        data: (failures as { data?: unknown }).data,
      },
    }),
    [dailyFacts, labResults, uploads, failures],
  );

  const getSubtitle = (cat: HealthRecordCategory): string => {
    if (cat.recordState === "Missing") return FALLBACK_MISSING;

    switch (cat.id) {
      case "body": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready" || !dailyFacts.data.body?.weightKg) return FALLBACK_NO_DATA;
        const b = dailyFacts.data.body;
        const w = `${b.weightKg} kg`;
        if (b.bodyFatPercent != null) return `${w}, ${b.bodyFatPercent}% fat`;
        return w;
      }
      case "cardiovascular": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready") return FALLBACK_NO_DATA;
        // Collapsed summary priority: 1 Blood pressure, 2 Resting HR, 3 HRV, 4 VO₂ max, 5 Steps, 6 Activity min, 7 Blood lipids
        const hrv = dailyFacts.data?.recovery?.hrvRmssd;
        const steps = dailyFacts.data?.activity?.steps;
        const moveMinutes = dailyFacts.data?.activity?.moveMinutes;
        const parts: string[] = [];
        if (hrv != null) parts.push(`HRV ${Math.round(hrv)} ms`);
        if (steps != null) parts.push(`${steps.toLocaleString()} steps`);
        if (moveMinutes != null) parts.push(`${moveMinutes} min`);
        return parts.length ? parts.join(" · ") : FALLBACK_NO_DATA;
      }
      case "musculoskeletal": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready" || !dailyFacts.data.strength) return FALLBACK_NO_DATA;
        const s = dailyFacts.data.strength;
        if (s.workoutsCount > 0) return `${s.workoutsCount} workout${s.workoutsCount !== 1 ? "s" : ""}`;
        if (s.totalSets > 0) return `${s.totalSets} sets`;
        return FALLBACK_NO_DATA;
      }
      case "sleep": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready") return FALLBACK_NO_DATA;
        // Collapsed summary priority: 1 Sleep duration, 2 Sleep quality, 3 Sleep regularity, 4 Sleep timing, 5 Sleep apnea
        const totalMinutes = dailyFacts.data?.sleep?.totalMinutes;
        if (totalMinutes != null) return formatSleepMinutes(totalMinutes);
        return FALLBACK_NO_DATA;
      }
      case "nutrition": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready" || !dailyFacts.data.nutrition) return FALLBACK_NO_DATA;
        const n = dailyFacts.data.nutrition;
        if (n.totalKcal != null) return `${n.totalKcal.toLocaleString()} kcal`;
        if (n.proteinG != null) return `${n.proteinG} g protein`;
        return FALLBACK_NO_DATA;
      }
      case "recovery": {
        if (dailyFacts.status === "error") return "—";
        if (dailyFacts.status !== "ready" || dailyFacts.data.recovery?.hrvRmssd == null) return FALLBACK_NO_DATA;
        return `HRV ${Math.round(dailyFacts.data.recovery.hrvRmssd)} ms`;
      }
      case "labs": {
        if (labResults.status === "error") return "—";
        if (labResults.status !== "ready") return FALLBACK_NO_DATA;
        // Collapsed summary priority: 1 Latest high-signal biomarker, 2 Latest lab panel result, 3 Lab results count
        const count = (labResults as { data?: { items: unknown[] } }).data?.items?.length ?? 0;
        return count === 0 ? FALLBACK_NO_DATA : `${count} result${count !== 1 ? "s" : ""}`;
      }
      case "imaging": {
        if (uploads.status === "error") return "—";
        if (uploads.status !== "ready") return FALLBACK_NO_UPLOADS;
        const count = uploads.data.count;
        return count === 0 ? FALLBACK_NO_UPLOADS : `${count} upload${count !== 1 ? "s" : ""}`;
      }
      case "data-quality": {
        if (failures.status === "error") return "—";
        if (failures.status !== "ready") return FALLBACK_NONE;
        const count = failures.data.items.length;
        return count === 0 ? FALLBACK_NONE : `${count} issue${count !== 1 ? "s" : ""}`;
      }
      default:
        return FALLBACK_NO_DATA;
    }
  };

  type Metric = { id: string; label: string; value: string; barProgress?: number | undefined };

  const CATEGORY_ID_TO_METRIC_CATEGORY_ID: Record<string, string> = {
    body: "body-structural",
    cardiovascular: "cardiovascular",
    respiratory: "respiratory",
    digestive: "digestive",
    endocrine: "endocrine-hormonal",
    musculoskeletal: "musculoskeletal",
    sleep: "sleep-circadian",
    nutrition: "nutrition-metabolism",
    recovery: "recovery-autonomic",
    labs: "labs-biomarkers",
    immune: "immune-inflammation",
    mental: "mental-cognitive",
    medications: "medications-supplements",
    conditions: "conditions-diagnoses",
    imaging: "imaging-documents",
    "data-quality": "data-quality",
  };

  const getMetricsForCategory = (catId: string): Metric[] => {
    const metricCategoryId = CATEGORY_ID_TO_METRIC_CATEGORY_ID[catId];
    if (!metricCategoryId) return [];
    const config = MANAGE_METRIC_MAP.find((c) => c.categoryId === metricCategoryId);
    if (!config) return [];
    return config.metrics.map((m) => {
      const value = formatMetricValue(m, metricDataContext);
      const numericForBar = getMetricNumericForBar(m, metricDataContext);
      const barProgress =
        numericForBar != null && METRIC_BAR_RANGES[m.id]
          ? getBarProgress(m.id, numericForBar)
          : null;
      return {
        id: m.id,
        label: m.label,
        value,
        ...(barProgress != null ? { barProgress } : {}),
      };
    });
  };

  const healthSystems = HEALTH_RECORD_CATEGORIES.filter((c) => c.group === "Health Systems");
  const clinicalRecords = HEALTH_RECORD_CATEGORIES.filter((c) => c.group === "Clinical Records");
  const recordIntegrity = HEALTH_RECORD_CATEGORIES.filter((c) => c.group === "Record Integrity");

  const renderSection = (label: string, categories: HealthRecordCategory[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.rows}>
        {categories.map((cat) => {
          const subtitle = getSubtitle(cat);
          const isExpanded = expandedCategoryId === cat.id;
          const metrics = isExpanded ? getMetricsForCategory(cat.id) : [];
          return (
            <View key={cat.id} style={styles.categoryBlock}>
              <RecordRow
                title={cat.title}
                subtitle={subtitle}
                isExpanded={isExpanded}
                muted={cat.recordState === "Missing"}
                onPress={() =>
                  setExpandedCategoryId((prev) => (prev === cat.id ? null : cat.id))
                }
                accessibilityLabel={`${cat.title}. ${subtitle}`}
              />
              {isExpanded && (
                <View style={styles.expandedContainer}>
                  {metrics.map((m, index) => (
                    <Pressable
                      key={m.id}
                      style={({ pressed }) => [
                        styles.metricRow,
                        index > 0 && styles.metricRowDivider,
                        pressed && styles.metricRowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${m.label}. ${m.value}`}
                      onPress={() => {
                        // Metric rows are tappable but do not navigate yet (no metric detail routes implemented).
                      }}
                    >
                      <View style={styles.metricRowInner}>
                        <View style={styles.metricLine1}>
                          <View style={styles.metricContent}>
                            <Text style={styles.metricLabel} numberOfLines={1}>
                              {m.label}
                            </Text>
                            <Text style={styles.metricValue} numberOfLines={1}>
                              {m.value}
                            </Text>
                          </View>
                        </View>
                        {m.barProgress != null && (
                          <View style={styles.metricBarTrack}>
                            <View
                              style={[
                                styles.metricBarFill,
                                {
                                  width: `${Math.max(0, Math.min(1, m.barProgress)) * 100}%`,
                                },
                              ]}
                            />
                          </View>
                        )}
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <ScreenContainer>
      <ScrollView contentContainerStyle={styles.scroll}>
        <PageTitleRow
          title="Manage"
          subtitle="Your health record — tracked and missing."
          rightSlot={<SettingsGearButton />}
        />
        {renderSection("HEALTH SYSTEMS", healthSystems)}
        {renderSection("CLINICAL RECORDS", clinicalRecords)}
        {renderSection("RECORD INTEGRITY", recordIntegrity)}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16, paddingBottom: 40 },
  section: { marginTop: 24 },
  sectionLabel: {
    marginBottom: 10,
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    textTransform: "uppercase",
  },
  rows: { gap: 8 },
  categoryBlock: {
    backgroundColor: "#FAFAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E8E8ED",
    overflow: "hidden",
  },
  row: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  rowPressed: { opacity: 0.92 },
  rowInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rowLeft: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: "600", color: "#1C1C1E" },
  rowSubtitle: { fontSize: 15, color: "#6E6E73" },
  rowSubtitleMuted: { color: "#8E8E93" },
  expandedContainer: {
    backgroundColor: "#F5F5F7",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 12,
    gap: 0,
  },
  metricRow: {
    minHeight: 52,
    paddingVertical: 10,
  },
  metricRowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5EA",
  },
  metricRowPressed: {
    backgroundColor: "#E5E5EA",
  },
  metricRowInner: {
    flex: 1,
    gap: 8,
  },
  metricLine1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  metricContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flex: 1,
    marginRight: 8,
  },
  metricLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1C1C1E",
    flex: 1,
    marginRight: 8,
  },
  metricValue: {
    fontSize: 15,
    color: "#3C3C43",
    flexShrink: 0,
  },
  metricBarTrack: {
    height: 3,
    backgroundColor: "#E5E5EA",
    borderRadius: 2,
    overflow: "hidden",
  },
  metricBarFill: {
    height: "100%",
    backgroundColor: "#8E8E93",
    borderRadius: 2,
  },
});
