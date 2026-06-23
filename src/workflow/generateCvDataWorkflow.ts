import fs from "node:fs";
import path from "node:path";
import { generateCvData } from "../ai/generateCvData.js";
import { validateGeneratedCvDataFacts } from "../ai/validateGeneratedCvDataFacts.js";
import { paths } from "../config.js";
import { LlmProviderName } from "../llm/LlmProvider.js";
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
};

export async function generateCvDataWorkflow(jobInput: string): Promise<GenerateCvDataWorkflowResult> {
  const jobName = jobInput.replace(/\.txt$/i, "");
  const profilePath = path.join(paths.data, "profile.base.json");
  const jobAnalysisPath = path.join(paths.data, "generated", `${jobName}.job-analysis.json`);
  const matchReportPath = path.join(paths.data, "generated", `${jobName}.match-report.json`);
  const promptPath = path.resolve("prompts/generate-cv-data.md");
  const outputPath = path.join(paths.data, "generated", `${jobName}.cv-data.json`);

  for (const requiredPath of [profilePath, jobAnalysisPath, matchReportPath, promptPath]) {
    if (!fs.existsSync(requiredPath)) {
      throw new Error(`Required input file not found: ${requiredPath}`);
    }
  }

  const profile = readJsonFile(profilePath, ProfileSchema);
  const jobAnalysis = readJsonFile(jobAnalysisPath, JobAnalysisSchema);
  const matchReport = readJsonFile(matchReportPath, MatchReportSchema);
  const prompt = fs.readFileSync(promptPath, "utf8");
  const result = await generateCvData({ prompt, profile, jobAnalysis, matchReport });
  const data = result.data;
  const factIssues = validateGeneratedCvDataFacts(data, profile, matchReport);

  if (factIssues.length > 0) {
    throw new Error(`Generated CV data failed fact validation:\n- ${factIssues.join("\n- ")}`);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(data, null, 2)}\n`);

  return {
    data,
    outputPath,
    provider: result.provider,
    skippedOpenAI: result.provider !== "openai",
    skippedOllama: result.provider !== "ollama",
    validationStatus: "passed"
  };
}
