import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import { TemplateMap, TemplateMapSchema } from "../schemas/templateMap.schema.js";
import { extractDocxStructure } from "./extractDocxStructure.js";

export function createTemplateMap(templateFileName: string): TemplateMap {
  const templateName = resolveTemplateName(templateFileName);
  const originalDocx = path.join(paths.templatesOriginal, `${templateName}.docx`);
  const preparedDocx = path.join(paths.templatesPrepared, `${templateName}.docx`);

  if (!fs.existsSync(originalDocx)) {
    throw new Error(`Template not found: ${originalDocx}`);
  }

  fs.mkdirSync(paths.templatesPrepared, { recursive: true });
  fs.mkdirSync(paths.templateMaps, { recursive: true });

  if (!fs.existsSync(preparedDocx)) {
    fs.copyFileSync(originalDocx, preparedDocx);
  }

  const structure = extractDocxStructure(preparedDocx);
  const variables = structure.placeholders.map((raw) => {
    const name = raw.replace(/[{}#/]/g, "").trim();
    const kind = raw.startsWith("{#")
      ? "loopStart"
      : raw.startsWith("{/")
        ? "loopEnd"
        : "placeholder";

    return { name, kind, raw };
  });

  const map = TemplateMapSchema.parse({
    templateName,
    originalDocx,
    preparedDocx,
    variables,
    loops: structure.loops,
    generatedAt: new Date().toISOString()
  });

  fs.writeFileSync(
    path.join(paths.templateMaps, `${templateName}.json`),
    `${JSON.stringify(map, null, 2)}\n`
  );

  return map;
}
