import { z } from "zod";

export const SkillLevelSchema = z.enum(["study", "basic", "practical", "professional"]);
export const ProjectEvidenceTypeSchema = z.enum([
  "personal",
  "professional",
  "open-source",
  "study"
]);

export const ProfileSchema = z.object({
  basics: z.object({
    name: z.string().min(1),
    targetRoles: z.array(z.string().min(1)).min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    location: z.string().min(1),
    linkedin: z.string().min(1),
    github: z.string().min(1),
    portfolio: z.string().min(1),
    summaryBase: z.string().min(1)
  }),
  skills: z.array(
    z.object({
      name: z.string().min(1),
      level: SkillLevelSchema,
      evidence: z.array(z.string().min(1)).min(1)
    })
  ),
  experience: z.array(
    z.object({
      title: z.string().min(1),
      company: z.string().min(1),
      type: z.string().min(1),
      location: z.string().min(1),
      period: z.string().min(1),
      bullets: z.array(z.string().min(1)).min(1),
      technologies: z.array(z.string().min(1))
    })
  ),
  projects: z.array(
    z.object({
      name: z.string().min(1),
      description: z.string().min(1),
      stack: z.array(z.string().min(1)).min(1),
      evidenceType: ProjectEvidenceTypeSchema,
      url: z.string().nullable(),
      github: z.string().nullable()
    })
  ),
  education: z.array(
    z.object({
      institution: z.string().min(1),
      course: z.string().min(1),
      period: z.string().min(1),
      status: z.string().min(1)
    })
  ),
  certifications: z.array(
    z.object({
      name: z.string().min(1),
      issuer: z.string().min(1),
      year: z.string().min(1)
    })
  ),
  languages: z.array(
    z.object({
      language: z.string().min(1),
      level: z.string().min(1),
      evidence: z.string().nullable()
    })
  )
});

export type Profile = z.infer<typeof ProfileSchema>;
