# AGENTS.md — Salon Queue Management

Queue app for a salon: customers join from their phone, see their wait time and get called; reception and barbers manage the queue; a TV shows who is next.

## Read first
- docs/01-brief.md        -> features + what NOT to build
- docs/02-screens.md      -> every screen's layout and behaviour
- docs/03-flows-rules.md  -> flows, queue rules, test checklist

## Stack
- client/: React + Vite + Tailwind CSS. Run with `npm run dev` inside client/.
- server/: Node + Express, in-memory store, JSON API. Run with `npm run dev` inside server/.
- Sync: client polls the server every 3 seconds. No websockets.
- Hosting: Vercel (client) + Heroku (server; needs a `Procfile` and `PORT` from env). No hard-coded localhost URLs; API base URL comes from an env var (`VITE_API_URL`).
- README.md: live link must be the first line after the title, with the staff test PIN right below.

## How to work
- One screen or one feature per task. Don't touch other screens.
- For big steps, show your plan and the files you'll create, then wait for my OK.
- Theme: charcoal (#1F2937) + gold (#D4A017), rounded cards, mobile-first.
- All labels via the EN/GU language file; no hard-coded text.
- Queue rules (call next, wait estimate, status moves) live in ONE server module; reuse it everywhere.
- Staff screens and staff API actions require the PIN (2468 for the lab).
- Never add features from the "Don't build" list.
- If code and docs disagree, tell me; docs are updated first, then code.
- After each task: list changed files and how to test the change. Don't commit unless I ask.
