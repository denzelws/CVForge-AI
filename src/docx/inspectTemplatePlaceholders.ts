import fs from "node:fs";
import PizZip from "pizzip";
import { resolveDotPath } from "../utils/resolveDotPath.js";

export type PlaceholderKind = "simple" | "loopStart" | "loopEnd" | "currentItem" | "malformed";

export type TemplatePlaceholder = {
  raw: string;
  kind: PlaceholderKind;
  field?: string;
};

export type PlaceholderInspection = {
  placeholders: TemplatePlaceholder[];
  simplePlaceholders: TemplatePlaceholder[];
  loopStarts: TemplatePlaceholder[];
  loopEnds: TemplatePlaceholder[];
  currentItems: TemplatePlaceholder[];
  malformed: TemplatePlaceholder[];
  unresolvedRaw: string[];
};

const BRACE_TOKEN_PATTERN = /\{[^{}]*\}/g;
const FIELD_PATTERN = /^[A-Za-z_$][\w$]*(\.[A-Za-z_$][\w$]*)*$/;

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'");
}

function extractTextFromXml(xml: string): string {
  return [...xml.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)]
    .map((match) => decodeXml(match[1] ?? ""))
    .join("");
}

export function extractDocxText(docxPath: string): string {
  const zip = new PizZip(fs.readFileSync(docxPath));
  const xmlFiles = zip
    .file(/word\/(document|header\d+|footer\d+)\.xml/)
    .map((file) => file.asText());

  return xmlFiles.map(extractTextFromXml).join("\n");
}

function classifyPlaceholder(raw: string): TemplatePlaceholder {
  const content = raw.slice(1, -1).trim();

  if (content === ".") {
    return { raw, kind: "currentItem", field: "." };
  }

  if (content.startsWith("#")) {
    const field = content.slice(1).trim();
    return FIELD_PATTERN.test(field)
      ? { raw, kind: "loopStart", field }
      : { raw, kind: "malformed" };
  }

  if (content.startsWith("/")) {
    const field = content.slice(1).trim();
    return FIELD_PATTERN.test(field)
      ? { raw, kind: "loopEnd", field }
      : { raw, kind: "malformed" };
  }

  return FIELD_PATTERN.test(content)
    ? { raw, kind: "simple", field: content }
    : { raw, kind: "malformed" };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function resolvePath(data: unknown, field: string, contextStack: unknown[]): unknown {
  for (let index = contextStack.length - 1; index >= 0; index -= 1) {
    const contextValue = resolveDotPath(contextStack[index], field);
    if (contextValue.found) {
      return contextValue.value;
    }
  }

  return resolveDotPath(data, field).value;
}

export function inspectTemplatePlaceholders(docxPath: string): PlaceholderInspection {
  const text = extractDocxText(docxPath);
  const placeholders = (text.match(BRACE_TOKEN_PATTERN) ?? []).map(classifyPlaceholder);

  return {
    placeholders,
    simplePlaceholders: placeholders.filter((placeholder) => placeholder.kind === "simple"),
    loopStarts: placeholders.filter((placeholder) => placeholder.kind === "loopStart"),
    loopEnds: placeholders.filter((placeholder) => placeholder.kind === "loopEnd"),
    currentItems: placeholders.filter((placeholder) => placeholder.kind === "currentItem"),
    malformed: placeholders.filter((placeholder) => placeholder.kind === "malformed"),
    unresolvedRaw: unique(placeholders.map((placeholder) => placeholder.raw))
  };
}

export function summarizePlaceholderInspection(inspection: PlaceholderInspection): string {
  return [
    `Simple placeholders: ${inspection.simplePlaceholders.length}`,
    `Loop starts: ${inspection.loopStarts.map((placeholder) => placeholder.raw).join(", ") || "none"}`,
    `Loop ends: ${inspection.loopEnds.map((placeholder) => placeholder.raw).join(", ") || "none"}`,
    `Malformed placeholders: ${inspection.malformed.map((placeholder) => placeholder.raw).join(", ") || "none"}`
  ].join("\n");
}

export function validateLoopPairs(placeholders: TemplatePlaceholder[]): string[] {
  const errors: string[] = [];
  const stack: TemplatePlaceholder[] = [];

  for (const placeholder of placeholders) {
    if (placeholder.kind === "loopStart") {
      stack.push(placeholder);
      continue;
    }

    if (placeholder.kind !== "loopEnd") {
      continue;
    }

    const start = stack.pop();
    if (!start) {
      errors.push(`Loop end ${placeholder.raw} has no matching start tag.`);
      continue;
    }

    if (start.field !== placeholder.field) {
      errors.push(`Loop start ${start.raw} is closed by ${placeholder.raw}.`);
    }
  }

  for (const start of stack.reverse()) {
    errors.push(`Loop start ${start.raw} has no matching end tag.`);
  }

  return errors;
}

export function validatePlaceholdersAgainstData(
  placeholders: TemplatePlaceholder[],
  data: unknown
): string[] {
  const errors: string[] = [];
  const contextStack: unknown[] = [];
  const loopStack: TemplatePlaceholder[] = [];

  for (const placeholder of placeholders) {
    if (placeholder.kind === "malformed") {
      errors.push(`Malformed placeholder: ${placeholder.raw}`);
      continue;
    }

    if (placeholder.kind === "currentItem") {
      if (contextStack.length === 0) {
        errors.push(`Current item placeholder ${placeholder.raw} is not inside a loop.`);
      }
      continue;
    }

    if (!placeholder.field) {
      continue;
    }

    if (placeholder.kind === "loopStart") {
      const value = resolvePath(data, placeholder.field, contextStack);
      if (!Array.isArray(value)) {
        errors.push(`Loop ${placeholder.raw} requires array data at "${placeholder.field}".`);
        contextStack.push(undefined);
      } else {
        contextStack.push(value[0]);
      }
      loopStack.push(placeholder);
      continue;
    }

    if (placeholder.kind === "loopEnd") {
      const start = loopStack.pop();
      if (start?.field === placeholder.field) {
        contextStack.pop();
      }
      continue;
    }

    const value = resolvePath(data, placeholder.field, contextStack);
    if (value === undefined || value === null) {
      errors.push(`Placeholder ${placeholder.raw} has no matching sample data field.`);
    }
  }

  return errors;
}
