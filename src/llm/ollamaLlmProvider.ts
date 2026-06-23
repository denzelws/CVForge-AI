import { getOllamaEnv } from "../config/env.js";
import { LlmGenerateCvDataInput, LlmProvider } from "./LlmProvider.js";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  error?: string;
};

export class OllamaInvalidJsonError extends Error {
  constructor(readonly rawOutput: string, message: string) {
    super(`Ollama returned invalid JSON: ${message}`);
  }
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch (firstError) {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new OllamaInvalidJsonError(content, "response did not contain a JSON object.");
    }

    try {
      return JSON.parse(content.slice(firstBrace, lastBrace + 1));
    } catch (secondError) {
      const error = secondError instanceof Error ? secondError : firstError;
      throw new OllamaInvalidJsonError(content, error instanceof Error ? error.message : "parse failed.");
    }
  }
}

function ollamaUnavailableError(model: string): Error {
  return new Error(
    `Ollama provider selected, but Ollama is not reachable or the model is not available. Start Ollama and run: ollama pull ${model}`
  );
}

function buildStrictPrompt(): string {
  return [
    "You rewrite selected text fields in an existing resume JSON object.",
    "Return exactly one JSON object and nothing else.",
    "All top-level keys are required: basics, skills, experience, projects, education, certifications, languages.",
    "skills must be an object: { \"technicalText\": \"string\" }.",
    "experience must be an array.",
    "projects must be an array.",
    "education must be an array.",
    "certifications must be an array of strings.",
    "languages must be an array of strings.",
    "Only improve these fields: basics.summary, skills.technicalText, experience[].bullets, projects[].description.",
    "Do not add new companies, projects, certifications, education, skills, metrics, percentages, links, dates, names, emails, phone numbers, institutions, or company names.",
    "Do not change links, dates, names, emails, phone, institutions, project names, certification names, or company names.",
    "Use only facts already present in the skeleton and compact metadata.",
    "If uncertain, keep the skeleton text unchanged."
  ].join("\n");
}

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, model: string): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`Ollama request timed out after ${timeoutMs}ms. Try a smaller model or increase OLLAMA_TIMEOUT_MS.`);
    }

    throw ollamaUnavailableError(model);
  } finally {
    clearTimeout(timeout);
  }
}

export class OllamaLlmProvider implements LlmProvider {
  name = "ollama" as const;

  async generateCvDataJson(input: LlmGenerateCvDataInput): Promise<unknown> {
    const env = getOllamaEnv();
    const baseUrl = env.OLLAMA_BASE_URL.replace(/\/$/, "");
    const startedAt = Date.now();

    console.log(`Selected LLM provider: ollama`);
    console.log(`Ollama base URL: ${baseUrl}`);
    console.log(`Ollama model: ${env.OLLAMA_MODEL}`);
    console.log(`Ollama num_predict: ${env.OLLAMA_NUM_PREDICT}`);

    const health = await fetchWithTimeout(
      `${baseUrl}/api/tags`,
      { method: "GET" },
      env.OLLAMA_TIMEOUT_MS,
      env.OLLAMA_MODEL
    );

    if (!health.ok) {
      throw ollamaUnavailableError(env.OLLAMA_MODEL);
    }

    console.log("Ollama health check passed");
    console.log("Ollama generation started");

    const response = await fetchWithTimeout(
      `${baseUrl}/api/chat`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          stream: false,
          format: "json",
          options: {
            temperature: 0,
            num_predict: env.OLLAMA_NUM_PREDICT
          },
          messages: [
            {
              role: "system",
              content: buildStrictPrompt()
            },
            {
              role: "user",
              content: JSON.stringify(
                {
                  deterministicSkeleton: input.skeleton,
                  targetRole: input.jobAnalysis.jobTitle,
                  matchedSkills: input.matchReport.matchedSkills.map((skill) => skill.skill),
                  uncertainSkills: input.matchReport.uncertainSkills.map((skill) => skill.skill),
                  resumeFocus: input.matchReport.recommendedFocus
                },
                null,
                2
              )
            }
          ]
        })
      },
      env.OLLAMA_TIMEOUT_MS,
      env.OLLAMA_MODEL
    );

    const payload = (await response.json().catch(() => ({}))) as OllamaChatResponse;
    console.log(`Ollama response received in ${elapsedMs(startedAt)}ms`);

    if (!response.ok) {
      throw ollamaUnavailableError(env.OLLAMA_MODEL);
    }

    const content = payload.message?.content;
    if (!content) {
      throw new Error("Ollama response did not include message content.");
    }

    console.log("Ollama JSON extraction started");
    return parseJsonObject(content);
  }
}
