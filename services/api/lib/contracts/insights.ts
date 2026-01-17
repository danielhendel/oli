import { z } from "zod";
import { dayKeySchema } from "./day";

const isoString = z.string().min(1);

export const insightSeveritySchema = z.enum(["info", "warning", "critical"]);

export const insightEvidencePointDtoSchema = z
  .object({
    factPath: z.string().min(1),
    value: z.union([z.number(), z.string(), z.boolean(), z.null()]),
    threshold: z.number().optional(),
    direction: z.enum(["above", "below", "outside_range"]).optional(),
  })
  .strip();

export const insightDtoSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    userId: z.string().min(1),
    date: dayKeySchema,
    kind: z.string().min(1),
    title: z.string().min(1),
    message: z.string().min(1),
    severity: insightSeveritySchema,
    evidence: z.array(insightEvidencePointDtoSchema),
    tags: z.array(z.string()).optional(),
    createdAt: isoString,
    updatedAt: isoString,
    ruleVersion: z.string().min(1),
  })
  .strip();

export type InsightDto = z.infer<typeof insightDtoSchema>;

export const insightsResponseDtoSchema = z
  .object({
    day: dayKeySchema,
    count: z.number().int().nonnegative(),
    items: z.array(insightDtoSchema),
  })
  .strip();

export type InsightsResponseDto = z.infer<typeof insightsResponseDtoSchema>;
