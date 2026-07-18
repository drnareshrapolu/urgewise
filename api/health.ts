import { createApp } from "../server/app.ts";

type JsonResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

function initializationMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (/^(JWT_SECRET|SEED_USER_)/.test(message)) return message;
  return "UrgeWise API failed to initialize. Check the Vercel function logs.";
}

export default async function handler(_req: unknown, res: JsonResponse) {
  try {
    createApp();
    return res.status(200).json({ ok: true, service: "urgewise", api: "ready" });
  } catch (error) {
    console.error("UrgeWise health check failed", error);
    return res.status(500).json({
      ok: false,
      service: "urgewise",
      error: initializationMessage(error)
    });
  }
}
