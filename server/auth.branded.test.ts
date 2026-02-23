import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { TRPCError } from "@trpc/server";
import * as db from "./db";
import { COOKIE_NAME } from "../shared/const";

// Test helpers

type CookieCall = { name: string; value?: string; options: Record<string, unknown> };

function createPublicContext(): { ctx: TrpcContext; setCookies: CookieCall[]; clearedCookies: CookieCall[] } {
  const setCookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];
  const ctx: TrpcContext = {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        setCookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as unknown as TrpcContext["res"],
  };
  return { ctx, setCookies, clearedCookies };
}

// Random username to avoid collisions between test runs
function uniqueUser(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

const createdUsernames: string[] = [];

afterAll(async () => {
  // Clean up test accounts after each run
  for (const username of createdUsernames) {
    try {
      const row = await db.getAppUserByUsername(username);
      if (row) await db.deleteAppUser(row.id);
    } catch {
      /* ignore - DB may not be reachable in some environments */
    }
  }
});

// Signup tests

describe("auth.signup", () => {
  it("creates a new account, issues a session cookie and reports success", async () => {
    const { ctx, setCookies } = createPublicContext();
    const username = uniqueUser("signup_ok");
    createdUsernames.push(username);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.signup({
      username,
      password: "SuperSecret123",
      fullName: "Signup Smoke Test",
      email: "smoke@citypharm.test",
    });

    expect(result.success).toBe(true);
    expect(result.openId).toBe(`pharmacy:${username}`);
    expect(setCookies.length).toBe(1);
    expect(setCookies[0]?.name).toBe(COOKIE_NAME);
    expect(typeof setCookies[0]?.value).toBe("string");
    expect((setCookies[0]?.value || "").length).toBeGreaterThan(20);
  });

  it("rejects duplicate usernames with CONFLICT", async () => {
    const username = uniqueUser("signup_dup");
    createdUsernames.push(username);
    const ctx1 = createPublicContext().ctx;
    await appRouter.createCaller(ctx1).auth.signup({
      username,
      password: "SuperSecret123",
      fullName: "First Signup",
    });

    const ctx2 = createPublicContext().ctx;
    await expect(
      appRouter.createCaller(ctx2).auth.signup({
        username,
        password: "AnotherSecret123",
        fullName: "Second Signup",
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("rejects passwords shorter than 8 characters", async () => {
    const ctx = createPublicContext().ctx;
    await expect(
      appRouter.createCaller(ctx).auth.signup({
        username: uniqueUser("signup_short"),
        password: "short",
        fullName: "Too Short",
      })
    ).rejects.toBeInstanceOf(TRPCError);
  });
});

// Signin tests

describe("auth.signin", () => {
  it("accepts the password set during signup (bcrypt path)", async () => {
    const username = uniqueUser("signin_ok");
    createdUsernames.push(username);
    const password = "BcryptPath123";
    await appRouter.createCaller(createPublicContext().ctx).auth.signup({
      username,
      password,
      fullName: "Bcrypt Signin",
    });

    const { ctx, setCookies } = createPublicContext();
    const result = await appRouter.createCaller(ctx).auth.signin({ username, password });

    expect(result.success).toBe(true);
    expect(result.openId).toBe(`pharmacy:${username}`);
    expect(setCookies.length).toBe(1);
  });

  it("rejects an invalid password with UNAUTHORIZED", async () => {
    const username = uniqueUser("signin_bad");
    createdUsernames.push(username);
    await appRouter.createCaller(createPublicContext().ctx).auth.signup({
      username,
      password: "RightPassword123",
      fullName: "Wrong Password Test",
    });

    const ctx = createPublicContext().ctx;
    await expect(
      appRouter.createCaller(ctx).auth.signin({ username, password: "WrongPassword123" })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("rejects a non-existent username with UNAUTHORIZED", async () => {
    const ctx = createPublicContext().ctx;
    await expect(
      appRouter.createCaller(ctx).auth.signin({
        username: uniqueUser("ghost_user"),
        password: "DoesNotMatter123",
      })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
