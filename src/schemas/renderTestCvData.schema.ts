import { z } from "zod";

export const RenderTestCvDataSchema = z.object({
  basics: z.object({
    name: z.string(),
    targetRole: z.string(),
    email: z.string(),
    phone: z.string().optional(),
    location: z.string(),
    linkedin: z.string(),
    github: z.string(),
    portfolio: z.string().optional(),
    links: z.string(),
    summary: z.string()
  }),
  skills: z.object({
    technicalText: z.string()
  }),
  experience: z.array(
    z.object({
      title: z.string(),
      company: z.string(),
      period: z.string(),
      bullets: z.array(z.string())
    })
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      stack: z.string()
    })
  ),
  education: z.array(
    z.object({
      institution: z.string(),
      course: z.string(),
      period: z.string()
    })
  ),
  certifications: z.array(z.string()),
  languages: z.array(z.string())
});

export type RenderTestCvData = z.infer<typeof RenderTestCvDataSchema>;
