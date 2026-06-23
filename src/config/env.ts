import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ override: false, quiet: true });

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LLM_PROVIDER: z.enum(["mock", "openai", "ollama"]).default("mock"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().min(1).default(DEFAULT_OPENAI_MODEL),
  OPENAI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
  OPENAI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(2500),
  OLLAMA_BASE_URL: z.string().url().default(DEFAULT_OLLAMA_BASE_URL),
  OLLAMA_MODEL: z.string().optional()
});

export type AppEnv = z.infer<typeof EnvSchema>;
export type OpenAiEnv = AppEnv & {
  OPENAI_API_KEY: string;
};
export type OllamaEnv = AppEnv & {
  OLLAMA_MODEL: string;
};

function normalizeEnv(env: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return {
    NODE_ENV: env.NODE_ENV || undefined,
    LLM_PROVIDER: env.LLM_PROVIDER || undefined,
    OPENAI_API_KEY: env.OPENAI_API_KEY || undefined,
    OPENAI_MODEL: env.OPENAI_MODEL || undefined,
    OPENAI_TEMPERATURE: env.OPENAI_TEMPERATURE || undefined,
    OPENAI_MAX_OUTPUT_TOKENS: env.OPENAI_MAX_OUTPUT_TOKENS || undefined,
    OLLAMA_BASE_URL: env.OLLAMA_BASE_URL || undefined,
    OLLAMA_MODEL: env.OLLAMA_MODEL || undefined
  };
}

export function getAppEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(normalizeEnv(env));

  if (!parsed.success) {
    throw new Error(`Invalid environment configuration:\n${parsed.error.issues.map((issue) => `- ${issue.path.join(".")}: ${issue.message}`).join("\n")}`);
  }

  return parsed.data;
}

export function getOpenAiEnv(env: NodeJS.ProcessEnv = process.env): OpenAiEnv {
  const appEnv = getAppEnv(env);

  if (!appEnv.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing. Set it before running LLM commands, for example: export OPENAI_API_KEY=\"your_project_key\""
    );
  }

  return {
    ...appEnv,
    OPENAI_API_KEY: appEnv.OPENAI_API_KEY
  };
}

export function getOllamaEnv(env: NodeJS.ProcessEnv = process.env): OllamaEnv {
  const appEnv = getAppEnv(env);

  if (!appEnv.OLLAMA_MODEL) {
    throw new Error("OLLAMA_MODEL is missing. Set it before running with LLM_PROVIDER=ollama, for example: OLLAMA_MODEL=llama3.2:3b");
  }

  return {
    ...appEnv,
    OLLAMA_MODEL: appEnv.OLLAMA_MODEL
  };
}
