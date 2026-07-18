import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
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

const cookieName = "urgewise_session";

export function signSession(user: AuthUser): string {
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d" });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(cookieName);
}

export function requireAuth(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: "Authentication required" });

    try {
      const payload = jwt.verify(token, config.jwtSecret) as AuthUser;
      const user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(payload.id) as AuthUser | undefined;
      if (!user) return res.status(401).json({ error: "Invalid session" });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid session" });
    }
  };
}
