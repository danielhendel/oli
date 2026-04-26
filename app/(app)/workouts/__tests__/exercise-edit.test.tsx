import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../../scripts/test/consoleGuard";

jest.mock("react-native", () => {
  const React = require("react");
  return {
    View: "View",
    Text: "Text",
    TextInput: "TextInput",
    Pressable: "Pressable",
    ScrollView: "ScrollView",
    Image: "Image",
    ActivityIndicator: "ActivityIndicator",
    Alert: { alert: jest.fn() },
    Dimensions: {
      get: jest.fn(() => ({ width: 390, height: 844, scale: 2, fontScale: 1 })),
    },
    Modal: function ModalMock({
      visible,
      children,
      testID,
    }: {
      visible: boolean;
      children: React.ReactNode;
      testID?: string;
    }) {
      if (!visible) return null;
      return React.createElement("View", { testID: testID ?? "modal" }, children);
    },
    KeyboardAvoidingView: function KeyboardAvoidingViewMock({ children }: { children: React.ReactNode }) {
      return React.createElement("View", { testID: "keyboard-avoiding" }, children);
    },
    StyleSheet: { create: (s: unknown) => s, hairlineWidth: 1 },
    Platform: { OS: "ios" },
  };
});

const mockNavigation = {
  setOptions: jest.fn(),
  goBack: jest.fn(),
};
const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, back: mockNavigation.goBack }),
  useLocalSearchParams: () => ({
    exerciseId: "custom_u1_landmine",
    sessionId: "s1",
  }),
  /** Stable reference — a fresh object each render retriggers useLayoutEffect forever. */
  useNavigation: () => mockNavigation,
}));

const mockGetIdToken = jest.fn().mockResolvedValue("test-token");
const mockAuthUser = { uid: "u1" };

jest.mock("@/lib/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: mockAuthUser,
    initializing: false,
    getIdToken: mockGetIdToken,
  }),
}));

jest.mock("@oli/contracts", () => ({
  ...jest.requireActual("@oli/contracts"),
  isUserScopedCustomExerciseId: () => true,
}));

/** Minimal thenable: invokes `.then` synchronously so exercise-edit’s effect completes inside `act(create)`. */
function mockSyncListMergedRows(rows: unknown[]) {
  const end = {
    catch() {
      return end;
    },
  };
  return {
    then(onFulfilled?: (v: unknown) => unknown) {
      onFulfilled?.(rows);
      return end;
    },
  };
}

function mockMergedExerciseFixture() {
  return [
    {
      exerciseId: "custom_u1_landmine",
      name: "Landmine Press",
      equipment: "Barbell",
      primary: "Shoulders",
      loggingType: "weight_reps",
      movementPattern: "push",
      stability: "free",
      laterality: "bilateral",
      aliases: ["landmine", "lm press"],
      primaryMusclesDetailed: ["DeltsAnterior"],
      secondaryMusclesDetailed: ["Triceps"],
      muscleContributions: [{ subgroup: "front_delts", weight: 0.6 }],
      imageUrl: "https://example.com/i.jpg",
      videoUrl: "",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    },
  ];
}

jest.mock("@/lib/workouts/exercises/mergeCustomExerciseSources", () => ({
  listMergedCustomExerciseRecords: jest.fn(() => mockSyncListMergedRows(mockMergedExerciseFixture())),
}));

const mockUpdateExerciseDefinition = jest.fn();
jest.mock("@/lib/api/exerciseDefinitions", () => ({
  updateExerciseDefinition: (...args: unknown[]) => mockUpdateExerciseDefinition(...args),
}));

const mockUploadExerciseDefinitionMediaFile = jest.fn();
jest.mock("@/lib/api/exerciseDefinitionMedia", () => ({
  uploadExerciseDefinitionMediaFile: (...args: unknown[]) => mockUploadExerciseDefinitionMediaFile(...args),
}));

const mockPickExerciseMediaFromLibrary = jest.fn();
const mockCaptureExerciseMediaWithCamera = jest.fn();
const mockReadLocalUriAsBase64 = jest.fn();
jest.mock("@/lib/workouts/exercises/pickExerciseMedia", () => ({
  pickExerciseMediaFromLibrary: (...args: unknown[]) => mockPickExerciseMediaFromLibrary(...args),
  captureExerciseMediaWithCamera: (...args: unknown[]) => mockCaptureExerciseMediaWithCamera(...args),
  readLocalUriAsBase64: (...args: unknown[]) => mockReadLocalUriAsBase64(...args),
}));

const mockUpdateCustomExercise = jest.fn();
jest.mock("@/lib/workouts/exercises/customExerciseStore", () => ({
  updateCustomExercise: (...args: unknown[]) => mockUpdateCustomExercise(...args),
}));

jest.mock("@/components/workouts/MuscleContributionsEditor", () => ({
  MuscleContributionsEditor: function MuscleContributionsEditorMock() {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, "MuscleContributionsEditorMock");
  },
}));

jest.mock("@/lib/ui/HeaderBackButton", () => ({
  HeaderBackButton: function HeaderBackButtonMock() {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { testID: "header-back" });
  },
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 34, left: 0, right: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function IoniconsMock() {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, "icon");
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const EditExerciseScreen = require("../exercise-edit").default;

function findByTestID(root: renderer.ReactTestRenderer["root"], testID: string): renderer.ReactTestInstance | null {
  try {
    return root.findByProps({ testID });
  } catch {
    return null;
  }
}

function findByA11yLabel(
  root: renderer.ReactTestRenderer["root"],
  label: string,
): renderer.ReactTestInstance | null {
  const pressables = root.findAllByType("Pressable");
  return pressables.find((p) => p.props.accessibilityLabel === label) ?? null;
}

async function flushEventLoop(): Promise<void> {
  await new Promise<void>((r) => setImmediate(r));
}

describe("workouts/exercise-edit", () => {
  let test: renderer.ReactTestRenderer | null = null;

  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
    mockUploadExerciseDefinitionMediaFile.mockReset();
    mockPickExerciseMediaFromLibrary.mockReset();
    mockCaptureExerciseMediaWithCamera.mockReset();
    mockReadLocalUriAsBase64.mockReset();
    mockUploadExerciseDefinitionMediaFile.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: { url: "https://firebasestorage.example/o/new.png?alt=media&token=abc", slot: "image" },
    });
    mockPickExerciseMediaFromLibrary.mockResolvedValue({
      uri: "file:///picked.jpg",
      mimeType: "image/jpeg",
      filename: "picked.jpg",
    });
    mockReadLocalUriAsBase64.mockResolvedValue("dGVzdA==");
    mockNavigation.setOptions.mockClear();
    mockNavigation.goBack.mockClear();
    mockReplace.mockClear();
    mockUpdateExerciseDefinition.mockClear();
    mockUpdateExerciseDefinition.mockResolvedValue({ ok: true, status: 200, requestId: null, error: null });
    mockUpdateCustomExercise.mockClear();
    mockUpdateCustomExercise.mockResolvedValue({});
    mockGetIdToken.mockClear();
    mockGetIdToken.mockResolvedValue("test-token");
    const merge = jest.requireMock("@/lib/workouts/exercises/mergeCustomExerciseSources") as {
      listMergedCustomExerciseRecords: jest.Mock;
    };
    merge.listMergedCustomExerciseRecords.mockImplementation(() =>
      mockSyncListMergedRows(mockMergedExerciseFixture()),
    );
  });

  afterEach(() => {
    const t = test;
    test = null;
    if (t != null) {
      act(() => {
        t.unmount();
      });
    }
  });

  it("category cards render current state after load", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    const merge = jest.requireMock("@/lib/workouts/exercises/mergeCustomExerciseSources") as {
      listMergedCustomExerciseRecords: jest.Mock;
    };
    expect(merge.listMergedCustomExerciseRecords).toHaveBeenCalled();
    const tree = JSON.stringify(test!.toJSON());
    expect(tree).toContain("Landmine Press");
    expect(tree).toContain("Barbell");
    expect(tree).toContain("Shoulders");
    expect(tree).toContain("Weight + reps");
    expect(tree).toContain("Push");
    expect(tree).toContain("Free motion");
    expect(tree).toContain("Bilateral");
    expect(tree).toContain("landmine, lm press");
    expect(tree).toContain("DeltsAnterior");
    expect(tree).toContain("Triceps");
    expect(tree).toContain("Image");
  });

  it("tapping Edit exercise name opens full-screen editor with explainer and current value", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    const editName = findByA11yLabel(test!.root, "Edit exercise name");
    expect(editName).not.toBeNull();
    act(() => {
      editName!.props.onPress();
    });
    expect(findByTestID(test!.root, "exercise-edit-category-sheet")).not.toBeNull();
    const tree = JSON.stringify(test!.toJSON());
    expect(tree).toContain("naturally say in the gym");
    expect(tree).toContain("What you're editing");
    expect(tree).toContain("Current value");
    expect(tree).toContain("How to edit");
    expect(findByTestID(test!.root, "exercise-edit-current-value")).not.toBeNull();
    expect(tree).toContain("Landmine Press");
  });

  it("tapping Edit logging type opens sheet with logging explainer", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    const edit = findByA11yLabel(test!.root, "Edit logging type");
    act(() => {
      edit!.props.onPress();
    });
    const tree = JSON.stringify(test!.toJSON());
    expect(tree).toContain("This tells Oli what numbers to track");
  });

  it("editing name in editor updates draft input; Save field applies to main card", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    act(() => {
      findByA11yLabel(test!.root, "Edit exercise name")!.props.onPress();
    });
    const nameInput = test!.root.findByProps({ accessibilityLabel: "Exercise name" });
    act(() => {
      nameInput.props.onChangeText("Atlas Stone Load");
    });
    expect(nameInput.props.value).toBe("Atlas Stone Load");
    act(() => {
      test!.root.findByProps({ accessibilityLabel: "Save field changes" }).props.onPress();
    });
    await flushEventLoop();
    const tree = JSON.stringify(test!.toJSON());
    expect(tree).toContain("Atlas Stone Load");
    expect(findByTestID(test!.root, "exercise-edit-category-sheet")).toBeNull();
    expect(findByTestID(test!.root, "exercise-edit-current-value")).toBeNull();
  });

  it("Save changes calls updateExerciseDefinition with merged body", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    act(() => {
      findByA11yLabel(test!.root, "Edit exercise name")!.props.onPress();
    });
    act(() => {
      test!.root.findByProps({ accessibilityLabel: "Exercise name" }).props.onChangeText("Renamed Lift");
    });
    act(() => {
      test!.root.findByProps({ accessibilityLabel: "Save field changes" }).props.onPress();
    });
    await flushEventLoop();
    act(() => {
      test!.root.findByProps({ accessibilityLabel: "Save changes" }).props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(mockUpdateExerciseDefinition).toHaveBeenCalledWith(
      "test-token",
      "custom_u1_landmine",
      expect.objectContaining({
        name: "Renamed Lift",
        equipment: "Barbell",
        primary: "Shoulders",
        loggingType: "weight_reps",
        movementPattern: "push",
        stability: "free",
        laterality: "bilateral",
        imageUrl: "https://example.com/i.jpg",
        videoUrl: "",
      }),
    );
    expect(mockUpdateCustomExercise).toHaveBeenCalled();
  });

  it("header uses blended background and exercise title", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    expect(mockNavigation.setOptions).toHaveBeenCalled();
    const calls = mockNavigation.setOptions.mock.calls.map((c) => c[0] as Record<string, unknown>);
    const last = calls[calls.length - 1]!;
    expect(last.headerStyle).toEqual({ backgroundColor: "#F2F2F7" });
    expect(last.title).toBe("Landmine Press");
  });

  it("choosing library image uploads and updates stored image URL in UI", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    act(() => {
      findByA11yLabel(test!.root, "Add or replace exercise image")!.props.onPress();
    });
    expect(findByTestID(test!.root, "exercise-media-action-sheet")).not.toBeNull();
    act(() => {
      findByA11yLabel(test!.root, "Choose from library")!.props.onPress();
    });
    await flushEventLoop();
    expect(mockPickExerciseMediaFromLibrary).toHaveBeenCalledWith("image");
    expect(mockReadLocalUriAsBase64).toHaveBeenCalled();
    expect(mockUploadExerciseDefinitionMediaFile).toHaveBeenCalled();
    const tree = JSON.stringify(test!.toJSON());
    expect(tree).toContain("https://firebasestorage.example");
    expect(mockUpdateCustomExercise).toHaveBeenCalledWith(
      "u1",
      "custom_u1_landmine",
      expect.objectContaining({
        imageUrl: "https://firebasestorage.example/o/new.png?alt=media&token=abc",
      }),
    );
  });

  it("choosing library video uploads and updates stored video URL in UI", async () => {
    mockUploadExerciseDefinitionMediaFile.mockResolvedValue({
      ok: true,
      status: 200,
      requestId: null,
      json: { url: "https://firebasestorage.example/o/vid.mp4?alt=media&token=vid", slot: "video" },
    });
    mockPickExerciseMediaFromLibrary.mockResolvedValue({
      uri: "file:///clip.mov",
      mimeType: "video/quicktime",
      filename: "clip.mov",
    });
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    act(() => {
      findByA11yLabel(test!.root, "Add or replace exercise video")!.props.onPress();
    });
    act(() => {
      findByA11yLabel(test!.root, "Choose from library")!.props.onPress();
    });
    await flushEventLoop();
    expect(mockPickExerciseMediaFromLibrary).toHaveBeenCalledWith("video");
    expect(mockUploadExerciseDefinitionMediaFile).toHaveBeenCalledWith(
      "test-token",
      "custom_u1_landmine",
      expect.objectContaining({
        slot: "video",
        mimeType: "video/quicktime",
      }),
    );
    expect(JSON.stringify(test!.toJSON())).toContain("Image · Video");
    expect(mockUpdateCustomExercise).toHaveBeenCalledWith(
      "u1",
      "custom_u1_landmine",
      expect.objectContaining({
        videoUrl: "https://firebasestorage.example/o/vid.mp4?alt=media&token=vid",
      }),
    );
  });

  it("remove image then Save changes persists cleared imageUrl", async () => {
    act(() => {
      test = renderer.create(<EditExerciseScreen />);
    });
    act(() => {
      findByA11yLabel(test!.root, "Add or replace exercise image")!.props.onPress();
    });
    act(() => {
      findByA11yLabel(test!.root, "Remove media")!.props.onPress();
    });
    await flushEventLoop();
    expect(mockUploadExerciseDefinitionMediaFile).not.toHaveBeenCalled();
    expect(JSON.stringify(test!.toJSON())).not.toContain("https://example.com/i.jpg");

    act(() => {
      test!.root.findByProps({ accessibilityLabel: "Save changes" }).props.onPress();
    });
    await flushEventLoop();
    await flushEventLoop();
    expect(mockUpdateExerciseDefinition).toHaveBeenCalledWith(
      "test-token",
      "custom_u1_landmine",
      expect.objectContaining({
        imageUrl: "",
      }),
    );
  });
});
