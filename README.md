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

## Staging Deployment (Docker Compose)

All services (Postgres, Redis, backend, frontend/nginx) run in Docker.

### 1. Copy and fill in staging secrets

```bash
cp .env.staging.example .env.staging
# Set: POSTGRES_PASSWORD, JWT_SECRET, FRONTEND_URL (e.g. http://<server-ip>)
```

### 2. Build and start

```bash
docker compose -f docker-compose.staging.yml --env-file .env.staging up -d --build
```

### 3. Seed demo data (first deploy only)

```bash
docker compose -f docker-compose.staging.yml exec backend \
  node -e "const {PrismaClient}=require('@prisma/client'); console.log('use pnpm db:seed locally')"
```

> For the seed, run `pnpm db:seed` locally pointing at the staging DB, or exec into the container and run the seed script.

### Architecture

```
Browser → nginx:80
           ├── /api/*       → backend:3000  (strips /api prefix)
           ├── /socket.io/* → backend:3000  (WebSocket)
           └── /*           → Vue SPA
```

Prisma migrations run automatically on every container start before NestJS boots.

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
