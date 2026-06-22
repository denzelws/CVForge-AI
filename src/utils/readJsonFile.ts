import fs from "node:fs";
import { z } from "zod";

export function readJsonFile<TSchema extends z.ZodTypeAny>(
  filePath: string,
  schema: TSchema
): z.output<TSchema> {
  const raw = fs.readFileSync(filePath, "utf8");
  return schema.parse(JSON.parse(raw));
}
