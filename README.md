# Salon Queue Management System

**Live demo:** https://itp-salon-queue-project.vercel.app
**Backend health check:** https://itp-salon-b7d7a9417e5b.herokuapp.com/api/health
**Hosted on:** Vercel (frontend) + Heroku (backend)
**Staff test PIN (reception / barber / owner screens):** `2468`

A queue app for a hair salon. Customers join from their phone, see their place and estimated wait, and get called automatically; the receptionist, barbers and owner run the salon from their own screens; a TV in the waiting area shows who is next. Everything is bilingual (English / ગુજરાતી) and stays in sync across devices within a few seconds.

> Built for the MSc IT vibe-coding lab: the product was specified in short documents first (`docs/`, `AGENTS.md`), then built step by step with an AI coding agent. See [How it was built](#how-it-was-built-phase-by-phase).

## Quick tour

| Screen | URL | Who | PIN |
|---|---|---|---|
| Home | `/` | Customer | no |
| Join queue | `/join` | Customer | no |
| My status | `/status/S-1` | Customer (opened automatically after joining) | no |
| Reception dashboard | `/reception` | Receptionist (tablet) | yes |
| Barber view | `/barber/ravi`, `/barber/amit`, `/barber/imran` | Barber (phone) | yes |
| Waiting-area TV | `/display` | Waiting area | no |
| Owner settings | `/admin` | Owner | yes |

To see the whole flow in one minute, open `/display`, `/reception` and `/barber/ravi` in separate windows, then join from `/join` on your phone.

## User flow

**Customer**
1. Opens the site and sees the live queue (people waiting, estimated wait, which barbers are free, busy or on break).
2. Taps **Join Queue**, enters name and a 10-digit phone number, picks up to 3 services and a barber (or "Any barber"). A running summary shows total time, price and expected wait.
3. Gets a token (for example **S-14**) and a live status page: position in line, wait countdown, and a "Start coming to the salon" alert when 2nd in line.
4. When a barber is free, the customer is **called automatically**. The phone shows a full-screen gold **"It's your turn! Go to Ravi"** and vibrates; the TV flashes the token with a chime.
5. The barber taps **Start**, then **Done**. The customer can cancel at any time before that.

**Receptionist** adds walk-ins, sees every barber and the waiting list (rows waiting over 60 minutes turn amber), can call the next customer manually, and marks no-shows (10 minutes after a customer is called) or cancels.

**Barber** sees the current customer and a timer, taps **Start** / **Done**, sees who is next, and can go on break (not while a customer is in the chair).

**Owner** opens or closes online joining, adds / edits / turns services on or off, sets which barbers are on duty, and reads today's stats (served, average wait, no-shows).

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, Tailwind CSS v4, React Router 7 |
| Backend | Node.js, Express 5, `cors` |
| Storage | In-memory store (resets when the server restarts) |
| Live updates | Client polling every 3 seconds (no websockets) |
| Language | Own EN / GU dictionary with a `useT()` hook; choice remembered in the browser |
| Tests | Node's built-in test runner (`node:test`), 40 tests on the queue rules |
| CI/CD | GitHub Actions: build, test, smoke-test, then deploy |
| Hosting | Vercel (frontend), Heroku (backend) |

## Features

- **Join from a phone** with validation (10-digit phone, 2+ character name, max 3 services) and a live total of time, price and expected wait.
- **One active spot per phone number.** Joining twice returns the existing spot; "I already joined" finds it by phone.
- **Live status** with position, wait ring, "Start coming" alert, full-screen "It's your turn" with vibration, and cancel with confirmation.
- **Auto-call.** As soon as a barber is free, the earliest eligible customer is called. Customers who chose a barber are never given another one; "Any" takes the first free barber. Reception can still call manually.
- **Fair waiting-time estimate**: minutes ahead divided by the barbers who can serve you, rounded up to 5 minutes, falling as customers finish.
- **No-show and cancel rules**: a no-show who comes back rejoins at the end with a new token.
- **Barber breaks and off-duty**: nobody is called to a barber on break; their customers see "Ravi is on break".
- **Online joining cutoff** 30 minutes before closing (8:30 PM IST) or when the owner closes the queue; walk-ins are always allowed.
- **Waiting-area TV** with large text, next 5 tokens, and a flash + chime for newly called tokens. It shows tokens only, never names or phone numbers.
- **Owner controls** for services (EN + GU names, minutes, price, on/off), barbers on duty and today's stats.
- **Staff PIN** protects reception, barber and owner screens and their API calls.
- **English / Gujarati** on every screen, mobile-first with 44px tap targets.

The full rules are written in plain English in [`docs/03-flows-rules.md`](docs/03-flows-rules.md) and are enforced in one server module, `server/queueRules.js`.

## Installation

**Prerequisites:** Node.js 20 or newer and npm.

```bash
git clone git@github.com:Gitax18/itp-salon-queue-project.git
cd itp-salon-queue-project
```

**1. Backend** (terminal 1)
```bash
cd server
npm install
npm run dev          # http://localhost:4000/api/health
```

**2. Frontend** (terminal 2)
```bash
cd client
npm install
npm run dev          # http://localhost:5173
```
In development the Vite dev server proxies `/api` to `localhost:4000`, so no `.env` is needed. To point the client at another API, copy `client/.env.example` to `client/.env` and set `VITE_API_URL`.

**3. Run the tests**
```bash
cd server && npm test
```

**Tip for trying it outside salon hours:** online joining closes at 8:30 PM IST. Start the server with `IGNORE_HOURS=1 npm run dev` to keep Join open, and `NOSHOW_MINUTES=0 npm run dev` to be able to mark a no-show immediately.

### Environment variables

| Where | Variable | Purpose | Default |
|---|---|---|---|
| Client | `VITE_API_URL` | Base URL of the API (set on Vercel to the Heroku URL) | same origin / dev proxy |
| Server | `PORT` | Port (Heroku sets it) | `4000` |
| Server | `CORS_ORIGIN` | Frontend origin allowed to call the API (set on Heroku to the Vercel URL, no trailing slash) | any origin |
| Server | `STAFF_PIN` | PIN for staff screens | `2468` |
| Server | `NOSHOW_MINUTES` | Minutes after calling before no-show is allowed | `10` |
| Server | `IGNORE_HOURS` | `1` skips the 8:30 PM IST cutoff (testing/demos) | off |

### Deployment and CI/CD

`.github/workflows/ci-cd.yml` runs on every push and pull request: it builds the client, runs the server tests and smoke-tests `/api/health`. Pushes to `main` then deploy the backend to Heroku (root `package.json` + `Procfile` start the `server/` folder) and the frontend to Vercel (project root directory `client`, with `vercel.json` rewriting every route to `index.html` so refreshing `/reception` works).

Repository secrets: `HEROKU_API_KEY`, `HEROKU_APP_NAME`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

## How it was built (phase by phase)

The project followed a **human-in-the-loop** method: the agent proposed a plan for each phase, I approved or changed it, the agent built it, tested it, and I reviewed and committed it. Documents were always updated *before* code, and every prompt is logged in [`prompts.md`](prompts.md).

| Phase | What was done |
|---|---|
| **0. Context documents** | Wrote the four documents the agent reads first: `docs/01-brief.md` (scope and "don't build" list), `docs/02-screens.md` (every screen), `docs/03-flows-rules.md` (flows, queue rules, test checklist) and `AGENTS.md` (stack and working rules). First commit contained only these. |
| **1. Scaffold** | React + Vite + Tailwind client, Express server, charcoal-and-gold theme, EN/GU dictionary and toggle, placeholder pages for every route, Heroku/Vercel config. |
| **CI/CD** | GitHub Actions pipeline and live deployment set up early, so every later push was already deployed. |
| **2. Home + Join** | Home page and the Join form with validation, the 3-service limit and a live summary, using dummy data. |
| **3. Server rules + My Status** | Real server: tokens, join rules, one spot per phone, waiting-time estimate, cancel. Home and Join moved to the API; new My Status screen with position, countdown and the "It's your turn" state. |
| **4. Staff PIN + Reception** | PIN gate, reception dashboard, walk-ins, call next, no-show and cancel. Testing exposed a design gap (a free barber did nobody any good until reception pressed a button), so the rules doc was changed first and **auto-call** was added. |
| **5. Barber view + TV** | Start / Done / break for barbers (with the break-blocking rule), and the waiting-area display with flash and chime. Temporary dev routes removed. |
| **6. Owner settings** | Queue open/closed switch, service add/edit/on-off, barbers on duty, and daily stats, after documenting the new rules. |
| **7. Rules, edge cases, polish** | Injectable clock and a 40-test suite for the queue rules (cutoff, no-show timing, wait estimates, off-duty, stats), tap-target and translation audits, a Gujarati review table, tests added to CI. |
| **8. Deploy and docs** | Verified the live frontend and backend, diagnosed a CORS mismatch between the Vercel URL and Heroku's `CORS_ORIGIN`, and wrote this README. |

### Project structure

```
├── AGENTS.md              instructions for the AI agent
├── docs/                  brief, screens, flows & rules, Gujarati label review
├── prompts.md             every prompt used, in order
├── client/                React + Vite + Tailwind app
│   └── src/ pages/ components/ i18n/ api.js usePolling.js
├── server/                Express API
│   ├── queueRules.js      ALL queue rules (one place)
│   ├── store.js           in-memory data
│   ├── index.js           routes
│   └── test/              rules tests
├── Procfile, package.json Heroku entry (starts server/)
└── .github/workflows/     CI/CD
```

## Known limitations

- Data is stored in memory, so it resets whenever the Heroku dyno restarts (tokens and stats start over).
- The staff PIN is one shared value, not per-user accounts.
- Not built, by design: online payment, future appointments, SMS/WhatsApp notifications, loyalty offers, multiple branches (see `docs/01-brief.md`).
