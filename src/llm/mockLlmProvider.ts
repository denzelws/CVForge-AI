import { GeneratedCvData } from "../schemas/generatedCvData.schema.js";
import { LlmGenerateCvDataInput, LlmProvider } from "./LlmProvider.js";

export class MockLlmProvider implements LlmProvider {
  name = "mock" as const;

  async generateCvDataJson(input: LlmGenerateCvDataInput): Promise<GeneratedCvData> {
    return input.skeleton;
  }
}
