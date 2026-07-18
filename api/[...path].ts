type ServerApp = (req: unknown, res: unknown) => unknown;
type JsonResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

let app: ServerApp | null = null;

export default async function handler(req: unknown, res: JsonResponse) {
  try {
    const { createApp } = await import("../server/app.ts");
    app ??= createApp() as unknown as ServerApp;
    return app(req, res);
  } catch (error) {
    console.error("UrgeWise API initialization failed", error);
    return res.status(500).json({
      error: "UrgeWise API failed to initialize. Check the Vercel function logs and environment variables."
    });
  }
}
