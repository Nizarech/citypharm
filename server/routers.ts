import { z } from "zod";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { signSession } from "./_core/auth";
import { TRPCError } from "@trpc/server";
import { invokeLLM } from "./_core/llm";
import * as db from "./db";
import { getDb } from "./db";
import { suppliers } from "../drizzle/schema";
import { inArray } from "drizzle-orm";
import { runSeed, resetAndReseed } from "./seed";
import bcrypt from "bcryptjs";

// Auth helpers

// Sync the app user into the framework users table so RBAC works
async function issueBrandedSession(
  ctx: { req: any; res: any },
  appUser: { username: string; fullName: string; email: string | null; role: "admin" | "manager" | "pharmacist" }
) {
  const openId = `pharmacy:${appUser.username}`;
  const role = appUser.role === "admin" ? "admin" : "user";
  const now = new Date();
  await db.upsertUser({
    openId,
    name: appUser.fullName,
    email: appUser.email,
    loginMethod: "password",
    role,
    lastSignedIn: now,
  });
  const token = await signSession(
    { openId, name: appUser.fullName },
    { expiresInMs: ONE_YEAR_MS }
  );
  const cookieOptions = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return { openId, fullName: appUser.fullName, role: appUser.role };
}

// Helpers

function generateReceiptNumber() {
  const now = new Date();
  const ts = now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  return `RCP-${ts}-${Math.floor(Math.random() * 1000).toString().padStart(3, "0")}`;
}

function generateOrderNumber() {
  const now = new Date();
  const ts = now.getFullYear().toString().slice(-2) +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  return `ORD-${ts}-${Math.floor(Math.random() * 10000).toString().padStart(4, "0")}`;
}

// Main router

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true, time: new Date().toISOString() })),
  }),
  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (!user) return null;
      // Add pharmacy role if this is a branded sign-in user
      let pharmacyRole: "admin" | "manager" | "pharmacist" | null = null;
      if (user.openId.startsWith("pharmacy:")) {
        const username = user.openId.slice("pharmacy:".length);
        const appUser = await db.getAppUserByUsername(username);
        if (appUser) pharmacyRole = appUser.role;
      }
      return { ...user, pharmacyRole, username: user.openId.startsWith("pharmacy:") ? user.openId.slice(9) : null };
    }),
    signup: publicProcedure
      .input(
        z.object({
          username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/, "Username may contain letters, digits, dot, dash and underscore only"),
          password: z.string().min(8, "Password must be at least 8 characters"),
          fullName: z.string().min(1).max(128),
          email: z.string().email().optional().or(z.literal("")),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const existing = await db.getAppUserByUsername(input.username);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "That username is already taken" });
        }
        // First account gets admin, everyone else starts as pharmacist
        const existingUsers = await db.getAppUsers();
        const role: "admin" | "manager" | "pharmacist" = existingUsers.length === 0 ? "admin" : "pharmacist";
        const passwordHash = await bcrypt.hash(input.password, 10);
        await db.createAppUser({
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          email: input.email && input.email.length > 0 ? input.email : null,
          role,
        });
        const session = await issueBrandedSession(ctx, {
          username: input.username,
          fullName: input.fullName,
          email: input.email && input.email.length > 0 ? input.email : null,
          role,
        });
        return { success: true, ...session } as const;
      }),
    signin: publicProcedure
      .input(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const appUser = await db.getAppUserByUsername(input.username);
        if (!appUser || !appUser.isActive) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        // Support both bcrypt and sha256 hashes (legacy demo accounts)
        let ok = false;
        if (appUser.passwordHash.startsWith("$2")) {
          ok = await bcrypt.compare(input.password, appUser.passwordHash);
        } else {
          const { createHash } = await import("crypto");
          const sha = createHash("sha256").update(input.password).digest("hex");
          ok = sha === appUser.passwordHash;
        }
        if (!ok) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid username or password" });
        }
        const session = await issueBrandedSession(ctx, appUser);
        return { success: true, ...session } as const;
      }),
    signout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    // Legacy alias for logout — kept for backwards compatibility
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Seed
  seed: router({
    check: publicProcedure.query(async () => {
      const needed = await db.isSeedNeeded();
      return { needed };
    }),
    run: publicProcedure.mutation(async () => {
      const needed = await db.isSeedNeeded();
      if (!needed) return { skipped: true };
      await runSeed();
      return { seeded: true };
    }),
    reset: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
      }
      await resetAndReseed();
      return { reset: true };
    }),
  }),

  // Dashboard
  dashboard: router({
    stats: publicProcedure.query(async () => {
      return db.getDashboardStats();
    }),
    dailyRevenue: publicProcedure
      .input(z.object({ days: z.number().optional().default(30) }))
      .query(async ({ input }) => {
        return db.getDailyRevenue(input.days);
      }),
    topProducts: publicProcedure
      .input(z.object({ limit: z.number().optional().default(10) }))
      .query(async ({ input }) => {
        return db.getTopProductsByRevenue(input.limit);
      }),
    categoryInventory: publicProcedure.query(async () => {
      return db.getCategoryInventory();
    }),
  }),

  // Products
  products: router({
    list: publicProcedure.query(async () => {
      return db.getProducts();
    }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getProductById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          sku: z.string().min(1),
          name: z.string().min(1),
          description: z.string().optional(),
          categoryId: z.number(),
          supplierId: z.number().optional(),
          batchNumber: z.string().optional(),
          expiryDate: z.string().optional(),
          quantity: z.number().min(0),
          reorderLevel: z.number().min(0),
          costPrice: z.string(),
          sellPrice: z.string(),
          unit: z.string().default("pack"),
        })
      )
      .mutation(async ({ input }) => {
        await db.createProduct({
          sku: input.sku,
          name: input.name,
          description: input.description ?? null,
          categoryId: input.categoryId,
          supplierId: input.supplierId ?? null,
          batchNumber: input.batchNumber ?? null,
          expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
          quantity: input.quantity,
          reorderLevel: input.reorderLevel,
          costPrice: input.costPrice,
          sellPrice: input.sellPrice,
          unit: input.unit,
        });
        return { success: true };
      }),
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          quantity: z.number().optional(),
          reorderLevel: z.number().optional(),
          sellPrice: z.string().optional(),
          costPrice: z.string().optional(),
          expiryDate: z.string().optional().nullable(),
          batchNumber: z.string().optional().nullable(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        const updateData: Record<string, unknown> = {};
        if (rest.quantity !== undefined) updateData.quantity = rest.quantity;
        if (rest.reorderLevel !== undefined) updateData.reorderLevel = rest.reorderLevel;
        if (rest.sellPrice !== undefined) updateData.sellPrice = rest.sellPrice;
        if (rest.costPrice !== undefined) updateData.costPrice = rest.costPrice;
        if (rest.expiryDate !== undefined) updateData.expiryDate = rest.expiryDate ? new Date(rest.expiryDate) : null;
        if (rest.batchNumber !== undefined) updateData.batchNumber = rest.batchNumber;
        await db.updateProduct(id, updateData as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteProduct(input.id);
        return { success: true };
      }),
  }),

  // Categories
  categories: router({
    list: publicProcedure.query(async () => {
      return db.getCategories();
    }),
    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
      .mutation(async ({ input }) => {
        await db.createCategory({ name: input.name, description: input.description ?? null });
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteCategory(input.id);
        return { success: true };
      }),
  }),

  // Suppliers
  suppliers: router({
    list: publicProcedure.query(async () => {
      return db.getSuppliers();
    }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSupplierById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1),
          contactName: z.string().optional(),
          email: z.string().email().optional().or(z.literal("")),
          phone: z.string().optional(),
          address: z.string().optional(),
          leadTimeDays: z.number().min(1).default(7),
        })
      )
      .mutation(async ({ input }) => {
        await db.createSupplier({
          name: input.name,
          contactName: input.contactName ?? null,
          email: input.email || null,
          phone: input.phone ?? null,
          address: input.address ?? null,
          leadTimeDays: input.leadTimeDays,
        });
        return { success: true };
      }),
    update: publicProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          contactName: z.string().optional(),
          email: z.string().optional(),
          phone: z.string().optional(),
          address: z.string().optional(),
          leadTimeDays: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...rest } = input;
        await db.updateSupplier(id, rest as any);
        return { success: true };
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteSupplier(input.id);
        return { success: true };
      }),
  }),

  // Sales
  sales: router({
    list: publicProcedure
      .input(z.object({ limit: z.number().optional().default(100) }))
      .query(async ({ input }) => {
        return db.getSales(input.limit);
      }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getSaleById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          paymentMethod: z.enum(["cash", "card", "insurance"]).default("cash"),
          discountAmount: z.string().optional().default("0"),
          notes: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantity: z.number().min(1),
              unitPrice: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const receiptNumber = generateReceiptNumber();
        const totalAmount = input.items
          .reduce((sum, item) => sum + Number(item.unitPrice) * item.quantity, 0)
          .toFixed(2);
        const saleId = await db.createSale(
          {
            receiptNumber,
            totalAmount,
            discountAmount: input.discountAmount ?? "0",
            paymentMethod: input.paymentMethod,
            notes: input.notes ?? null,
          },
          input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: (Number(item.unitPrice) * item.quantity).toFixed(2),
            saleId: 0,
          }))
        );
        return { success: true, saleId, receiptNumber };
      }),
    return: protectedProcedure
      .input(z.object({ saleId: z.number() }))
      .mutation(async ({ input }) => {
        await db.returnSale(input.saleId);
        return { success: true };
      }),
  }),

  // Orders
  orders: router({
    list: publicProcedure.query(async () => {
      return db.getOrders();
    }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getOrderById(input.id);
      }),
    create: protectedProcedure
      .input(
        z.object({
          supplierId: z.number(),
          notes: z.string().optional(),
          expectedDate: z.string().optional(),
          items: z.array(
            z.object({
              productId: z.number(),
              quantityOrdered: z.number().min(1),
              unitCost: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input }) => {
        const orderNumber = generateOrderNumber();
        const totalAmount = input.items
          .reduce((sum, item) => sum + Number(item.unitCost) * item.quantityOrdered, 0)
          .toFixed(2);
        const orderId = await db.createOrder(
          {
            orderNumber,
            supplierId: input.supplierId,
            totalAmount,
            notes: input.notes ?? null,
            expectedDate: input.expectedDate ? new Date(input.expectedDate) : null,
          },
          input.items.map((item) => ({
            productId: item.productId,
            quantityOrdered: item.quantityOrdered,
            unitCost: item.unitCost,
            totalCost: (Number(item.unitCost) * item.quantityOrdered).toFixed(2),
            orderId: 0,
          }))
        );
        return { success: true, orderId, orderNumber };
      }),
    updateStatus: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "confirmed", "received", "cancelled"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateOrderStatus(input.id, input.status);
        return { success: true };
      }),
    updateItem: protectedProcedure
      .input(
        z.object({
          itemId: z.number(),
          quantityOrdered: z.number().min(1),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateOrderItemQuantity(input.itemId, input.quantityOrdered);
        return { success: true };
      }),
  }),

  // Statistics
  statistics: router({
    overview: publicProcedure.query(async () => {
      const [dailyRevenue, topProducts, categoryInventory, stats] = await Promise.all([
        db.getDailyRevenue(30),
        db.getTopProductsByRevenue(10),
        db.getCategoryInventory(),
        db.getDashboardStats(),
      ]);
      return { dailyRevenue, topProducts, categoryInventory, stats };
    }),
  }),

  // AI features
  ai: router({
    expiryAlerts: publicProcedure.query(async () => {
      const allProducts = await db.getProducts();
      const today = new Date();
      const thirtyDays = new Date(today);
      thirtyDays.setDate(thirtyDays.getDate() + 30);
      const expired = allProducts.filter(
        (p) => p.expiryDate && new Date(p.expiryDate) < today
      );
      const expiringSoon = allProducts.filter(
        (p) =>
          p.expiryDate &&
          new Date(p.expiryDate) >= today &&
          new Date(p.expiryDate) <= thirtyDays
      );
      return { expired, expiringSoon };
    }),
    reorderCandidates: publicProcedure.query(async () => {
      const allProducts = await db.getProducts();
      return allProducts.filter((p) => p.quantity <= p.reorderLevel);
    }),
    autoCreateReorders: protectedProcedure.mutation(async () => {
      const allProducts = await db.getProducts();
      const candidates = allProducts.filter(
        (p) => p.quantity <= p.reorderLevel && p.supplierId
      );
      if (candidates.length === 0) return { created: 0 };
      // Group reorder candidates by supplier
      const bySupplier = new Map<number, typeof candidates>();
      for (const p of candidates) {
        if (!p.supplierId) continue;
        if (!bySupplier.has(p.supplierId)) bySupplier.set(p.supplierId, []);
        bySupplier.get(p.supplierId)!.push(p);
      }
      let created = 0;
      for (const [supplierId, items] of Array.from(bySupplier.entries())) {
        const orderNumber = generateOrderNumber() + `-AUTO`;
        await db.createOrder(
          {
            orderNumber,
            supplierId,
            totalAmount: items
              .reduce((s: number, p: any) => s + Number(p.costPrice) * (p.reorderLevel * 2), 0)
              .toFixed(2),
            notes: "Auto-generated reorder",
          },
          items.map((p: any) => ({
            productId: p.id,
            quantityOrdered: p.reorderLevel * 2,
            unitCost: String(p.costPrice),
            totalCost: (Number(p.costPrice) * p.reorderLevel * 2).toFixed(2),
            orderId: 0,
          }))
        );
        created++;
      }
      return { created };
    }),
    autoCreateSoldOutOrders: protectedProcedure.mutation(async () => {
      // Create a pending order for each sold-out product, grouped by supplier
      const allProducts = await db.getProducts();
      const soldOut = allProducts.filter((p) => p.quantity === 0);
      if (soldOut.length === 0) return { created: 0, items: 0 };

      // Use a placeholder supplier if no supplier is assigned
      let placeholderId: number | null = null;
      const hasUnassigned = soldOut.some((p) => !p.supplierId);
      if (hasUnassigned) {
        const suppliers = await db.getSuppliers();
        const existing = suppliers.find((s: any) => s.name === "Pending Assignment");
        if (existing) placeholderId = existing.id;
        else {
          const createdSupplier = await db.createSupplier({
            name: "Pending Assignment",
            contactPerson: null,
            email: null,
            phone: null,
            address: null,
            leadTimeDays: 7,
          } as any);
          placeholderId = (createdSupplier as any).id ?? null;
        }
      }

      const bySupplier = new Map<number, typeof soldOut>();
      for (const p of soldOut) {
        const sid = p.supplierId ?? placeholderId;
        if (!sid) continue;
        if (!bySupplier.has(sid)) bySupplier.set(sid, []);
        bySupplier.get(sid)!.push(p);
      }

      let created = 0;
      let itemCount = 0;
      for (const [supplierId, items] of Array.from(bySupplier.entries())) {
        const orderNumber = generateOrderNumber() + `-SOLDOUT`;
        await db.createOrder(
          {
            orderNumber,
            supplierId,
            totalAmount: items
              .reduce((s: number, p: any) => s + Number(p.costPrice) * (p.reorderLevel * 2), 0)
              .toFixed(2),
            notes: "Sold-out auto-reorder (not confirmed)",
          },
          items.map((p: any) => ({
            productId: p.id,
            quantityOrdered: p.reorderLevel * 2,
            unitCost: String(p.costPrice),
            totalCost: (Number(p.costPrice) * p.reorderLevel * 2).toFixed(2),
            orderId: 0,
          }))
        );
        created++;
        itemCount += items.length;
      }
      return { created, items: itemCount };
    }),
    businessSummary: protectedProcedure
      .input(z.object({ days: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(30) }))
      .mutation(async ({ input }) => {
        const days = input.days;
        const [stats, topProducts, categoryInventory, dailyRevenue] = await Promise.all([
          db.getDashboardStats(),
          db.getTopProductsByRevenue(5, days),
          db.getCategoryInventory(),
          db.getDailyRevenue(days),
        ]);
        const windowRevenue = dailyRevenue.reduce((s: number, r: any) => s + Number(r.revenue || 0), 0);
        const activeDays = dailyRevenue.filter((r: any) => Number(r.revenue || 0) > 0).length;
        const avgPerActiveDay = activeDays > 0 ? windowRevenue / activeDays : 0;

        const prompt = `You are a pharmacy business analyst. Write a concise 3-paragraph narrative summary covering: (1) sales performance over the last ${days} days, (2) inventory health (stock, expiry, categories), (3) concrete recommendations for the pharmacy manager. Use UK English and pounds sterling.

Window: Last ${days} days

Sales performance:
- Total revenue in window: £${windowRevenue.toFixed(2)}
- Active trading days: ${activeDays}
- Average per active day: £${avgPerActiveDay.toFixed(2)}
- Sales today: £${stats?.salesToday?.toFixed(2) ?? "0.00"}
- Sales this calendar month: £${stats?.salesMonth?.toFixed(2) ?? "0.00"}
- Top 5 products in window by revenue: ${topProducts.map((p: any) => `${p.name} (£${Number(p.totalRevenue).toFixed(2)})`).join(", ") || "none"}

Inventory health:
- Total active products: ${stats?.totalProducts ?? 0}
- Low stock: ${stats?.lowStock ?? 0}
- Sold out: ${stats?.soldOut ?? 0}
- Expiring soon (30 days): ${stats?.expiringSoon ?? 0}
- Expired: ${stats?.expired ?? 0}
- Pending supplier orders: ${stats?.pendingOrders ?? 0}
- Inventory by category: ${categoryInventory.map((c: any) => `${c.name}: ${c.productCount} SKUs, £${Number(c.totalValue).toFixed(2)} retail value`).join("; ")}

Write a professional, actionable summary. Do not invent figures that are not in the data above.`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: "You are a professional pharmacy business analyst writing for a UK community pharmacy manager." },
            { role: "user", content: prompt },
          ],
        });
        const summary = response.choices?.[0]?.message?.content ?? "Unable to generate summary.";
        return { summary, days, windowRevenue, activeDays, avgPerActiveDay };
      }),
  }),

  // App users (Settings page)
  appUsers: router({
    list: publicProcedure.query(async () => {
      return db.getAppUsers();
    }),
    create: protectedProcedure
      .input(
        z.object({
          username: z.string().min(3),
          password: z.string().min(6),
          fullName: z.string().min(1),
          email: z.string().email().optional().or(z.literal("")),
          role: z.enum(["admin", "manager", "pharmacist"]),
        })
      )
      .mutation(async ({ input }) => {
        const passwordHash = await bcrypt.hash(input.password, 10);
        await db.createAppUser({
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          email: input.email || null,
          role: input.role,
        });
        return { success: true };
      }),
     delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.deleteAppUser(input.id);
        return { success: true };
      }),
  }),

  // Utility to remove duplicate suppliers
  utils: router({
    deduplicateSuppliers: protectedProcedure.mutation(async () => {
      const database = await getDb();
      if (!database) throw new Error("DB unavailable");
      // Keep the first occurrence, delete the rest
      const allSuppliers = await database.select({ id: suppliers.id, name: suppliers.name }).from(suppliers);
      const seen = new Map<string, number>();
      const toDelete: number[] = [];
      for (const s of allSuppliers) {
        if (seen.has(s.name)) {
          toDelete.push(s.id);
        } else {
          seen.set(s.name, s.id);
        }
      }
      if (toDelete.length > 0) {
        await database.delete(suppliers).where(inArray(suppliers.id, toDelete));
      }
      return { removed: toDelete.length, remaining: seen.size };
    }),
  }),
});
export type AppRouter = typeof appRouter;
