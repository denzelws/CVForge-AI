import { generateCvWorkflow } from "./workflow/generateCvWorkflow.js";
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
