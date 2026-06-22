import fs from "node:fs";
import path from "node:path";
import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import { resolveDotPath } from "../utils/resolveDotPath.js";

type RenderData = Record<string, unknown>;
type ParserContext = {
  scopeList?: unknown[];
};

function formatDocxError(error: unknown): Error {
  if (!(error instanceof Error)) {
    return new Error(String(error));
  }

  const properties = (error as Error & { properties?: unknown }).properties;

  if (properties) {
    return new Error(
      `DOCX template render failed. Check for invalid placeholder syntax or unmatched loop tags. ${error.message}\n${JSON.stringify(properties, null, 2)}`
    );
  }

  return new Error(`DOCX template render failed. ${error.message}`);
}

function resolveTemplateValue(tag: string, scope: unknown, context: ParserContext, rootData: RenderData): unknown {
  const trimmedTag = tag.trim();

  if (trimmedTag === ".") {
    return scope;
  }

  const scopeCandidates = [scope, ...(context.scopeList ?? []).slice().reverse(), rootData];

  for (const candidate of scopeCandidates) {
    const resolved = resolveDotPath(candidate, trimmedTag);
    if (resolved.found && resolved.value !== undefined && resolved.value !== null) {
      return resolved.value;
    }
  }

  throw new Error(`Could not resolve DOCX placeholder "{${trimmedTag}}" from render data.`);
}

function createDotPathParser(rootData: RenderData) {
  return (tag: string) => ({
    get(scope: unknown, context: ParserContext) {
      return resolveTemplateValue(tag, scope, context, rootData);
    }
  });
}

export function renderDocx(templatePath: string, data: RenderData, outputPath: string): void {
  const content = fs.readFileSync(templatePath);
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    parser: createDotPathParser(data)
  });

  try {
    doc.render(data);
  } catch (error) {
    throw formatDocxError(error);
  }

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    doc.getZip().generate({
      type: "nodebuffer",
      compression: "DEFLATE"
    })
  );
}
