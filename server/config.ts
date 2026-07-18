import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const defaultDatabasePath = process.env.VERCEL ? path.join(os.tmpdir(), "urgewise.sqlite") : path.resolve(rootDir, "./data/urgewise.sqlite");

export const config = {
  rootDir,
  port: Number(process.env.PORT ?? 4000),
  databasePath: process.env.DATABASE_PATH ? path.resolve(rootDir, process.env.DATABASE_PATH) : defaultDatabasePath,
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  llmProvider: (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  seedUserEmail: (process.env.SEED_USER_EMAIL ?? "").trim().toLowerCase(),
  seedUserPassword: process.env.SEED_USER_PASSWORD ?? "",
  isProduction: process.env.NODE_ENV === "production"
};

export function validateRuntimeConfig(): void {
  if (config.isProduction && (config.jwtSecret === "dev-only-change-me" || config.jwtSecret.length < 32)) {
    throw new Error("JWT_SECRET must be set to at least 32 characters in Production");
  }

  if (Boolean(config.seedUserEmail) !== Boolean(config.seedUserPassword)) {
    throw new Error("SEED_USER_EMAIL and SEED_USER_PASSWORD must be configured together in Production");
  }

  if (config.seedUserPassword && config.seedUserPassword.length < 12) {
    throw new Error("SEED_USER_PASSWORD must be at least 12 characters");
  }
}
