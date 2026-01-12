import { SignJWT, jwtVerify } from "jose";
import type { Request } from "express";
import { ENV } from "./env";
import { COOKIE_NAME } from "@shared/const";

export type SessionPayload = {
  openId: string;
  name?: string;
};

function getSecretKey() {
  if (!ENV.cookieSecret) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function signSession(
  payload: SessionPayload,
  options: { expiresInMs: number }
): Promise<string> {
  const expiresAt = Math.floor((Date.now() + options.expiresInMs) / 1000);
  return await new SignJWT({
    openId: payload.openId,
    name: payload.name ?? "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expiresAt)
    .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.openId !== "string") return null;
    return {
      openId: payload.openId,
      name: typeof payload.name === "string" ? payload.name : undefined,
    };
  } catch {
    return null;
  }
}

export function readSessionCookie(req: Request): string | null {
  const raw = req.headers.cookie;
  if (!raw) return null;
  const parts = raw.split(";").map(p => p.trim());
  for (const p of parts) {
    const [name, ...rest] = p.split("=");
    if (name === COOKIE_NAME) return decodeURIComponent(rest.join("="));
  }
  return null;
}
