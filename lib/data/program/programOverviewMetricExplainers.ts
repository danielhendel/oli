// lib/data/program/programOverviewMetricExplainers.ts
/**
 * World-class, coach-style explainer content for each Program Overview metric. Pure data — no IO,
 * no React.
 *
 * Every metric is built from the generated prescription so the UI stays presentational and the
 * copy/values live in one testable place. Each explainer follows the same five-part teaching
 * structure so the user learns what a metric is, why it matters, what their generated value means,
 * how to use it, and what to watch next.
 */
import type { ProgrammingPrescription } from "@/lib/data/program/programmingEngineTypes";

export type ProgramOverviewMetricId =
  | "total_weekly_sets"
  | "frequency"
  | "rep_range"
  | "rir_target"
  | "rpe_target"
  | "progression";

/**
 * The reusable, structured explainer model. Every Program Overview metric uses this exact shape so
 * the sheet UI can render consistent sections and tests can assert each part.
 */
export interface ProgramMetricExplainer {
  /** Sheet title. */
  title: string;
  /** The generated value, shown large under the title. */
  currentValue: string;
  /** Plain-language definition of the metric. */
  whatIsIt: string;
  /** The training rationale — why it drives results. */
  whyItMatters: string;
  /** What the user's specific generated value implies for them. */
  whatYourValueMeans: string;
  /** Concrete, actionable guidance. */
  howToUseIt: string;
  /** The signal that tells the user when/how to adjust. */
  whatToWatchNext: string;
}

export type ProgramOverviewMetric = {
  id: ProgramOverviewMetricId;
  /** Left-hand row label. */
  label: string;
  /** Right-hand row value (also surfaced as the sheet's current value). */
  value: string;
  /** Structured, five-part explainer rendered in the detail sheet. */
  explainer: ProgramMetricExplainer;
};

function frequencyLabel(min: number, max: number): string {
  if (max <= 0) return "—";
  return min === max ? `${min}× per week` : `${min}–${max}× per week`;
}

function levelPhrase(level: ProgrammingPrescription["inputs"]["trainingLevel"]): string {
  switch (level) {
    case "beginner":
      return "As a newer lifter, you grow from a relatively modest amount of well-executed work";
    case "advanced":
      return "As an advanced lifter, you need more total work to keep making progress";
    case "intermediate":
    default:
      return "At your intermediate level, this is a productive amount of work you can recover from";
  }
}

/**
 * Build the ordered Program Overview metrics for a prescription. Order matches the card:
 * total weekly sets → frequency → rep range → RIR → RPE → progression.
 */
export function buildProgramOverviewMetrics(
  prescription: ProgrammingPrescription,
): ProgramOverviewMetric[] {
  const totalSets = String(prescription.totalWeeklySets);
  const frequency = frequencyLabel(
    prescription.frequencyRange.min,
    prescription.frequencyRange.max,
  );
  const repRange = prescription.headline.repRange;
  const rir = prescription.headline.rirTarget;
  const rpe = prescription.headline.rpeTarget;
  const progression = prescription.progressionModel;
  const level = prescription.inputs.trainingLevel;

  return [
    {
      id: "total_weekly_sets",
      label: "Total weekly sets",
      value: totalSets,
      explainer: {
        title: "Total weekly sets",
        currentValue: `${totalSets} sets / week`,
        whatIsIt:
          "This is your weekly training workload — the total number of hard working sets across " +
          "every muscle group for the week. A hard working set is a set taken close to failure " +
          "(near your RIR target), not a warm-up or an easy set.",
        whyItMatters:
          "Volume is the single biggest driver of muscle growth, but it's a trade-off: more sets " +
          "create more stimulus to adapt, and also more fatigue to recover from. Growth happens " +
          "when stimulus is high enough to challenge you but recovery still keeps pace.",
        whatYourValueMeans:
          `${levelPhrase(level)}, so your program recommends ${totalSets} hard sets this week. ` +
          "That's your training budget — enough to drive adaptation without burying your recovery.",
        howToUseIt:
          `Spread these ${totalSets} sets across your training days and make each one count with ` +
          "clean, near-failure reps. Don't add extra sets just because a session feels easy.",
        whatToWatchNext:
          "Only chase more volume when recovery and performance justify it — you're sleeping well, " +
          "joints feel good, and your reps are still climbing. If progress stalls or you feel run " +
          "down, trim the lowest-priority muscle groups first.",
      },
    },
    {
      id: "frequency",
      label: "Frequency",
      value: frequency,
      explainer: {
        title: "Frequency",
        currentValue: frequency,
        whatIsIt:
          "Frequency is how often each major muscle group gets trained per week — how many separate " +
          "exposures it receives, rather than how many total sets it gets.",
        whyItMatters:
          "Splitting your weekly volume across more sessions keeps the quality of each set high. " +
          "Fresh muscles produce better reps, you accumulate less fatigue per session, and you " +
          "refresh the growth signal more often instead of one big spike that fades.",
        whatYourValueMeans:
          `Your plan trains most major muscle groups about ${frequency}. That distributes your ` +
          "weekly sets so you rarely cram a muscle's entire workload into a single workout.",
        howToUseIt:
          "When you build your split, give each major muscle group roughly this many exposures. " +
          "Treat every exposure as a real opportunity to add a quality set — not a throwaway.",
        whatToWatchNext:
          "If a muscle is consistently sore or under-recovering session to session, you may be " +
          "doing too much per exposure — spread its volume across more days. If a muscle is barely " +
          "fatigued, you have room to add a set per session.",
      },
    },
    {
      id: "rep_range",
      label: "Rep range",
      value: repRange,
      explainer: {
        title: "Rep range",
        currentValue: `${repRange} reps`,
        whatIsIt:
          "This is the target number of reps for most of your working sets — the window your sets " +
          "should land in before the set ends at your RIR target.",
        whyItMatters:
          "Rep range shapes the whole set: lower reps use heavier loads with more neural and joint " +
          "demand, higher reps use lighter loads with more metabolic fatigue and a bigger technique " +
          "cost as you tire. A well-chosen range balances stimulus, load, fatigue, and form.",
        whatYourValueMeans:
          `Most of your working sets should finish in the ${repRange} range. It's broad enough to ` +
          "fit different exercises and still keep every set effective.",
        howToUseIt:
          `Pick a load that puts you inside ${repRange} while still hitting your RIR target. ` +
          "Heavy compounds often live at the lower end; isolation moves can sit at the higher end.",
        whatToWatchNext:
          "When you can complete the top of the range at your target RIR, that's your green light " +
          "to add load or difficulty next session — then drop back toward the bottom of the range " +
          "and climb again.",
      },
    },
    {
      id: "rir_target",
      label: "RIR target",
      value: rir,
      explainer: {
        title: "RIR target",
        currentValue: `${rir} RIR`,
        whatIsIt:
          "RIR means Reps In Reserve — how many clean reps you could still do when you end a set. " +
          "0 RIR is true failure, 1 RIR means one rep left, 2 RIR means two reps left, and so on.",
        whyItMatters:
          "RIR controls the stimulus-to-fatigue balance. Sets near failure drive strong growth but " +
          "cost a lot of recovery; stopping a couple reps short captures almost all the stimulus for " +
          "far less fatigue, so you can repeat quality work across the week.",
        whatYourValueMeans:
          `Your target is to stop most sets with about ${rir} reps left in the tank. That keeps the ` +
          "work hard enough to grow while protecting your ability to recover and progress.",
        howToUseIt:
          `End each set when roughly ${rir} clean reps remain — when the next rep would slow down or ` +
          "break form. Don't grind to failure on every set just to prove it's hard.",
        whatToWatchNext:
          "Calibrate your estimate over time: occasionally take a set close to failure and count how " +
          "far off you were. If you're routinely leaving more reps than planned, push a little closer; " +
          "if reps suddenly drop next set, you went too deep.",
      },
    },
    {
      id: "rpe_target",
      label: "RPE target",
      value: rpe,
      explainer: {
        title: "RPE target",
        currentValue: `RPE ${rpe}`,
        whatIsIt:
          "RPE is Rate of Perceived Exertion — how hard a set felt on a 1–10 scale, where 10 is an " +
          "all-out max effort. It's the effort-based companion to RIR: roughly, RPE 8 ≈ 2 RIR, " +
          "RPE 9 ≈ 1 RIR, RPE 10 ≈ 0 RIR.",
        whyItMatters:
          "RPE lets you autoregulate. RIR counts reps left; RPE captures how the set actually felt, " +
          "which already factors in sleep, stress, nutrition, and readiness on a given day.",
        whatYourValueMeans:
          `Most of your sets should feel like an RPE ${rpe} out of 10 — clearly hard and challenging, ` +
          "but not a true grind where every rep is a battle.",
        howToUseIt:
          `Rate each set honestly against RPE ${rpe}. On a low-readiness day the same weight will feel ` +
          "harder, so reduce the load to keep the same effort; on a great day it may feel easier, so " +
          "you can add a little. Not every set should feel like a max test.",
        whatToWatchNext:
          "If your sets consistently feel below target, it's a sign to add load or reps. If they " +
          "consistently feel above target, back off slightly and protect your recovery.",
      },
    },
    {
      id: "progression",
      label: "Progression",
      value: progression,
      explainer: {
        title: "Progression",
        currentValue: progression,
        whatIsIt:
          `Your progression model — ${progression} — is the rule for how the program gets harder over ` +
          "time. Progressive overload is what forces continued adaptation; without it, training " +
          "plateaus.",
        whyItMatters:
          "Doing the same work forever stops producing results. Steadily increasing the demand — when " +
          "you've earned it — is what keeps strength and muscle moving in the right direction.",
        whatYourValueMeans:
          `With ${progression}, you advance the work only once you can hit your recommended reps with ` +
          "good form at your target RIR. Earning the increase is the whole point.",
        howToUseIt:
          "Progress can take several forms — more load, more reps, more density, better quality, or " +
          "harder exercise variations — depending on your training type. Use whichever your plan " +
          "favors, and only step up when reps, form, and RIR are all on target.",
        whatToWatchNext:
          "Each week, check those three markers. When they're all met, make the next session harder. " +
          "If any one is off, repeat the week and earn the increase rather than forcing it.",
      },
    },
  ];
}
