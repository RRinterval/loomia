import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY 未設定，請檢查 .env.local");
  client ??= new OpenAI();
  return client;
}

export const AI_MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";
