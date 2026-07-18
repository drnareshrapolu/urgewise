import type { NextFunction, Request, Response } from "express";
import { config } from "./config.ts";
import type { Db } from "./db.ts";

export type AuthUser = { id: string; email: string };

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function useDemoUser(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(config.demoEmail) as AuthUser | undefined;
    if (!user) return res.status(500).json({ error: "Demo user was not initialized" });
    req.user = user;
    next();
  };
}
