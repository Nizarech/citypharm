import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { readSessionCookie, verifySession } from "./auth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  try {
    const token = readSessionCookie(opts.req);
    if (token) {
      const session = await verifySession(token);
      if (session?.openId) {
        const existing = await db.getUserByOpenId(session.openId);
        if (existing) user = existing;
      }
    }
  } catch (error) {
    console.error("[Context] Failed to resolve user:", error);
    user = null;
  }
  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
