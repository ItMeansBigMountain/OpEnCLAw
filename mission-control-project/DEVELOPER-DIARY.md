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

## Next recommended work
- Make API base dynamic from the current browser host
- Add a portability manifest for moving Mission Control and assistant memory/config to a cloud machine
- Add per-project diary convention across projects under the main desktop project root
- Continue hardening event binding and render safety so missing sections cannot crash the whole app
