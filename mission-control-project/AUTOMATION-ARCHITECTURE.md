# Mission Control Automation Architecture

## Product definition
Mission Control is the mandatory operational mirror for interacting with the assistant.
It should reflect real assistant state automatically, not depend on manual dashboard grooming.

## Required reflected domains
- Conversations
- Future work / tracked intended work
- Git commits and repo state
- Workspace memory and control docs
- Assistant configuration and auth metadata
- Direct operator blockers / risky pending actions (handled in chat/Discord, not a web approval queue)
- Sent email log

## Reflection model
1. Real sources exist elsewhere:
   - OpenClaw session transcripts
   - workspace markdown files
   - `.openclaw/openclaw.json`
   - git repository state
   - later: email send logs
   - direct operator chat/Discord decisions for risky actions when needed
2. Mission Control builds or refreshes derived machine-readable artifacts in-project.
3. The UI reads those derived artifacts and server endpoints.
4. Automation refreshes them regularly and on interaction.

## Derived artifact direction
Primary derived file:
- `app/mc-derived-state.json`

Suggested producers:
- transcript ingester
- workspace memory/doc ingester
- config metadata ingester
- git audit ingester
- future-work aggregator from tasks/worklog
- later: sent-email ingester

## Operating rule
When the assistant changes meaningful state, Mission Control should be refreshed as part of the same operational loop whenever practical.

## Near-term implementation goals
- Move reflection-backed data into `mc-derived-state.json`
- Refresh derived state from real sources through the local server
- Reduce or eliminate seeded/demo data
- Keep Mission Control project-local and portable so the framework can later move into `openclaw-config`
