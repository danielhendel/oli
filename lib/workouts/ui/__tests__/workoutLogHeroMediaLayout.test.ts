import { WORKOUT_LOG_HERO_MEDIA_CONTAINER } from "../workoutLogHeroMediaLayout";

describe("workoutLogHeroMediaLayout", () => {
  it("uses transparent wrapper so media is not a full-width gray slab", () => {
    expect(WORKOUT_LOG_HERO_MEDIA_CONTAINER.backgroundColor).toBe("transparent");
    expect(WORKOUT_LOG_HERO_MEDIA_CONTAINER.maxHeight).toBe(196);
  });
});
