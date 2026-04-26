import React from "react";
import renderer, { act } from "react-test-renderer";
import { allowConsoleForThisTest } from "../../../scripts/test/consoleGuard";
import { ExerciseMediaPreview } from "../ExerciseMediaPreview";

jest.mock("react-native", () => {
  return {
    View: "View",
    Image: "Image",
    StyleSheet: { create: (s: unknown) => s },
  };
});

jest.mock("expo-video", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    VideoView: function VideoViewMock({ style }: { player?: unknown; style?: object }) {
      return React.createElement(View, { testID: "expo-video-mock-view", style });
    },
    useVideoPlayer: jest.fn((_source: unknown, setup?: (p: Record<string, unknown>) => void) => {
      const p = {
        loop: false,
        muted: false,
        play: jest.fn(),
        pause: jest.fn(),
      };
      setup?.(p);
      return p;
    }),
  };
});

jest.mock("@expo/vector-icons", () => ({
  Ionicons: function IoniconsMock() {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { testID: "thumb-ionicon-placeholder" });
  },
}));

async function flush(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("ExerciseMediaPreview", () => {
  beforeEach(() => {
    allowConsoleForThisTest({ error: [/act\(\.\.\.\)/, /not wrapped in act/] });
  });

  it("renders remote image when customRecord has imageUrl (no bundled asset)", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaPreview
          exerciseId="custom_u1_angled"
          customRecord={{
            imageUrl: "https://storage.example/angled.png",
            videoUrl: "",
          }}
          preferStillThumbnail
        />,
      );
    });
    await flush();
    const imgs = tree.root.findAllByType("Image");
    const remote = imgs.find((n) => n.props.source?.uri === "https://storage.example/angled.png");
    expect(remote).toBeDefined();
    expect(remote!.props.resizeMode).toBe("contain");
    expect(tree.root.findAllByProps({ testID: "thumb-ionicon-placeholder" }).length).toBe(0);
    act(() => {
      tree.unmount();
    });
  });

  it("uses session snapshot image when customRecord has no image", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaPreview
          exerciseId="custom_u1_legacy"
          customRecord={null}
          sessionMedia={{ imageUrl: "https://snap.example/hold.jpg" }}
          preferStillThumbnail
        />,
      );
    });
    await flush();
    const imgs = tree.root.findAllByType("Image");
    const img = imgs.find((n) => n.props.source?.uri === "https://snap.example/hold.jpg");
    expect(img).toBeDefined();
    expect(img!.props.resizeMode).toBe("contain");
    act(() => {
      tree.unmount();
    });
  });

  it("prefers custom image over session snapshot", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaPreview
          exerciseId="custom_u1_x"
          customRecord={{ imageUrl: "https://new.example/a.png" }}
          sessionMedia={{ imageUrl: "https://old.example/b.png" }}
          preferStillThumbnail
        />,
      );
    });
    await flush();
    const imgs = tree.root.findAllByType("Image");
    expect(imgs.some((n) => n.props.source?.uri === "https://new.example/a.png")).toBe(true);
    expect(imgs.some((n) => n.props.source?.uri === "https://old.example/b.png")).toBe(false);
    act(() => {
      tree.unmount();
    });
  });

  it("shows placeholder for unknown exercise with no media", async () => {
    let tree!: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ExerciseMediaPreview exerciseId="totally_unknown_exercise_xyz" preferStillThumbnail />,
      );
    });
    await flush();
    expect(tree.root.findAllByProps({ testID: "thumb-ionicon-placeholder" }).length).toBeGreaterThan(0);
    act(() => {
      tree.unmount();
    });
  });
});
