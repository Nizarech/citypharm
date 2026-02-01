import { and, desc, eq, gte, lt, lte, sql, sum, count, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  appUsers,
  categories,
  suppliers,
  products,
  sales,
  saleItems,
  orders,
  orderItems,
  type InsertAppUser,
  type InsertCategory,
  type InsertSupplier,
  type InsertProduct,
  type InsertSale,
  type InsertSaleItem,
  type InsertOrder,
  type InsertOrderItem,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// Auth users

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  textFields.forEach((field) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  });
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// App users (pharmacy staff)

export async function getAppUsers() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: appUsers.id,
      username: appUsers.username,
      fullName: appUsers.fullName,
      email: appUsers.email,
      role: appUsers.role,
      isActive: appUsers.isActive,
      createdAt: appUsers.createdAt,
    })
    .from(appUsers)
    .orderBy(asc(appUsers.fullName));
}

export async function getAppUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(appUsers).where(eq(appUsers.username, username)).limit(1);
  return result[0];
}

export async function createAppUser(data: InsertAppUser) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(appUsers).values(data);
  return result;
}

export async function deleteAppUser(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(appUsers).where(eq(appUsers.id, id));
}

// Categories

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).orderBy(asc(categories.name));
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(categories).values(data);
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.delete(categories).where(eq(categories.id, id));
}

// Suppliers

export async function getSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(suppliers).where(eq(suppliers.isActive, true)).orderBy(asc(suppliers.name));
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result[0];
}

export async function createSupplier(data: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.insert(suppliers).values(data);
  return result;
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(suppliers).set({ isActive: false }).where(eq(suppliers.id, id));
}

// Products

export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
      batchNumber: products.batchNumber,
      expiryDate: products.expiryDate,
      quantity: products.quantity,
      reorderLevel: products.reorderLevel,
      costPrice: products.costPrice,
      sellPrice: products.sellPrice,
      unit: products.unit,
      isActive: products.isActive,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.isActive, true))
    .orderBy(asc(products.name));
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select({
      id: products.id,
      sku: products.sku,
      name: products.name,
      description: products.description,
      categoryId: products.categoryId,
      categoryName: categories.name,
      supplierId: products.supplierId,
      supplierName: suppliers.name,
      batchNumber: products.batchNumber,
      expiryDate: products.expiryDate,
      quantity: products.quantity,
      reorderLevel: products.reorderLevel,
      costPrice: products.costPrice,
      sellPrice: products.sellPrice,
      unit: products.unit,
      isActive: products.isActive,
      createdAt: products.createdAt,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
    .where(eq(products.id, id))
    .limit(1);
  return result[0];
}

export async function createProduct(data: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(products).values(data);
}

export async function updateProduct(id: number, data: Partial<InsertProduct>) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(products).set(data).where(eq(products.id, id));
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.update(products).set({ isActive: false }).where(eq(products.id, id));
}

// Sales

export async function getSales(limit = 100) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: sales.id,
      receiptNumber: sales.receiptNumber,
      appUserId: sales.appUserId,
      totalAmount: sales.totalAmount,
      discountAmount: sales.discountAmount,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      notes: sales.notes,
      saleDate: sales.saleDate,
    })
    .from(sales)
    .orderBy(desc(sales.saleDate))
    .limit(limit);
}

export async function getSaleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const saleResult = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
  if (!saleResult[0]) return undefined;
  const items = await db
    .select({
      id: saleItems.id,
      saleId: saleItems.saleId,
      productId: saleItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
      totalPrice: saleItems.totalPrice,
      returned: saleItems.returned,
    })
    .from(saleItems)
    .leftJoin(products, eq(saleItems.productId, products.id))
    .where(eq(saleItems.saleId, id));
  return { ...saleResult[0], items };
}

export async function createSale(saleData: InsertSale, items: InsertSaleItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(sales).values(saleData);
  const created = await db.select().from(sales).where(eq(sales.receiptNumber, saleData.receiptNumber)).limit(1);
  if (!created[0]) throw new Error("Sale not created");
  const saleId = created[0].id;
  const itemsWithSaleId = items.map((item) => ({ ...item, saleId }));
  await db.insert(saleItems).values(itemsWithSaleId);
  // Reduce stock for each item sold
  for (const item of items) {
    await db
      .update(products)
      .set({ quantity: sql`quantity - ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
  return saleId;
}

export async function returnSale(saleId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const saleResult = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
  if (!saleResult[0]) throw new Error("Sale not found");
  const items = await db.select().from(saleItems).where(eq(saleItems.saleId, saleId));
  // Put stock back if sale is cancelled
  for (const item of items) {
    await db
      .update(products)
      .set({ quantity: sql`quantity + ${item.quantity}` })
      .where(eq(products.id, item.productId));
  }
  await db.update(saleItems).set({ returned: true }).where(eq(saleItems.saleId, saleId));
  await db.update(sales).set({ status: "returned" }).where(eq(sales.id, saleId));
}

// Orders

export async function getOrders() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      supplierId: orders.supplierId,
      supplierName: suppliers.name,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      expectedDate: orders.expectedDate,
      receivedDate: orders.receivedDate,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const orderResult = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      supplierId: orders.supplierId,
      supplierName: suppliers.name,
      status: orders.status,
      totalAmount: orders.totalAmount,
      notes: orders.notes,
      expectedDate: orders.expectedDate,
      receivedDate: orders.receivedDate,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .leftJoin(suppliers, eq(orders.supplierId, suppliers.id))
    .where(eq(orders.id, id))
    .limit(1);
  if (!orderResult[0]) return undefined;
  const items = await db
    .select({
      id: orderItems.id,
      orderId: orderItems.orderId,
      productId: orderItems.productId,
      productName: products.name,
      productSku: products.sku,
      quantityOrdered: orderItems.quantityOrdered,
      quantityReceived: orderItems.quantityReceived,
      unitCost: orderItems.unitCost,
      totalCost: orderItems.totalCost,
    })
    .from(orderItems)
    .leftJoin(products, eq(orderItems.productId, products.id))
    .where(eq(orderItems.orderId, id));
  return { ...orderResult[0], items };
}

export async function createOrder(
  orderData: InsertOrder,
  items: InsertOrderItem[]
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  await db.insert(orders).values(orderData);
  const created = await db.select().from(orders).where(eq(orders.orderNumber, orderData.orderNumber)).limit(1);
  if (!created[0]) throw new Error("Order not created");
  const orderId = created[0].id;
  const itemsWithOrderId = items.map((item) => ({ ...item, orderId }));
  await db.insert(orderItems).values(itemsWithOrderId);
  return orderId;
}

export async function updateOrderStatus(
  id: number,
  status: "pending" | "confirmed" | "received" | "cancelled"
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const updateData: Record<string, unknown> = { status };
  if (status === "received") {
    updateData.receivedDate = new Date();
    // Add received quantity to stock
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    for (const item of items) {
      await db
        .update(products)
        .set({ quantity: sql`quantity + ${item.quantityOrdered}` })
        .where(eq(products.id, item.productId));
      await db
        .update(orderItems)
        .set({ quantityReceived: item.quantityOrdered })
        .where(eq(orderItems.id, item.id));
    }
  }
  await db.update(orders).set(updateData as any).where(eq(orders.id, id));
}

export async function updateOrderItemQuantity(
  itemId: number,
  quantityOrdered: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  // Recalculate line total from unit cost
  const existing = await db.select().from(orderItems).where(eq(orderItems.id, itemId)).limit(1);
  if (!existing[0]) throw new Error("Order item not found");
  const totalCost = (Number(existing[0].unitCost) * quantityOrdered).toFixed(2);
  await db.update(orderItems).set({ quantityOrdered, totalCost }).where(eq(orderItems.id, itemId));
  // Update the order total
  const orderId = existing[0].orderId;
  const allItems = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const newTotal = allItems.reduce((sum, i) => sum + Number(i.totalCost), 0).toFixed(2);
  await db.update(orders).set({ totalAmount: newTotal }).where(eq(orders.id, orderId));
}

// Dashboard

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [totalProductsResult] = await db
    .select({ count: count() })
    .from(products)
    .where(eq(products.isActive, true));

  const [lowStockResult] = await db
    .select({ count: count() })
    .from(products)
    .where(and(eq(products.isActive, true), sql`quantity > 0 AND quantity <= reorderLevel`));

  const [soldOutResult] = await db
    .select({ count: count() })
    .from(products)
    .where(and(eq(products.isActive, true), eq(products.quantity, 0)));

  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const [expiringSoonResult] = await db
    .select({ count: count() })
    .from(products)
    .where(
      and(
        eq(products.isActive, true),
        gte(products.expiryDate, sql`CURDATE()`),
        lte(products.expiryDate, sql`DATE_ADD(CURDATE(), INTERVAL 30 DAY)`)
      )
    );

  const [expiredResult] = await db
    .select({ count: count() })
    .from(products)
    .where(and(eq(products.isActive, true), lt(products.expiryDate, sql`CURDATE()`)));

  const [salesTodayResult] = await db
    .select({ total: sum(sales.totalAmount) })
    .from(sales)
    .where(and(eq(sales.status, "completed"), gte(sales.saleDate, today)));

  const [salesMonthResult] = await db
    .select({ total: sum(sales.totalAmount) })
    .from(sales)
    .where(and(eq(sales.status, "completed"), gte(sales.saleDate, monthStart)));

  const [pendingOrdersResult] = await db
    .select({ count: count() })
    .from(orders)
    .where(eq(orders.status, "pending"));

  return {
    totalProducts: totalProductsResult?.count ?? 0,
    lowStock: lowStockResult?.count ?? 0,
    soldOut: soldOutResult?.count ?? 0,
    expiringSoon: expiringSoonResult?.count ?? 0,
    expired: expiredResult?.count ?? 0,
    salesToday: Number(salesTodayResult?.total ?? 0),
    salesMonth: Number(salesMonthResult?.total ?? 0),
    pendingOrders: pendingOrdersResult?.count ?? 0,
  };
}

export async function getDailyRevenue(days = 30) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT 
      DATE(saleDate) as date,
      SUM(totalAmount) as revenue,
      COUNT(*) as transactions
    FROM sales
    WHERE status = 'completed'
      AND saleDate >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(saleDate)
    ORDER BY date ASC
  `);
  return (result[0] as unknown as any[]).map((row: any) => ({
    date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
    revenue: Number(row.revenue),
    transactions: Number(row.transactions),
  }));
}

export async function getTopProductsByRevenue(limit = 10, days = 30) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT 
      p.id,
      p.name,
      p.sku,
      SUM(si.totalPrice) as totalRevenue,
      SUM(si.quantity) as totalQuantity
    FROM sale_items si
    JOIN products p ON si.productId = p.id
    JOIN sales s ON si.saleId = s.id
    WHERE s.status = 'completed'
      AND s.saleDate >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY p.id, p.name, p.sku
    ORDER BY totalRevenue DESC
    LIMIT ${limit}
  `);
  return (result[0] as unknown as any[]).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    sku: String(row.sku),
    totalRevenue: Number(row.totalRevenue),
    totalQuantity: Number(row.totalQuantity),
  }));
}

export async function getCategoryInventory() {
  const db = await getDb();
  if (!db) return [];
  const result = await db.execute(sql`
    SELECT 
      c.id,
      c.name,
      COUNT(p.id) as productCount,
      SUM(p.quantity) as totalStock,
      SUM(p.quantity * p.sellPrice) as totalValue
    FROM categories c
    LEFT JOIN products p ON p.categoryId = c.id AND p.isActive = true
    GROUP BY c.id, c.name
    ORDER BY totalValue DESC
  `);
  return (result[0] as unknown as any[]).map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    productCount: Number(row.productCount),
    totalStock: Number(row.totalStock),
    totalValue: Number(row.totalValue),
  }));
}

// Seed check

export async function isSeedNeeded() {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select({ count: count() }).from(appUsers);
  return (result[0]?.count ?? 0) === 0;
}
