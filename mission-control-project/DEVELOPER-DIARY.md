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
- Fixed the hydration merge so richer server-seeded arrays can win over stale local browser snapshots when appropriate, which keeps new operating surfaces from disappearing after deployment.
- Added a safe API inventory discovery path that scans environment metadata only, masks detected secrets, and avoids dumping raw credentials into the UI.
- Shifted Mission Control toward a reflection architecture: workspace memory/docs now come from real markdown files, conversations come from the live OpenClaw session transcript, and API inventory can also reflect config-backed metadata from `.openclaw/openclaw.json`.
- Added the first derived-state automation spine with `app/mc-derived-state.json` plus a refresh script so Mission Control can become a mandatory operational mirror instead of a manually groomed dashboard.
- Investigated the existing OpenClaw gateway and confirmed the local control plane already exposes useful operational signals Mission Control should mirror: service status, startup/restart lifecycle, canvas mount, MCP loopback port, heartbeat/health-monitor lifecycle, browser control listener, plugin readiness, Discord channel resolution, and security warnings.
- Confirmed a key architectural nuance: some gateway data is available through local CLI/status/log surfaces immediately, while deeper gateway RPC paths can require pairing. Mission Control should support both a safe reflection mode and a later gated control mode.
- Confirmed the current config/security warning `gateway.controlUi.allowInsecureAuth=true` should become a visible audit/approval item in Mission Control rather than living only in logs.
- Began triaging user-requested skills from the local skills catalog. Promising fits include `gog` (Google Workspace), `himalaya` (email), `gemini`, and `mcporter`; they should be installed intentionally around actual workflows instead of as a giant blind bundle.
- Closed the Discord reaction detour and turned the useful part of that work into Mission Control product progress: the derived state now includes a gateway/runtime reflection block, and the Assistant Audit tab now exposes a dedicated Gateway Mirror card instead of hiding that reflection only in JSON.
- Revalidated the Mission Control app after the latest UI pass with the Playwright smoke test, which still passed. That keeps the project moving without pretending the rest of the dashboard is finished.
- Extended the `.openclaw` reflection from a backend-only footprint into a visible operator surface. Mission Control now shows a dedicated OpenClaw Mirror card with runtime directory counts, config artifact visibility, notable root files, and a sample of session files. That feels much closer to the product direction: the dashboard is becoming a real operational mirror instead of a themed shell around JSON.
- Hard correction after user feedback: Mission Control had too many first-class tabs and some of them were low-value or half-working. Consolidated the shell by removing `Revenue`, `Meetings`, `Automation`, `Notes`, `YouTube`, `Verbose`, and `Intel` from navigation, then collapsed action history, execution trace, and live console updates into one `Logs` tab.
- Durable product lesson: do not promote speculative or weakly wired surfaces into top-level navigation. If a section is not real, reliable, and useful, it should stay out of the primary shell.
- Replaced the hardcoded task-board scaffolding with a reflected board pipeline. Tasks, priorities, and the compact check-in now derive from `WORKLOG.md` structure instead of hand-maintained agile task arrays, and stale local browser task state no longer overrides the derived server truth.
- Finished the tab-consolidation follow-through properly: removed the hidden dead panels for the sections that were cut from navigation, simplified the top-level render path, and fixed the startup/hydration bug where removed form resets were breaking reflected check-in loading.
- Responded to direct product feedback with a tighter operator shell: Tasks is now supposed to be just kanban, so Stats was split out as its own tab and the old mixed dashboard content was moved there.
- Corrected an important trust problem in the Agents view: the real role agents were already configured in `.openclaw/openclaw.json`, but Mission Control was still showing placeholder personalities. Derived state now reflects the actual configured roster so the UI matches reality.
- Corrected the empty Projects tab by deriving visible projects from the workspace project registry and attaching reflected task counts for Mission Control work.
- Added a notification badge plus realtime approve/deny controls to Approvals so review is an active operating surface rather than a passive list.
- Pulled project markdown like `WORKLOG.md`, `DEVELOPER-DIARY.md`, `SPEC-AUDIT.md`, and the numbered spec files into the reflected docs pipeline, then updated workspace guidance so project-local truth stays connected to assistant continuity.
- The smoke test had to be updated after Stats moved out of Tasks; after that adjustment, validation passed again.
- Did the overdue cleanup pass on the frontend shell itself: removed the leftover revenue/YouTube/meetings/intel/notes/automation code that was still hanging around in `mission-control.html` after those surfaces were removed from navigation.
- Useful catch during cleanup: tab switching looked broken in smoke not because the tabs were conceptually wrong, but because an orphaned `updateMeetingCountdowns` call was still throwing at startup and stopping the event wiring from behaving normally. Fixed that and revalidated.
- Deleted the lingering assistant temp residue `tmp_find_choose.py` so the project folder is a little less noisy and more presentable.
- Pushed the `.openclaw` reflection past the old footprint summary card. Mission Control now derives and shows real runtime panels for configured-vs-runtime agents, runtime stores (`tasks`, `flows`, `logs`, `media`), exec approvals, and config health/audit.
- Important safety detail: the new reflection path stays masked. The exec-approval token is masked, and config-audit command summaries are sanitized so raw secret-bearing arguments do not get dumped into the UI.
- Put the new runtime panels in the visible **Agents** area instead of creating more navigation sprawl. That keeps the shell small while making the substrate much more inspectable.

## Next recommended work
- Add OpenClaw gateway reflection panels for runtime health, plugins/channels, control surfaces, and security warnings
- Fill sparse tabs with more realistic working content so Mission Control feels operational rather than empty
- Add an approval gate section for pending high-risk or review-required actions
- Add email setup/report-delivery work into the backlog and eventual governance model
- Add a secure API inventory/billing tab with masked key display, reveal controls, and billing dashboard links
- Perform a deeper internal scan of configured APIs later so cost analysis can be grounded in the real provider footprint
- Keep hardening event binding and render safety so missing sections cannot crash the whole app
- Continue the portability path for a future cloud machine move
