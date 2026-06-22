import fs from "node:fs";
import path from "node:path";
import { paths, resolveTemplateName } from "../config.js";
import { TemplateStructureAnalysis } from "./analyzeDocxTemplate.js";

type Confidence = "high" | "medium" | "low";
type ReplacementType = "single" | "list" | "repeating_block";

export type TemplateVariableCandidate = {
  field: string;
  currentText: string;
  suggestedPlaceholder: string;
  section: string;
  confidence: Confidence;
  reason: string;
  replacementType: ReplacementType;
};

export type FixedSection = {
  text: string;
  reason: string;
};

export type VariableCandidateMap = {
  templateName: string;
  detectedSections: string[];
  variables: TemplateVariableCandidate[];
  fixedSections: FixedSection[];
  warnings: string[];
};

type Paragraph = {
  index: number;
  text: string;
};

const SECTION_TO_FIELD: Record<
  string,
  {
    field: string;
    suggestedPlaceholder: string;
    replacementType: ReplacementType;
    reason: string;
  }
> = {
  "Resumo Profissional": {
    field: "basics.summary",
    suggestedPlaceholder: "{basics.summary}",
    replacementType: "single",
    reason: "This section contains the professional summary and should be tailored per job."
  },
  "Competências Técnicas": {
    field: "skills.technical",
    suggestedPlaceholder: "{#skills.technical}{.}{/skills.technical}",
    replacementType: "list",
    reason: "This section contains grouped technical skills that should be tailored to the job requirements."
  },
  "Experiência Profissional": {
    field: "experience",
    suggestedPlaceholder: "{#experience}...{/experience}",
    replacementType: "repeating_block",
    reason: "This section contains job history entries and bullets that should repeat from structured experience data."
  },
  "Projetos Selecionados": {
    field: "projects",
    suggestedPlaceholder: "{#projects}...{/projects}",
    replacementType: "repeating_block",
    reason: "This section contains selected project entries that should repeat from structured project data."
  }
};

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function joinParagraphs(paragraphs: Paragraph[]): string {
  return paragraphs.map((paragraph) => paragraph.text).join("\n");
}

function findParagraphAfterHeading(
  paragraphs: Paragraph[],
  headingIndex: number,
  matcher: (text: string) => boolean
): Paragraph | undefined {
  return paragraphs.find((paragraph) => paragraph.index > headingIndex && matcher(paragraph.text));
}

function addVariable(
  variables: TemplateVariableCandidate[],
  variable: TemplateVariableCandidate | undefined
): void {
  if (variable && variable.currentText.trim().length > 0) {
    variables.push(variable);
  }
}

function getSectionParagraphs(structure: TemplateStructureAnalysis): Map<string, Paragraph[]> {
  const headings = [...structure.possibleSectionHeadings].sort(
    (a, b) => a.paragraphIndex - b.paragraphIndex
  );
  const result = new Map<string, Paragraph[]>();

  headings.forEach((heading, index) => {
    const nextHeading = headings[index + 1];
    const content = structure.paragraphs.filter(
      (paragraph) =>
        paragraph.index > heading.paragraphIndex &&
        (!nextHeading || paragraph.index < nextHeading.paragraphIndex)
    );
    result.set(heading.text, content);
  });

  return result;
}

function createHeaderVariables(structure: TemplateStructureAnalysis): TemplateVariableCandidate[] {
  const firstHeadingIndex = Math.min(
    ...structure.possibleSectionHeadings.map((heading) => heading.paragraphIndex)
  );
  const headerParagraphs = structure.paragraphs.filter((paragraph) => paragraph.index < firstHeadingIndex);
  const variables: TemplateVariableCandidate[] = [];
  const [name, role, contact, linkedin, githubOrPortfolio] = headerParagraphs;

  addVariable(variables, name && {
    field: "basics.name",
    currentText: name.text,
    suggestedPlaceholder: "{basics.name}",
    section: "Header",
    confidence: "high",
    reason: "Text before the first section heading appears to be the candidate name.",
    replacementType: "single"
  });

  addVariable(variables, role && {
    field: "basics.targetRole",
    currentText: role.text,
    suggestedPlaceholder: "{basics.targetRole}",
    section: "Header",
    confidence: "high",
    reason: "Second header line appears to be the target role or professional title.",
    replacementType: "single"
  });

  if (contact) {
    const email = contact.text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
    const parts = contact.text.split("|").map((part) => normalizeText(part)).filter(Boolean);
    const location = parts.find((part) => !part.includes("@") && !/^\+?\d/.test(part));

    addVariable(variables, email ? {
      field: "basics.email",
      currentText: email,
      suggestedPlaceholder: "{basics.email}",
      section: "Header",
      confidence: "high",
      reason: "Header contact line contains an email address.",
      replacementType: "single"
    } : undefined);

    addVariable(variables, location ? {
      field: "basics.location",
      currentText: location,
      suggestedPlaceholder: "{basics.location}",
      section: "Header",
      confidence: "high",
      reason: "Header contact line contains a location segment.",
      replacementType: "single"
    } : undefined);
  }

  addVariable(variables, linkedin && /linkedin/i.test(linkedin.text) ? {
    field: "basics.linkedin",
    currentText: linkedin.text,
    suggestedPlaceholder: "{basics.linkedin}",
    section: "Header",
    confidence: "high",
    reason: "Header contains a LinkedIn URL.",
    replacementType: "single"
  } : undefined);

  addVariable(variables, githubOrPortfolio && /github/i.test(githubOrPortfolio.text) ? {
    field: "basics.github",
    currentText: githubOrPortfolio.text,
    suggestedPlaceholder: "{basics.github}",
    section: "Header",
    confidence: "medium",
    reason: "Header contains a GitHub URL, possibly alongside another profile URL.",
    replacementType: "single"
  } : undefined);

  return variables;
}

function createSectionVariables(structure: TemplateStructureAnalysis): TemplateVariableCandidate[] {
  const sections = getSectionParagraphs(structure);
  const variables: TemplateVariableCandidate[] = [];

  for (const [section, config] of Object.entries(SECTION_TO_FIELD)) {
    const paragraphs = sections.get(section) ?? [];
    addVariable(variables, {
      field: config.field,
      currentText: joinParagraphs(paragraphs),
      suggestedPlaceholder: config.suggestedPlaceholder,
      section,
      confidence: paragraphs.length > 0 ? "high" : "low",
      reason: config.reason,
      replacementType: config.replacementType
    });
  }

  const educationSection = "Formação & Certificações";
  const educationHeading = structure.possibleSectionHeadings.find(
    (heading) => heading.text === educationSection
  );
  const educationParagraphs = sections.get(educationSection) ?? [];

  if (educationHeading) {
    const education = findParagraphAfterHeading(
      educationParagraphs,
      educationHeading.paragraphIndex,
      (text) => /^Graduação:|^Formação:|^Educação:/i.test(text)
    );
    const certifications = educationParagraphs.filter((paragraph) => /^Certificaç/i.test(paragraph.text));
    const languages = educationParagraphs.filter((paragraph) => /^Idioma:/i.test(paragraph.text));

    addVariable(variables, education && {
      field: "education",
      currentText: education.text,
      suggestedPlaceholder: "{#education}...{/education}",
      section: educationSection,
      confidence: "high",
      reason: "This paragraph describes formal education and should come from structured education data.",
      replacementType: "repeating_block"
    });

    addVariable(variables, certifications.length > 0 ? {
      field: "certifications",
      currentText: joinParagraphs(certifications),
      suggestedPlaceholder: "{#certifications}...{/certifications}",
      section: educationSection,
      confidence: "high",
      reason: "This content describes certifications and should come from structured certification data.",
      replacementType: "list"
    } : undefined);

    addVariable(variables, languages.length > 0 ? {
      field: "languages",
      currentText: joinParagraphs(languages),
      suggestedPlaceholder: "{#languages}...{/languages}",
      section: educationSection,
      confidence: "high",
      reason: "This content describes languages and should come from structured language data.",
      replacementType: "list"
    } : undefined);
  }

  return variables;
}

function createWarnings(structure: TemplateStructureAnalysis, variables: TemplateVariableCandidate[]): string[] {
  const warnings: string[] = [];
  const githubVariable = variables.find((variable) => variable.field === "basics.github");

  if (structure.placeholders.length === 0) {
    warnings.push("No existing DOCX placeholders were found. This map only identifies replacement candidates.");
  }

  if (githubVariable?.currentText.toLowerCase().includes("portfolio")) {
    warnings.push("GitHub and portfolio appear on the same line. Split them manually if both should become separate placeholders.");
  }

  return warnings;
}

export function createVariableCandidateMap(
  templateFileName: string,
  structure?: TemplateStructureAnalysis
): VariableCandidateMap & { outputPath: string } {
  const templateName = resolveTemplateName(templateFileName);
  const structurePath = path.join(paths.templateMaps, `${templateName}.structure.json`);
  const outputPath = path.join(paths.templateMaps, `${templateName}.map.json`);
  const analysis =
    structure ??
    (JSON.parse(fs.readFileSync(structurePath, "utf8")) as TemplateStructureAnalysis);
  const detectedSections = analysis.possibleSectionHeadings.map((heading) => heading.text);
  const fixedSections = detectedSections.map((text) => ({
    text,
    reason: "Section heading should remain fixed."
  }));
  const variables = [...createHeaderVariables(analysis), ...createSectionVariables(analysis)];
  const map: VariableCandidateMap & { outputPath: string } = {
    templateName,
    detectedSections,
    variables,
    fixedSections,
    warnings: createWarnings(analysis, variables),
    outputPath
  };

  fs.writeFileSync(outputPath, `${JSON.stringify(map, null, 2)}\n`);

  return map;
}
