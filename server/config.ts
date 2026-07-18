import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

export const config = {
  rootDir,
  port: Number(process.env.PORT ?? 4000),
  databasePath: path.resolve(rootDir, process.env.DATABASE_PATH ?? "./data/urgewise.sqlite"),
  jwtSecret: process.env.JWT_SECRET ?? "dev-only-change-me",
  llmProvider: (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase(),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
  geminiApiKey: process.env.GEMINI_API_KEY ?? "",
  geminiModel: process.env.GEMINI_MODEL ?? "gemini-flash-latest",
  demoEmail: process.env.DEMO_EMAIL ?? "demo@urgewise.local",
  demoPassword: process.env.DEMO_PASSWORD ?? "PromptWars2026!",
  isProduction: process.env.NODE_ENV === "production"
};

if (config.isProduction && config.jwtSecret === "dev-only-change-me") {
  throw new Error("JWT_SECRET must be set in production");
}
