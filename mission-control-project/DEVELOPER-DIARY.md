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
- Investigated an async-reported Playwright smoke failure around the `Context Files` tab and verified the current workspace no longer reproduces it. The tab button, panel IDs, and smoke selectors all align, and a fresh targeted smoke run passed.
- Repeatable Windows execution lesson: avoid Unix heredoc / redirection habits in PowerShell-backed shell calls during repo inspection; they create fake failures that slow down debugging.

## 2026-04-22
- Corrected a product/process mismatch after direct user feedback: the web approval queue was not how blockers were actually being resolved in practice, so it should not stay as a first-class Mission Control dependency.
- Removed the Mission Control **Approvals** tab from the shell and stopped rendering the approval-queue workflow.
- Kept the broader safety rule intact: destructive, public, install/system-change, expensive, or secret-sensitive actions still require explicit approval, but that approval should happen directly in chat/Discord instead of through a dashboard queue.
- Reframed the remaining runtime reflection from "Exec Approvals" to "Exec Policy" so the UI mirrors substrate state without pretending the operator is expected to use a web approval gate.
- Applied the same product simplification rule to Office: the Mission Control **Live Console** panel was removed after the operator called it low-value, leaving Office focused on avatars and recent activity instead of pretending the dashboard is the best place to inspect logs.

- Shipped a bounded GitOps continuity follow-up instead of another backend expansion: the GitOps working-tree card now exposes grouped file-scope sections for staged, unstaged, untracked, and external changes using the already-reflected arrays from derived state.
- Durable lesson: once reflected source data exists, prefer making that data legible in the operator UI before widening ingestion again. That keeps slices smaller and easier to validate.
- Followed that same rule again for commit continuity: the GitOps feed now separates local-only commits from pushed history using existing reflected `pushed` metadata, which gives operators a clearer bridge between current working-tree churn and unshipped commit state.
- Added a small but higher-signal remote cue pass: GitOps now reflects the upstream tracking branch plus remote host and turns raw ahead/behind counts into a clearer **Remote risk** summary so operators can tell whether the branch is aligned, locally ahead, or behind tracked remote history.
- Followed with a bounded repo-scope pass instead of jumping to full multi-repo management: GitOps now reflects worktree metadata so the operator can see the current repo scope/path context and how many worktrees are present before any larger repo-selection slice is attempted.
- Added one more lightweight comparison cue on top of that reflected worktree data: GitOps now shows a worktree-detail line with branch/path entries so operators can see the current worktree set before any future multi-repo or repo-selection work.
- Tightened that scope cue further with an explicit current-worktree marker so the operator can tell which reflected worktree the page is actually summarizing before any future selection UI exists.
- Added a lightweight readiness cue on top: GitOps now distinguishes a single-worktree scope from additional reflected worktrees, which should help decide whether future repo/worktree selection controls are worth shipping.
- Tightened that worktree-awareness path one step further: the worktree detail preview now admits when more reflected worktrees exist beyond the visible five-item preview instead of silently truncating them.
- Added one more low-risk coverage cue on top: GitOps now states how many reflected worktrees are currently shown versus total, so operators do not have to infer preview scope from the detail row alone.
- Followed with a small summary-consistency pass: the same visible-versus-total worktree preview count now appears as a GitOps micro-card, so the cue is readable at a glance before the operator scans the supporting copy.
- Added one more glanceability cue in the same reflected path: GitOps now surfaces the current worktree path basename as its own micro-card, so branch and path scope can be scanned separately.
- Followed with a matching repository-identity cue: GitOps now surfaces the repo root basename as its own micro-card so operators can distinguish repo scope from current worktree scope at a glance.
- Added one more relation cue on top of that same reflected data: GitOps now states whether the current scope is the repo root itself or a linked worktree, which should make future multi-repo or selector decisions easier to judge.
- Followed with a small readability pass: GitOps now also explains that repo/worktree relationship in a plain sentence so operators do not have to infer it from micro-cards alone.
- Added one more low-risk scanability improvement on top of the same reflected data: when worktree detail is previewed, the current worktree is now moved to the front of that preview instead of relying on source order alone.
- Added another bounded readability cue on the same preview: the worktree-detail line now states its shown/total coverage directly, so preview scope is visible in-place instead of only in separate summary copy.
- Added one more tiny follow-up on the same reflected data: when the preview is already complete, the worktree-detail line now says that all reflected worktrees are shown instead of leaving completeness implicit.
- Added a similarly small reassurance cue on the same line: when the visible preview includes the active reflected scope, GitOps now says so directly instead of making operators infer it from ordering and markers alone.
- Followed with one slightly more glanceable cue on the same reflected worktree data: the summary grid now exposes how many reflected worktrees are hidden beyond the preview, instead of leaving truncation awareness only in the detail line.
- Added one more micro-summary on that same reflected preview state: GitOps now labels the preview as `Complete` or `Truncated`, so operators can classify the preview state at a glance without reading counts first.
- Added a matching inclusion cue to the summary grid: GitOps now says whether the current reflected worktree is inside the visible preview, so that reassurance is glanceable instead of detail-only.
- Added one more ordering cue on the same reflected preview state: GitOps now labels whether the preview is `Current-first` or still in reflected source order, so operators can interpret the visible list more quickly.
- Added one more concrete placement cue on the same preview: GitOps now states the current reflected worktree's visible position like `1/3`, so operators can tell where the active scope sits in the preview without scanning the detail line.
- Closed the negative-case gap in the worktree detail line: when a current scope exists but the preview does not include it, GitOps now says `current reflected worktree not shown` instead of making operators infer omission from the absence of the positive cue.
- Tightened the positive-case detail cue too: when the current reflected worktree is visible, the detail line now says `current reflected worktree included at X/Y`, so operators can read inclusion and placement in one place without cross-checking the summary grid.

## Next recommended work
- Add OpenClaw gateway reflection panels for runtime health, plugins/channels, control surfaces, and security warnings
- Fill sparse tabs with more realistic working content so Mission Control feels operational rather than empty
- Add email setup/report-delivery work into the backlog and eventual governance model
- Add a secure API inventory/billing tab with masked key display, reveal controls, and billing dashboard links
- Perform a deeper internal scan of configured APIs later so cost analysis can be grounded in the real provider footprint
- Keep hardening event binding and render safety so missing sections cannot crash the whole app
- Continue the portability path for a future cloud machine move
