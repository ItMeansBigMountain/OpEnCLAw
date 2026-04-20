# Portability Guide

## Goal
Make Mission Control and related assistant/project state easy to move to another machine, including a future cloud machine.

## Portable assets already in repo
- `app/mission-control.html`
- `app/server.js`
- `app/mc-data.json`
- `app/mc-activity.json`
- `app/mc-cron-sample.json`
- `app/postgres/`
- `SPEC-AUDIT.md`
- `WORKLOG.md`
- `DEVELOPER-DIARY.md`

## Machine-specific assets not yet fully portable
- live OpenClaw installation and auth state
- workspace memory outside this repo
- any external API keys
- any local service installs like Docker/Postgres

## Migration checklist
1. Clone repo onto target machine
2. Install Node.js
3. Run `node app/server.js`
4. Verify Mission Control loads
5. Copy any approved workspace memory files if desired
6. Reconfigure secrets via environment variables or machine-local config, not committed files
7. If needed, start project-local Postgres from `app/postgres/`

## Preferred future direction
- Keep app data exportable as JSON snapshots
- Keep service definitions in-repo
- Keep secrets out of repo
- Add an explicit bootstrap script later for faster cloud migration
