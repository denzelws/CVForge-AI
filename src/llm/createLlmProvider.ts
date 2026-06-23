import { getAppEnv } from "../config/env.js";
import { LlmProvider } from "./LlmProvider.js";
import { MockLlmProvider } from "./mockLlmProvider.js";
import { OllamaLlmProvider } from "./ollamaLlmProvider.js";
import { OpenAiLlmProvider } from "./openaiLlmProvider.js";

export function createLlmProvider(): LlmProvider {
  const env = getAppEnv();

  if (env.LLM_PROVIDER === "openai") {
    return new OpenAiLlmProvider();
  }

  if (env.LLM_PROVIDER === "ollama") {
    return new OllamaLlmProvider();
  }

  return new MockLlmProvider();
}
