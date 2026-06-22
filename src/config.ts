import path from "node:path";

export const paths = {
  data: path.resolve("data"),
  jobs: path.resolve("data/jobs"),
  templatesOriginal: path.resolve("templates/original"),
  templatesPrepared: path.resolve("templates/prepared"),
  templateMaps: path.resolve("template-maps"),
  outputs: path.resolve("outputs")
};

export function resolveTemplateName(input: string): string {
  return input.replace(/\.docx$/i, "");
}
