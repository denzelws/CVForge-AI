import { z } from "zod";
import { getAppEnv } from "../config/env.js";
import { createLlmProvider } from "../llm/createLlmProvider.js";
import { LlmProviderName } from "../llm/LlmProvider.js";
import { OllamaInvalidJsonError } from "../llm/ollamaLlmProvider.js";
import { GeneratedCvData, GeneratedCvDataSchema } from "../schemas/generatedCvData.schema.js";
import { JobAnalysis } from "../schemas/jobAnalysis.schema.js";
import { MatchReport } from "../schemas/matchReport.schema.js";
import { Profile } from "../schemas/profile.schema.js";
import { buildGeneratedCvDataSkeleton } from "./buildGeneratedCvDataSkeleton.js";
import { normalizeGeneratedCvData } from "./normalizeGeneratedCvData.js";

export type GenerateCvDataInput = {
  prompt: string;
  profile: Profile;
  jobAnalysis: JobAnalysis;
  matchReport: MatchReport;
};

export type GenerateCvDataResult = {
  data: GeneratedCvData;
  provider: LlmProviderName;
  rawJson: unknown;
  skeleton: GeneratedCvData;
  fallbackUsed: boolean;
  fallbackReason?: string;
  invalidRawJson?: unknown;
};

export class GeneratedCvDataSchemaValidationError extends Error {
  constructor(
    readonly provider: LlmProviderName,
    readonly issues: z.ZodIssue[],
    readonly rawJson: unknown
  ) {
    super(
      [
        provider === "ollama"
          ? "Ollama returned JSON, but it did not match GeneratedCvData schema."
          : `${provider} returned JSON, but it did not match GeneratedCvData schema.`,
        ...issues.map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
      ].join("\n")
    );
  }
}

export async function generateCvData(input: GenerateCvDataInput): Promise<GenerateCvDataResult> {
  const env = getAppEnv();
  const provider = createLlmProvider();
  const skeleton = buildGeneratedCvDataSkeleton(input);

  if (provider.name === "ollama") {
    console.log("Deterministic skeleton built: yes");
    console.log("Ollama rewrite attempted: yes");
  }

  let rawJson: unknown;
  try {
    rawJson = await provider.generateCvDataJson({ ...input, skeleton });
  } catch (error) {
    if (provider.name === "ollama" && env.OLLAMA_ALLOW_SKELETON_FALLBACK) {
      const message = error instanceof Error ? error.message : "Ollama generation failed.";
      return {
        data: skeleton,
        provider: provider.name,
        rawJson: skeleton,
        skeleton,
        fallbackUsed: true,
        fallbackReason: message.includes("timed out")
          ? "Ollama timed out; deterministic skeleton fallback was used."
          : "Ollama returned invalid output; deterministic skeleton fallback was used.",
        invalidRawJson: error instanceof OllamaInvalidJsonError ? error.rawOutput : undefined
      };
    }

    throw error;
  }

  const normalizedJson = normalizeGeneratedCvData(rawJson);

  if (provider.name === "ollama") {
    console.log("Ollama schema validation started");
  }

  const parsed = GeneratedCvDataSchema.safeParse(normalizedJson);

  if (!parsed.success) {
    if (provider.name === "ollama" && env.OLLAMA_ALLOW_SKELETON_FALLBACK) {
      return {
        data: skeleton,
        provider: provider.name,
        rawJson,
        skeleton,
        fallbackUsed: true,
        fallbackReason: "Ollama returned schema-invalid JSON; deterministic skeleton fallback was used.",
        invalidRawJson: rawJson
      };
    }

    throw new GeneratedCvDataSchemaValidationError(provider.name, parsed.error.issues, rawJson);
  }

  return {
    data: parsed.data,
    provider: provider.name,
    rawJson,
    skeleton,
    fallbackUsed: false
  };
}
