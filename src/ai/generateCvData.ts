import { generateJsonWithOpenAI } from "../llm/openaiClient.js";
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

export async function generateCvData(input: GenerateCvDataInput): Promise<GeneratedCvData> {
  const result = await generateJsonWithOpenAI({
    systemPrompt: input.prompt,
    userPrompt: JSON.stringify(
      {
        profile: input.profile,
        jobAnalysis: input.jobAnalysis,
        matchReport: input.matchReport
      },
      null,
      2
    )
  });

  return GeneratedCvDataSchema.parse(result);
}
