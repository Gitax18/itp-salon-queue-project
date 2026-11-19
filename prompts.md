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
