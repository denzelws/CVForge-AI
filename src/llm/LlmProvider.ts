import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { MatchReport } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";

export type LlmProviderName = "mock" | "openai" | "ollama";

export type LlmGenerateCvDataInput = {
  prompt: string;
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchReport: MatchReport;
};

export type LlmProvider = {
  name: LlmProviderName;
  generateCvDataJson(input: LlmGenerateCvDataInput): Promise<unknown>;
};
