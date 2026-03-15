import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

// Checks the seed bundle is present and internally consistent
describe("NHS PCA seed bundle", () => {
  const bundlePath = join(process.cwd(), "server", "data", "nhs_pca_seed.json");
  const raw = readFileSync(bundlePath, "utf-8");
  const data = JSON.parse(raw);

  it("includes all required top-level collections", () => {
    expect(data._meta).toBeDefined();
    expect(data._meta.source).toContain("NHS Business Services Authority");
    expect(data._meta.licence).toContain("Open Government Licence");
    expect(Array.isArray(data.categories)).toBe(true);
    expect(Array.isArray(data.suppliers)).toBe(true);
    expect(Array.isArray(data.products)).toBe(true);
    expect(Array.isArray(data.sales)).toBe(true);
    expect(Array.isArray(data.saleItems)).toBe(true);
    expect(Array.isArray(data.orders)).toBe(true);
    expect(Array.isArray(data.orderItems)).toBe(true);
    expect(Array.isArray(data.users)).toBe(true);
  });

  it("has a non-trivial volume of data", () => {
    expect(data.products.length).toBeGreaterThanOrEqual(50);
    expect(data.sales.length).toBeGreaterThanOrEqual(1000);
    expect(data.saleItems.length).toBeGreaterThanOrEqual(1000);
    expect(data.categories.length).toBeGreaterThanOrEqual(8);
    expect(data.suppliers.length).toBeGreaterThanOrEqual(5);
  });

  it("uses unique receipt numbers for sales", () => {
    const receipts = new Set(data.sales.map((s: { receiptNumber: string }) => s.receiptNumber));
    expect(receipts.size).toBe(data.sales.length);
  });

  it("uses unique SKUs for products", () => {
    const skus = new Set(data.products.map((p: { sku: string }) => p.sku));
    expect(skus.size).toBe(data.products.length);
  });

  it("references valid product ids in sale items", () => {
    const productIds = new Set(data.products.map((p: { id: number }) => p.id));
    const saleIds = new Set(data.sales.map((s: { id: number }) => s.id));
    for (const item of data.saleItems.slice(0, 200)) {
      expect(productIds.has(item.productId)).toBe(true);
      expect(saleIds.has(item.saleId)).toBe(true);
    }
  });

  it("references valid category and supplier ids in products", () => {
    const catIds = new Set(data.categories.map((c: { id: number }) => c.id));
    const supIds = new Set(data.suppliers.map((s: { id: number }) => s.id));
    for (const p of data.products) {
      expect(catIds.has(p.categoryId)).toBe(true);
      expect(supIds.has(p.supplierId)).toBe(true);
    }
  });

  it("contains realistic NHS-prescribed UK medications", () => {
    const productNames = data.products
      .map((p: { name: string }) => p.name.toLowerCase())
      .join(" | ");
    // Check common medications exist in the dataset
    const expected = ["paracetamol", "atorvastatin", "amlodipine", "omeprazole", "metformin"];
    const found = expected.filter((d) => productNames.includes(d));
    expect(found.length).toBeGreaterThanOrEqual(3);
  });
});
