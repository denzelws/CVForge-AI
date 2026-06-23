import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import { renderDocx } from "../docx/renderDocx.js";
import { GeneratedCvDataSchema } from "../schemas/generatedCvData.schema.js";
import { readJsonFile } from "../utils/readJsonFile.js";

export function generateCvWorkflow(templateInput: string, jobInput: string): string {
  const templateName = resolveTemplateName(templateInput);
  const jobName = jobInput.replace(/\.txt$/i, "");
  const cvDataPath = path.join(paths.data, "generated", `${jobName}.cv-data.json`);
  const preparedTemplatePath = path.join(paths.templatesPrepared, `${templateName}.docx`);
  const outputPath = path.join(paths.outputs, `${templateName}-${jobName}.docx`);

  if (!fs.existsSync(preparedTemplatePath)) {
    throw new Error(`Prepared template not found: ${preparedTemplatePath}`);
  }

  if (!fs.existsSync(cvDataPath)) {
    throw new Error(
      `Generated CV data not found: ${cvDataPath}. Run yarn cv:generate-data -- --job ${jobName} first.`
    );
  }

  const cvData = readJsonFile(cvDataPath, GeneratedCvDataSchema);

  renderDocx(preparedTemplatePath, cvData, outputPath);
  fs.writeFileSync(
    path.join(paths.outputs, `${templateName}-${jobName}.json`),
    `${JSON.stringify(cvData, null, 2)}\n`
  );

  return outputPath;
}
