import { JobAnalysis, JobAnalysisSchema } from "../schemas/jobAnalysis.schema.js";

type SkillRule = {
  canonical: string;
  patterns: RegExp[];
  focus?: string;
};

const SKILL_RULES: SkillRule[] = [
  { canonical: "React", patterns: [/\breact(?:\.js|js)?\b/i], focus: "React component development" },
  { canonical: "TypeScript", patterns: [/\btypescript\b/i], focus: "type-safe frontend code" },
  { canonical: "JavaScript", patterns: [/\bjavascript\b|\bjs\b/i] },
  { canonical: "Node.js", patterns: [/\bnode(?:\.js|js)?\b/i], focus: "Node.js backend/API work" },
  { canonical: "NestJS", patterns: [/\bnest(?:\.js|js)?\b/i] },
  { canonical: "Express", patterns: [/\bexpress(?:\.js)?\b/i] },
  { canonical: "Fastify", patterns: [/\bfastify\b/i] },
  { canonical: "HTML", patterns: [/\bhtml5?\b/i] },
  { canonical: "CSS", patterns: [/\bcss3?\b/i] },
  { canonical: "TailwindCSS", patterns: [/\btailwind(?:css)?\b/i], focus: "responsive styling" },
  { canonical: "Styled Components", patterns: [/\bstyled[-\s]?components?\b/i] },
  { canonical: "REST APIs", patterns: [/\bapi\s*rest\b|\brest\s*api(?:s)?\b|\bapis?\s*rest\b/i], focus: "API integration" },
  { canonical: "GraphQL", patterns: [/\bgraphql\b/i] },
  { canonical: "PostgreSQL", patterns: [/\bpostgres(?:ql)?\b/i] },
  { canonical: "MongoDB", patterns: [/\bmongodb\b/i] },
  { canonical: "Docker", patterns: [/\bdocker\b/i] },
  { canonical: "Git", patterns: [/\bgit\b|\bgithub\b|\bbitbucket\b/i] },
  { canonical: "Figma", patterns: [/\bfigma\b/i], focus: "Figma handoff" },
  { canonical: "Jest", patterns: [/\bjest\b/i] },
  { canonical: "Vitest", patterns: [/\bvitest\b/i] },
  { canonical: "Cypress", patterns: [/\bcypress\b/i] },
  { canonical: "Testing Library", patterns: [/\btesting library\b/i] },
  { canonical: "Accessibility", patterns: [/\baccessibility\b|\bacessibilidade\b|\baccessible\b|\bacessivel\b|\bacessível\b/i], focus: "accessible UI" },
  { canonical: "Responsive Design", patterns: [/\bresponsive\b|\bresponsivo\b|\bresponsiva\b/i], focus: "responsive interfaces" },
  { canonical: "Design Systems", patterns: [/\bdesign systems?\b|\bsistema de design\b/i] }
];

const RESPONSIBILITY_PATTERN =
  /\b(desenvolver|implementar|manter|integrar|colaborar|build|develop|implement|maintain|integrate|collaborate|translate|write|work)\b/i;

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeLine(line: string): string {
  return line.replace(/^[-*•]\s*/, "").trim();
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split(/\n|(?<=[.!?])\s+/)
    .map(normalizeLine)
    .filter(Boolean);
}

function detectLanguage(text: string): "pt-BR" | "en" | "unknown" {
  const lower = text.toLowerCase();
  const portugueseHits = [
    "desenvolver",
    "implementar",
    "manter",
    "integrar",
    "colaborar",
    "experiência",
    "experiencia",
    "conhecimento",
    "requisitos",
    "responsabilidades",
    "vaga",
    "júnior",
    "pleno",
    "sênior"
  ].filter((word) => lower.includes(word)).length;
  const englishHits = [
    "develop",
    "build",
    "implement",
    "maintain",
    "integrate",
    "collaborate",
    "experience",
    "requirements",
    "responsibilities",
    "we are looking",
    "junior",
    "senior"
  ].filter((word) => lower.includes(word)).length;

  if (portugueseHits >= englishHits + 2) {
    return "pt-BR";
  }

  if (englishHits >= portugueseHits + 2) {
    return "en";
  }

  return "unknown";
}

function detectSeniority(text: string): JobAnalysis["seniority"] {
  const lower = text.toLowerCase();

  if (/\b(est[aá]gio|estagi[aá]rio|intern|internship)\b/i.test(lower)) {
    return "internship";
  }

  if (/\b(junior|j[uú]nior|jr)\b/i.test(lower)) {
    return "junior";
  }

  if (/\b(pleno|mid-level|mid level|middle)\b/i.test(lower)) {
    return "mid";
  }

  if (/\b(senior|s[eê]nior|sr)\b/i.test(lower)) {
    return "senior";
  }

  return "unknown";
}

function detectSkills(text: string): string[] {
  return SKILL_RULES.filter((rule) => rule.patterns.some((pattern) => pattern.test(text))).map(
    (rule) => rule.canonical
  );
}

function extractJobTitle(lines: string[]): string {
  const firstContentLine = lines.find((line) => line.length > 0);
  return firstContentLine ?? "Unknown Job Title";
}

function extractResponsibilities(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const bulletResponsibilities = lines
    .filter((line) => /^[-*•]\s*/.test(line))
    .map(normalizeLine)
    .filter((line) => RESPONSIBILITY_PATTERN.test(line));
  const sentenceResponsibilities = splitSentences(text).filter((line) => RESPONSIBILITY_PATTERN.test(line));

  return unique([...bulletResponsibilities, ...sentenceResponsibilities]).slice(0, 12);
}

function extractSkillSection(text: string, sectionWords: string[]): string {
  const lines = text.split(/\r?\n/);
  const startIndex = lines.findIndex((line) =>
    sectionWords.some((word) => line.toLowerCase().includes(word.toLowerCase()))
  );

  if (startIndex === -1) {
    return "";
  }

  const nextHeadingIndex = lines.findIndex(
    (line, index) => index > startIndex && /^[A-Za-zÀ-ÿ ]+:$/.test(line.trim())
  );

  return lines.slice(startIndex, nextHeadingIndex === -1 ? undefined : nextHeadingIndex).join("\n");
}

function extractNiceToHaveSkills(text: string, requiredSkills: string[]): string[] {
  const niceSection = extractSkillSection(text, [
    "nice to have",
    "preferred",
    "desejável",
    "desejaveis",
    "diferenciais"
  ]);
  const skills = detectSkills(niceSection);
  return unique(skills.filter((skill) => !requiredSkills.includes(skill)));
}

function inferResumeFocus(skills: string[], responsibilities: string[]): string[] {
  const focus = SKILL_RULES.filter((rule) => rule.focus && skills.includes(rule.canonical)).map(
    (rule) => rule.focus as string
  );

  if (responsibilities.some((item) => /test|teste/i.test(item))) {
    focus.push("component testing");
  }

  if (responsibilities.some((item) => /review|pair|colabor/i.test(item))) {
    focus.push("collaboration with engineering teams");
  }

  return unique(focus).slice(0, 8);
}

export function analyzeJob(jobDescription: string): JobAnalysis {
  const lines = jobDescription.split(/\r?\n/).map((line) => line.trim());
  const jobTitle = extractJobTitle(lines);
  const requiredSkills = detectSkills(jobDescription);
  const niceToHaveSkills = extractNiceToHaveSkills(jobDescription, requiredSkills);
  const responsibilities = extractResponsibilities(jobDescription);
  const keywords = unique([...requiredSkills, ...niceToHaveSkills, ...jobTitle.split(/\s+/)]);
  const notes: string[] = [];

  if (niceToHaveSkills.length === 0) {
    notes.push("No explicit nice-to-have skills section was detected.");
  }

  if (responsibilities.length === 0) {
    notes.push("No responsibility-like bullet or sentence was detected.");
  }

  return JobAnalysisSchema.parse({
    jobTitle,
    seniority: detectSeniority(jobDescription),
    requiredSkills,
    niceToHaveSkills,
    responsibilities,
    keywords,
    resumeFocus: inferResumeFocus(requiredSkills, responsibilities),
    language: detectLanguage(jobDescription),
    notes
  });
}
