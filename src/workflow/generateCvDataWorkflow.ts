import fs from "node:fs";
import path from "node:path";
import { GeneratedCvDataSchemaValidationError, generateCvData } from "../ai/generateCvData.js";
import { validateGeneratedCvDataFacts } from "../ai/validateGeneratedCvDataFacts.js";
import { paths } from "../config.js";
import { LlmProviderName } from "../llm/LlmProvider.js";
import { OllamaInvalidJsonError } from "../llm/ollamaLlmProvider.js";
import { GeneratedCvData } from "../schemas/generatedCvData.schema.js";
import { JobAnalysisSchema } from "../schemas/jobAnalysis.schema.js";
import { MatchReportSchema } from "../schemas/matchReport.schema.js";
import { ProfileSchema } from "../schemas/profile.schema.js";
import { readJsonFile } from "../utils/readJsonFile.js";

export type GenerateCvDataWorkflowResult = {
  data: GeneratedCvData;
  outputPath: string;
  provider: LlmProviderName;
  skippedOpenAI: boolean;
  skippedOllama: boolean;
  validationStatus: "passed";
  fallbackUsed: boolean;
  fallbackReason?: string;
};

export async function generateCvDataWorkflow(jobInput: string): Promise<GenerateCvDataWorkflowResult> {
  const jobName = jobInput.replace(/\.txt$/i, "");
  const profilePath = path.join(paths.data, "profile.base.json");
  const jobAnalysisPath = path.join(paths.data, "generated", `${jobName}.job-analysis.json`);
  const matchReportPath = path.join(paths.data, "generated", `${jobName}.match-report.json`);
  const promptPath = path.resolve("prompts/generate-cv-data.md");
  const outputPath = path.join(paths.data, "generated", `${jobName}.cv-data.json`);
  const debugOutputPath = path.join(paths.data, "generated", "debug", `${jobName}.ollama-invalid-output.json`);

  for (const requiredPath of [profilePath, jobAnalysisPath, matchReportPath, promptPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required input file not found: ${requiredPath}`);
    }
  }

  const profile = readJsonFile(profilePath, ProfileSchema);
  const jobAnalysis = readJsonFile(jobAnalysisPath, JobAnalysisSchema);
  const matchReport = readJsonFile(matchReportPath, MatchReportSchema);
  const prompt = fs.readFileSync(promptPath, "utf8");
  let result: Awaited<ReturnType<typeof generateCvData>>;

  try {
    result = await generateCvData({ prompt, profile, jobAnalysis, matchReport });
  } catch (error) {
    if (error instanceof OllamaInvalidJsonError) {
      fs.mkdirSync(path.dirname(debugOutputPath), { recursive: true });
      fs.writeFileSync(debugOutputPath, `${JSON.stringify(error.rawOutput, null, 2)}\n`);
      throw new Error(`${error.message}\nRaw invalid Ollama JSON saved to: ${debugOutputPath}`);
    }

    if (error instanceof GeneratedCvDataSchemaValidationError && error.provider === "ollama") {
      fs.mkdirSync(path.dirname(debugOutputPath), { recursive: true });
      fs.writeFileSync(debugOutputPath, `${JSON.stringify(error.rawJson, null, 2)}\n`);
      throw new Error(`${error.message}\nRaw invalid Ollama JSON saved to: ${debugOutputPath}`);
    }

    throw error;
  }

  const data = result.data;

  if (result.provider === "ollama" && result.invalidRawJson !== undefined) {
    fs.mkdirSync(path.dirname(debugOutputPath), { recursive: true });
    fs.writeFileSync(debugOutputPath, `${JSON.stringify(result.invalidRawJson, null, 2)}\n`);
    console.log(`Raw invalid Ollama JSON saved to: ${debugOutputPath}`);
  }

  if (result.provider === "ollama") {
    console.log("Ollama schema validation status: passed");
    console.log("Ollama fact validation started");
  }

  const factIssues = validateGeneratedCvDataFacts(data, profile, matchReport);

  if (factIssues.length > 0) {
    throw new Error(`Generated CV data failed fact validation:\n- ${factIssues.join("\n- ")}`);
  }

  if (result.provider === "ollama") {
    console.log("Ollama fact validation status: passed");
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

  return {
    data,
    outputPath,
    provider: result.provider,
    skippedOpenAI: result.provider !== "openai",
    skippedOllama: result.provider !== "ollama",
    validationStatus: "passed",
    fallbackUsed: result.fallbackUsed,
    fallbackReason: result.fallbackReason
  };
}
