import "dotenv/config";
import { createHash } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  appUsers,
  categories,
  suppliers,
  products,
  sales,
  saleItems,
  orders,
  orderItems,
} from "../drizzle/schema";

// Types for the seed JSON bundle

interface SeedFile {
  _meta: {
    source: string;
    sourceUrl: string;
    licence: string;
    generated: string;
    topNProducts: number;
    scaleFactor: number;
    monthsOfHistory: number;
  };
  categories: Array<{ id: number; name: string; description: string }>;
  suppliers: Array<{
    id: number;
    name: string;
    contactEmail: string;
    contactPhone: string;
    leadTimeDays: number;
  }>;
  products: Array<{
    id: number;
    sku: string;
    name: string;
    description: string;
    categoryId: number;
    supplierId: number;
    batchNumber: string;
    expiryDate: string;
    quantity: number;
    reorderLevel: number;
    costPrice: string;
    sellPrice: string;
    unit: string;
  }>;
  sales: Array<{
    id: number;
    receiptNumber: string;
    saleDate: string;
    totalAmount: string;
    discountAmount: string;
    paymentMethod: "cash" | "card" | "insurance";
    status: "completed" | "returned" | "partial_return";
    appUserId: number;
  }>;
  saleItems: Array<{
    id: number;
    saleId: number;
    productId: number;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
  }>;
  orders: Array<{
    id: number;
    orderNumber: string;
    supplierId: number;
    status: "pending" | "confirmed" | "received" | "cancelled";
    totalAmount: string;
    expectedDate: string;
  }>;
  orderItems: Array<{
    id: number;
    orderId: number;
    productId: number;
    quantityOrdered: number;
    quantityReceived: number;
    unitCost: string;
    totalCost: string;
  }>;
  users: Array<{ id: number; username: string; fullName: string; role: string; email: string }>;
}

// Load the seed bundle from disk

function loadSeedFile(): SeedFile {
  const here = dirname(fileURLToPath(import.meta.url));
  // Try dev path first, fall back to prod path
  const candidates = [
    join(here, "data", "nhs_pca_seed.json"),
    join(here, "..", "server", "data", "nhs_pca_seed.json"),
    join(process.cwd(), "server", "data", "nhs_pca_seed.json"),
    // Production path after build
    join(process.cwd(), "dist", "data", "nhs_pca_seed.json"),
  ];
  for (const p of candidates) {
    try {
      const raw = readFileSync(p, "utf-8");
      console.log(`[Seed] Loaded NHS PCA seed bundle from ${p}`);
      return JSON.parse(raw) as SeedFile;
    } catch {
      // Try next path
    }
  }
  throw new Error("[Seed] Could not locate nhs_pca_seed.json");
}

// Insert in chunks to avoid MySQL packet size limit

async function chunkedInsert<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  table: any,
  rows: T[],
  chunkSize: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  label: string,
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const slice = rows.slice(i, i + chunkSize);
    await db.insert(table).values(slice);
    if (rows.length > chunkSize) {
      console.log(`[Seed] ${label}: inserted ${Math.min(i + chunkSize, rows.length)}/${rows.length}`);
    }
  }
}

// Main seed function

export async function runSeed() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  console.log("[Seed] Starting pharmacy data seed (NHS PCA dataset)...");
  const data = loadSeedFile();
  console.log(`[Seed] Source: ${data._meta.source}`);
  console.log(`[Seed] Licence: ${data._meta.licence}`);

  // App users
  const hash = (pw: string) => createHash("sha256").update(pw).digest("hex");
  const passwordByUsername: Record<string, string> = {
    admin: "admin123",
    manager: "manager123",
    pharmacist: "pharm123",
  };
  await db.insert(appUsers).values(
    data.users.map((u) => ({
      username: u.username,
      passwordHash: hash(passwordByUsername[u.username] ?? "demo123"),
      fullName: u.fullName,
      email: u.email,
      role: u.role as "admin" | "manager" | "pharmacist",
    })),
  ).onDuplicateKeyUpdate({ set: { fullName: sql`fullName` } });

  // Categories
  await db.insert(categories).values(
    data.categories.map((c) => ({ name: c.name, description: c.description })),
  ).onDuplicateKeyUpdate({ set: { name: sql`name` } });

  const catRows = await db.select().from(categories);
  const catIdByName: Record<string, number> = {};
  for (const c of catRows) catIdByName[c.name] = c.id;

  // Suppliers
  await db.insert(suppliers).values(
    data.suppliers.map((s) => ({
      name: s.name,
      contactName: "Wholesale Account Manager",
      email: s.contactEmail,
      phone: s.contactPhone,
      address: "United Kingdom",
      leadTimeDays: s.leadTimeDays,
    })),
  );

  const supRows = await db.select().from(suppliers);
  const supIdByName: Record<string, number> = {};
  for (const s of supRows) supIdByName[s.name] = s.id;

  // Map JSON ids to real DB ids
  const catJsonToDbId: Record<number, number> = {};
  for (const c of data.categories) catJsonToDbId[c.id] = catIdByName[c.name];
  const supJsonToDbId: Record<number, number> = {};
  for (const s of data.suppliers) supJsonToDbId[s.id] = supIdByName[s.name];

  // Products
  const productRows = data.products.map((p) => ({
    sku: p.sku,
    name: p.name,
    description: p.description,
    categoryId: catJsonToDbId[p.categoryId] ?? catRows[0]!.id,
    supplierId: supJsonToDbId[p.supplierId] ?? supRows[0]!.id,
    batchNumber: p.batchNumber,
    expiryDate: p.expiryDate,
    quantity: p.quantity,
    reorderLevel: p.reorderLevel,
    costPrice: p.costPrice,
    sellPrice: p.sellPrice,
    unit: p.unit,
  }));
  await chunkedInsert(products, productRows, 50, db, "products");

  const prodRows = await db.select().from(products);
  const prodIdBySku: Record<string, number> = {};
  for (const p of prodRows) prodIdBySku[p.sku] = p.id;
  const prodJsonToDbId: Record<number, number> = {};
  for (const p of data.products) prodJsonToDbId[p.id] = prodIdBySku[p.sku];

  // Map app user ids
  const appUserRows = await db.select().from(appUsers);
  const appUserIdByUsername: Record<string, number> = {};
  for (const u of appUserRows) appUserIdByUsername[u.username] = u.id;
  const appUserJsonToDbId: Record<number, number> = {};
  for (const u of data.users) appUserJsonToDbId[u.id] = appUserIdByUsername[u.username];

  // Sales
  console.log(`[Seed] Inserting ${data.sales.length} sales transactions...`);
  const saleRowsToInsert = data.sales.map((s) => ({
    receiptNumber: s.receiptNumber,
    appUserId: appUserJsonToDbId[s.appUserId] ?? null,
    totalAmount: s.totalAmount,
    discountAmount: s.discountAmount,
    paymentMethod: s.paymentMethod,
    status: s.status,
    saleDate: new Date(s.saleDate),
  }));
  await chunkedInsert(sales, saleRowsToInsert, 500, db, "sales");

  const saleDbRows = await db.select({ id: sales.id, receiptNumber: sales.receiptNumber }).from(sales);
  const saleIdByReceipt: Record<string, number> = {};
  for (const s of saleDbRows) saleIdByReceipt[s.receiptNumber] = s.id;
  const saleJsonToDbId: Record<number, number> = {};
  for (const s of data.sales) saleJsonToDbId[s.id] = saleIdByReceipt[s.receiptNumber];

  // Sale items
  console.log(`[Seed] Inserting ${data.saleItems.length} sale items...`);
  const saleItemRowsToInsert = data.saleItems
    .map((si) => {
      const realSaleId = saleJsonToDbId[si.saleId];
      const realProductId = prodJsonToDbId[si.productId];
      if (!realSaleId || !realProductId) return null;
      return {
        saleId: realSaleId,
        productId: realProductId,
        quantity: si.quantity,
        unitPrice: si.unitPrice,
        totalPrice: si.totalPrice,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  await chunkedInsert(saleItems, saleItemRowsToInsert, 500, db, "saleItems");

  // Supplier orders
  console.log(`[Seed] Inserting ${data.orders.length} supplier orders...`);
  await db.insert(orders).values(
    data.orders.map((o) => ({
      orderNumber: o.orderNumber,
      supplierId: supJsonToDbId[o.supplierId] ?? supRows[0]!.id,
      status: o.status,
      totalAmount: o.totalAmount,
      expectedDate: new Date(o.expectedDate),
    })),
  );

  const orderDbRows = await db.select({ id: orders.id, orderNumber: orders.orderNumber }).from(orders);
  const orderIdByNumber: Record<string, number> = {};
  for (const o of orderDbRows) orderIdByNumber[o.orderNumber] = o.id;
  const orderJsonToDbId: Record<number, number> = {};
  for (const o of data.orders) orderJsonToDbId[o.id] = orderIdByNumber[o.orderNumber];

  await db.insert(orderItems).values(
    data.orderItems
      .map((oi) => {
        const realOrderId = orderJsonToDbId[oi.orderId];
        const realProductId = prodJsonToDbId[oi.productId];
        if (!realOrderId || !realProductId) return null;
        return {
          orderId: realOrderId,
          productId: realProductId,
          quantityOrdered: oi.quantityOrdered,
          quantityReceived: oi.quantityReceived,
          unitCost: oi.unitCost,
          totalCost: oi.totalCost,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null),
  );

  console.log("[Seed] Done. NHS PCA-derived demo data seeded successfully.");
}

// Wipe and re-seed all pharmacy tables

export async function resetAndReseed() {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");

  console.log("[Seed] Wiping existing pharmacy data...");
  // Delete child tables first to avoid FK errors
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 0`);
  await db.execute(sql`TRUNCATE TABLE order_items`);
  await db.execute(sql`TRUNCATE TABLE orders`);
  await db.execute(sql`TRUNCATE TABLE sale_items`);
  await db.execute(sql`TRUNCATE TABLE sales`);
  await db.execute(sql`TRUNCATE TABLE products`);
  await db.execute(sql`TRUNCATE TABLE suppliers`);
  await db.execute(sql`TRUNCATE TABLE categories`);
  await db.execute(sql`TRUNCATE TABLE app_users`);
  await db.execute(sql`SET FOREIGN_KEY_CHECKS = 1`);

  await runSeed();
}

// Only run if called directly

import { fileURLToPath as _ftu } from "url";
const _isMain =
  typeof process.argv[1] !== "undefined" &&
  (process.argv[1].endsWith("seed.ts") ||
    process.argv[1].endsWith("seed.js"));

if (_isMain) {
  runSeed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Seed] Fatal error:", err);
      process.exit(1);
    });
}
