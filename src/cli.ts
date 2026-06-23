import { analyzeJobWorkflow } from "./workflow/analyzeJobWorkflow.js";
import { generateCvDataWorkflow } from "./workflow/generateCvDataWorkflow.js";
import { generateCvWorkflow } from "./workflow/generateCvWorkflow.js";
import { matchJobWorkflow } from "./workflow/matchJobWorkflow.js";
import { renderTestWorkflow } from "./workflow/renderTestWorkflow.js";
import { setupTemplateWorkflow } from "./workflow/setupTemplateWorkflow.js";
import { validateProfileWorkflow } from "./workflow/validateProfileWorkflow.js";

type Args = Record<string, string | boolean>;

function parseArgs(argv: string[]): { command?: string; flags: Args } {
  const [command, ...rest] = argv;
  const flags: Args = {};

  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) {
      continue;
    }

    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }

    flags[key] = next;
    index += 1;
  }

  return { command, flags };
}

function requireStringFlag(flags: Args, name: string): string {
  const value = flags[name];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Missing required flag: --${name}`);
  }

  return value;
}

function printUsage(): void {
  console.log(`CVForge AI

Commands:
  npm run template:analyze -- --template frontend-model.docx
  yarn render:test -- --template frontend-model
  yarn profile:validate
  yarn job:analyze -- --job example-frontend-jr
  yarn job:match -- --job example-frontend-jr
  yarn cv:generate-data -- --job example-frontend-jr
  npm run generate -- --template frontend-model --job example-frontend-jr
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));

  if (command === "template:analyze") {
    const template = requireStringFlag(flags, "template");
    const { structure, map, candidateMap } = setupTemplateWorkflow(template);
    console.log(`Template map written for ${map.templateName}`);
    console.log(`Prepared template: ${map.preparedDocx}`);
    console.log(`Paragraphs: ${structure.paragraphs.length}`);
    console.log(`Tables: ${structure.tables.length}`);
    console.log(
      `Likely sections: ${
        structure.possibleSectionHeadings.map((heading) => heading.text).join(", ") || "none"
      }`
    );
    console.log(`Variable candidates: ${candidateMap.variables.length}`);
    console.log(`Structure output: ${structure.outputPath}`);
    console.log(`Candidate map output: ${candidateMap.outputPath}`);
    return;
  }

  if (command === "render:test") {
    const template = requireStringFlag(flags, "template");
    const { outputPath, placeholderSummary } = renderTestWorkflow(template);
    console.log(placeholderSummary);
    console.log(`Render test generated: ${outputPath}`);
    return;
  }

  if (command === "profile:validate") {
    const result = validateProfileWorkflow();
    console.log(`Profile valid: ${result.profilePath}`);
    console.log(`Candidate: ${result.summary.candidateName}`);
    console.log(`Skills: ${result.summary.skills}`);
    console.log(`Experiences: ${result.summary.experiences}`);
    console.log(`Projects: ${result.summary.projects}`);
    console.log(`Certifications: ${result.summary.certifications}`);
    console.log(`Languages: ${result.summary.languages}`);
    return;
  }

  if (command === "job:analyze") {
    const job = requireStringFlag(flags, "job");
    const { analysis, outputPath } = analyzeJobWorkflow(job);
    console.log(`Job title: ${analysis.jobTitle}`);
    console.log(`Seniority: ${analysis.seniority}`);
    console.log(`Language: ${analysis.language}`);
    console.log(`Required skills: ${analysis.requiredSkills.join(", ") || "none"}`);
    console.log(`Nice-to-have skills: ${analysis.niceToHaveSkills.join(", ") || "none"}`);
    console.log(`Resume focus: ${analysis.resumeFocus.join(", ") || "none"}`);
    console.log(`Output: ${outputPath}`);
    return;
  }

  if (command === "job:match") {
    const job = requireStringFlag(flags, "job");
    const { report, outputPath } = matchJobWorkflow(job);
    console.log(`Match score: ${report.matchScore}`);
    console.log(`Decision: ${report.decision}`);
    console.log(`Matched skills: ${report.matchedSkills.map((item) => item.skill).join(", ") || "none"}`);
    console.log(`Missing skills: ${report.missingSkills.join(", ") || "none"}`);
    console.log(`Uncertain skills: ${report.uncertainSkills.map((item) => item.skill).join(", ") || "none"}`);
    console.log(`Recommended projects: ${report.recommendedProjects.join(", ") || "none"}`);
    console.log(`Recommended experience: ${report.recommendedExperience.join(", ") || "none"}`);
    console.log(`Output: ${outputPath}`);
    return;
  }

  if (command === "cv:generate-data") {
    const job = requireStringFlag(flags, "job");
    const { outputPath, data, provider, skippedOpenAI, skippedOllama, validationStatus } =
      await generateCvDataWorkflow(job);
    console.log(`Selected LLM provider: ${provider}`);
    console.log(`OpenAI skipped: ${skippedOpenAI ? "yes" : "no"}`);
    console.log(`Ollama skipped: ${skippedOllama ? "yes" : "no"}`);
    console.log(`Validation: ${validationStatus}`);
    console.log(`Generated CV data: ${outputPath}`);
    console.log(`Target role: ${data.basics.targetRole}`);
    console.log(`Experience entries: ${data.experience.length}`);
    console.log(`Projects: ${data.projects.length}`);
    return;
  }

  if (command === "generate") {
    const template = requireStringFlag(flags, "template");
    const job = requireStringFlag(flags, "job");
    const outputPath = generateCvWorkflow(template, job);
    console.log(`Resume generated: ${outputPath}`);
    return;
  }

  printUsage();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
