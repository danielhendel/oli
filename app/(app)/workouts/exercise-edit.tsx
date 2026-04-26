import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import {
  isUserScopedCustomExerciseId,
  type ExerciseDefinitionLaterality,
  type ExerciseDefinitionStability,
  type ExerciseDefinitionUpdateBody,
} from "@oli/contracts";
import { ExerciseEditSettingCard } from "@/components/workouts/ExerciseEditSettingCard";
import { ExerciseMediaActionSheet } from "@/components/workouts/ExerciseMediaActionSheet";
import { ExerciseMediaCard } from "@/components/workouts/ExerciseMediaCard";
import { MuscleContributionsEditor } from "@/components/workouts/MuscleContributionsEditor";
import { HeaderBackButton } from "@/lib/ui/HeaderBackButton";
import {
  WORKOUTS_SCREEN_CONTENT_BG,
  workoutsStackNavigationOptions,
} from "@/lib/ui/headers/workoutsStackHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import type { Equipment, MuscleGroupDetailed, PrimaryBucket } from "@/lib/workouts/exercises/taxonomy";
import {
  isMuscleSplitTotalUnit,
  muscleContributionWeightSum,
} from "@/lib/workouts/exercises/muscleContributionSplit";
import {
  isMuscleSubgroup,
  validateMuscleContributions,
  type MuscleContribution,
} from "@/lib/workouts/exercises/taxonomy";
import type { MovementPattern } from "@/lib/workouts/exercises/metadata";
import { updateExerciseDefinition } from "@/lib/api/exerciseDefinitions";
import {
  updateCustomExercise,
  type CustomExerciseLoggingType,
  type CustomExerciseRecord,
  type CustomExerciseUpdatePatch,
} from "@/lib/workouts/exercises/customExerciseStore";
import { listMergedCustomExerciseRecords } from "@/lib/workouts/exercises/mergeCustomExerciseSources";
import {
  captureExerciseMediaWithCamera,
  pickExerciseMediaFromLibrary,
  type ExerciseMediaSlot,
} from "@/lib/workouts/exercises/pickExerciseMedia";
import { uploadExerciseDefinitionSlotMediaFromPick } from "@/lib/workouts/exercises/uploadExerciseDefinitionSlotMediaFromPick";
import { elevatedCardSurfaceStyle } from "@/lib/ui/theme/elevatedCardSurface";
import { SYSTEM_ACCENT } from "@/lib/ui/theme/systemAccent";
import { UI_TEXT_MUTED, UI_TEXT_PRIMARY } from "@/lib/ui/theme/uiTokens";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EQUIPMENT_OPTIONS: Equipment[] = [
  "Barbell",
  "Dumbbell",
  "Kettlebell",
  "Machine",
  "Cable",
  "Bodyweight",
  "Band",
  "MedicineBall",
  "Sled",
  "CardioMachine",
  "Other",
];

const PRIMARY_OPTIONS: (PrimaryBucket | "Other")[] = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Legs",
  "Core",
  "Full body",
  "Other",
];

const LOGGING_TYPE_OPTIONS: { value: CustomExerciseLoggingType; label: string }[] = [
  { value: "weight_reps", label: "Weight + reps" },
  { value: "reps_only", label: "Reps only" },
  { value: "bodyweight_reps", label: "Bodyweight reps" },
  { value: "time", label: "Time" },
  { value: "distance", label: "Distance" },
  { value: "custom", label: "Custom" },
];

const MOVEMENT_OPTIONS: { value: MovementPattern; label: string }[] = [
  { value: "push", label: "Push" },
  { value: "pull", label: "Pull" },
  { value: "squat", label: "Squat" },
  { value: "hinge", label: "Hinge" },
  { value: "carry", label: "Carry" },
  { value: "core", label: "Core" },
  { value: "isolation", label: "Isolation" },
  { value: "lunge", label: "Lunge" },
  { value: "rotation", label: "Rotation" },
  { value: "gait", label: "Gait" },
];

const MOVEMENT_PATTERN_CHIPS: { value: MovementPattern | null; label: string }[] = [
  { value: null, label: "Not set" },
  ...MOVEMENT_OPTIONS,
];

const STABILITY_CHIPS: { value: ExerciseDefinitionStability | null; label: string }[] = [
  { value: null, label: "Not set" },
  { value: "machine", label: "Machine / braced" },
  { value: "free", label: "Free motion" },
];

const LATERALITY_CHIPS: { value: ExerciseDefinitionLaterality | null; label: string }[] = [
  { value: null, label: "Not set" },
  { value: "bilateral", label: "Bilateral" },
  { value: "unilateral", label: "Unilateral" },
];

type SheetCategory =
  | "name"
  | "aliases"
  | "equipment"
  | "primary"
  | "loggingType"
  | "movementPattern"
  | "stability"
  | "laterality"
  | "primaryMusclesDetailed"
  | "secondaryMusclesDetailed"
  | "muscleSplit";

type ActiveSheet =
  | null
  | { id: "name"; name: string }
  | { id: "aliases"; aliasesText: string }
  | { id: "equipment"; equipment: Equipment }
  | { id: "primary"; primary: PrimaryBucket | "Other" }
  | { id: "loggingType"; loggingType: CustomExerciseLoggingType }
  | { id: "movementPattern"; movementPattern: MovementPattern | null }
  | { id: "stability"; stability: ExerciseDefinitionStability | null }
  | { id: "laterality"; laterality: ExerciseDefinitionLaterality | null }
  | { id: "primaryMusclesDetailed"; primaryMusclesText: string }
  | { id: "secondaryMusclesDetailed"; secondaryMusclesText: string }
  | { id: "muscleSplit"; muscleContributions: MuscleContribution[] };

const SHEET_TITLES: Record<SheetCategory, string> = {
  name: "Exercise name",
  aliases: "Aliases",
  equipment: "Equipment type",
  primary: "Primary muscle group",
  loggingType: "Logging type",
  movementPattern: "Movement pattern",
  stability: "Stability",
  laterality: "Laterality",
  primaryMusclesDetailed: "Primary muscles (detailed)",
  secondaryMusclesDetailed: "Secondary muscles (detailed)",
  muscleSplit: "Muscle load split",
};

const SHEET_EXPLAINERS: Record<SheetCategory, string> = {
  name: "This is the name you’ll see in workouts and history. Use the name you naturally say in the gym.",
  aliases: "Aliases help Oli recognize the same exercise when it is written different ways. Example: “ohp” and “overhead press” for one lift.",
  equipment:
    "Equipment helps Oli compare machine, cable, barbell, dumbbell, and bodyweight training. Pick what you actually use for this exercise.",
  primary:
    "This is the main body area the exercise trains. It is used for simple weekly summaries (for example “chest volume this week”).",
  loggingType:
    "This tells Oli what numbers to track for the exercise — for example weight and reps, reps only, or time.",
  movementPattern:
    "This describes the type of movement, like push, pull, squat, or hinge. It helps Oli understand training balance across patterns.",
  stability:
    "Machine/braced exercises guide your path. Free motion exercises require more balance and control. This is separate from which equipment you pick.",
  laterality: "Bilateral means both sides work together. Unilateral means one side works at a time.",
  primaryMusclesDetailed:
    "Optional finer muscle labels (for example DeltsAnterior, UpperPecs). They power detailed analytics beyond the simple primary group.",
  secondaryMusclesDetailed:
    "Optional supporting muscles for this lift. Use the same style of labels as primary detailed — comma-separated.",
  muscleSplit:
    "This tells Oli how much each muscle contributes so volume insights are more accurate. Weights are relative shares that should add up to 100%.",
};

/** Action-oriented tips shown under “How to edit”. */
const SHEET_HOW_TO_EDIT: Record<SheetCategory, string> = {
  name: "Type the full name. Example: “Landmine press” or “Atlas stone load”.",
  aliases: "Separate aliases with commas. Example: landmine, lm press, landmine ohp.",
  equipment: "Tap one option — pick what you actually use for this exercise.",
  primary: "Tap the bucket that best matches where you feel the exercise most.",
  loggingType: "Choose how you log sets (weight + reps, time, distance, etc.).",
  movementPattern: "Pick the closest pattern, or “Not set” if you prefer to leave it blank.",
  stability: "Use machine/braced when the path is fixed; free motion when you stabilize yourself.",
  laterality: "Bilateral for both sides together; unilateral for one side at a time.",
  primaryMusclesDetailed: "Use taxonomy labels separated by commas. Example: DeltsAnterior, UpperPecs.",
  secondaryMusclesDetailed: "List supporting muscles the same way. Example: Triceps, DeltsPosterior.",
  muscleSplit: "Add rows, pick subgroups, and use Normalize so weights total 100% for best insights.",
};

function trimCollapse(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function splitCommaList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function labelForLoggingType(v: CustomExerciseLoggingType): string {
  return LOGGING_TYPE_OPTIONS.find((o) => o.value === v)?.label ?? v;
}

function labelForMovement(m: MovementPattern | null): string {
  if (m == null) return "Not set";
  return MOVEMENT_OPTIONS.find((o) => o.value === m)?.label ?? m;
}

function labelForStability(s: ExerciseDefinitionStability | null): string {
  if (s == null) return "Not set";
  return STABILITY_CHIPS.find((o) => o.value === s)?.label ?? s;
}

function labelForLaterality(l: ExerciseDefinitionLaterality | null): string {
  if (l == null) return "Not set";
  return LATERALITY_CHIPS.find((o) => o.value === l)?.label ?? l;
}

function formatMuscleSplitSummary(rows: MuscleContribution[]): string {
  if (rows.length === 0) return "Not set";
  const sum = muscleContributionWeightSum(rows);
  const pct = Math.round(sum * 1000) / 10;
  const suffix = isMuscleSplitTotalUnit(sum) ? "" : ` (${pct}% total — not 100%)`;
  return `${rows.length} muscle${rows.length === 1 ? "" : "s"}${suffix}`;
}

function formatExerciseMediaSummary(imageUrl: string, videoUrl: string): string {
  const i = trimCollapse(imageUrl);
  const v = trimCollapse(videoUrl);
  const parts: string[] = [];
  if (i.length > 0) parts.push("Image");
  if (v.length > 0) parts.push("Video");
  return parts.length === 0 ? "None" : parts.join(" · ");
}

type SheetBaselineSource = {
  name: string;
  aliasesText: string;
  equipment: Equipment;
  primary: PrimaryBucket | "Other";
  loggingType: CustomExerciseLoggingType;
  movementPattern: MovementPattern | null;
  stability: ExerciseDefinitionStability | null;
  laterality: ExerciseDefinitionLaterality | null;
  primaryMusclesText: string;
  secondaryMusclesText: string;
  muscleContributions: MuscleContribution[];
  imageUrl: string;
  videoUrl: string;
};

/** Value shown in “Current value” — from committed form state, not the in-modal draft. */
function committedBaselineForCategory(id: SheetCategory, m: SheetBaselineSource): string {
  switch (id) {
    case "name":
      return m.name.trim().length === 0 ? "—" : trimCollapse(m.name);
    case "aliases":
      return trimCollapse(m.aliasesText).length === 0 ? "None" : m.aliasesText.trim();
    case "equipment":
      return m.equipment;
    case "primary":
      return m.primary;
    case "loggingType":
      return labelForLoggingType(m.loggingType);
    case "movementPattern":
      return labelForMovement(m.movementPattern);
    case "stability":
      return labelForStability(m.stability);
    case "laterality":
      return labelForLaterality(m.laterality);
    case "primaryMusclesDetailed":
      return trimCollapse(m.primaryMusclesText).length === 0 ? "None" : m.primaryMusclesText.trim();
    case "secondaryMusclesDetailed":
      return trimCollapse(m.secondaryMusclesText).length === 0 ? "None" : m.secondaryMusclesText.trim();
    case "muscleSplit":
      return formatMuscleSplitSummary(m.muscleContributions);
    default: {
      const _e: never = id;
      void _e;
      return "";
    }
  }
}

export default function EditExerciseScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams<{
    exerciseId?: string;
    sessionId?: string;
    blockId?: string;
    logReturnPath?: string;
    enrichDay?: string;
    enrichTargetId?: string;
    sessionAnchorIso?: string;
    journalSessionId?: string;
  }>();
  const { user, initializing, getIdToken } = useAuth();
  const insets = useSafeAreaInsets();

  const exerciseId = typeof params.exerciseId === "string" ? params.exerciseId.trim() : "";
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : undefined;
  const blockId = typeof params.blockId === "string" ? params.blockId : undefined;
  const returnToEnrich = params.logReturnPath === "enrich";

  const [sheet, setSheet] = useState<ActiveSheet>(null);
  const sheetRef = useRef<ActiveSheet>(null);
  sheetRef.current = sheet;

  const [loadStatus, setLoadStatus] = useState<"loading" | "ready" | "notfound" | "forbidden">("loading");
  const [name, setName] = useState("");
  const [aliasesText, setAliasesText] = useState("");
  const [equipment, setEquipment] = useState<Equipment>("Machine");
  const [primary, setPrimary] = useState<PrimaryBucket | "Other">("Full body");
  const [loggingType, setLoggingType] = useState<CustomExerciseLoggingType>("weight_reps");
  const [movementPattern, setMovementPattern] = useState<MovementPattern | null>(null);
  const [stability, setStability] = useState<ExerciseDefinitionStability | null>(null);
  const [laterality, setLaterality] = useState<ExerciseDefinitionLaterality | null>(null);
  const [primaryMusclesText, setPrimaryMusclesText] = useState("");
  const [secondaryMusclesText, setSecondaryMusclesText] = useState("");
  const [muscleContributions, setMuscleContributions] = useState<MuscleContribution[]>([]);
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [mediaSheet, setMediaSheet] = useState<{ slot: ExerciseMediaSlot } | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);

  const headerTitle = useMemo(() => {
    if (loadStatus !== "ready") return "Exercise";
    const t = trimCollapse(name);
    return t.length > 0 ? t : "Exercise";
  }, [loadStatus, name]);

  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const renderHeaderBack = useCallback(
    () => <HeaderBackButton onPress={() => navigationRef.current.goBack()} />,
    [],
  );

  const lastNavChrome = useRef<{ title: string } | null>(null);
  useLayoutEffect(() => {
    const prev = lastNavChrome.current;
    if (prev != null && prev.title === headerTitle) return;
    lastNavChrome.current = { title: headerTitle };
    navigationRef.current.setOptions({
      ...workoutsStackNavigationOptions("task"),
      title: headerTitle,
      headerStyle: { backgroundColor: WORKOUTS_SCREEN_CONTENT_BG },
      headerLeft: renderHeaderBack,
    });
  }, [headerTitle, renderHeaderBack]);

  useEffect(() => {
    if (!user || initializing) return;
    if (exerciseId.length === 0) {
      setLoadStatus("notfound");
      return;
    }
    if (!isUserScopedCustomExerciseId(user.uid, exerciseId)) {
      setLoadStatus("forbidden");
      return;
    }
    let cancelled = false;
    setLoadStatus("loading");
    void listMergedCustomExerciseRecords(user.uid, () => getIdToken(false))
      .then((rows: CustomExerciseRecord[]) => {
        if (cancelled) return;
        const row = rows.find((r: CustomExerciseRecord) => r.exerciseId === exerciseId);
        if (row == null) {
          setLoadStatus("notfound");
          return;
        }
        setName(row.name);
        setAliasesText(row.aliases != null ? row.aliases.join(", ") : "");
        setEquipment(row.equipment);
        setPrimary(row.primary);
        setLoggingType(row.loggingType);
        setMovementPattern(row.movementPattern ?? null);
        setStability(row.stability ?? null);
        setLaterality(row.laterality ?? null);
        setPrimaryMusclesText(row.primaryMusclesDetailed != null ? row.primaryMusclesDetailed.join(", ") : "");
        setSecondaryMusclesText(
          row.secondaryMusclesDetailed != null ? row.secondaryMusclesDetailed.join(", ") : "",
        );
        setMuscleContributions(row.muscleContributions != null ? [...row.muscleContributions] : []);
        setImageUrl(row.imageUrl ?? "");
        setVideoUrl(row.videoUrl ?? "");
        setLoadStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadStatus("notfound");
      });
    return () => {
      cancelled = true;
    };
  }, [user, initializing, exerciseId, getIdToken]);

  const canSave = useMemo(() => {
    if (loadStatus !== "ready") return false;
    if (saveStatus === "saving") return false;
    if (!user || initializing) return false;
    return trimCollapse(name).length > 0;
  }, [loadStatus, saveStatus, user, initializing, name]);

  const muscleSplitSaveWarning = useMemo(() => {
    if (muscleContributions.length === 0) return null;
    const sum = muscleContributionWeightSum(muscleContributions);
    if (isMuscleSplitTotalUnit(sum)) return null;
    const pct = Math.round(sum * 1000) / 10;
    return `Muscle split adds up to ${pct}% (not 100%). You can still save — use Normalize in the editor or adjust weights for clearer volume insights.`;
  }, [muscleContributions]);

  const sheetCommittedBaseline = useMemo(() => {
    if (sheet == null) return "";
    return committedBaselineForCategory(sheet.id, {
      name,
      aliasesText,
      equipment,
      primary,
      loggingType,
      movementPattern,
      stability,
      laterality,
      primaryMusclesText,
      secondaryMusclesText,
      muscleContributions,
      imageUrl,
      videoUrl,
    });
  }, [
    sheet,
    name,
    aliasesText,
    equipment,
    primary,
    loggingType,
    movementPattern,
    stability,
    laterality,
    primaryMusclesText,
    secondaryMusclesText,
    muscleContributions,
    imageUrl,
    videoUrl,
  ]);

  const commitSheet = useCallback(() => {
    const current = sheetRef.current;
    if (current == null) return;
    switch (current.id) {
      case "name":
        setName(current.name);
        break;
      case "aliases":
        setAliasesText(current.aliasesText);
        break;
      case "equipment":
        setEquipment(current.equipment);
        break;
      case "primary":
        setPrimary(current.primary);
        break;
      case "loggingType":
        setLoggingType(current.loggingType);
        break;
      case "movementPattern":
        setMovementPattern(current.movementPattern);
        break;
      case "stability":
        setStability(current.stability);
        break;
      case "laterality":
        setLaterality(current.laterality);
        break;
      case "primaryMusclesDetailed":
        setPrimaryMusclesText(current.primaryMusclesText);
        break;
      case "secondaryMusclesDetailed":
        setSecondaryMusclesText(current.secondaryMusclesText);
        break;
      case "muscleSplit":
        setMuscleContributions(current.muscleContributions);
        break;
      default: {
        const _exhaustive: never = current;
        void _exhaustive;
      }
    }
    setSheet(null);
  }, []);

  const uploadPickedAsset = useCallback(
    async (slot: ExerciseMediaSlot, picked: { uri: string; mimeType: string; filename: string }) => {
      if (exerciseId.length === 0) return;
      const setBusy = slot === "image" ? setImageUploading : setVideoUploading;
      setBusy(true);
      setError(null);
      try {
        console.info("[exercise-media] upload start", {
          slot,
          uri: picked.uri,
          mimeType: picked.mimeType,
          filename: picked.filename,
        });
        const url = await uploadExerciseDefinitionSlotMediaFromPick(exerciseId, slot, picked, getIdToken);
        if (slot === "image") setImageUrl(url);
        else setVideoUrl(url);
        if (user?.uid) {
          const mediaPatch: CustomExerciseUpdatePatch =
            slot === "image" ? { imageUrl: url } : { videoUrl: url };
          try {
            await updateCustomExercise(user.uid, exerciseId, mediaPatch);
          } catch {
            // Local cache only; Save changes still syncs to API. Picker may lag until Save if this fails.
          }
        }
        console.info("[exercise-media] upload finish", { slot, url });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Upload failed.";
        console.error("[exercise-media] upload failed", { slot, message });
        setError(message);
        Alert.alert("Upload failed", message);
      } finally {
        setBusy(false);
      }
    },
    [exerciseId, getIdToken, user?.uid],
  );

  const pickAndUploadMedia = useCallback(
    async (slot: ExerciseMediaSlot, source: "library" | "camera"): Promise<void> => {
      try {
        const picked =
          source === "library"
            ? await pickExerciseMediaFromLibrary(slot)
            : await captureExerciseMediaWithCamera(slot);
        if (picked == null) {
          console.info("[exercise-media] no asset selected", { slot, source });
          return;
        }
        await uploadPickedAsset(slot, picked);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Could not open media picker. Please try again.";
        console.error("[exercise-media] pick failed", { slot, source, message });
        setError(message);
        Alert.alert("Could not open picker", message);
      }
    },
    [uploadPickedAsset],
  );

  const navigateAfterSave = useCallback(() => {
    if (sessionId == null) {
      router.back();
      return;
    }
    const pathname = returnToEnrich ? "/(app)/workouts/enrich" : "/(app)/workouts/log";
    const nextParams: Record<string, string> = {
      sessionId,
      pickedExerciseId: exerciseId,
    };
    if (blockId) nextParams.blockId = blockId;
    if (returnToEnrich) {
      const d = typeof params.enrichDay === "string" ? params.enrichDay : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) nextParams.enrichDay = d;
      const t = typeof params.enrichTargetId === "string" ? params.enrichTargetId.trim() : "";
      if (t.length > 0) nextParams.enrichTargetId = t;
      const a = typeof params.sessionAnchorIso === "string" ? params.sessionAnchorIso.trim() : "";
      if (a.length > 0) nextParams.sessionAnchorIso = a;
      const j = typeof params.journalSessionId === "string" ? params.journalSessionId.trim() : "";
      if (j.length > 0) nextParams.journalSessionId = j;
    }
    router.replace({ pathname, params: nextParams });
  }, [
    router,
    sessionId,
    blockId,
    returnToEnrich,
    exerciseId,
    params.enrichDay,
    params.enrichTargetId,
    params.sessionAnchorIso,
    params.journalSessionId,
  ]);

  const onSave = async (): Promise<void> => {
    if (!user || exerciseId.length === 0) {
      setError("Missing user or exercise.");
      return;
    }
    const cleanName = trimCollapse(name);
    if (cleanName.length === 0) {
      setError("Exercise name is required.");
      return;
    }
    if (muscleContributions.length > 0) {
      for (const row of muscleContributions) {
        if (!isMuscleSubgroup(row.subgroup)) {
          setError("Muscle contributions contain an unknown subgroup.");
          return;
        }
      }
      if (!validateMuscleContributions(muscleContributions)) {
        setError("Muscle contributions failed validation (weights must be finite and ≥ 0).");
        return;
      }
    }

    const aliases = splitCommaList(aliasesText);
    const primaryMusclesDetailed = splitCommaList(primaryMusclesText);
    const secondaryMusclesDetailed = splitCommaList(secondaryMusclesText);

    const body: ExerciseDefinitionUpdateBody = {
      name: cleanName,
      equipment,
      primary,
      loggingType,
      aliases,
      primaryMusclesDetailed: primaryMusclesDetailed.length > 0 ? primaryMusclesDetailed : [],
      secondaryMusclesDetailed: secondaryMusclesDetailed.length > 0 ? secondaryMusclesDetailed : [],
      muscleContributions,
      stability,
      laterality,
    };
    if (movementPattern != null) body.movementPattern = movementPattern;
    const iu = trimCollapse(imageUrl);
    const vu = trimCollapse(videoUrl);
    body.imageUrl = iu;
    body.videoUrl = vu;

    setSaveStatus("saving");
    setError(null);
    try {
      const token = await getIdToken(false);
      if (token) {
        const res = await updateExerciseDefinition(token, exerciseId, body);
        if (!res.ok) {
          throw new Error(res.error ?? "Unable to update exercise.");
        }
      }
      const localPatch: CustomExerciseUpdatePatch = {
        name: cleanName,
        equipment,
        primary,
        loggingType,
        aliases,
        muscleContributions,
        stability,
        laterality,
      };
      if (movementPattern != null) localPatch.movementPattern = movementPattern;
      if (primaryMusclesDetailed.length > 0) {
        localPatch.primaryMusclesDetailed = primaryMusclesDetailed as MuscleGroupDetailed[];
      }
      if (secondaryMusclesDetailed.length > 0) {
        localPatch.secondaryMusclesDetailed = secondaryMusclesDetailed as MuscleGroupDetailed[];
      }
      localPatch.imageUrl = iu;
      localPatch.videoUrl = vu;
      await updateCustomExercise(user.uid, exerciseId, localPatch);
      navigateAfterSave();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Unable to save exercise.";
      setSaveStatus("idle");
      setError(message);
    }
  };

  const aliasesPreview = trimCollapse(aliasesText).length === 0 ? "None" : aliasesText.trim();
  const primaryMusclePreview =
    trimCollapse(primaryMusclesText).length === 0 ? "None" : primaryMusclesText.trim();
  const secondaryMusclePreview =
    trimCollapse(secondaryMusclesText).length === 0 ? "None" : secondaryMusclesText.trim();

  const renderSheetEditor = (): React.ReactNode => {
    if (sheet == null) return null;
    switch (sheet.id) {
      case "name":
        return (
          <>
            <TextInput
              value={sheet.name}
              onChangeText={(t) => setSheet({ id: "name", name: t })}
              placeholder="e.g. Landmine press"
              style={styles.input}
              accessibilityLabel="Exercise name"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </>
        );
      case "aliases":
        return (
          <>
            <TextInput
              value={sheet.aliasesText}
              onChangeText={(t) => setSheet({ id: "aliases", aliasesText: t })}
              placeholder="e.g. my press, landmine ohp"
              style={styles.input}
              accessibilityLabel="Aliases"
              autoCorrect={false}
            />
          </>
        );
      case "equipment":
        return (
          <>
            <View style={styles.chipRow}>
              {EQUIPMENT_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setSheet({ id: "equipment", equipment: opt })}
                  style={[styles.chip, sheet.equipment === opt && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Equipment ${opt}`}
                >
                  <Text style={[styles.chipText, sheet.equipment === opt && styles.chipTextSelected]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "primary":
        return (
          <>
            <View style={styles.chipRow}>
              {PRIMARY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  onPress={() => setSheet({ id: "primary", primary: opt })}
                  style={[styles.chip, sheet.primary === opt && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Primary muscle ${opt}`}
                >
                  <Text style={[styles.chipText, sheet.primary === opt && styles.chipTextSelected]}>{opt}</Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "loggingType":
        return (
          <>
            <View style={styles.chipRow}>
              {LOGGING_TYPE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  onPress={() => setSheet({ id: "loggingType", loggingType: opt.value })}
                  style={[styles.chip, sheet.loggingType === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Logging type ${opt.label}`}
                >
                  <Text style={[styles.chipText, sheet.loggingType === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "movementPattern":
        return (
          <>
            <View style={styles.chipRow}>
              {MOVEMENT_PATTERN_CHIPS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setSheet({ id: "movementPattern", movementPattern: opt.value })}
                  style={[styles.chip, sheet.movementPattern === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Movement ${opt.label}`}
                >
                  <Text style={[styles.chipText, sheet.movementPattern === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "stability":
        return (
          <>
            <View style={styles.chipRow}>
              {STABILITY_CHIPS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setSheet({ id: "stability", stability: opt.value })}
                  style={[styles.chip, sheet.stability === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Stability ${opt.label}`}
                >
                  <Text style={[styles.chipText, sheet.stability === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "laterality":
        return (
          <>
            <View style={styles.chipRow}>
              {LATERALITY_CHIPS.map((opt) => (
                <Pressable
                  key={opt.label}
                  onPress={() => setSheet({ id: "laterality", laterality: opt.value })}
                  style={[styles.chip, sheet.laterality === opt.value && styles.chipSelected]}
                  accessibilityRole="button"
                  accessibilityLabel={`Laterality ${opt.label}`}
                >
                  <Text style={[styles.chipText, sheet.laterality === opt.value && styles.chipTextSelected]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        );
      case "primaryMusclesDetailed":
        return (
          <>
            <TextInput
              value={sheet.primaryMusclesText}
              onChangeText={(t) => setSheet({ id: "primaryMusclesDetailed", primaryMusclesText: t })}
              placeholder="e.g. DeltsAnterior, UpperPecs"
              style={styles.input}
              accessibilityLabel="Primary muscles detailed"
              autoCorrect={false}
            />
          </>
        );
      case "secondaryMusclesDetailed":
        return (
          <>
            <TextInput
              value={sheet.secondaryMusclesText}
              onChangeText={(t) => setSheet({ id: "secondaryMusclesDetailed", secondaryMusclesText: t })}
              placeholder="e.g. Triceps"
              style={styles.input}
              accessibilityLabel="Secondary muscles detailed"
              autoCorrect={false}
            />
          </>
        );
      case "muscleSplit":
        return (
          <>
            <MuscleContributionsEditor
              value={sheet.muscleContributions}
              onChange={(next) => setSheet({ id: "muscleSplit", muscleContributions: next })}
            />
          </>
        );
      default: {
        const _ex: never = sheet;
        void _ex;
        return null;
      }
    }
  };

  if (loadStatus === "forbidden" || loadStatus === "notfound") {
    return (
      <View style={styles.centered}>
        <Text style={styles.fallbackTitle}>{loadStatus === "forbidden" ? "Cannot edit" : "Exercise not found"}</Text>
        <Text style={styles.pageSubtitle}>
          {loadStatus === "forbidden"
            ? "You can only edit exercises created on this account."
            : "This exercise is not available on this device."}
        </Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.saveButton} accessibilityRole="button">
          <Text style={styles.saveButtonText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (loadStatus === "loading") {
    return (
      <View style={styles.centered}>
        <Text style={styles.pageSubtitle}>Loading…</Text>
      </View>
    );
  }

  const sheetCategory: SheetCategory | null = sheet?.id ?? null;
  const sheetTitle = sheetCategory != null ? SHEET_TITLES[sheetCategory] : "";

  return (
    <View style={styles.screenRoot}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.pageContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.pageSubtitle}>Changes sync to your account when online.</Text>

        <Text style={styles.sectionHeading} accessibilityRole="header">
          Basics
        </Text>
        <View style={styles.sectionStack}>
          <ExerciseEditSettingCard
            title="Exercise name"
            value={name.trim().length === 0 ? "—" : name}
            onPressEdit={() => setSheet({ id: "name", name })}
            editAccessibilityLabel="Edit exercise name"
          />
          <ExerciseEditSettingCard
            title="Aliases"
            value={aliasesPreview}
            onPressEdit={() => setSheet({ id: "aliases", aliasesText })}
            editAccessibilityLabel="Edit aliases"
          />
          <ExerciseEditSettingCard
            title="Equipment type"
            value={equipment}
            onPressEdit={() => setSheet({ id: "equipment", equipment })}
            editAccessibilityLabel="Edit equipment type"
          />
          <ExerciseEditSettingCard
            title="Primary muscle group"
            value={primary}
            onPressEdit={() => setSheet({ id: "primary", primary })}
            editAccessibilityLabel="Edit primary muscle group"
          />
          <ExerciseEditSettingCard
            title="Logging type"
            value={labelForLoggingType(loggingType)}
            onPressEdit={() => setSheet({ id: "loggingType", loggingType })}
            editAccessibilityLabel="Edit logging type"
          />
        </View>

        <Text style={styles.sectionHeading} accessibilityRole="header">
          Physiology & analytics
        </Text>
        <View style={styles.sectionStack}>
          <ExerciseEditSettingCard
            title="Movement pattern"
            value={labelForMovement(movementPattern)}
            onPressEdit={() => setSheet({ id: "movementPattern", movementPattern })}
            editAccessibilityLabel="Edit movement pattern"
          />
          <ExerciseEditSettingCard
            title="Stability"
            value={labelForStability(stability)}
            onPressEdit={() => setSheet({ id: "stability", stability })}
            editAccessibilityLabel="Edit stability"
          />
          <ExerciseEditSettingCard
            title="Laterality"
            value={labelForLaterality(laterality)}
            onPressEdit={() => setSheet({ id: "laterality", laterality })}
            editAccessibilityLabel="Edit laterality"
          />
          <ExerciseEditSettingCard
            title="Primary muscles detailed"
            value={primaryMusclePreview}
            onPressEdit={() => setSheet({ id: "primaryMusclesDetailed", primaryMusclesText })}
            editAccessibilityLabel="Edit primary muscles detailed"
          />
          <ExerciseEditSettingCard
            title="Secondary muscles detailed"
            value={secondaryMusclePreview}
            onPressEdit={() => setSheet({ id: "secondaryMusclesDetailed", secondaryMusclesText })}
            editAccessibilityLabel="Edit secondary muscles detailed"
          />
          <ExerciseEditSettingCard
            title="Muscle load split"
            value={formatMuscleSplitSummary(muscleContributions)}
            onPressEdit={() => setSheet({ id: "muscleSplit", muscleContributions: [...muscleContributions] })}
            editAccessibilityLabel="Edit muscle load split"
          />
          {muscleSplitSaveWarning ? <Text style={styles.saveWarning}>{muscleSplitSaveWarning}</Text> : null}
        </View>

        <Text style={styles.sectionHeading} accessibilityRole="header">
          Media
        </Text>
        <Text style={styles.mediaSectionHint}>
          Reference photo or short video uploads to your account. Use Save changes to persist URLs with the exercise.
        </Text>
        <View style={styles.sectionStack}>
          <ExerciseMediaCard
            testID="exercise-media-image-card"
            title="Image"
            slot="image"
            previewUri={trimCollapse(imageUrl).length > 0 ? trimCollapse(imageUrl) : null}
            uploading={imageUploading}
            onPressAddReplace={() => setMediaSheet({ slot: "image" })}
            addReplaceAccessibilityLabel="Add or replace exercise image"
          />
          <ExerciseMediaCard
            testID="exercise-media-video-card"
            title="Video"
            slot="video"
            previewUri={trimCollapse(videoUrl).length > 0 ? trimCollapse(videoUrl) : null}
            uploading={videoUploading}
            onPressAddReplace={() => setMediaSheet({ slot: "video" })}
            addReplaceAccessibilityLabel="Add or replace exercise video"
          />
          <Text style={styles.mediaSummaryLine} accessibilityLabel="Media summary">
            {formatExerciseMediaSummary(imageUrl, videoUrl)}
          </Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          onPress={() => void onSave()}
          disabled={!canSave}
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <Text style={styles.saveButtonText}>{saveStatus === "saving" ? "Saving…" : "Save changes"}</Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={sheet != null}
        transparent
        animationType="slide"
        onRequestClose={() => setSheet(null)}
      >
        {sheet != null ? (
          <KeyboardAvoidingView
            testID="exercise-edit-category-sheet"
            style={styles.fsModalRoot}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={styles.fsDim}>
              <Pressable
                style={styles.fsBackdropTap}
                onPress={() => setSheet(null)}
                accessibilityLabel="Dismiss editor"
                accessibilityRole="button"
              />
              <View
                style={[
                  styles.fsPanel,
                  {
                    height: Math.round(
                      (typeof Dimensions.get === "function" ? Dimensions.get("window").height : 800) * 0.92,
                    ),
                  },
                ]}
              >
                <View style={styles.fsHeader}>
                  <Pressable
                    onPress={() => setSheet(null)}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel editing field"
                  >
                    <Text style={styles.fsHeaderCancelText}>Cancel</Text>
                  </Pressable>
                  <View style={styles.fsHeaderTitleCenter} pointerEvents="none">
                    <Text style={styles.fsHeaderTitle} numberOfLines={1} accessibilityRole="header">
                      {sheetTitle}
                    </Text>
                  </View>
                  <View style={styles.fsHeaderSpacer} />
                </View>

                <ScrollView
                  style={styles.fsScroll}
                  contentContainerStyle={styles.fsScrollContent}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.sectionHeading} accessibilityRole="header">
                    {"What you're editing"}
                  </Text>
                  <Text style={styles.fsWhatTitle}>{sheetTitle}</Text>
                  <Text style={styles.fsWhatBody}>{SHEET_EXPLAINERS[sheet.id]}</Text>

                  <Text style={[styles.sectionHeading, styles.fsSectionHeadingSpacer]} accessibilityRole="header">
                    Current value
                  </Text>
                  <View
                    style={[styles.fsValueCard, elevatedCardSurfaceStyle]}
                    testID="exercise-edit-current-value"
                    accessible
                    accessibilityLabel={`Current value: ${sheetCommittedBaseline}`}
                  >
                    <Text style={styles.fsValueCardText} importantForAccessibility="no">
                      {sheetCommittedBaseline}
                    </Text>
                  </View>

                  <Text style={[styles.sectionHeading, styles.fsSectionHeadingSpacer]} accessibilityRole="header">
                    How to edit
                  </Text>
                  <Text style={styles.fsHowBody}>{SHEET_HOW_TO_EDIT[sheet.id]}</Text>

                  <Text style={[styles.sectionHeading, styles.fsSectionHeadingSpacer]} accessibilityRole="header">
                    Your changes
                  </Text>
                  <View style={styles.fsInputBlock}>{renderSheetEditor()}</View>
                </ScrollView>

                <View
                  style={[
                    styles.fsStickySaveWrap,
                    { paddingBottom: Math.max(insets.bottom, 12) },
                  ]}
                >
                  <Pressable
                    onPress={commitSheet}
                    style={styles.fsStickySave}
                    accessibilityRole="button"
                    accessibilityLabel="Save field changes"
                  >
                    <Text style={styles.fsStickySaveText}>Save</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        ) : null}
      </Modal>

      <ExerciseMediaActionSheet
        testID="exercise-media-action-sheet"
        visible={mediaSheet != null}
        slot={mediaSheet?.slot ?? "image"}
        hasExisting={
          mediaSheet != null &&
          trimCollapse(mediaSheet.slot === "image" ? imageUrl : videoUrl).length > 0
        }
        onClose={() => setMediaSheet(null)}
        onChooseLibrary={() => {
          const slot = mediaSheet?.slot;
          setMediaSheet(null);
          if (slot == null) return;
          void pickAndUploadMedia(slot, "library");
        }}
        onUseCamera={() => {
          const slot = mediaSheet?.slot;
          setMediaSheet(null);
          if (slot == null) return;
          void pickAndUploadMedia(slot, "camera");
        }}
        onRemove={() => {
          const slot = mediaSheet?.slot;
          setMediaSheet(null);
          if (slot === "image") setImageUrl("");
          else if (slot === "video") setVideoUrl("");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  scroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  pageContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 28,
    gap: 16,
  },
  pageSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
  },
  mediaSectionHint: {
    fontSize: 14,
    lineHeight: 20,
    color: UI_TEXT_MUTED,
    marginTop: -8,
  },
  mediaSummaryLine: {
    fontSize: 13,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: "800",
    color: "#8E8E93",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginTop: 4,
  },
  sectionStack: {
    gap: 12,
  },
  centered: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  fallbackTitle: { fontSize: 20, fontWeight: "800", color: UI_TEXT_PRIMARY },
  saveWarning: {
    fontSize: 13,
    color: "#92400E",
    lineHeight: 18,
    fontWeight: "600",
    marginTop: -4,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#FCD34D",
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C6C6C8",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#1C1C1E",
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    backgroundColor: "#E5E5EA",
    borderRadius: 16,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  chipSelected: { backgroundColor: SYSTEM_ACCENT },
  chipText: { fontSize: 13, fontWeight: "600", color: "#1C1C1E" },
  chipTextSelected: { color: "#FFFFFF" },
  error: { color: "#B00020", fontSize: 13, fontWeight: "600", marginTop: 4 },
  saveButton: {
    marginTop: 4,
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  saveButtonDisabled: { opacity: 0.45 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  fsModalRoot: {
    flex: 1,
  },
  fsDim: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.38)",
  },
  fsBackdropTap: {
    ...StyleSheet.absoluteFillObject,
  },
  fsPanel: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 12,
  },
  fsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 10,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(60, 60, 67, 0.12)",
    backgroundColor: "#FFFFFF",
  },
  fsHeaderCancelText: {
    fontSize: 17,
    fontWeight: "600",
    color: SYSTEM_ACCENT,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fsHeaderTitleCenter: {
    position: "absolute",
    left: 88,
    right: 88,
    alignItems: "center",
  },
  fsHeaderTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: UI_TEXT_PRIMARY,
    textAlign: "center",
  },
  fsHeaderSpacer: {
    width: 88,
  },
  fsScroll: {
    flex: 1,
    backgroundColor: WORKOUTS_SCREEN_CONTENT_BG,
  },
  fsScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 6,
  },
  fsWhatTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: UI_TEXT_PRIMARY,
    marginTop: 2,
  },
  fsWhatBody: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "500",
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  fsSectionHeadingSpacer: {
    marginTop: 18,
  },
  fsValueCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 6,
  },
  fsValueCardText: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: "600",
    color: UI_TEXT_PRIMARY,
  },
  fsHowBody: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
    color: UI_TEXT_MUTED,
    marginTop: 4,
  },
  fsInputBlock: {
    marginTop: 6,
    gap: 12,
  },
  fsStickySaveWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(60, 60, 67, 0.12)",
    backgroundColor: "#FFFFFF",
  },
  fsStickySave: {
    backgroundColor: SYSTEM_ACCENT,
    borderRadius: 12,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  fsStickySaveText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
