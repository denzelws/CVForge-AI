import { analyzeDocxTemplate } from "../docx/analyzeDocxTemplate.js";
import { createTemplateMap } from "../docx/createTemplateMap.js";
import { createVariableCandidateMap } from "../docx/createVariableCandidateMap.js";

export function setupTemplateWorkflow(templateFileName: string) {
  const structure = analyzeDocxTemplate(templateFileName);
  const map = createTemplateMap(templateFileName);
  const candidateMap = createVariableCandidateMap(templateFileName, structure);

  return { structure, map, candidateMap };
}
