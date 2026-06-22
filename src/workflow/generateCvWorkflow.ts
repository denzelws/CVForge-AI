import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import { analyzeJob } from "../ai/analyzeJob.js";
import { generateCvData } from "../ai/generateCvData.js";
import { validateCvData } from "../ai/validateCvData.js";
import { renderDocx } from "../docx/renderDocx.js";
import { ProfileSchema } from "../schemas/profile.schema.js";

export function generateCvWorkflow(templateInput: string, jobInput: string): string {
  const templateName = resolveTemplateName(templateInput);
  const jobName = jobInput.replace(/\.txt$/i, "");
  const profilePath = path.join(paths.data, "profile.base.json");
  const jobPath = path.join(paths.jobs, `${jobName}.txt`);
  const preparedTemplatePath = path.join(paths.templatesPrepared, `${templateName}.docx`);
  const outputPath = path.join(paths.outputs, `${templateName}-${jobName}.docx`);

  if (!fs.existsSync(preparedTemplatePath)) {
    throw new Error(`Prepared template not found: ${preparedTemplatePath}`);
  }

  if (!fs.existsSync(jobPath)) {
    throw new Error(`Job description not found: ${jobPath}`);
  }

  const profile = ProfileSchema.parse(JSON.parse(fs.readFileSync(profilePath, "utf8")));
  const job = analyzeJob(fs.readFileSync(jobPath, "utf8"));
  const cvData = validateCvData(generateCvData(profile, job));

  renderDocx(preparedTemplatePath, cvData, outputPath);
  fs.writeFileSync(
    path.join(paths.outputs, `${templateName}-${jobName}.json`),
    `${JSON.stringify(cvData, null, 2)}\n`
  );

  return outputPath;
}
