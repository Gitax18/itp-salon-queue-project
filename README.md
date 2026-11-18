# Salon Queue Management System

**Live demo:** _(add URL after first deploy)_
**Hosted on:** Vercel (frontend) + Heroku (backend)
**Staff test PIN (reception / barber / admin):** 2468

## About
Queue app for a salon: customers join from their phone, see their wait time and get called; reception and barbers manage the queue; a TV shows who is next. See `docs/` for the full spec.

## Run locally
```
# terminal 1
cd server && npm install && npm run dev      # http://localhost:4000/api/health

# terminal 2
cd client && cp .env.example .env && npm install && npm run dev
```

## CI/CD
GitHub Actions (`.github/workflows/ci-cd.yml`): every push/PR builds the client and smoke-tests the server. Pushes to `main` then deploy the backend to Heroku and the frontend to Vercel (each deploy step is skipped if its secrets are missing).

Repo secrets to add (Settings > Secrets and variables > Actions):
- `HEROKU_API_KEY`, `HEROKU_APP_NAME`
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

One-time setup:
- Vercel project: set Root Directory to `client`, and env var `VITE_API_URL` to the Heroku app URL.
- Heroku app: set config var `CORS_ORIGIN` to the Vercel URL.
