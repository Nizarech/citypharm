# CityPharm   AI-Assisted Pharmacy Stock Management System

A pharmacy inventory management web application with AI-powered summaries,
reorder suggestions, and expiry alerts. Built with React 19, Tailwind 4,
Express 4, tRPC 11, Drizzle ORM and MySQL.

---

## Project Structure

```
client/        React 19 + Tailwind 4 frontend
  src/
    pages/         Page components (Dashboard, Products, Sales, ...)
    components/    Shared UI (DashboardLayout, etc.)
    lib/trpc.ts    tRPC client binding
drizzle/       Schema + generated SQL migrations
server/        Express + tRPC backend
  _core/         Framework plumbing (env, auth, llm, vite bridge)
  routers.ts     All tRPC procedures
  db.ts          Drizzle query helpers
  seed.ts        Demo-data seeder
  storage.ts     Local filesystem upload helper
scripts/       Build helpers
railway.json   Railway deployment configuration
nixpacks.toml  Nixpacks build configuration
```

---

## Author

Nizar Echouaibi   BSc (Hons) Computer Science, London South Bank University.
Final-year project, 2026.
