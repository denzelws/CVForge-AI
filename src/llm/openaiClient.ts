import { getOpenAiEnv } from "../config/env.js";

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
};

export type OpenAiJsonRequest = {
  systemPrompt: string;
  userPrompt: string;
};

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("OpenAI response did not contain a JSON object.");
    }

    return JSON.parse(content.slice(firstBrace, lastBrace + 1));
  }
}

function isQuotaOrBillingError(message: string, code?: string): boolean {
  const value = `${message} ${code ?? ""}`.toLowerCase();
  return (
    value.includes("exceeded your current quota") ||
    value.includes("billing") ||
    value.includes("quota") ||
    value.includes("insufficient_quota")
  );
}

function formatOpenAiError(payload: ChatCompletionResponse, fallbackMessage: string): Error {
  const originalMessage = payload.error?.message ?? fallbackMessage;

  if (isQuotaOrBillingError(originalMessage, payload.error?.code)) {
    return new Error(
      [
        "OpenAI API quota/billing issue detected.",
        "Your API key was loaded, but the OpenAI Platform project/account does not currently have available API quota.",
        "Check Platform Billing, Usage, and Project Limits.",
        "ChatGPT Plus/Codex usage does not include API usage.",
        "",
        `Original OpenAI error: ${originalMessage}`
      ].join("\n")
    );
  }

  return new Error(`OpenAI API request failed: ${originalMessage}`);
}

export async function generateJsonWithOpenAI(request: OpenAiJsonRequest): Promise<unknown> {
  const env = getOpenAiEnv();
  const messages: ChatMessage[] = [
    { role: "system", content: request.systemPrompt },
    { role: "user", content: request.userPrompt }
  ];
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL,
      messages,
      temperature: env.OPENAI_TEMPERATURE,
      max_tokens: env.OPENAI_MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" }
    })
  });

  const payload = (await response.json()) as ChatCompletionResponse;

  if (!response.ok) {
    throw formatOpenAiError(payload, response.statusText);
  }

  const content = payload.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("OpenAI API response did not include message content.");
  }

  return parseJsonObject(content);
}
