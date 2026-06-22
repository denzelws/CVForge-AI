import fs from "node:fs";
import path from "node:path";
import { paths } from "../config.js";
import { matchProfileToJob } from "../matching/matchProfileToJob.js";
import { JobAnalysisSchema } from "../schemas/jobAnalysis.schema.js";
import { MatchReport, MatchReportSchema } from "../schemas/matchReport.schema.js";
import { ProfileSchema } from "../schemas/profile.schema.js";
import { readJsonFile } from "../utils/readJsonFile.js";

export type MatchJobResult = {
  report: MatchReport;
  outputPath: string;
};

export function matchJobWorkflow(jobInput: string): MatchJobResult {
  const jobName = jobInput.replace(/\.txt$/i, "").replace(/\.job-analysis\.json$/i, "");
  const profilePath = path.join(paths.data, "profile.base.json");
  const analysisPath = path.join(paths.data, "generated", `${jobName}.job-analysis.json`);
  const outputPath = path.join(paths.data, "generated", `${jobName}.match-report.json`);

  if (!fs.existsSync(analysisPath)) {
    throw new Error(`Job analysis not found: ${analysisPath}. Run yarn job:analyze -- --job ${jobName} first.`);
  }

  const profile = readJsonFile(profilePath, ProfileSchema);
  const jobAnalysis = readJsonFile(analysisPath, JobAnalysisSchema);
  const report = MatchReportSchema.parse(matchProfileToJob(profile, jobAnalysis, jobName));

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);

  return { report, outputPath };
}
