import { generateJsonWithOpenAI } from "./openaiClient.js";
import { LlmGenerateCvDataInput, LlmProvider } from "./LlmProvider.js";

export class OpenAiLlmProvider implements LlmProvider {
  name = "openai" as const;

  async generateCvDataJson(input: LlmGenerateCvDataInput): Promise<unknown> {
    return generateJsonWithOpenAI({
      systemPrompt: input.prompt,
      userPrompt: JSON.stringify(
        {
          profile: input.profile,
          jobAnalysis: input.jobAnalysis,
          matchReport: input.matchReport,
          deterministicSkeleton: input.skeleton
        },
        null,
        2
      )
    });
  }
}
