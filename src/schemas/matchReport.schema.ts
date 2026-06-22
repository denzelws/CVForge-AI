import { z } from "zod";
import { SkillLevelSchema } from "./profile.schema.js";

export const MatchDecisionSchema = z.enum([
  "strong_match",
  "good_match",
  "partial_match",
  "weak_match"
]);

export const MatchReportSchema = z.object({
  jobName: z.string().min(1),
  matchScore: z.number().min(0).max(100),
  decision: MatchDecisionSchema,
  matchedSkills: z.array(
    z.object({
      skill: z.string().min(1),
      profileLevel: SkillLevelSchema,
      evidence: z.array(z.string())
    })
  ),
  missingSkills: z.array(z.string()),
  uncertainSkills: z.array(
    z.object({
      skill: z.string().min(1),
      reason: z.string().min(1),
      questionForUser: z.string().min(1)
    })
  ),
  recommendedFocus: z.array(z.string()),
  recommendedProjects: z.array(z.string()),
  recommendedExperience: z.array(z.string()),
  warnings: z.array(z.string()),
  notes: z.array(z.string())
});

export type MatchReport = z.infer<typeof MatchReportSchema>;
