import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import {
  extractDocxText,
  inspectTemplatePlaceholders,
  summarizePlaceholderInspection,
  validateLoopPairs,
  validatePlaceholdersAgainstData
} from "../docx/inspectTemplatePlaceholders.js";
import { renderDocx } from "../docx/renderDocx.js";
import { RenderTestCvDataSchema } from "../schemas/renderTestCvData.schema.js";

export type RenderTestResult = {
  outputPath: string;
  placeholderSummary: string;
};

export function renderTestWorkflow(templateInput: string): RenderTestResult {
  const templateName = resolveTemplateName(templateInput);
  const templatePath = path.join(paths.templatesPrepared, `${templateName}.docx`);
  const dataPath = path.join(paths.data, "fixtures/cv-data.sample.json");
  const outputPath = path.join(paths.outputs, `${templateName}.render-test.docx`);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Prepared template not found: ${templatePath}`);
  }

  if (!fs.existsSync(dataPath)) {
    throw new Error(`Sample CV data not found: ${dataPath}`);
  }

  const data = RenderTestCvDataSchema.parse(JSON.parse(fs.readFileSync(dataPath, "utf8")));
  const inspection = inspectTemplatePlaceholders(templatePath);
  const placeholderSummary = summarizePlaceholderInspection(inspection);

  if (inspection.placeholders.length === 0) {
    throw new Error(
      `Render test failed: no placeholders were found in ${templatePath}.\nThis test must verify actual JSON injection, so add DOCX placeholders before running it.\n${placeholderSummary}`
    );
  }

  const preflightErrors = [
    ...validateLoopPairs(inspection.placeholders),
    ...validatePlaceholdersAgainstData(inspection.placeholders, data)
  ];

  if (preflightErrors.length > 0) {
    throw new Error(
      `Render test preflight failed for ${templatePath}.\n${placeholderSummary}\nErrors:\n- ${preflightErrors.join("\n- ")}`
    );
  }

  renderDocx(templatePath, data, outputPath);
  const outputInspection = inspectTemplatePlaceholders(outputPath);

  if (outputInspection.placeholders.length > 0) {
    throw new Error(
      `Render test failed: unresolved placeholders remain in ${outputPath}.\nUnresolved:\n- ${outputInspection.unresolvedRaw.join("\n- ")}`
    );
  }

  if (/\bundefined\b/i.test(extractDocxText(outputPath))) {
    throw new Error(`Render test failed: generated DOCX contains the word "undefined": ${outputPath}`);
  }

  return { outputPath, placeholderSummary };
}
