import { getGymProfile, getGymLabel, getGymMenuOptions, isExerciseAvailableAtGym } from "../gymRegistry";

describe("gymRegistry", () => {
  describe("getGymProfile", () => {
    it("returns null for null or empty id", () => {
      expect(getGymProfile(null)).toBeNull();
      expect(getGymProfile("")).toBeNull();
    });

    it("returns profile for known gym edge_fitness_manchester_ct", () => {
      const p = getGymProfile("edge_fitness_manchester_ct");
      expect(p).not.toBeNull();
      expect(p!.id).toBe("edge_fitness_manchester_ct");
      expect(p!.name).toBe("Edge Fitness Manchester CT");
      expect(p!.availableEquipment).toContain("Barbell");
      expect(p!.availableEquipment).toContain("Bodyweight");
    });

    it("returns profile for known gym bodyweight_only_home", () => {
      const p = getGymProfile("bodyweight_only_home");
      expect(p).not.toBeNull();
      expect(p!.id).toBe("bodyweight_only_home");
      expect(p!.availableEquipment).toEqual(["Bodyweight"]);
    });

    it("returns null for unknown gym id", () => {
      expect(getGymProfile("unknown_gym")).toBeNull();
    });
  });

  describe("getGymLabel", () => {
    it("returns No gym for null or empty", () => {
      expect(getGymLabel(null)).toBe("No gym");
      expect(getGymLabel("")).toBe("No gym");
    });
    it("returns profile name for known gym", () => {
      expect(getGymLabel("edge_fitness_manchester_ct")).toBe("Edge Fitness Manchester CT");
      expect(getGymLabel("bodyweight_only_home")).toBe("Bodyweight only (home)");
    });
    it("returns id for unknown gym", () => {
      expect(getGymLabel("unknown_gym")).toBe("unknown_gym");
    });
  });

  describe("getGymMenuOptions", () => {
    it("returns No gym first then all registered gyms sorted by id", () => {
      const opts = getGymMenuOptions();
      expect(opts[0]).toEqual({ value: null, label: "No gym" });
      expect(opts.map((o) => o.value)).toContain("bodyweight_only_home");
      expect(opts.map((o) => o.value)).toContain("edge_fitness_manchester_ct");
      expect(opts.map((o) => o.value)).not.toContain("limited_machines_gym");
      expect(opts.length).toBe(3);
    });

    it("hides test-only gyms from menu but keeps them in registry and labels", () => {
      const opts = getGymMenuOptions();
      expect(opts.map((o) => o.value)).not.toContain("limited_machines_gym");
      const profile = getGymProfile("limited_machines_gym");
      expect(profile).not.toBeNull();
      expect(profile!.name).toBe("Limited machines (test)");
      expect(getGymLabel("limited_machines_gym")).toBe("Limited machines (test)");
    });
  });

  describe("isExerciseAvailableAtGym", () => {
    it("null gym: no restriction (fail-open), returns true", () => {
      expect(isExerciseAvailableAtGym(null, "bench_press")).toBe(true);
      expect(isExerciseAvailableAtGym(null, "push_up")).toBe(true);
    });

    it("unknown gym: fail-open, returns true", () => {
      expect(isExerciseAvailableAtGym("unknown_gym", "bench_press")).toBe(true);
    });

    it("known gym with equipment: exercise requiring that equipment is available", () => {
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "bench_press")).toBe(true);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "push_up")).toBe(true);
    });

    it("bodyweight_only_home: Barbell exercise not available", () => {
      expect(isExerciseAvailableAtGym("bodyweight_only_home", "bench_press")).toBe(false);
    });

    it("bodyweight_only_home: Bodyweight exercise is available", () => {
      expect(isExerciseAvailableAtGym("bodyweight_only_home", "push_up")).toBe(true);
    });

    it("edge_fitness_manchester_ct: machine subtypes use an explicit list", () => {
      // Included machine subtypes should be available.
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "machine_leg_press_vertical")).toBe(true);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "machine_chest_press")).toBe(true);
      // Smith machine exercises are not in availableMachineSubtypes and should be treated as unavailable.
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "smith_machine_bench_press")).toBe(false);
    });

    it("edge_fitness_manchester_ct: cardio subtypes are conservative", () => {
      // Common commercial cardio machines are explicitly modeled as available.
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "treadmill_run")).toBe(true);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "stationary_bike")).toBe(true);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "elliptical")).toBe(true);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "stair_climber")).toBe(true);
      // Less universal cardio machines are omitted from the list and treated as unavailable.
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "rower")).toBe(false);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "assault_bike")).toBe(false);
      expect(isExerciseAvailableAtGym("edge_fitness_manchester_ct", "ski_erg")).toBe(false);
    });

    it("limited_machines_gym: only listed machine subtypes are available", () => {
      expect(isExerciseAvailableAtGym("limited_machines_gym", "machine_chest_press")).toBe(true);
      expect(isExerciseAvailableAtGym("limited_machines_gym", "machine_pulldown")).toBe(true);
      expect(isExerciseAvailableAtGym("limited_machines_gym", "machine_leg_press_vertical")).toBe(false);
      expect(isExerciseAvailableAtGym("limited_machines_gym", "machine_pec_fly")).toBe(false);
    });

    it("limited_machines_gym: Bodyweight still available", () => {
      expect(isExerciseAvailableAtGym("limited_machines_gym", "push_up")).toBe(true);
    });

    it("limited_machines_gym: cardio not in availableEquipment so not available", () => {
      expect(isExerciseAvailableAtGym("limited_machines_gym", "treadmill_run")).toBe(false);
    });
  });
});
