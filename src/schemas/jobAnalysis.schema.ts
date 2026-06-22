import { z } from "zod";

export const JobSenioritySchema = z.enum(["internship", "junior", "mid", "senior", "unknown"]);
export const JobLanguageSchema = z.enum(["pt-BR", "en", "unknown"]);

export const JobAnalysisSchema = z.object({
  jobTitle: z.string().min(1),
  seniority: JobSenioritySchema,
  requiredSkills: z.array(z.string()).default([]),
  niceToHaveSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  resumeFocus: z.array(z.string()).default([]),
  language: JobLanguageSchema,
  notes: z.array(z.string()).default([])
});

export type JobAnalysis = z.infer<typeof JobAnalysisSchema>;
