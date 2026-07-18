import { createApp } from "./app.js";

type ServerApp = (req: unknown, res: unknown) => unknown;
type JsonResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

let app: ServerApp | null = null;

function initializationMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/^(JWT_SECRET|SEED_USER_)/.test(message)) return message;
  return "UrgeWise API failed to initialize. Check the Vercel function logs and environment variables.";
}

export default async function handler(req: unknown, res: JsonResponse) {
  try {
    app ??= createApp() as unknown as ServerApp;
    return app(req, res);
  } catch (error) {
    console.error("UrgeWise API initialization failed", error);
    return res.status(500).json({ error: initializationMessage(error) });
  }
}
