import { z } from "zod";

export const JobAnalysisSchema = z.object({
  title: z.string(),
  seniority: z.string().optional(),
  responsibilities: z.array(z.string()).default([]),
  requiredSkills: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([])
});

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
