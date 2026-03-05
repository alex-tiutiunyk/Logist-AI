# 🚛 Logistics Manager Console — MVP

A real-time logistics operations dashboard for a fleet of 40 trucks, 6 terminals, and 20 drivers. Built as a production-ready MVP.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vue 3 + Vite + Pinia + Tailwind CSS + socket.io-client |
| Backend | NestJS + TypeScript + Prisma ORM |
| Database | PostgreSQL |
| Cache / Queue | Redis + BullMQ |
| Realtime | socket.io (WebSocket gateway) |
| Auth | JWT + RBAC (passport-jwt) |
| Monorepo | pnpm workspaces |

---

## Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8 (`npm i -g pnpm`)
- Docker + Docker Compose (for PostgreSQL + Redis)

---

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url> logistics-manager
cd logistics-manager
pnpm install
```

### 2. Start infrastructure (PostgreSQL + Redis)

```bash
docker compose up -d
```

Wait a few seconds for the DB to be ready.

### 3. Configure environment

The `.env` files are pre-configured for local development. If you need to change values:

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env
# Edit DATABASE_URL, REDIS_URL, JWT_SECRET as needed

# Frontend
# apps/frontend/.env is already set to proxy through Vite
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

When prompted for migration name, enter: `init`

### 5. Seed demo data

```bash
pnpm db:seed
```

This creates:
- ✅ 3 demo users (admin, manager, operator)
- ✅ 40 trucks (TRK-001 through TRK-040)
- ✅ 6 terminals (3 own, 3 partner)
- ✅ 20 drivers
- ✅ 60 trips with realistic statuses and terminal events
- ✅ 5 sample alerts

### 6. Start development servers

```bash
pnpm dev
```

This starts both backend (port 3000) and frontend (port 5173) concurrently.

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **Prisma Studio**: `pnpm db:studio` (optional)

---

## Demo Users

| Email | Password | Role |
|---|---|---|
| `admin@demo.com` | `admin123` | ADMIN |
| `manager@demo.com` | `manager123` | MANAGER |
| `operator@demo.com` | `operator123` | TERMINAL_OPERATOR |

Login quick-fill buttons are available on the login page.

---

## Environment Variables

### Backend (`apps/backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://logist:logist_pass@localhost:5432/logistics` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `JWT_SECRET` | Secret key for JWT signing | `dev_jwt_secret_change_me_in_production` |
| `JWT_EXPIRES_IN` | JWT token expiry | `8h` |
| `PORT` | Backend HTTP port | `3000` |
| `FRONTEND_URL` | CORS origin for frontend | `http://localhost:5173` |

### Frontend (`apps/frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | API base URL (proxied via Vite in dev) | `/api` |
| `VITE_WS_URL` | WebSocket server URL | `http://localhost:3000` |

---

## Features

### A) Real-time Dashboard
- **KPI cards**: Active trips, Trucks idle, Late risk count, Avg dwell time today, Margin today
- **Live truck table** with: Truck ID, Driver, Status badge, Current trip, ETA (+drift), Terminal, Risk badge
- **Quick actions**: Mark arrived, Mark departed directly from the table
- **Filters**: Status, Terminal, Risk, Search (truck/driver/trip code)
- **Real-time updates**: WebSocket events refresh table and KPIs on any status change

### B) Trips Planning
- **Trip list** with all 60 seeded trips, filterable by status and searchable
- **Create trip form** with full validation:
  - Origin / destination terminal selection
  - Planned start + ETA datetimes
  - Distance, cargo weight, rate income, fuel cost estimate
  - Truck + driver assignment
- **"Suggest Truck" AI heuristic** (top 3 candidates):
  - Prefers IDLE trucks (+3 points)
  - Prefers trucks already at origin terminal (+2 points)
  - Excludes MAINTENANCE trucks
  - Returns reason text for each suggestion

### C) Terminal Queue Control
- **Per-terminal panels** showing trucks currently at terminal (waiting/loading/unloading)
- **Dwell timer** since arrival — turns yellow at 75% SLA, red when exceeded
- **Action buttons** based on trip status:
  - Start Loading → Finish Loading → (truck departs)
  - Start Unloading → Finish Unloading → (trip completed)

### D) Alerts Panel
- All alert types: **Late Risk**, **Dwell Risk**, **Idle Too Long**
- Severity levels: INFO, WARNING, CRITICAL (color-coded row borders)
- **Acknowledge** single alerts
- Toggle to show/hide acknowledged alerts
- **Background job** (BullMQ) runs every 5 minutes to evaluate and create new alerts
- **Real-time**: new alerts appear instantly via WebSocket

---

## Deploying to the Internet (Railway — free tier)

Railway hosts the full stack for free. You will get two public URLs:
one for the backend and one for the frontend. Everything below takes
about 10–15 minutes on the first deploy.

---

### Step 1 — Create a Railway account

1. Go to **https://railway.app**
2. Click **Login** → **Login with GitHub**
3. Authorize Railway to access your GitHub account

---

### Step 2 — Create a new project

1. On the Railway dashboard click **New Project**
2. Choose **Deploy from GitHub repo**
3. Find and select **Logist-AI** (it is the repo at `alex-tiutiunyk/Logist-AI`)
4. When Railway asks which service to deploy, click **Add variables later** — you will configure everything manually below

Railway creates an empty project. You will now add four services to it.

---

### Step 3 — Add PostgreSQL

1. Inside the project click **+ New** → **Database** → **Add PostgreSQL**
2. Railway spins up a Postgres instance automatically
3. Click the Postgres service → **Variables** tab → copy the value of **DATABASE_URL** (you will need it in Step 6)

---

### Step 4 — Add Redis

1. Click **+ New** → **Database** → **Add Redis**
2. Click the Redis service → **Variables** tab → copy the value of **REDIS_URL**

---

### Step 5 — Add the backend service

1. Click **+ New** → **GitHub Repo** → select **Logist-AI** again
2. Railway will detect the repo. Before it builds, change the **Root Directory** to `/` and set the **Dockerfile Path** to `apps/backend/Dockerfile`
   - Click the service → **Settings** tab
   - **Root Directory**: leave empty (repo root)
   - **Dockerfile**: `apps/backend/Dockerfile`
3. Click **Settings** → **Networking** → **Generate Domain** — Railway gives you a public URL like `https://logist-backend-xxxx.up.railway.app`. **Copy this URL.**

---

### Step 6 — Set backend environment variables

Click the backend service → **Variables** tab → add these one by one:

| Variable | Value |
|---|---|
| `DATABASE_URL` | paste the value you copied from the Postgres service |
| `REDIS_URL` | paste the value you copied from the Redis service |
| `JWT_SECRET` | any long random string, e.g. `my_super_secret_key_change_this_32chars` |
| `JWT_EXPIRES_IN` | `8h` |
| `PORT` | `3000` |
| `FRONTEND_URL` | leave blank for now — you will fill this after Step 8 |

Click **Deploy** (or it auto-deploys after saving variables).

---

### Step 7 — Add the frontend service

1. Click **+ New** → **GitHub Repo** → select **Logist-AI** again (third time)
2. Click the new service → **Settings** tab:
   - **Dockerfile**: `apps/frontend/Dockerfile`
3. Click **Settings** → **Networking** → **Generate Domain** — copy your frontend URL, e.g. `https://logist-frontend-xxxx.up.railway.app`

---

### Step 8 — Set frontend build variables

Click the frontend service → **Variables** tab → add:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `/api` |
| `VITE_WS_URL` | the backend URL from Step 5, e.g. `https://logist-backend-xxxx.up.railway.app` |

Then go **back to the backend service** → **Variables** → set:

| Variable | Value |
|---|---|
| `FRONTEND_URL` | the frontend URL from Step 7, e.g. `https://logist-frontend-xxxx.up.railway.app` |

Save — both services will redeploy automatically.

---

### Step 9 — Seed demo data (first deploy only)

Wait for the backend to finish deploying (green status), then:

1. Click the backend service → **Settings** → **Shell** (or open the Railway CLI)
2. Run inside the container:

```bash
node -e "
const { execSync } = require('child_process');
execSync('npx ts-node --require tsconfig-paths/register prisma/seed.ts', { stdio: 'inherit' });
"
```

> If the shell is not available on your plan, you can seed by temporarily setting `DATABASE_URL` in your local `.env` to the Railway Postgres URL and running `pnpm db:seed` from your machine.

---

### Step 10 — Open the app

Go to the frontend URL from Step 7, e.g.:

```
https://logist-frontend-xxxx.up.railway.app
```

Log in with:

| Email | Password |
|---|---|
| `admin@demo.com` | `admin123` |
| `manager@demo.com` | `manager123` |
| `operator@demo.com` | `operator123` |

---

### Troubleshooting

| Problem | Solution |
|---|---|
| Backend shows "Application failed to respond" | Check the **Logs** tab — likely a missing env variable |
| Frontend shows blank page or 502 on `/api` | Make sure `VITE_WS_URL` points to the backend Railway URL (not localhost) and redeploy |
| Prisma migration error on startup | The backend runs `prisma migrate deploy` on boot — check logs for the exact error |
| CORS error in browser console | Make sure `FRONTEND_URL` on the backend exactly matches your frontend Railway URL (no trailing slash) |

---

## API Reference

### Authentication
```
POST   /auth/login         { email, password } → { accessToken, user }
GET    /me                 → { id, email, role }
```

### Dashboard
```
GET    /dashboard/summary  → KPI metrics
GET    /dashboard/trucks   → Enriched truck rows with risk badges
```

### Trips
```
GET    /trips              → List (filterable: status, terminalId, search)
GET    /trips/:id          → Trip detail with terminal events
POST   /trips              → Create trip (MANAGER/ADMIN)
POST   /trips/:id/status   → Change trip status (validates transitions)
POST   /trips/suggest-truck → { originTerminalId, plannedStartAt } → top 3 candidates
```

### Trucks
```
GET    /trucks             → List (filterable: status, terminalId)
GET    /trucks/:id         → Truck detail
```

### Terminals
```
GET    /terminals          → List all terminals
GET    /terminals/queue    → Queue view with active trips per terminal
POST   /terminals/:id/action → { tripId, action } (start_loading | finish_loading | start_unloading | finish_unloading)
```

### Alerts
```
GET    /alerts             → List unacked alerts (?all=true for all)
POST   /alerts/:id/ack     → Acknowledge an alert
```

### Drivers
```
GET    /drivers            → List all drivers
```

### WebSocket Events (socket.io)

Connect with: `io('http://localhost:3000', { auth: { token: 'Bearer <jwt>' } })`

| Event | Payload | Description |
|---|---|---|
| `truck.updated` | `{ truckId }` | A truck's status changed |
| `trip.updated` | `{ tripId }` | A trip's status changed |
| `alert.created` | `{ alertId, type, message }` | New alert created |
| `alert.updated` | `{ alertId }` | Alert acknowledged |

---

## Project Structure

```
logistics-manager/
├── apps/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # DB schema (7 models)
│   │   │   └── seed.ts            # Demo data seeder
│   │   └── src/
│   │       ├── auth/              # JWT auth + RBAC guards
│   │       ├── alerts/            # Alert CRUD + evaluator
│   │       ├── dashboard/         # Summary + truck table endpoints
│   │       ├── drivers/           # Driver list
│   │       ├── gateway/           # socket.io WebSocket gateway
│   │       ├── jobs/              # BullMQ alert-check job
│   │       ├── prisma/            # PrismaService (global)
│   │       ├── terminals/         # Terminal queue + actions
│   │       ├── trips/             # Trip CRUD + status + suggest
│   │       ├── trucks/            # Truck list + status
│   │       ├── users/             # User lookup
│   │       ├── app.module.ts
│   │       └── main.ts
│   └── frontend/
│       └── src/
│           ├── api/               # axios client + socket.io client
│           ├── components/
│           │   ├── layout/        # AppLayout, Sidebar, Topbar
│           │   └── ui/            # KpiCard, StatusBadge, RiskBadge, AlertBadge
│           ├── router/            # Vue Router (auth guard)
│           ├── stores/            # Pinia stores (auth, dashboard, trips, terminals, alerts)
│           ├── views/             # LoginView, DashboardView, TripsView, TerminalsView, AlertsView
│           └── types.ts           # TypeScript interfaces
└── packages/
    └── shared/
        └── src/index.ts           # Shared enums + WS payload types
```

---

## RBAC Permissions

| Action | ADMIN | MANAGER | TERMINAL_OPERATOR |
|---|---|---|---|
| View all data | ✅ | ✅ | ✅ |
| Create trips | ✅ | ✅ | ❌ |
| Change trip status | ✅ | ✅ | ✅ |
| Terminal actions | ✅ | ✅ | ✅ |
| Acknowledge alerts | ✅ | ✅ | ✅ |

---

## Data Model

```
User          → id, email, passwordHash, role
Driver        → id, name, phone
Truck         → id, code, status, lastTerminalId?, lat/lng
Terminal      → id, name, type (OWN|PARTNER), slaMinutes
Trip          → id, code, origin/dest terminal, truck, driver, status,
                plannedStartAt, plannedEtaAt, financials, marginComputed
TerminalEvent → id, tripId, terminalId, truckId, type, at
Alert         → id, type, severity, truck/trip/terminal refs, message,
                createdAt, acknowledgedAt?
```
