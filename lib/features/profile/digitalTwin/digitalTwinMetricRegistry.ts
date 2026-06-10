// lib/features/profile/digitalTwin/digitalTwinMetricRegistry.ts
// Longevity / digital-twin marker registry. 13 systems × their full marker lists.
// This is an IA/navigation scaffold: rows carry a short description/cadence and navigate
// to a blank metric detail page. No values, no scores, no invented data yet.

import type {
  DigitalTwinSystemId,
  MetricDefinition,
} from "@/lib/features/profile/digitalTwin/types";

/** Concise constructor for a marker row (all markers are supporting-tier in the scaffold). */
function marker(id: string, label: string, description: string): MetricDefinition {
  return { id, label, tier: "supporting", description };
}

const general: MetricDefinition[] = [
  marker("first-name", "First Name", "Coming soon"),
  marker("last-name", "Last Name", "Coming soon"),
  marker("date-of-birth", "Date of Birth", "Coming soon"),
  marker("sex-at-birth", "Sex at Birth", "Coming soon"),
  marker("height", "Height", "Coming soon"),
  marker("weight", "Weight", "Coming soon"),
  marker("preferred-units", "Preferred Units", "Coming soon"),
  marker("primary-goal", "Primary Goal", "Coming soon"),
  marker("activity-level", "Activity Level", "Coming soon"),
];

const cardiovascular: MetricDefinition[] = [
  marker("blood-pressure", "Blood Pressure", "Each visit / home cuff"),
  marker("resting-heart-rate", "Resting Heart Rate", "Daily (wearable)"),
  marker("heart-rate-recovery", "Heart Rate Recovery", "Per workout"),
  marker("total-cholesterol", "Total Cholesterol", "Annual lipid panel"),
  marker("ldl-c", "LDL-C", "Annual lipid panel"),
  marker("hdl-c", "HDL-C", "Annual lipid panel"),
  marker("triglycerides", "Triglycerides", "Annual lipid panel"),
  marker("apob", "ApoB", "Annual"),
  marker("lipoprotein-a", "Lipoprotein(a)", "Once (genetic)"),
  marker("ldl-particle-number", "LDL Particle Number", "As indicated"),
  marker("ldl-particle-size", "LDL Particle Size", "As indicated"),
  marker("oxidized-ldl", "Oxidized LDL", "As indicated"),
  marker("hscrp", "hsCRP", "Annual"),
  marker("homocysteine", "Homocysteine", "Annual"),
  marker("lp-pla2", "LP-PLA2", "As indicated"),
  marker("cac-score", "CAC Score", "Every 3–5 years"),
  marker("carotid-cimt", "Carotid Ultrasound / CIMT", "As indicated"),
  marker("echocardiogram", "Echocardiogram", "As indicated"),
  marker("ecg", "ECG", "Annual"),
  marker("stress-test", "Stress Test", "As indicated"),
  marker("vo2-max", "VO2 Max", "Annual"),
];

const metabolic: MetricDefinition[] = [
  marker("fasting-glucose", "Fasting Glucose", "Annual"),
  marker("hba1c", "HbA1c", "Annual"),
  marker("fasting-insulin", "Fasting Insulin", "Annual"),
  marker("c-peptide", "C-Peptide", "As indicated"),
  marker("homa-ir", "HOMA-IR", "Annual"),
  marker("cgm-glucose-variability", "CGM Glucose Variability", "Periodic"),
  marker("uric-acid", "Uric Acid", "Annual"),
  marker("liver-fat", "Liver Fat", "As indicated"),
];

const bodyComposition: MetricDefinition[] = [
  marker("weight", "Weight", "Daily / weekly"),
  marker("waist-circumference", "Waist Circumference", "Monthly"),
  marker("body-fat-percent", "Body Fat %", "Monthly"),
  marker("lean-muscle-mass", "Lean Muscle Mass", "Quarterly"),
  marker("visceral-fat", "Visceral Fat", "Quarterly"),
  marker("bone-density", "Bone Density", "Every 2 years (DEXA)"),
  marker("grip-strength", "Grip Strength", "Quarterly"),
  marker("mobility", "Mobility", "Quarterly"),
  marker("balance", "Balance", "Quarterly"),
];

const fitness: MetricDefinition[] = [
  marker("vo2-max", "VO2 Max", "Annual"),
  marker("lactate-threshold", "Lactate Threshold", "Periodic"),
  marker("zone-2-pace", "Zone 2 Pace / Power", "Per workout"),
  marker("resting-hr", "Resting HR", "Daily"),
  marker("hrv", "HRV", "Daily"),
  marker("heart-rate-recovery", "Heart Rate Recovery", "Per workout"),
  marker("strength-ratios", "Strength Ratios", "Quarterly"),
  marker("weekly-volume", "Weekly Volume", "Weekly"),
  marker("injury-pain-score", "Injury / Pain Score", "As needed"),
  marker("push-ups", "Push-ups", "Monthly"),
  marker("pull-ups", "Pull-ups", "Monthly"),
  marker("squat-strength", "Squat Strength", "Monthly"),
  marker("deadlift-strength", "Deadlift Strength", "Monthly"),
];

const sleepRecovery: MetricDefinition[] = [
  marker("sleep-duration", "Sleep Duration", "Nightly"),
  marker("sleep-efficiency", "Sleep Efficiency", "Nightly"),
  marker("deep-sleep", "Deep Sleep", "Nightly"),
  marker("rem-sleep", "REM Sleep", "Nightly"),
  marker("respiratory-rate", "Respiratory Rate", "Nightly"),
  marker("overnight-hr", "Overnight HR", "Nightly"),
  marker("hrv-trend", "HRV Trend", "Daily"),
  marker("recovery-score", "Recovery Score", "Daily"),
  marker("sleep-apnea-risk", "Sleep Apnea Risk", "As indicated"),
];

const hormonesThyroid: MetricDefinition[] = [
  marker("total-testosterone", "Total Testosterone", "Annual"),
  marker("free-testosterone", "Free Testosterone", "Annual"),
  marker("shbg", "SHBG", "Annual"),
  marker("estradiol", "Estradiol", "Annual"),
  marker("lh", "LH", "Annual"),
  marker("fsh", "FSH", "Annual"),
  marker("prolactin", "Prolactin", "As indicated"),
  marker("dhea-s", "DHEA-S", "Annual"),
  marker("cortisol", "Cortisol", "Annual"),
  marker("igf-1", "IGF-1", "Annual"),
  marker("tsh", "TSH", "Annual"),
  marker("free-t4", "Free T4", "Annual"),
  marker("free-t3", "Free T3", "Annual"),
  marker("reverse-t3", "Reverse T3", "As indicated"),
  marker("tpo-antibodies", "TPO Antibodies", "As indicated"),
  marker("thyroglobulin-antibodies", "Thyroglobulin Antibodies", "As indicated"),
];

const organFunction: MetricDefinition[] = [
  marker("cbc", "CBC", "Annual"),
  marker("cmp", "CMP", "Annual"),
  marker("creatinine", "Creatinine", "Annual"),
  marker("egfr", "eGFR", "Annual"),
  marker("bun", "BUN", "Annual"),
  marker("cystatin-c", "Cystatin-C", "As indicated"),
  marker("urinalysis", "Urinalysis", "Annual"),
  marker("urine-microalbumin", "Urine Microalbumin", "Annual"),
  marker("urine-albumin-creatinine", "Urine Albumin / Creatinine", "Annual"),
  marker("alt", "ALT", "Annual"),
  marker("ast", "AST", "Annual"),
  marker("ggt", "GGT", "Annual"),
  marker("alkaline-phosphatase", "Alkaline Phosphatase", "Annual"),
  marker("bilirubin", "Bilirubin", "Annual"),
  marker("ferritin", "Ferritin", "Annual"),
  marker("iron-panel", "Iron Panel", "Annual"),
];

const nutritionalStatus: MetricDefinition[] = [
  marker("vitamin-d", "Vitamin D", "Annual"),
  marker("b12", "B12", "Annual"),
  marker("mma", "MMA", "As indicated"),
  marker("folate", "Folate", "Annual"),
  marker("ferritin", "Ferritin", "Annual"),
  marker("iron-panel", "Iron Panel", "Annual"),
  marker("rbc-magnesium", "RBC Magnesium", "Annual"),
  marker("zinc", "Zinc", "As indicated"),
  marker("copper", "Copper", "As indicated"),
  marker("selenium", "Selenium", "As indicated"),
  marker("iodine", "Iodine", "As indicated"),
  marker("omega-3-index", "Omega-3 Index", "Annual"),
  marker("protein-adequacy", "Protein Adequacy", "Ongoing"),
];

const inflammationImmune: MetricDefinition[] = [
  marker("hscrp", "hsCRP", "Annual"),
  marker("esr", "ESR", "As indicated"),
  marker("fibrinogen", "Fibrinogen", "As indicated"),
  marker("uric-acid", "Uric Acid", "Annual"),
  marker("ana", "ANA", "As indicated"),
  marker("rf", "RF", "As indicated"),
  marker("immunoglobulins", "Immunoglobulins", "As indicated"),
  marker("vaccine-titers", "Vaccine Titers", "As indicated"),
];

const cancerPrevention: MetricDefinition[] = [
  marker("colonoscopy", "Colonoscopy", "Every 10 years"),
  marker("fit-stool-occult-blood", "FIT / Stool Occult Blood", "Annual"),
  marker("psa", "PSA", "Annual"),
  marker("free-psa", "Free PSA", "As indicated"),
  marker("psa-velocity", "PSA Velocity", "Annual"),
  marker("skin-exam", "Dermatology Full Body Skin Exam", "Annual"),
  marker("h-pylori-test", "H. pylori Stool Antigen / Breath Test", "Once / as indicated"),
  marker("upper-endoscopy", "Upper Endoscopy", "As indicated"),
  marker("hbv-triple-panel", "HBV Triple Panel", "Once"),
  marker("galleri-mcd", "Galleri Multi-Cancer Detection", "Annual"),
  marker("whole-body-mri", "Whole Body MRI", "Periodic"),
];

const genetics: MetricDefinition[] = [
  marker("apoe", "APOE", "Once"),
  marker("lp-a-genetics", "Lp(a) Genetics / Level", "Once"),
  marker("fh-genes", "Familial Hypercholesterolemia Genes", "Once"),
  marker("brca", "BRCA", "Once"),
  marker("lynch-syndrome", "Lynch Syndrome", "Once"),
  marker("cancer-panel", "Cancer Panel", "Once"),
  marker("pharmacogenomics", "Pharmacogenomics", "Once"),
  marker("hla-autoimmune-risk", "HLA / Autoimmune Risk", "Once"),
  marker("polygenic-risk-scores", "Polygenic Risk Scores", "Once"),
];

const brainCognitive: MetricDefinition[] = [
  marker("cognitive-assessment", "Cognitive Assessment", "Annual"),
  marker("memory", "Memory", "Annual"),
  marker("executive-function", "Executive Function", "Annual"),
  marker("processing-speed", "Processing Speed", "Annual"),
  marker("reaction-time", "Reaction Time", "Periodic"),
  marker("depression-screening", "Depression Screening", "Annual"),
  marker("anxiety-screening", "Anxiety Screening", "Annual"),
  marker("stress-scale", "Stress Scale", "Periodic"),
  marker("hearing", "Hearing", "Periodic"),
  marker("vision", "Vision", "Annual"),
  marker("brain-mri", "Brain MRI", "As indicated"),
];

const environmentGutData: MetricDefinition[] = [
  marker("mercury", "Mercury", "As indicated"),
  marker("lead", "Lead", "As indicated"),
  marker("arsenic", "Arsenic", "As indicated"),
  marker("cadmium", "Cadmium", "As indicated"),
  marker("mold-exposure", "Mold Exposure", "As indicated"),
  marker("air-quality", "Air Quality", "Ongoing"),
  marker("light-exposure", "Light Exposure", "Ongoing"),
  marker("noise", "Noise", "Ongoing"),
  marker("h-pylori", "H. pylori", "Once / as indicated"),
  marker("celiac-screen", "Celiac Screen", "As indicated"),
  marker("microbiome", "Microbiome", "Periodic"),
  marker("gi-symptoms", "GI Symptoms", "Ongoing"),
  marker("wearables-data", "Wearables Data", "Ongoing"),
  marker("scale-data", "Scale Data", "Ongoing"),
  marker("food-logging", "Food Logging", "Ongoing"),
  marker("exercise-logging", "Exercise Logging", "Ongoing"),
  marker("symptoms", "Symptoms", "Ongoing"),
  marker("labs", "Labs", "Ongoing"),
  marker("imaging", "Imaging", "Ongoing"),
  marker("clinician-notes", "Clinician Notes", "Ongoing"),
  marker("data-quality-score", "Data Quality Score", "Ongoing"),
];

/** Metric definitions grouped by canonical system id. */
export const SYSTEM_METRICS: Record<DigitalTwinSystemId, MetricDefinition[]> = {
  general,
  cardiovascular,
  metabolic,
  "body-composition": bodyComposition,
  fitness,
  "sleep-recovery": sleepRecovery,
  "hormones-thyroid": hormonesThyroid,
  "organ-function": organFunction,
  "nutritional-status": nutritionalStatus,
  "inflammation-immune": inflammationImmune,
  "cancer-prevention": cancerPrevention,
  genetics,
  "brain-cognitive": brainCognitive,
  "environment-gut-data": environmentGutData,
};
