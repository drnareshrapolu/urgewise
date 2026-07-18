import handler from "../server/vercel-handler.js";

type GatewayRequest = {
  query?: Record<string, string | string[] | undefined>;
  url?: string;
};

type GatewayResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

export function resolveGatewayPath(value: string | string[] | undefined): string | null {
  const path = Array.isArray(value) ? value[0] : value;
  if (!path?.startsWith("/api/") || path.includes("\\") || path.includes("..")) return null;
  return path;
}

export default function gateway(req: GatewayRequest, res: GatewayResponse) {
  const path = resolveGatewayPath(req.query?.path);
  if (!path) return res.status(400).json({ error: "A valid API path is required" });

  req.url = path;
  return handler(req, res);
}
