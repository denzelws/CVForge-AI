import { Profile } from "../schemas/profile.schema.js";
import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";

export function askMissingInfo(profile: Profile, job: JobAnalysis): string[] {
  const missing: string[] = [];

  if (!profile.basics.email) {
    missing.push("What email address should appear on the resume?");
  }

  if (job.requiredSkills.length > 0 && profile.skills.length === 0) {
    missing.push("Which skills from the job description can you support with real experience?");
  }

  return missing;
}
