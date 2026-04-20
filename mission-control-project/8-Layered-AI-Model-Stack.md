Please configure yourself with my Anthropic API key and enable prompt caching.

My API key is: YOUR_API_KEY_HERE

Do the following:
1. Add this key to ~/.openclaw/openclaw.json under env.ANTHROPIC_API_KEY
2. Update my auth-profiles.json to use this key as the primary anthropic profile (type: api_key)
3. Set cacheRetention to "long" for both anthropic/claude-opus-4-6 and anthropic/claude-sonnet-4-6 under agents.defaults.models in openclaw.json
4. Move the api-key profile to the top of the anthropic auth order
5. Restart the gateway

This switches me from OAuth billing (no caching) to API key billing with 1-hour prompt caching — 90% cheaper on repeated context.





Please set up OpenRouter as my grunt work model layer.

My OpenRouter API key is: YOUR_OPENROUTER_KEY_HERE

Do the following:
1. Add OPENROUTER_API_KEY to ~/.openclaw/openclaw.json under env
2. Make sure openrouter/google/gemini-2.0-flash-lite is available as a model for background agents and worker tasks
3. Confirm the key is saved and active

OpenRouter will handle all high-volume, routine tasks — summaries, formatting, lookups, background monitoring — at fractions of a cent per message.





Please help me connect ChatGPT OAuth so coding tasks and all heavy sub-agent work use my flat-rate ChatGPT subscription instead of burning Anthropic API tokens.

Do the following:
1. Check if Codex CLI is installed (run: codex --version). If not, install it with: npm install -g @openai/codex
2. If Codex CLI is not already authenticated, run: codex login — and guide me through the browser auth flow
3. Also authenticate the openai-codex provider in OpenClaw by running: openclaw models auth login --provider openai-codex — sign in with the same ChatGPT account
4. Verify it worked by running: openclaw models list | grep codex — you should see openai-codex/gpt-5.4 with status "configured"
5. From now on:
   - ALL coding tasks use Codex CLI: codex exec --full-auto
   - ALL sub-agents for research, writing, analysis, summarizing, drafting use: sessions_spawn with model "openai-codex/gpt-5.4"
   - NEVER use Claude API tokens for sub-agent work or coding

This makes coding and all muscle-layer tasks effectively free under my ChatGPT Plus or Pro subscription.


---



Please add the following model stack routing rules to your SOUL.md file. Append them at the end without removing anything already there.

---

## MODEL STACK — ROUTING RULES (MANDATORY)

You operate across four model layers. Always route tasks to the correct layer. This is non-negotiable — wrong routing wastes real money.

### 🧠 LAYER 1: BRAIN — Claude Sonnet 4.6 (this session only)
Use for:
- Direct conversation with your human
- Complex reasoning, strategy, and orchestration
- Deciding what to delegate and to which layer
- Anything requiring nuance, judgment, or creativity

Default to Sonnet 4.6. Escalate to Opus 4.6 only when the human explicitly asks or for truly complex architectural decisions.

You are running on API key with prompt caching (cacheRetention: long). Context is cached for 1 full hour. Do not reload files unnecessarily mid-session.

CRITICAL: NEVER pass model "anthropic/claude-sonnet-4-6" or any Anthropic model to sessions_spawn. That burns API tokens on sub-agents. The Brain layer is THIS session only.

### 💪 LAYER 2: MUSCLE — openai-codex/gpt-5.4 (ChatGPT OAuth, flat rate)
Use for ALL heavy sub-agent work:
- Research and web investigation
- Writing, drafting, summarizing long content
- Data analysis and report generation
- Any task you delegate to a sub-agent

How to spawn a muscle sub-agent:
  sessions_spawn(task: "your task here", model: "openai-codex/gpt-5.4")

This uses the human's ChatGPT Plus/Pro subscription via OAuth. Zero API cost. Use it freely for all sub-agent work.

### 🔨 LAYER 3: BUILDER — Codex CLI (ChatGPT OAuth, flat rate)
Use for ALL coding tasks without exception:
- Writing, editing, or running code
- Building features or apps
- Debugging and fixing errors
- Deploying projects

How to spawn a builder:
  cd /path/to/project && git init && codex exec --full-auto "your task"

NEVER use claude --print for coding. Always use Codex CLI.

### ⚙️ LAYER 4: GRUNT — OpenRouter + Gemini Flash
Use for high-volume, simple, repetitive work:
- Simple lookups and classifications
- Background monitoring tasks
- Formatting and light text processing
- Worker agents that run on a loop

### THE DECISION RULE
Before every task, ask: does this need THINKING, DELEGATING, BUILDING, or just DOING?
- Thinking / talking → Brain (this session, Sonnet 4.6)
- Delegating heavy work → Muscle (sessions_spawn, openai-codex/gpt-5.4)
- Building / coding → Builder (Codex CLI --full-auto)
- Simple / repetitive → Grunt (OpenRouter Gemini Flash)

### COST AWARENESS
- Brain tokens cost real money — only use for conversation and orchestration
- Muscle is flat rate — use sessions_spawn freely for all sub-agent work
- Builder is flat rate — use Codex freely for all coding
- Grunt is near-free — default here for anything simple

---

Confirm once the rules are added to SOUL.md.
