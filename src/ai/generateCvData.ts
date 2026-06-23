import { createLlmProvider } from "../llm/createLlmProvider.js";
import { LlmProviderName } from "../llm/LlmProvider.js";
import { GeneratedCvData, GeneratedCvDataSchema } from "../schemas/generatedCvData.schema.js";
import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { MatchReport } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";

export type GenerateCvDataInput = {
  prompt: string;
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchReport: MatchReport;
};

export type GenerateCvDataResult = {
  data: GeneratedCvData;
  provider: LlmProviderName;
};

export async function generateCvData(input: GenerateCvDataInput): Promise<GenerateCvDataResult> {
  const provider = createLlmProvider();
  const result = await provider.generateCvDataJson(input);

  return {
    data: GeneratedCvDataSchema.parse(result),
    provider: provider.name
  };
}
