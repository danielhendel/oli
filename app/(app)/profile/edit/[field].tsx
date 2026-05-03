import { UI_CARD_SURFACE } from "@/lib/ui/theme/uiTokens";

// app/(app)/profile/edit/[field].tsx — focused editors for Profile v1 fields
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Switch,
  ScrollView,
  Alert,
} from "react-native";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";

import {
  profileIsoDateSchema,
  type ProfileLengthUnit,
  type ProfilePrimaryGoal,
  type ProfileSexAtBirth,
  type ProfileWeighInPreference,
  type UserProfileMain,
  type UserProfileMainPatch,
} from "@oli/contracts";
import { useUserProfileMain } from "@/lib/data/profile/useUserProfileMain";
import { resolveUserProfileMainForUi } from "@/lib/data/profile/resolveUserProfileMainForUi";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";
import {
  LENGTH_UNIT_LABELS,
  PRIMARY_GOAL_LABELS,
  SEX_AT_BIRTH_LABELS,
  WEIGH_IN_LABELS,
} from "@/lib/profile/profileLabels";
import { feetInchesToCm, cmToFeetInches } from "@/lib/profile/heightConvert";

const FIELD_IDS = [
  "first_name",
  "last_name",
  "date_of_birth",
  "sex_at_birth",
  "height",
  "preferred_units",
  "athlete_mode",
  "primary_goal",
  "weigh_in_preference",
  "waist",
  "hip",
  "neck",
] as const;

type FieldId = (typeof FIELD_IDS)[number];

function isFieldId(s: string | undefined): s is FieldId {
  return !!s && (FIELD_IDS as readonly string[]).includes(s);
}

const TITLES: Record<FieldId, string> = {
  first_name: "First name",
  last_name: "Last name",
  date_of_birth: "Date of birth",
  sex_at_birth: "Sex at birth",
  height: "Height",
  preferred_units: "Preferred units",
  athlete_mode: "Athlete mode",
  primary_goal: "Primary goal",
  weigh_in_preference: "Usual weigh-in",
  waist: "Waist circumference",
  hip: "Hip circumference",
  neck: "Neck circumference",
};

export default function ProfileFieldEditorScreen() {
  const { field: fieldParam } = useLocalSearchParams<{ field: string }>();
  const field = isFieldId(fieldParam) ? fieldParam : null;
  const navigation = useNavigation();
  const router = useRouter();
  const { state, patch } = useUserProfileMain();
  const { state: prefState, setMassUnit } = usePreferences();

  const profile = resolveUserProfileMainForUi(state);

  useEffect(() => {
    const title = field ? TITLES[field] : "Profile";
    navigation.setOptions({ title });
  }, [navigation, field]);

  const [saving, setSaving] = useState(false);

  const onDone = useCallback(() => {
    router.back();
  }, [router]);

  if (!field) {
    return (
      <View style={styles.center}>
        <Text style={styles.error}>Unknown field.</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Sign in to edit your profile.</Text>
      </View>
    );
  }

  const busy = saving || (state.status === "partial" && state.profile !== null);

  // ----- first name -----
  if (field === "first_name") {
    return (
      <TextFieldEditor
        label="First name"
        initial={profile.identity.firstName ?? ""}
        placeholder="Optional"
        busy={busy}
        caption="Used to personalize the app. You can leave this blank."
        onSave={async (text) => {
          const v = text.trim();
          setSaving(true);
          try {
            const ok = await patch({ identity: { firstName: v.length ? v : null } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "last_name") {
    return (
      <TextFieldEditor
        label="Last name"
        initial={profile.identity.lastName ?? ""}
        placeholder="Optional"
        busy={busy}
        onSave={async (text) => {
          const v = text.trim();
          setSaving(true);
          try {
            const ok = await patch({ identity: { lastName: v.length ? v : null } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "date_of_birth") {
    return (
      <TextFieldEditor
        label="Date of birth"
        initial={profile.identity.dateOfBirth ?? ""}
        placeholder="YYYY-MM-DD"
        keyboardType="numbers-and-punctuation"
        busy={busy}
        caption="Used only to personalize ranges and summaries. Optional."
        onSave={async (text) => {
          const v = text.trim();
          if (!v) {
            setSaving(true);
            try {
              const ok = await patch({ identity: { dateOfBirth: null } });
              if (ok) onDone();
            } finally {
              setSaving(false);
            }
            return;
          }
          const parsed = profileIsoDateSchema.safeParse(v);
          if (!parsed.success) {
            Alert.alert("Date of birth", "Use format YYYY-MM-DD with a valid calendar date.");
            return;
          }
          setSaving(true);
          try {
            const ok = await patch({ identity: { dateOfBirth: parsed.data } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "sex_at_birth") {
    const options = Object.keys(SEX_AT_BIRTH_LABELS) as ProfileSexAtBirth[];
    return (
      <OptionListEditor<ProfileSexAtBirth>
        options={options.map((k) => ({ key: k, label: SEX_AT_BIRTH_LABELS[k] }))}
        busy={busy}
        onPick={async (k) => {
          setSaving(true);
          try {
            const ok = await patch({ identity: { sexAtBirth: k } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "height") {
    return (
      <HeightEditor
        profile={profile}
        busy={busy}
        patch={patch}
        onDone={onDone}
        setSaving={setSaving}
      />
    );
  }

  if (field === "preferred_units") {
    return (
      <PreferredUnitsEditor
        lengthUnit={profile.app.preferredUnits.length}
        massUnit={prefState.preferences.units.mass}
        busy={busy}
        patch={patch}
        setMassUnit={setMassUnit}
        onDone={onDone}
        setSaving={setSaving}
      />
    );
  }

  if (field === "athlete_mode") {
    return (
      <View style={styles.pad}>
        <Text style={styles.lede}>
          Athlete mode can adjust how we interpret training load and recovery context. You can change this anytime.
        </Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Athlete mode</Text>
          <Switch
            value={profile.bodyInputs.athleteMode}
            disabled={busy}
            onValueChange={async (v) => {
              setSaving(true);
              try {
                await patch({ bodyInputs: { athleteMode: v } });
              } finally {
                setSaving(false);
              }
            }}
          />
        </View>
        <Pressable style={styles.doneBtn} onPress={onDone} accessibilityRole="button">
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
    );
  }

  if (field === "primary_goal") {
    const options = Object.keys(PRIMARY_GOAL_LABELS) as ProfilePrimaryGoal[];
    return (
      <OptionListEditor<ProfilePrimaryGoal>
        options={options.map((k) => ({ key: k, label: PRIMARY_GOAL_LABELS[k] }))}
        busy={busy}
        onPick={async (k) => {
          setSaving(true);
          try {
            const ok = await patch({ bodyInputs: { primaryGoal: k } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "weigh_in_preference") {
    const options = Object.keys(WEIGH_IN_LABELS) as ProfileWeighInPreference[];
    return (
      <OptionListEditor<ProfileWeighInPreference>
        options={options.map((k) => ({ key: k, label: WEIGH_IN_LABELS[k] }))}
        busy={busy}
        footerHint="Helps us line up trends; does not change how weight is stored."
        onPick={async (k) => {
          setSaving(true);
          try {
            const ok = await patch({ bodyInputs: { usualWeighInPreference: k } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  if (field === "waist" || field === "hip" || field === "neck") {
    const key =
      field === "waist"
        ? "waistCircumferenceCm"
        : field === "hip"
          ? "hipCircumferenceCm"
          : "neckCircumferenceCm";
    const initial =
      field === "waist"
        ? profile.bodyInputs.waistCircumferenceCm
        : field === "hip"
          ? profile.bodyInputs.hipCircumferenceCm
          : profile.bodyInputs.neckCircumferenceCm;
    return (
      <CircumferenceEditor
        label={TITLES[field]}
        initialCm={initial}
        busy={busy}
        onSave={async (cm) => {
          setSaving(true);
          try {
            const ok = await patch({ bodyInputs: { [key]: cm } });
            if (ok) onDone();
          } finally {
            setSaving(false);
          }
        }}
      />
    );
  }

  return null;
}

function TextFieldEditor(props: {
  label: string;
  initial: string;
  placeholder?: string;
  keyboardType?: "default" | "numbers-and-punctuation";
  caption?: string;
  busy: boolean;
  onSave: (text: string) => Promise<void>;
}) {
  const [text, setText] = useState(props.initial);
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      {props.caption ? <Text style={styles.lede}>{props.caption}</Text> : null}
      <Text style={styles.inputLabel}>{props.label}</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={props.placeholder}
        editable={!props.busy}
        keyboardType={props.keyboardType ?? "default"}
        autoCapitalize="words"
        style={styles.input}
      />
      <Pressable
        style={[styles.primaryBtn, props.busy && styles.primaryBtnDisabled]}
        disabled={props.busy}
        onPress={() => void props.onSave(text)}
        accessibilityRole="button"
        accessibilityLabel={`Save ${props.label}`}
      >
        <Text style={styles.primaryBtnText}>{props.busy ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function OptionListEditor<T extends string>(props: {
  options: readonly { key: T; label: string }[];
  busy: boolean;
  footerHint?: string;
  onPick: (key: T) => Promise<void>;
}) {
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <View style={styles.listGroup}>
        {props.options.map((o) => (
          <Pressable
            key={o.key}
            style={styles.row}
            disabled={props.busy}
            onPress={() => void props.onPick(o.key)}
            accessibilityRole="button"
            accessibilityLabel={o.label}
          >
            <Text style={styles.rowTitle}>{o.label}</Text>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>
      {props.footerHint ? <Text style={styles.footerHint}>{props.footerHint}</Text> : null}
    </ScrollView>
  );
}

function CircumferenceEditor(props: {
  label: string;
  initialCm: number | null;
  busy: boolean;
  onSave: (cm: number | null) => Promise<void>;
}) {
  const [text, setText] = useState(props.initialCm != null ? String(props.initialCm) : "");
  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.lede}>Optional. Stored in centimeters. Leave empty to clear.</Text>
      <Text style={styles.inputLabel}>{props.label} (cm)</Text>
      <TextInput
        value={text}
        onChangeText={setText}
        keyboardType="decimal-pad"
        editable={!props.busy}
        style={styles.input}
      />
      <Pressable
        style={[styles.primaryBtn, props.busy && styles.primaryBtnDisabled]}
        disabled={props.busy}
        onPress={() => {
          const t = text.trim();
          if (!t) {
            void props.onSave(null);
            return;
          }
          const n = Number(t);
          if (!Number.isFinite(n)) {
            Alert.alert(props.label, "Enter a number or leave blank to clear.");
            return;
          }
          void props.onSave(n);
        }}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>{props.busy ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function HeightEditor(props: {
  profile: UserProfileMain;
  busy: boolean;
  patch: (p: UserProfileMainPatch) => Promise<boolean>;
  onDone: () => void;
  setSaving: (v: boolean) => void;
}) {
  const u = props.profile.app.preferredUnits.length;
  const h0 = props.profile.body.heightCm;

  const [cmText, setCmText] = useState(h0 != null ? String(Math.round(h0)) : "");
  const fi0 = useMemo(() => (h0 != null ? cmToFeetInches(h0) : { feet: 5, inches: 8 }), [h0]);
  const [ftText, setFtText] = useState(String(fi0.feet));
  const [inText, setInText] = useState(String(fi0.inches));

  const saveCm = async (cm: number | null) => {
    props.setSaving(true);
    try {
      const ok = await props.patch({ body: { heightCm: cm } });
      if (ok) props.onDone();
    } finally {
      props.setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.lede}>Optional. Change height units from Preferred units if needed.</Text>
      {u === "cm" ? (
        <>
          <Text style={styles.inputLabel}>Height (cm)</Text>
          <TextInput
            value={cmText}
            onChangeText={setCmText}
            keyboardType="number-pad"
            editable={!props.busy}
            style={styles.input}
          />
        </>
      ) : (
        <>
          <Text style={styles.inputLabel}>Feet</Text>
          <TextInput
            value={ftText}
            onChangeText={setFtText}
            keyboardType="number-pad"
            editable={!props.busy}
            style={styles.input}
          />
          <Text style={styles.inputLabel}>Inches</Text>
          <TextInput
            value={inText}
            onChangeText={setInText}
            keyboardType="decimal-pad"
            editable={!props.busy}
            style={styles.input}
          />
        </>
      )}
      <Pressable
        style={[styles.primaryBtn, props.busy && styles.primaryBtnDisabled]}
        disabled={props.busy}
        onPress={() => {
          if (u === "cm") {
            const t = cmText.trim();
            if (!t) {
              void saveCm(null);
              return;
            }
            const n = Number(t);
            if (!Number.isFinite(n) || n < 40 || n > 280) {
              Alert.alert("Height", "Enter a height between 40 and 280 cm, or leave blank to clear.");
              return;
            }
            void saveCm(n);
            return;
          }
          const ft = Number(ftText);
          const inch = Number(inText);
          if (!Number.isFinite(ft) || !Number.isFinite(inch) || inch < 0 || inch >= 12) {
            Alert.alert("Height", "Enter whole feet and inches (0–11).");
            return;
          }
          const cm = feetInchesToCm(ft, inch);
          if (cm < 40 || cm > 280) {
            Alert.alert("Height", "That height is out of range.");
            return;
          }
          void saveCm(cm);
        }}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>{props.busy ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

function PreferredUnitsEditor(props: {
  lengthUnit: ProfileLengthUnit;
  massUnit: "lb" | "kg";
  busy: boolean;
  patch: (p: UserProfileMainPatch) => Promise<boolean>;
  setMassUnit: (m: "lb" | "kg") => Promise<void>;
  onDone: () => void;
  setSaving: (v: boolean) => void;
}) {
  const [lengthUnit, setLengthUnit] = useState<ProfileLengthUnit>(props.lengthUnit);
  const [massUnit, setMassUnitLocal] = useState<"lb" | "kg">(props.massUnit);

  const saveAll = async () => {
    props.setSaving(true);
    try {
      await props.setMassUnit(massUnit);
      const ok = await props.patch({ app: { preferredUnits: { length: lengthUnit } } });
      if (ok) props.onDone();
    } finally {
      props.setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.pad}>
      <Text style={styles.lede}>
        Weight units match Settings → Units and only affect how weight is shown. Length units control how height
        and circumferences are edited.
      </Text>

      <Text style={styles.sectionMini}>Weight display</Text>
      <View style={styles.listGroup}>
        {(["lb", "kg"] as const).map((m) => {
          const selected = massUnit === m;
          return (
            <Pressable
              key={m}
              style={styles.row}
              disabled={props.busy}
              onPress={() => setMassUnitLocal(m)}
              accessibilityRole="button"
            >
              <Text style={styles.rowTitle}>{m === "lb" ? "Pounds (lb)" : "Kilograms (kg)"}</Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.sectionMini}>Length / height entry</Text>
      <View style={styles.listGroup}>
        {(Object.keys(LENGTH_UNIT_LABELS) as ProfileLengthUnit[]).map((k) => {
          const selected = lengthUnit === k;
          return (
            <Pressable
              key={k}
              style={styles.row}
              disabled={props.busy}
              onPress={() => setLengthUnit(k)}
              accessibilityRole="button"
            >
              <Text style={styles.rowTitle}>{LENGTH_UNIT_LABELS[k]}</Text>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={[styles.primaryBtn, props.busy && styles.primaryBtnDisabled]}
        disabled={props.busy}
        onPress={() => void saveAll()}
        accessibilityRole="button"
      >
        <Text style={styles.primaryBtnText}>{props.busy ? "Saving…" : "Save"}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pad: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10, padding: 24 },
  lede: { fontSize: 15, color: "#6E6E73", lineHeight: 22 },
  muted: { fontSize: 15, color: "#8E8E93" },
  error: { fontSize: 16, color: "#C00" },
  inputLabel: { fontSize: 14, fontWeight: "600", color: "#3C3C43" },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#C7C7CC",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17,
    backgroundColor: "#FFF",
  },
  primaryBtn: {
    marginTop: 8,
    backgroundColor: "#1C1C1E",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFF", fontWeight: "700", fontSize: 16 },
  doneBtn: {
    marginTop: 20,
    alignSelf: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  doneBtnText: { fontSize: 17, fontWeight: "600", color: "#007AFF" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingVertical: 8,
  },
  switchLabel: { fontSize: 17, color: "#1C1C1E" },
  listGroup: {
    borderRadius: 12,
    backgroundColor: UI_CARD_SURFACE,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E5EA",
  },
  rowTitle: { fontSize: 16, color: "#1C1C1E" },
  rowChevron: { fontSize: 20, color: "#C7C7CC" },
  check: { fontSize: 18, fontWeight: "700", color: "#007AFF" },
  footerHint: { fontSize: 14, color: "#6E6E73", marginTop: 12, lineHeight: 20 },
  sectionMini: {
    fontSize: 13,
    fontWeight: "600",
    color: "#8E8E93",
    marginTop: 8,
    textTransform: "uppercase",
  },
});
