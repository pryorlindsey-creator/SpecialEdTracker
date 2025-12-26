# Render.com Deployment Guide - Special Education Tracker

## Overview

This guide walks you through deploying the Special Education Tracker to Render.com using GitHub integration.

## Prerequisites

- GitHub repository with latest code
- Render.com account (free tier available)
- Updated `package.json` with production scripts

---

## Step 1: Update Your Repository

Before deploying, update these files in your GitHub repository:

### 1.1 Replace `package.json` (root)
Use the updated `package.json` provided - it includes:
- `build` script that compiles both client and server
- `start` script for production
- `db:push` script for database migrations

### 1.2 Update `server/index.ts`
Change the port configuration from:
```typescript
const port = 5000;
```
To:
```typescript
const port = parseInt(process.env.PORT || "5000", 10);
```

### 1.3 Add `render.yaml` to repository root
This enables "Infrastructure as Code" deployment.

### 1.4 Update `.env.example`
Remove any hardcoded credentials.

---

## Step 2: Deploy to Render.com

### Option A: Blueprint Deployment (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub repository
4. Render auto-detects `render.yaml` and configures services
5. Click **"Apply"**

### Option B: Manual Deployment

#### Create PostgreSQL Database:
1. Click **"New"** → **"PostgreSQL"**
2. Configure:
   - Name: `specialedtracker-db`
   - Database: `specialedtracker`
   - User: `specialedtracker`
   - Region: Ohio (or your preference)
   - Plan: Free (or Starter for production)
3. Click **"Create Database"**
4. Copy the **Internal Database URL**

#### Create Web Service:
1. Click **"New"** → **"Web Service"**
2. Connect GitHub repository
3. Configure:

| Setting | Value |
|---------|-------|
| Name | `specialedtracker` |
| Region | Same as database |
| Branch | `main` |
| Runtime | Node |
| Build Command | `npm install && npm run build` |
| Start Command | `npm run start` |
| Plan | Free (or Starter) |

4. Add Environment Variables:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `5000` |
| `DATABASE_URL` | (paste Internal Database URL) |
| `SESSION_SECRET` | (click "Generate" for secure random value) |
| `ADMIN_USERNAME` | (your admin username) |
| `ADMIN_PASSWORD` | (your secure admin password) |

5. Click **"Create Web Service"**

---

## Step 3: Initialize Database

After first deployment:

1. Go to your Web Service in Render dashboard
2. Click **"Shell"** tab
3. Run:
```bash
npm run db:push
```

This creates all required database tables.

---

## Step 4: Verify Deployment

1. Click the service URL (e.g., `https://specialedtracker.onrender.com`)
2. Test login with your admin credentials
3. Verify data collection features work

---

## Troubleshooting

### Build Failures

**Error: "npm run build" failed**
- Check that `esbuild` is in `devDependencies`
- Verify `vite.config.ts` is correct

**Error: Cannot find module**
- Run `npm install` locally to verify dependencies
- Check import paths use correct extensions

### Runtime Errors

**Error: "Cannot connect to database"**
- Verify `DATABASE_URL` is set correctly
- Ensure database and web service are in same region
- Check database is running (not suspended on free tier)

**Error: "Session store error"**
- Verify `SESSION_SECRET` is set
- Run `npm run db:push` to create sessions table

### Free Tier Limitations

| Limitation | Impact | Solution |
|------------|--------|----------|
| Spin down after 15 min | ~30 sec cold start | Upgrade to Starter ($7/mo) |
| 750 hours/month | May hit limit with multiple services | Consolidate or upgrade |
| Database 1GB limit | Data cap | Upgrade to Starter DB |

---

## Production Recommendations

For a production deployment serving real users:

1. **Upgrade to Starter plan** ($7/mo) - prevents spin-down
2. **Enable auto-deploy** - automatic updates on git push
3. **Set up custom domain** - professional URL
4. **Configure health checks** - `/api/health` endpoint
5. **Enable logging** - Render provides built-in logs
6. **Set up database backups** - automatic on paid plans

---

## Quick Reference

| Task | Command/Action |
|------|----------------|
| View logs | Render Dashboard → Service → Logs |
| Run migrations | Shell → `npm run db:push` |
| Restart service | Dashboard → Manual Deploy |
| View database | Dashboard → Database → Connect |
| Update env vars | Dashboard → Service → Environment |

---

## Support

- [Render Documentation](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [PostgreSQL on Render](https://render.com/docs/databases)
