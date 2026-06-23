import { GeneratedCvData } from "../schemas/generatedCvData.schema.js";
import { MatchReport } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/api\s*rest|rest\s*api(s)?|apis?\s*rest/g, "restapis")
    .replace(/node(?:\.js|js)/g, "nodejs")
    .replace(/react(?:\.js|js)/g, "react")
    .replace(/typescript/g, "ts")
    .replace(/javascript/g, "js")
    .replace(/tailwindcss|tailwind/g, "tailwind")
    .replace(/styled[-\s]?components?/g, "styledcomponents")
    .replace(/[^a-z0-9]/g, "");
}

function splitSkills(value: string): string[] {
  return value
    .split(/[·,|;/]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function collectNumbers(value: unknown): Set<string> {
  const text = JSON.stringify(value);
  return new Set(text.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? []);
}

function textFields(data: GeneratedCvData): string[] {
  return [
    data.basics.summary,
    data.skills.technicalText,
    ...data.experience.flatMap((item) => [item.title, item.company, item.period, ...item.bullets]),
    ...data.projects.flatMap((item) => [item.name, item.description, item.stack]),
    ...data.education.flatMap((item) => [item.institution, item.course, item.period]),
    ...data.certifications,
    ...data.languages
  ];
}

function includesAnyNormalized(values: string[], target: string): boolean {
  const normalizedTarget = normalize(target);
  return values.some((value) => normalize(value) === normalizedTarget);
}

export function validateGeneratedCvDataFacts(
  data: GeneratedCvData,
  profile: Profile,
  matchReport: MatchReport
): string[] {
  const issues: string[] = [];
  const companyNames = profile.experience.map((item) => item.company);
  const projectNames = profile.projects.map((item) => item.name);
  const certificationNames = profile.certifications.map((item) => item.name);
  const educationKeys = profile.education.map((item) => `${item.institution} ${item.course}`);
  const allowedSkills = [
    ...profile.skills.map((item) => item.name),
    ...profile.experience.flatMap((item) => item.technologies),
    ...profile.projects.flatMap((item) => item.stack),
    ...matchReport.matchedSkills.map((item) => item.skill)
  ];
  const allowedNumbers = collectNumbers(profile);

  for (const experience of data.experience) {
    if (!includesAnyNormalized(companyNames, experience.company)) {
      issues.push(`Unsupported company in generated experience: ${experience.company}`);
    }
  }

  for (const project of data.projects) {
    if (!includesAnyNormalized(projectNames, project.name)) {
      issues.push(`Unsupported project in generated projects: ${project.name}`);
    }
  }

  for (const certification of data.certifications) {
    if (!certificationNames.some((name) => certification.toLowerCase().includes(name.toLowerCase()))) {
      issues.push(`Unsupported certification in generated certifications: ${certification}`);
    }
  }

  for (const education of data.education) {
    const key = `${education.institution} ${education.course}`;
    if (!educationKeys.some((profileKey) => normalize(profileKey) === normalize(key))) {
      issues.push(`Unsupported education entry: ${education.institution} - ${education.course}`);
    }
  }

  for (const skill of splitSkills(data.skills.technicalText)) {
    if (!includesAnyNormalized(allowedSkills, skill)) {
      issues.push(`Unsupported skill in skills.technicalText: ${skill}`);
    }
  }

  for (const field of textFields(data)) {
    const numbers = field.match(/\b\d+(?:[.,]\d+)?%?\b/g) ?? [];
    for (const number of numbers) {
      if (!allowedNumbers.has(number)) {
        issues.push(`Unsupported numeric claim "${number}" in generated text: ${field}`);
      }
    }
  }

  return issues;
}
