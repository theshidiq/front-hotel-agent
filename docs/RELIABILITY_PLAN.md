# Reliability & Operability Plan

## Background

The hotel allergen management system is currently running as a single-server deployment with no automated recovery, monitoring, or alerting. Management has raised concerns about:

1. **What happens if the app crashes?**
2. **How do we ensure staff can use it without technical support?**

This plan addresses both reliability (keeping the system running) and usability (making sure staff can operate it confidently).

---

## Phase 1: Crash Recovery & Auto-Restart (Day 1)

**Goal**: App recovers automatically from crashes without manual intervention.

### Option A: PM2 (Recommended for single-server setup)

- Install PM2 process manager on the production server
- Configure PM2 to:
  - Auto-restart NestJS backend on crash (max 10 restarts in 1 minute before stopping)
  - Auto-restart SvelteKit frontend if serving via Node
  - Start both services on server boot (`pm2 startup`)
  - Save process list (`pm2 save`)
- Add `ecosystem.config.js` to the repo:
  ```js
  module.exports = {
    apps: [
      {
        name: 'hotel-api',
        cwd: './apps/api',
        script: 'dist/main.js',
        instances: 1,
        autorestart: true,
        max_restarts: 10,
        min_uptime: '10s',
        max_memory_restart: '512M',
        env_production: {
          NODE_ENV: 'production',
        },
      },
      {
        name: 'hotel-web',
        cwd: './apps/web',
        script: 'build/index.js',
        instances: 1,
        autorestart: true,
        max_memory_restart: '256M',
      },
    ],
  };
  ```
- **Recovery time**: ~3-5 seconds (automatic)
- **Cost**: $0

### Option B: Docker + Docker Compose (Recommended for multi-server/cloud)

- Containerize both frontend and backend
- Add `docker-compose.yml` with:
  - `restart: always` policy on all services
  - Health check endpoints
  - Log rotation
- Benefits: consistent environment, easy to move between servers, easy to scale
- **Cost**: $0 (just engineering time)

### Deliverables

- [ ] PM2 ecosystem config or Docker Compose setup
- [ ] Auto-start on server reboot
- [ ] Crash recovery tested and verified

---

## Phase 2: Monitoring & Alerting (Day 1-2)

**Goal**: Team is notified of issues before guests or staff notice.

### 2a. Uptime Monitoring

- Set up **UptimeRobot** (free tier: 50 monitors, 5-min intervals)
  - Monitor: `GET /` health check endpoint (backend)
  - Monitor: Frontend URL (HTTP 200 check)
  - Alert via: Email + Slack/LINE (configurable)
- **Cost**: $0 (free tier)

### 2b. Error Tracking (Sentry)

- Integrate **Sentry** into the NestJS backend
  - Captures unhandled exceptions automatically
  - Provides stack traces, request context, user info
  - Alerts on new/recurring errors via email or Slack
- Integration steps:
  1. Install `@sentry/nestjs`
  2. Initialize in `main.ts` with DSN
  3. Add global exception filter for Sentry reporting
  4. Configure alert rules (e.g., notify on first occurrence of new error)
- **Cost**: $0 (free tier: 5K errors/month — more than enough)

### 2c. Structured Logging

- Add **Winston** or **Pino** logger to NestJS (replace default console logger)
- Log to file with rotation (e.g., 7-day retention, max 50MB per file)
- Log levels: error, warn, info (production), debug (development)
- Key events to log:
  - API request/response (method, path, status, duration)
  - OCR scan requests and results
  - Database errors
  - Authentication failures (when RBAC is added)

### Deliverables

- [ ] UptimeRobot configured with alerts
- [ ] Sentry integrated into backend
- [ ] Structured logging with file rotation

---

## Phase 3: Database Safety (Day 2)

**Goal**: Data is never lost, even in worst-case scenarios.

### Current State (Already in Place)

- Supabase provides **automatic daily backups** (Pro plan: point-in-time recovery)
- Database is hosted separately from the application server — server crash does NOT affect data

### Improvements

- Enable **Point-in-Time Recovery (PITR)** on Supabase if on Pro plan
  - Allows restoring to any second in the last 7 days
- Add a **manual backup script** that runs weekly:
  - Export critical tables (allergens, products, menus) to JSON
  - Store in a separate location (S3 bucket or local backup)
- Document the **restore procedure** so any team member can follow it

### Deliverables

- [ ] Verify Supabase backup settings
- [ ] Weekly backup script (optional, extra safety)
- [ ] Disaster recovery runbook (1-page document)

---

## Phase 4: Deployment Process (Day 2-3)

**Goal**: Deploy updates safely without breaking production.

### Basic CI/CD Pipeline (GitHub Actions)

```yaml
# On push to main:
1. Run linting (pnpm lint)
2. Run tests (pnpm test)
3. Build both apps (pnpm build)
4. Deploy to server (SSH + PM2 reload / Docker pull)
```

### Zero-Downtime Deploys

- With PM2: `pm2 reload hotel-api` (graceful reload)
- With Docker: `docker compose up -d --build` (rolling restart)

### Staging Environment

- Set up a separate staging server (or use a different port on same server)
- All changes tested on staging before going to production
- **Cost**: $5-20/month (small VPS) or $0 (same server, different port)

### Deliverables

- [ ] GitHub Actions workflow for build + lint + test
- [ ] Deploy script (PM2 reload or Docker-based)
- [ ] Staging environment (optional but recommended)

---

## Phase 5: Usability & Training (Day 3-4)

**Goal**: Staff can use the system confidently without developer support.

### 5a. User Guide

- Create a simple visual guide (PDF or Notion) covering:
  - How to scan a product label
  - How to add/edit products manually
  - How to create and manage menus
  - How to check allergens for a menu item
  - What to do if something goes wrong (who to contact)
- Include screenshots for each step
- Print a laminated quick-reference card for the front desk

### 5b. In-App Help (Optional Enhancement)

- Add tooltip icons (?) next to key actions
- Add a first-time onboarding overlay (3-4 steps)
- Show confirmation dialogs for destructive actions (delete product, etc.)

### 5c. Training Session

- 30-minute walkthrough with front desk and kitchen staff
- Hands-on practice with test data
- Record the session for future new hires

### Deliverables

- [ ] User guide document with screenshots
- [ ] Quick-reference card (printable)
- [ ] Training session conducted
- [ ] In-app tooltips (optional)

---

## Summary

| Phase | What | Time | Cost |
|-------|------|------|------|
| 1. Crash Recovery | PM2 or Docker auto-restart | 0.5 day | $0 |
| 2. Monitoring | UptimeRobot + Sentry + logging | 0.5-1 day | $0 |
| 3. Database Safety | Verify backups, add restore docs | 0.5 day | $0 |
| 4. Deployment | CI/CD pipeline + staging | 1 day | $0-20/mo |
| 5. Usability | User guide + training | 1 day | $0 |
| **Total** | | **3-4 days** | **$0-20/mo** |

## Outcome

After implementation:

- **App self-heals** from crashes in <5 seconds
- **Team is alerted** of issues before guests notice
- **Zero data loss** guaranteed (Supabase backups + separate hosting)
- **Safe deployments** with CI/CD and optional staging
- **Staff trained** with documentation and hands-on session
- **99.9%+ effective uptime** for the allergen management system
