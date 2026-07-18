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
  return jwt.sign(user, config.jwtSecret, { expiresIn: "7d", issuer: "urgewise" });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(cookieName, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.isProduction,
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/"
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(cookieName, {
    httpOnly: true,
    sameSite: "strict",
    secure: config.isProduction,
    path: "/"
  });
}

export function requireAuth(db: Db) {
  return (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies?.[cookieName];
    if (!token) return res.status(401).json({ error: "Authentication required" });

    try {
      const payload = jwt.verify(token, config.jwtSecret, { issuer: "urgewise" }) as AuthUser;
      if (!payload.id || !payload.email) return res.status(401).json({ error: "Invalid session" });

      let user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(payload.id) as AuthUser | undefined;

      // Vercel may execute route groups in separate ephemeral functions.
      // A valid signed session can safely provision the same identity in each database.
      if (!user) {
        db.prepare("INSERT OR IGNORE INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").run(
          payload.id,
          payload.email.toLowerCase(),
          "session-provisioned",
          new Date().toISOString()
        );
        user = db.prepare("SELECT id, email FROM users WHERE id = ?").get(payload.id) as AuthUser | undefined;
      }

      if (!user) return res.status(401).json({ error: "Invalid session" });
      req.user = user;
      next();
    } catch {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
  };
}
