import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import { gateway } from "ai";

export function getModel() {
  const named = process.env.AI_MODEL;

  if (process.env.AI_GATEWAY_API_KEY) {
    return gateway(named || "anthropic/claude-sonnet-4.5");
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return anthropic(named || "claude-sonnet-4-5");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai(named || "gpt-4.1");
  }
  throw new Error(
    "No AI provider configured. Set AI_GATEWAY_API_KEY, ANTHROPIC_API_KEY, or OPENAI_API_KEY.",
  );
}

export function providerLabel() {
  if (process.env.AI_GATEWAY_API_KEY) return "Vercel AI Gateway";
  if (process.env.ANTHROPIC_API_KEY) return "Anthropic";
  if (process.env.OPENAI_API_KEY) return "OpenAI";
  return "Not configured";
}
