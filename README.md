# CityPharm — AI-Assisted Pharmacy Stock Management System

A pharmacy inventory management web application with AI-powered summaries,
reorder suggestions, and expiry alerts. Built with React 19, Tailwind 4,
Express 4, tRPC 11, Drizzle ORM and MySQL.

---

## Prerequisites

- Node.js v22 or later
- pnpm v10 or later (`npm install -g pnpm`)
- A MySQL 9 database (local or hosted)
- An OpenAI API key (for the AI assistant features)

---

## Local Development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create a `.env` file in the project root

```env
NODE_ENV=development
DATABASE_URL=mysql://root@localhost:3306/citypharm
JWT_SECRET=please-change-me-to-a-long-random-string
OPENAI_API_KEY=sk-your-openai-key-here

# Optional overrides:
# OPENAI_MODEL=gpt-4o-mini
# OPENAI_BASE_URL=https://api.openai.com/v1
```

### 3. Run database migrations

```bash
pnpm db:migrate
```

### 4. Seed the demo data

```bash
pnpm db:seed
```

### 5. Start the dev server

```bash
pnpm dev
```

The app runs at **http://localhost:3000**. Register the first account
through the sign-up page — the first user automatically becomes the
administrator and can promote other users from the Settings page.

---

## Running Tests

```bash
pnpm test
```

The Vitest suite should pass end-to-end.

---

## Deploying to Railway

The project is preconfigured for Railway via `railway.json` and
`nixpacks.toml`. The deployment plan is:

1. **Create a new Railway project** — sign in at <https://railway.com> and
   click **New Project → Deploy from GitHub repo**.
2. **Add a MySQL database service** — in your Railway project, click
   **+ New → Database → Add MySQL**.
3. **Connect the variables** — open the web service's **Variables** tab
   and add:

   | Variable          | Value                                                 |
   | ----------------- | ----------------------------------------------------- |
   | `DATABASE_URL`    | `${{ MySQL.MYSQL_URL }}` (Railway template reference) |
   | `JWT_SECRET`      | A long random string (64+ chars)                      |
   | `OPENAI_API_KEY`  | Your OpenAI key                                       |
   | `NODE_ENV`        | `production`                                          |

4. **Deploy** — Railway runs `pnpm install && pnpm build`, then on each
   container start it runs `pnpm db:migrate && pnpm start`.
5. **Seed the demo data once** — open the Railway service shell and run
   `pnpm db:seed`.
6. **Generate a public domain** — on the service page, go to **Settings →
   Networking → Generate Domain**.

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

Nizar Echouafni — BSc (Hons) Computer Science, London South Bank University.
Final-year project, 2026.
