import { ExtractedDocxStructure } from "../docx/extractDocxStructure.js";

export function detectVariables(structure: ExtractedDocxStructure): string[] {
  return structure.placeholders;
}
