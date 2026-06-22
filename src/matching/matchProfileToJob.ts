import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { MatchReport, MatchReportSchema } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";

type SkillLevel = Profile["skills"][number]["level"];

type SkillMatch = {
  skill: string;
  profileLevel?: SkillLevel;
  evidence: string[];
  source: "profile" | "technology" | "related" | "missing";
  scoreWeight: number;
};

const RELATED_SKILLS: Record<string, string[]> = {
  "Design Systems": ["Styled Components", "TailwindCSS", "React"],
  Accessibility: ["Responsive Design", "HTML", "CSS"],
  "Responsive Design": ["React", "CSS", "TailwindCSS"],
  "REST APIs": ["Node.js", "NestJS", "Fastify", "Express"],
  "Testing Library": ["Jest", "Vitest", "Cypress"],
  Figma: ["React", "Responsive Design"]
};

const LEVEL_SCORE: Record<SkillLevel, number> = {
  study: 0.25,
  basic: 0.5,
  practical: 0.85,
  professional: 1
};

function normalizeSkill(value: string): string {
  return value
    .toLowerCase()
    .replace(/react(?:\.js|js)/g, "react")
    .replace(/node(?:\.js|js)/g, "nodejs")
    .replace(/typescript/g, "ts")
    .replace(/javascript/g, "js")
    .replace(/api\s*rest|rest\s*api(s)?|apis?\s*rest/g, "restapis")
    .replace(/tailwindcss|tailwind/g, "tailwind")
    .replace(/styled[-\s]?components?/g, "styledcomponents")
    .replace(/[^a-z0-9]/g, "");
}

function includesNormalized(values: string[], skill: string): boolean {
  const target = normalizeSkill(skill);
  return values.some((value) => normalizeSkill(value) === target);
}

function textContainsSkill(text: string, skill: string): boolean {
  return normalizeSkill(text).includes(normalizeSkill(skill));
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function findProfileSkill(profile: Profile, skill: string): Profile["skills"][number] | undefined {
  return profile.skills.find((profileSkill) => normalizeSkill(profileSkill.name) === normalizeSkill(skill));
}

function findTechnologyEvidence(profile: Profile, skill: string): string[] {
  const experienceEvidence = profile.experience
    .filter((experience) => includesNormalized(experience.technologies, skill))
    .map((experience) => `${experience.title} at ${experience.company}`);
  const projectEvidence = profile.projects
    .filter((project) => includesNormalized(project.stack, skill))
    .map((project) => `${project.name} project`);

  return unique([...experienceEvidence, ...projectEvidence]);
}

function findTextEvidence(profile: Profile, skill: string): string[] {
  const skillEvidence = profile.skills
    .filter((profileSkill) => profileSkill.evidence.some((evidence) => textContainsSkill(evidence, skill)))
    .map((profileSkill) => `${profileSkill.name} evidence`);
  const experienceEvidence = profile.experience
    .filter((experience) => experience.bullets.some((bullet) => textContainsSkill(bullet, skill)))
    .map((experience) => `${experience.title} at ${experience.company}`);
  const projectEvidence = profile.projects
    .filter(
      (project) =>
        textContainsSkill(project.description, skill) ||
        project.stack.some((stackItem) => textContainsSkill(stackItem, skill))
    )
    .map((project) => `${project.name} project`);

  return unique([...skillEvidence, ...experienceEvidence, ...projectEvidence]);
}

function findRelatedSkill(profile: Profile, skill: string): string | undefined {
  const related = RELATED_SKILLS[skill] ?? [];
  return related.find(
    (relatedSkill) =>
      Boolean(findProfileSkill(profile, relatedSkill)) ||
      findTechnologyEvidence(profile, relatedSkill).length > 0
  );
}

function matchSkill(profile: Profile, skill: string): SkillMatch {
  const profileSkill = findProfileSkill(profile, skill);

  if (profileSkill) {
    return {
      skill,
      profileLevel: profileSkill.level,
      evidence: profileSkill.evidence,
      source: profileSkill.level === "study" || profileSkill.level === "basic" ? "related" : "profile",
      scoreWeight: LEVEL_SCORE[profileSkill.level]
    };
  }

  const technologyEvidence = findTechnologyEvidence(profile, skill);
  if (technologyEvidence.length > 0) {
    return {
      skill,
      profileLevel: "practical",
      evidence: technologyEvidence,
      source: "technology",
      scoreWeight: LEVEL_SCORE.practical
    };
  }

  const textEvidence = findTextEvidence(profile, skill);
  if (textEvidence.length > 0) {
    return {
      skill,
      profileLevel: "practical",
      evidence: textEvidence,
      source: "technology",
      scoreWeight: LEVEL_SCORE.practical
    };
  }

  const relatedSkill = findRelatedSkill(profile, skill);
  if (relatedSkill) {
    return {
      skill,
      evidence: [`Related skill found: ${relatedSkill}`],
      source: "related",
      scoreWeight: 0.35
    };
  }

  return {
    skill,
    evidence: [],
    source: "missing",
    scoreWeight: 0
  };
}

function getDecision(score: number): MatchReport["decision"] {
  if (score >= 85) {
    return "strong_match";
  }

  if (score >= 70) {
    return "good_match";
  }

  if (score >= 50) {
    return "partial_match";
  }

  return "weak_match";
}

function recommendProjects(profile: Profile, skills: string[]): string[] {
  return profile.projects
    .filter((project) =>
      project.stack.some((stackItem) => skills.some((skill) => normalizeSkill(stackItem) === normalizeSkill(skill)))
    )
    .map((project) => project.name);
}

function recommendExperience(profile: Profile, skills: string[]): string[] {
  return profile.experience
    .filter((experience) => {
      const technologyMatch = experience.technologies.some((technology) =>
        skills.some((skill) => normalizeSkill(technology) === normalizeSkill(skill))
      );
      const bulletMatch = experience.bullets.some((bullet) =>
        skills.some((skill) => textContainsSkill(bullet, skill))
      );
      return technologyMatch || bulletMatch;
    })
    .map((experience) => `${experience.title} at ${experience.company}`);
}

export function matchProfileToJob(profile: Profile, job: JobAnalysis, jobName: string): MatchReport {
  const requiredSkills = unique(job.requiredSkills);
  const matches = requiredSkills.map((skill) => matchSkill(profile, skill));
  const matchedSkills = matches
    .filter((match) => match.source === "profile" || match.source === "technology")
    .map((match) => ({
      skill: match.skill,
      profileLevel: match.profileLevel ?? "practical",
      evidence: match.evidence
    }));
  const uncertainSkills = matches
    .filter((match) => match.source === "related")
    .map((match) => ({
      skill: match.skill,
      reason: match.profileLevel
        ? `Profile skill exists with ${match.profileLevel} level, so it should be verified before presenting strongly.`
        : match.evidence[0] ?? "A related skill was found, but not an exact match.",
      questionForUser: `Can you provide concrete evidence for ${match.skill} in work, projects, or study?`
    }));
  const missingSkills = matches
    .filter((match) => match.source === "missing")
    .map((match) => match.skill);
  const totalWeight = requiredSkills.length || 1;
  const rawScore = matches.reduce((sum, match) => sum + match.scoreWeight, 0) / totalWeight;
  const scorePenalty = missingSkills.length > 0 ? Math.min(0.15, missingSkills.length * 0.03) : 0;
  const matchScore = Math.max(0, Math.min(100, Math.round((rawScore - scorePenalty) * 100)));
  const matchedSkillNames = matchedSkills.map((match) => match.skill);
  const warnings: string[] = [];

  if (missingSkills.length > 0) {
    warnings.push("Some required skills were not found in the profile evidence.");
  }

  if (uncertainSkills.length > 0) {
    warnings.push("Some skills are related or low-confidence and should not be overstated.");
  }

  return MatchReportSchema.parse({
    jobName,
    matchScore,
    decision: getDecision(matchScore),
    matchedSkills,
    missingSkills,
    uncertainSkills,
    recommendedFocus: unique([...job.resumeFocus, ...matchedSkillNames]).slice(0, 12),
    recommendedProjects: recommendProjects(profile, matchedSkillNames),
    recommendedExperience: recommendExperience(profile, matchedSkillNames),
    warnings,
    notes: [
      `Matched ${matchedSkills.length} of ${requiredSkills.length} required skills as practical/professional or technology-backed evidence.`
    ]
  });
}
