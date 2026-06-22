import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import { ExtractedDocxStructure, extractDocxStructure } from "./extractDocxStructure.js";

export type TemplateStructureAnalysis = ExtractedDocxStructure & {
  templateName: string;
  sourceDocx: string;
  outputPath: string;
  generatedAt: string;
};

export function analyzeDocxTemplate(templateFileName: string): TemplateStructureAnalysis {
  const templateName = resolveTemplateName(templateFileName);
  const sourceDocx = path.join(paths.templatesOriginal, `${templateName}.docx`);
  const outputPath = path.join(paths.templateMaps, `${templateName}.structure.json`);

  if (!fs.existsSync(sourceDocx)) {
    throw new Error(`Template not found: ${sourceDocx}`);
  }

  fs.mkdirSync(paths.templateMaps, { recursive: true });

  const structure = extractDocxStructure(sourceDocx);
  const analysis: TemplateStructureAnalysis = {
    ...structure,
    templateName,
    sourceDocx,
    outputPath,
    generatedAt: new Date().toISOString()
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(analysis, null, 2)}\n`);

  return analysis;
}
