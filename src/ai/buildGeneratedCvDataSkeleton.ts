import { GeneratedCvData, GeneratedCvDataSchema } from "../schemas/generatedCvData.schema.js";
import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { MatchReport } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";

type BuildGeneratedCvDataSkeletonInput = {
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchReport: MatchReport;
};

function scoreText(text: string, terms: string[]): number {
  const lower = text.toLowerCase();
  return terms.filter((term) => lower.includes(term.toLowerCase())).length;
}

function pickRelevantBullets(bullets: string[], terms: string[], count: number): string[] {
  return [...bullets]
    .sort((a, b) => scoreText(b, terms) - scoreText(a, terms))
    .slice(0, count);
}

function formatCertification(certification: Profile["certifications"][number]): string {
  return `${certification.name} - ${certification.issuer} (${certification.year})`;
}

function formatLanguage(language: Profile["languages"][number]): string {
  return language.evidence
    ? `${language.language} - ${language.level} (${language.evidence})`
    : `${language.language} - ${language.level}`;
}

export function buildGeneratedCvDataSkeleton(input: BuildGeneratedCvDataSkeletonInput): GeneratedCvData {
  const matchedSkills = input.matchReport.matchedSkills.map((skill) => skill.skill);
  const focusTerms = [...input.jobAnalysis.keywords, ...matchedSkills, ...input.matchReport.recommendedFocus];
  const selectedExperience = input.profile.experience
    .filter((experience) =>
      input.matchReport.recommendedExperience.some((recommended) => recommended.includes(experience.company))
    )
    .slice(0, 2);
  const selectedProjects = input.profile.projects
    .filter((project) => input.matchReport.recommendedProjects.includes(project.name))
    .slice(0, 3);
  const experience = selectedExperience.length > 0 ? selectedExperience : input.profile.experience.slice(0, 2);
  const projects = selectedProjects.length > 0 ? selectedProjects : input.profile.projects.slice(0, 3);

  return GeneratedCvDataSchema.parse({
    basics: {
      name: input.profile.basics.name,
      targetRole: input.jobAnalysis.jobTitle,
      email: input.profile.basics.email,
      phone: input.profile.basics.phone,
      location: input.profile.basics.location,
      linkedin: input.profile.basics.linkedin,
      github: input.profile.basics.github,
      portfolio: input.profile.basics.portfolio,
      summary: `Desenvolvedor focado em ${matchedSkills.slice(0, 5).join(", ")}, com experiencia em interfaces responsivas, integracao de APIs e projetos praticos alinhados a ${input.jobAnalysis.jobTitle}.`
    },
    skills: {
      technicalText: matchedSkills.join(" · ")
    },
    experience: experience.map((item) => ({
      title: item.title,
      company: item.company,
      period: item.period,
      bullets: pickRelevantBullets(item.bullets, focusTerms, 4)
    })),
    projects: projects.map((project) => ({
      name: project.name,
      description: project.description,
      stack: project.stack.join(", ")
    })),
    education: input.profile.education.map((education) => ({
      institution: education.institution,
      course: education.course,
      period: education.period
    })),
    certifications: input.profile.certifications.map(formatCertification),
    languages: input.profile.languages.map(formatLanguage)
  });
}
