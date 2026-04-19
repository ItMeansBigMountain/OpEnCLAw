# OpenClaw Discord Project Template

This repo is a starter template for OpenClaw projects that you run locally and control through Discord.

- [example-openclaw.json](C:/Users/faree/Desktop/openclaw/example-openclaw.json) mirrors your current `C:\Users\faree\.openclaw\openclaw.json` shape, but with secrets and operator-specific IDs replaced by placeholders.
- [BOOT.md](C:/Users/faree/Desktop/openclaw/BOOT.md) is the repo-level instruction file for the agent that picks up this project.
- Real config path: `C:\Users\faree\.openclaw\openclaw.json`
- Dashboard: `http://127.0.0.1:18789/`

## Commands

Run these in `cmd.exe`, top to bottom.

```shell
# Install OpenClaw
powershell -c "& ([scriptblock]::Create((irm https://openclaw.ai/install.ps1)))"

# Save only the secrets you actually use
setx OPENAI_API_KEY "YOUR_OPENAI_API_KEY"
setx DISCORD_BOT_TOKEN "YOUR_DISCORD_BOT_TOKEN"
setx NOTION_API_KEY "YOUR_NOTION_API_KEY"
setx ELEVENLABS_API_KEY "YOUR_ELEVENLABS_API_KEY"

# Close this terminal and open a new cmd.exe window

# Clone your project repo and enter it
git clone YOUR_REPO_URL
cd YOUR_REPO_FOLDER

# Run OpenClaw onboarding once
openclaw onboard

# Point Discord auth at your env var
openclaw config set channels.discord.token --ref-provider default --ref-source env --ref-id DISCORD_BOT_TOKEN
openclaw config set channels.discord.enabled true --strict-json

# Lock Discord down to one server, one user, one channel
openclaw config set channels.discord.groupPolicy allowlist
openclaw config set channels.discord.guilds "{}" --strict-json
openclaw config set channels.discord.guilds.YOUR_GUILD_ID.users "[\"YOUR_DISCORD_USER_ID\"]" --strict-json
openclaw config set channels.discord.guilds.YOUR_GUILD_ID.channels.YOUR_DISCORD_CHANNEL_ID "{\"enabled\":true,\"requireMention\":true}" --strict-json

# Harden the local control UI
openclaw config set gateway.controlUi.allowInsecureAuth false --strict-json

# Validate and start
openclaw config validate
openclaw gateway start

# Verify the setup
openclaw channels status --probe
openclaw gateway status --deep
openclaw security audit --deep

# Open the local control UI
openclaw dashboard
```

## What To Replace

- `YOUR_REPO_URL`
- `YOUR_REPO_FOLDER`
- `YOUR_OPENAI_API_KEY`
- `YOUR_DISCORD_BOT_TOKEN`
- `YOUR_NOTION_API_KEY`
- `YOUR_ELEVENLABS_API_KEY`
- `YOUR_GUILD_ID`
- `YOUR_DISCORD_USER_ID`
- `YOUR_DISCORD_CHANNEL_ID`

## Notes

- Do not commit your real `C:\Users\faree\.openclaw\openclaw.json`.
- Do not put raw secrets in this repo, screenshots, or Discord messages.
- `openclaw gateway reset` is not a valid command.
- In `cmd.exe`, do not use single quotes for JSON values.
- `requireMention=true` is the safer default for a Discord-controlled bot.
- `gateway.controlUi.allowInsecureAuth=false` is the safer default for local use.
- The example config is a reference file. The commands above are the source of truth for your live machine.
