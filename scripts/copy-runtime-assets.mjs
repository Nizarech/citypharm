// Copies runtime files needed by the production server bundle into ./dist
// so that `node dist/index.js` can find them on hosts like Railway.
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");

const copies = [
  // NHS PCA seed bundle (needed by `pnpm db:seed` in production)
  {
    from: resolve(root, "server/data"),
    to: resolve(root, "dist/data"),
  },
  // Drizzle migrations + meta (needed by `pnpm db:migrate` in production)
  {
    from: resolve(root, "drizzle"),
    to: resolve(root, "dist/drizzle"),
  },
];

for (const { from, to } of copies) {
  if (!existsSync(from)) {
    console.warn(`[copy-runtime-assets] skip: ${from} does not exist`);
    continue;
  }
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
  console.log(`[copy-runtime-assets] ${from} -> ${to}`);
}
