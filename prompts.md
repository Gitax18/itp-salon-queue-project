# prompts.md

Every prompt used, in order (including ones that didn't work).

1. "based on content of Salon_Queue_Management_Vibe_Coding_Guide.pdf assignment, create a plan for building this project. Initially we will build the core markdown files for AI context which are also specified in the document. Use HITL method to plan the entire flow, then we will start working on the project development."
   - Result: plan approved (Node/Express + polling, repo root = itp_last_lab, shared staff PIN).
2. (Approved plan) Draft docs/01-brief.md.
3. "Approved with the brief of the project, now create further docs."
   - Result: drafted docs/02-screens.md, docs/03-flows-rules.md, AGENTS.md.
4. "OK, go with your recommendations" (Step 1 scaffold: root package.json + Procfile for Heroku, Tailwind v4, in-memory store, Gujarati proofreading at Step 7)
   - Result: scaffolded client/ (Vite+React+Tailwind, 7 placeholder routes, EN/GU toggle) and server/ (Express /api/health). Build + health check pass.
5. "commit this and start step 2. I have checked the backend and the frontend and they are working fine."
   - Result: Step 1 committed (033d1f4); Step 2 built Home + Join Queue with dummy data (client-side only).
6. "I have connected the repository to heroku ... undefined error." / "how should i check whether both the deployed backend and frontend are connected" (questions, no code)
7. "start the step 3"
   - Result: server store/queueRules/API (join, spots, cancel, public, lookup, temporary dev routes) + client Home/Join on API + new Status screen.
8. "ok" (approved Step 4 plan: PIN gate + Reception Dashboard, waited-time on rows, NOSHOW_MINUTES for testing)
   - Result: server staff PIN/call-next/no-show/cancel/walk-in + receptionView; client StaffGate + Reception. Curl-tested rules.
9. "why haventthe salon is selecting barber for me" / "all barber is free ... it is showing queue and showing all barbers as free" (found a design gap: nothing called customers when a barber was free)
   - Decision: auto-call free barbers. Updated docs/03-flows-rules.md (rule 3a, flow, checklist) + docs/02-screens.md first, then server autoCall() in queueRules.js. Curl-tested.
10. "ok" (approved Step 5 plan: Barber View + TV, shared staff PIN, Web Audio chime, per-customer wait on TV)
   - Result: server barberStart/Done/setBreak/barberView/displayView + /api/barber/*, /api/display; removed temporary dev routes; client Barber.jsx + Display.jsx.
11. "Push the step 5 changes and start working on step 6, but before implementing anything, give me the brief of your plan..." then "Ok"
   - Step 5 pushed (b2879d9). Step 6 plan approved: off-duty rule, IST stats, edit/add (no delete) services.
   - Result: docs rules 16-18; server admin rules + /api/admin/*; client Admin.jsx; Status off-duty note; Barber off-duty handling.
12. "commit step 6, push it and give next plan brief." then "Ok" (Step 7: rules/edge cases/polish)
   - Step 6 pushed (3be6e8b). Step 7 approved: automated rules test, Gujarati table for proofreading, browser checks if available.
   - Result: injectable clock + store.reset(); server/test/rules.test.js (40 tests, all pass); CI runs tests; header link tap target and aria-label fixes; docs/gujarati-labels.md generated. No browser tool in this session, so visual checks left for the user.
