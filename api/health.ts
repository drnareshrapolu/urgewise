type JsonResponse = {
  status: (code: number) => {
    json: (body: unknown) => void;
  };
};

export default async function handler(_req: unknown, res: JsonResponse) {
  try {
    const { createApp } = await import("../server/app.ts");
    createApp();
    return res.status(200).json({ ok: true, service: "urgewise", api: "ready" });
  } catch (error) {
    console.error("UrgeWise health check failed", error);
    return res.status(500).json({
      ok: false,
      service: "urgewise",
      error: "UrgeWise API failed to initialize. Check JWT_SECRET and the Vercel function logs."
    });
  }
}
