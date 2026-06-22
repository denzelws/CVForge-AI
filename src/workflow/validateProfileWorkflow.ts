import path from "node:path";
import { paths } from "../config.js";
import { Profile, ProfileSchema } from "../schemas/profile.schema.js";
import { readJsonFile } from "../utils/readJsonFile.js";

export type ProfileValidationSummary = {
  profile: Profile;
  profilePath: string;
  summary: {
    candidateName: string;
    skills: number;
    experiences: number;
    projects: number;
    certifications: number;
    languages: number;
  };
};

export function validateProfileWorkflow(): ProfileValidationSummary {
  const profilePath = path.join(paths.data, "profile.base.json");
  const profile = readJsonFile(profilePath, ProfileSchema);

  return {
    profile,
    profilePath,
    summary: {
      candidateName: profile.basics.name,
      skills: profile.skills.length,
      experiences: profile.experience.length,
      projects: profile.projects.length,
      certifications: profile.certifications.length,
      languages: profile.languages.length
    }
  };
}
