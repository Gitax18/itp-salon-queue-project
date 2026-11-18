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
