# Developer Diary

## Purpose
This file is the durable project diary for Mission Control.
Track what was attempted, what changed, what broke, what was learned, and what should happen next.

## Portability rules
- Keep project state inside this repository wherever practical
- Prefer relative paths and project-local config over machine-specific assumptions
- Treat local JSON as a portable baseline export format
- Document all required services and environment assumptions before depending on them

## 2026-04-20
- Mission Control was shifted toward a left-side navigation shell for better mobile use.
- Added Automation and GitOps tabs to make cron visibility and commit/push visibility reviewable inside Mission Control.
- Added project-local Postgres scaffolding under `app/postgres/` to keep future DB setup portable.
- Identified a likely mobile/LAN bug source: frontend API requests were hardcoded to `http://localhost:8899/mc`, which is wrong when the dashboard is opened from a phone over LAN.
- Durable portability direction: keep JSON primary, document services clearly, and only add machine-bound services behind explicit local scaffolding.
- New working preference from user: once main is in a stable state they like, adopt a branching strategy where project work branches off `main`, feature work happens on `feature/*` branches, and changes are reviewed through pull requests. Until then, stabilize directly on `main`.
- New standing instruction: document every meaningful instruction the user gives about preferred working style and process.
- Expanded Mission Control with governance-first operating surfaces: Approvals, API Inventory, and Email Ops.
- Upgraded the Office tab so it feels more alive, with a playful office floor plus a live console stream for current system activity.
- Added `mc-live-console.json` and matching backend endpoints so the live console can be persisted locally and refreshed from the server.
- Installed Playwright locally to improve future runtime inspection and smoke testing during UI work.
- Added the first repeatable Playwright smoke test plus project-local test config, and used it to catch selector ambiguity plus a state-hydration precedence problem where stale localStorage can mask newer server-seeded structures.

## Next recommended work
- Fill sparse tabs with more realistic working content so Mission Control feels operational rather than empty
- Add an approval gate section for pending high-risk or review-required actions
- Add email setup/report-delivery work into the backlog and eventual governance model
- Add a secure API inventory/billing tab with masked key display, reveal controls, and billing dashboard links
- Perform a deeper internal scan of configured APIs later so cost analysis can be grounded in the real provider footprint
- Keep hardening event binding and render safety so missing sections cannot crash the whole app
- Continue the portability path for a future cloud machine move
