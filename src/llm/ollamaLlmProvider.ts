import { getOllamaEnv } from "../config/env.js";
import { LlmGenerateCvDataInput, LlmProvider } from "./LlmProvider.js";

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
  error?: string;
};

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("Ollama response did not contain a JSON object.");
    }

    return JSON.parse(content.slice(firstBrace, lastBrace + 1));
  }
}

function ollamaUnavailableError(model: string): Error {
  return new Error(
    `Ollama provider selected, but Ollama is not reachable or the model is not available. Start Ollama and run: ollama pull ${model}`
  );
}

export class OllamaLlmProvider implements LlmProvider {
  name = "ollama" as const;

  async generateCvDataJson(input: LlmGenerateCvDataInput): Promise<unknown> {
    const env = getOllamaEnv();

    let response: Response;
    try {
      response = await fetch(`${env.OLLAMA_BASE_URL.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: env.OLLAMA_MODEL,
          stream: false,
          format: "json",
          messages: [
            {
              role: "system",
              content: input.prompt
            },
            {
              role: "user",
              content: JSON.stringify(
                {
                  profile: input.profile,
                  jobAnalysis: input.jobAnalysis,
                  matchReport: input.matchReport
                },
                null,
                2
              )
            }
          ]
        })
      });
    } catch {
      throw ollamaUnavailableError(env.OLLAMA_MODEL);
    }

    const payload = (await response.json().catch(() => ({}))) as OllamaChatResponse;

    if (!response.ok) {
      throw ollamaUnavailableError(env.OLLAMA_MODEL);
    }

    const content = payload.message?.content;
    if (!content) {
      throw new Error("Ollama response did not include message content.");
    }

    return parseJsonObject(content);
  }
}
