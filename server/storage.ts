import fs from "node:fs/promises";
import path from "node:path";
import type { Express } from "express";
import { nanoid } from "nanoid";

export const UPLOADS_DIR = path.resolve(process.cwd(), "uploads");

async function ensureUploadsDir() {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

function sanitizeKey(key: string): string {
  // Strip any path traversal characters so files always stay inside UPLOADS_DIR.
  return key.replace(/[^a-zA-Z0-9._/-]/g, "_").replace(/\.\.+/g, "_");
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  _contentType?: string
): Promise<{ key: string; url: string }> {
  await ensureUploadsDir();
  const key = sanitizeKey(relKey) || `${nanoid()}`;
  const fullPath = path.join(UPLOADS_DIR, key);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  const buffer = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
  await fs.writeFile(fullPath, buffer);
  return { key, url: `/uploads/${key}` };
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = sanitizeKey(relKey);
  return { key, url: `/uploads/${key}` };
}

// Registers the uploads route (currently a no-op, static files handled in index.ts)
export function registerUploads(_app: Express) {
  // No-op — static files are served by express.static in index.ts
}
