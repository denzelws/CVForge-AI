import { z } from "zod";

export const GeneratedCvDataSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    targetRole: z.string().min(1),
    email: z.string().min(1),
    phone: z.string().min(1),
    location: z.string().min(1),
    linkedin: z.string().min(1),
    github: z.string().min(1),
    portfolio: z.string().min(1),
    summary: z.string().min(1)
  }),
  skills: z.object({
    technicalText: z.string().min(1)
  }),
  experience: z.array(
    z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      period: z.string().min(1),
      bullets: z.array(z.string().min(1)).min(1)
    })
  ),
  projects: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      stack: z.string().min(1)
    })
  ),
  education: z.array(
    z.object({
      institution: z.string().min(1),
      course: z.string().min(1),
      period: z.string().min(1)
    })
  ),
  certifications: z.array(z.string().min(1)),
  languages: z.array(z.string().min(1))
});

export type GeneratedCvData = z.infer<typeof GeneratedCvDataSchema>;
