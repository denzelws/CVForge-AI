import { JobAnalysis, JobAnalysisSchema } from "../schemas/jobAnalysis.schema.js";

const SKILL_KEYWORDS = [
  "React",
  "TypeScript",
  "JavaScript",
  "HTML",
  "CSS",
  "Git",
  "Figma",
  "Jest",
  "Accessibility",
  "Responsive Design",
  "Node.js"
];

export function analyzeJob(jobDescription: string): JobAnalysis {
  const lines = jobDescription
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const title = lines[0] ?? "Target Role";
  const lower = jobDescription.toLowerCase();
  const keywords = SKILL_KEYWORDS.filter((skill) => lower.includes(skill.toLowerCase()));

  return JobAnalysisSchema.parse({
    title,
    seniority: lower.includes("junior") ? "junior" : undefined,
    responsibilities: lines.filter((line) => line.startsWith("-")).map((line) => line.slice(1).trim()),
    requiredSkills: keywords,
    preferredSkills: [],
    keywords
  });
}
