import { CvData, CvDataSchema } from "../schemas/cvData.schema.js";
import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { Profile } from "../schemas/profile.schema.js";

function scoreText(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  return keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
}

export function generateCvData(profile: Profile, job: JobAnalysis): CvData {
  const skills = [...profile.skills].sort((a, b) => {
    const scoreA = scoreText([a.name, ...a.evidence].join(" "), job.keywords);
    const scoreB = scoreText([b.name, ...b.evidence].join(" "), job.keywords);
    return scoreB - scoreA;
  });

  const experience = profile.experience.map((item) => ({
    title: item.title,
    company: item.company,
    period: item.period,
    bullets: [...item.bullets].sort(
      (a, b) => scoreText(b, job.keywords) - scoreText(a, job.keywords)
    )
  }));

  return CvDataSchema.parse({
    basics: {
      name: profile.basics.name,
      targetRole: job.jobTitle || profile.basics.targetRoles[0],
      email: profile.basics.email,
      phone: profile.basics.phone,
      location: profile.basics.location,
      linkedin: profile.basics.linkedin,
      github: profile.basics.github,
      portfolio: profile.basics.portfolio,
      summary: `${profile.basics.summaryBase} Targeting ${job.jobTitle.toLowerCase()} roles with emphasis on ${job.keywords.slice(0, 5).join(", ")}.`
    },
    skills: {
      technicalText: skills.map((skill) => skill.name).join(" · ")
    },
    experience,
    projects: profile.projects.map((project) => ({
      name: project.name,
      description: project.description,
      stack: project.stack.join(", ")
    })),
    education: profile.education.map((item) => ({
      institution: item.institution,
      course: item.course,
      period: item.period
    })),
    certifications: profile.certifications.map(
      (item) => `${item.name} - ${item.issuer} (${item.year})`
    ),
    languages: profile.languages.map((item) =>
      item.evidence ? `${item.language} - ${item.level} (${item.evidence})` : `${item.language} - ${item.level}`
    ),
    meta: {
      targetRole: job.jobTitle,
      jobKeywords: job.keywords,
      generatedAt: new Date().toISOString()
    }
  });
}
