# Project Boot Instructions

This repository is a template for building OpenClaw-driven orchestration projects.

## Mission

Build AI orchestration and feedback-loop systems that:

- run locally through OpenClaw
- are operable through Discord
- turn user goals into repeatable multi-agent workflows
- keep a human operator in control

## Default Operating Model

When starting a new project in this repo:

1. Read `README.md` and the current project files first.
2. Treat Discord as the operator interface, not as the source of truth for secrets or long-term state.
3. Keep secrets in environment variables or external machine config, never in repo files.
4. Prefer a simple agent loop:
   intake -> planning -> execution -> review -> summary -> next action
5. Design for explicit feedback loops:
   worker output -> critic/reviewer -> revision -> operator update
6. Keep one clear coordinator responsible for task routing and progress reporting.
7. Make outputs inspectable:
   plans, logs, prompts, artifacts, and status files should be readable in the repo.

## Build Priorities

- Start with the smallest working orchestration loop.
- Favor reliability and observability over novelty.
- Keep the Discord surface area narrow and locked down.
- Default to one allowed server, one allowed operator, and one allowed channel unless the user expands scope.
- Use repo-local scripts and docs so the project is reproducible after cloning.

## OpenClaw Vocab

- gateway: the local OpenClaw runtime and control surface that exposes the Web UI and websocket endpoint
- control UI: the local web dashboard used to inspect and control the gateway
- channel: an external messaging integration such as Discord
- guild: a Discord server
- allowlist: the explicit set of users, guilds, or channels allowed to interact with the bot
- groupPolicy: the rule that controls whether group chats are disabled, open, or allowlisted
- SecretRef: a config reference to a secret stored outside the repo, usually from an environment variable
- workspace: the agent's working directory for files, outputs, and project artifacts
- session: the conversation/runtime state OpenClaw keeps for an agent interaction
- hook: an automation that runs on internal events such as startup or command handling
- plugin: an installed OpenClaw integration or capability provider
- skill: an extra capability package that may require external tools or API keys
- onboard: the guided OpenClaw setup flow
- doctor: the diagnostic command for config, runtime, dependencies, and repair suggestions
- security audit: the command that checks for unsafe or weak configuration
- probe: a connectivity check against the running gateway or configured channel
- orchestration loop: the project pattern where planner, worker, reviewer, and operator feedback drive repeated progress

## Expected Deliverables For New Projects

- a short project overview in `README.md`
- a concrete run flow with commands
- a clear folder structure
- agent roles and responsibilities
- feedback-loop logic
- safety constraints
- verification steps

## Safety Rules

- Do not weaken Discord allowlists unless the user explicitly asks.
- Do not commit secrets, tokens, or copied local config with real credentials.
- Do not assume external services are available; verify from local project context first.
- Keep dangerous automation explicit and reviewable.
- do not delete anything without confirmation after thoughrough documentation and rollback steps 
