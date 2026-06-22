import fs from "node:fs";
import path from "node:path";
import { analyzeJob } from "../ai/analyzeJob.js";
import { paths } from "../config.js";
import { JobAnalysis, JobAnalysisSchema } from "../schemas/jobAnalysis.schema.js";

export type AnalyzeJobResult = {
  analysis: JobAnalysis;
  inputPath: string;
  outputPath: string;
};

export function analyzeJobWorkflow(jobInput: string): AnalyzeJobResult {
  const jobName = jobInput.replace(/\.txt$/i, "");
  const inputPath = path.join(paths.jobs, `${jobName}.txt`);
  const outputDir = path.join(paths.data, "generated");
  const outputPath = path.join(outputDir, `${jobName}.job-analysis.json`);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Job description not found: ${inputPath}`);
  }

  const jobDescription = fs.readFileSync(inputPath, "utf8");
  const analysis = JobAnalysisSchema.parse(analyzeJob(jobDescription));

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);

  return { analysis, inputPath, outputPath };
}
