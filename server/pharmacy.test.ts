import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function createAuthContext(role: "admin" | "manager" | "user" = "user"): TrpcContext {
  const user: User = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "password",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// Auth context helpers

describe("auth", () => {
  it("me returns null for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(await caller.auth.me()).toBeNull();
  });

  it("me returns user for authenticated user", async () => {
    const caller = appRouter.createCaller(createAuthContext("admin"));
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.role).toBe("admin");
  });

  it("logout clears session cookie", async () => {
    const cleared: string[] = [];
    const ctx: TrpcContext = {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { clearCookie: (name: string) => { cleared.push(name); } } as unknown as TrpcContext["res"],
    };
    const result = await appRouter.createCaller(ctx).auth.logout();
    expect(result.success).toBe(true);
    expect(cleared.length).toBe(1);
  });
});

// Seed tests

describe("seed", () => {
  it("check returns { needed: boolean }", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.seed.check();
    expect(result).toHaveProperty("needed");
    expect(typeof result.needed).toBe("boolean");
  });
});

// RBAC tests — protected routes should reject unauthenticated users

describe("RBAC: protected procedures reject unauthenticated callers", () => {
  it("products.create throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.products.create({
        sku: "TEST-001", name: "Test", categoryId: 1,
        quantity: 10, reorderLevel: 5, costPrice: "1.00", sellPrice: "2.00",
      })
    ).rejects.toThrow();
  });

  it("products.delete throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.products.delete({ id: 999 })).rejects.toThrow();
  });

  it("sales.create throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.sales.create({
        paymentMethod: "cash",
        items: [{ productId: 1, quantity: 1, unitPrice: "5.00" }],
      })
    ).rejects.toThrow();
  });

  it("orders.create throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.orders.create({
        supplierId: 1,
        items: [{ productId: 1, quantityOrdered: 10, unitCost: "1.00" }],
      })
    ).rejects.toThrow();
  });

  it("suppliers.create throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.suppliers.create({ name: "Test Supplier" })).rejects.toThrow();
  });

  it("appUsers.create throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.appUsers.create({
        username: "testuser", password: "password123",
        fullName: "Test User", role: "pharmacist",
      })
    ).rejects.toThrow();
  });

  it("ai.businessSummary throws UNAUTHORIZED for unauthenticated user", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.ai.businessSummary({ days: 30 })).rejects.toThrow();
  });
});

// Public read tests — these should work without auth

describe("public read procedures work without auth", () => {
  it("products.list returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.products.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("categories.list returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.categories.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("suppliers.list returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.suppliers.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("sales.list returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.sales.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("orders.list returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.orders.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("dashboard.stats returns expected shape", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("totalProducts");
    expect(result).toHaveProperty("lowStock");
    expect(result).toHaveProperty("soldOut");
    expect(result).toHaveProperty("salesToday");
    expect(result).toHaveProperty("salesMonth");
  });

  it("statistics.overview returns all sections", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.statistics.overview();
    expect(result).toHaveProperty("dailyRevenue");
    expect(result).toHaveProperty("topProducts");
    expect(result).toHaveProperty("categoryInventory");
    expect(result).toHaveProperty("stats");
    expect(Array.isArray(result.dailyRevenue)).toBe(true);
    expect(Array.isArray(result.topProducts)).toBe(true);
    expect(Array.isArray(result.categoryInventory)).toBe(true);
  });

  it("ai.expiryAlerts returns expired and expiringSoon arrays", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ai.expiryAlerts();
    expect(result).toHaveProperty("expired");
    expect(result).toHaveProperty("expiringSoon");
    expect(Array.isArray(result.expired)).toBe(true);
    expect(Array.isArray(result.expiringSoon)).toBe(true);
  });

  it("ai.businessSummary only accepts 30, 60 or 90 days", async () => {
    const caller = appRouter.createCaller(createAuthContext("admin"));
    await expect(
      (caller.ai.businessSummary as any)({ days: 45 })
    ).rejects.toThrow();
  });
  it("ai.autoCreateSoldOutOrders requires auth", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(caller.ai.autoCreateSoldOutOrders()).rejects.toThrow();
  });
  it("ai.reorderCandidates returns an array", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.ai.reorderCandidates();
    expect(Array.isArray(result)).toBe(true);
  });
});
