import { z } from "zod";

export const TemplateVariableSchema = z.object({
  name: z.string(),
  kind: z.enum(["placeholder", "loopStart", "loopEnd"]),
  raw: z.string()
});

export const TemplateMapSchema = z.object({
  templateName: z.string(),
  originalDocx: z.string(),
  preparedDocx: z.string(),
  variables: z.array(TemplateVariableSchema),
  loops: z.array(z.string()),
  generatedAt: z.string()
});

export type TemplateMap = z.infer<typeof TemplateMapSchema>;
