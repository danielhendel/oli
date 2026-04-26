import {
  resolveWorkoutExerciseRemoteImageUri,
  resolveWorkoutExerciseRemoteVideoUri,
} from "../workoutExerciseMediaResolve";

describe("workoutExerciseMediaResolve", () => {
  it("prefers custom imageUrl over session snapshot", () => {
    expect(
      resolveWorkoutExerciseRemoteImageUri(
        { imageUrl: " https://a.example/i.png " },
        { imageUrl: "https://b.example/old.png" },
      ),
    ).toBe("https://a.example/i.png");
  });

  it("uses session imageUrl when custom has none", () => {
    expect(
      resolveWorkoutExerciseRemoteImageUri(null, { imageUrl: "https://snap.example/x.jpg" }),
    ).toBe("https://snap.example/x.jpg");
  });

  it("uses custom mediaUrl when imageUrl empty", () => {
    expect(
      resolveWorkoutExerciseRemoteImageUri({ imageUrl: "", mediaUrl: "https://m.example/m.jpg" }, null),
    ).toBe("https://m.example/m.jpg");
  });

  it("resolveWorkoutExerciseRemoteVideoUri prefers custom over session", () => {
    expect(
      resolveWorkoutExerciseRemoteVideoUri(
        { videoUrl: "https://v.example/a.mp4" },
        { videoUrl: "https://v.example/b.mp4" },
      ),
    ).toBe("https://v.example/a.mp4");
  });

  it("returns null when no image sources", () => {
    expect(resolveWorkoutExerciseRemoteImageUri(undefined, {})).toBeNull();
  });
});
