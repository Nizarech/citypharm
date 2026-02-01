import { defineConfig } from "drizzle-kit";
import { existsSync } from "node:fs";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// In production (e.g. on Railway) the source `./drizzle` folder is not shipped.
// `pnpm build` copies the migrations into `./dist/drizzle`, so prefer that path
// when it exists. This lets `pnpm db:migrate` work both locally and in production.
const hasBuiltMigrations = existsSync("./dist/drizzle");
const migrationsOut = hasBuiltMigrations ? "./dist/drizzle" : "./drizzle";
const schemaPath = existsSync("./drizzle/schema.ts")
  ? "./drizzle/schema.ts"
  : "./dist/drizzle/schema.ts";

export default defineConfig({
  schema: schemaPath,
  out: migrationsOut,
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
