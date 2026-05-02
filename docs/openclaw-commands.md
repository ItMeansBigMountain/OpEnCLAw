# 🧠 Cleaned OpenClaw Command System

## ⚙️ 1. Setup / Onboarding (FIRST STEP)

| Command                                                                           | Purpose                |
| --------------------------------------------------------------------------------- | ---------------------- |
| `openclaw onboard`                                                                | Full setup wizard      |
| `openclaw onboard --anthropic-api-key YOUR_KEY`                                   | Setup with Anthropic   |
| `openclaw onboard --auth-choice anthropic-api-key --anthropic-api-key YOUR_KEY`   | Force Anthropic config |
| `openclaw onboard --auth-choice openrouter-api-key --openrouter-api-key YOUR_KEY` | Use OpenRouter         |

👉 Use once. Don’t spam this like a caveman.

---

## 🧱 2. Core Setup & Recovery

| Command              | Purpose                     |
| -------------------- | --------------------------- |
| `openclaw setup`     | Initialize workspace        |
| `openclaw configure` | Edit credentials + channels |
| `openclaw reset`     | Nuke config (when broken)   |

👉 Reset = last resort, not your default debugging strategy.

---

## 🧠 3. Memory System (CRITICAL for your goals)

| Command                                 | Purpose              |
| --------------------------------------- | -------------------- |
| `mkdir -p ~/.openclaw/workspace/memory` | Create memory folder |
| `openclaw memory`                       | Manage/search memory |

👉 This is your **learning loop backbone**

---

## 🚀 4. Gateway (YOUR SYSTEM HEARTBEAT)

| Command                      | Purpose                   |
| ---------------------------- | ------------------------- |
| `openclaw gateway install`   | Auto-start service        |
| `openclaw gateway start`     | Start system              |
| `openclaw gateway stop`      | Stop system               |
| `openclaw gateway restart`   | Restart (MOST USED)       |
| `openclaw gateway status`    | Check if alive            |
| `openclaw gateway run`       | Debug mode (logs visible) |
| `openclaw gateway uninstall` | Remove service            |

👉 If your agents “feel dead” → it’s this.

---

## 🩺 5. Debugging / Health

| Command           | Purpose              |
| ----------------- | -------------------- |
| `openclaw status` | Full system overview |
| `openclaw doctor` | Auto-fix suggestions |
| `openclaw health` | Quick ping           |
| `openclaw logs`   | Live activity logs   |

👉 If you skip logs, you deserve confusion.

---

## ⚙️ 6. Config Management

| Command                          | Purpose       |
| -------------------------------- | ------------- |
| `openclaw config get models`     | Current model |
| `openclaw config get auth`       | API setup     |
| `openclaw config file`           | Locate config |
| `openclaw config validate`       | Check errors  |
| `nano ~/.openclaw/openclaw.json` | Manual edit   |

👉 This is where you break things accidentally.

---

## 📡 7. Channels (DISCORD = YOUR COMMAND CENTER)

| Command                    | Purpose              |
| -------------------------- | -------------------- |
| `openclaw channels list`   | See channels         |
| `openclaw channels status` | Connection state     |
| `openclaw channels add`    | Add Discord/Telegram |
| `openclaw channels logs`   | Debug messaging      |

👉 Your entire system depends on this working cleanly.

---

## 🔄 8. Updates

| Command                  | Purpose         |
| ------------------------ | --------------- |
| `openclaw update`        | Update system   |
| `openclaw update status` | Check version   |
| `openclaw --version`     | Current version |

👉 Running outdated versions while building “bleeding edge AI” is peak irony.

---

## 🤖 9. Models & Skills

| Command           | Purpose          |
| ----------------- | ---------------- |
| `openclaw models` | Available models |
| `openclaw skills` | Installed skills |

👉 Skills = how your bots actually DO things

---

## 🖥️ 10. Dashboard / UI

| Command              | Purpose            |
| -------------------- | ------------------ |
| `openclaw dashboard` | Open control panel |

👉 Optional, but useful for sanity.

---

## 🧾 11. Sessions & History

| Command             | Purpose            |
| ------------------- | ------------------ |
| `openclaw sessions` | Past conversations |

👉 Useful for debugging agent decisions.

---

## 🧨 12. Advanced / Nuclear Options

| Command              | Purpose           |
| -------------------- | ----------------- |
| `openclaw uninstall` | Remove everything |
| `openclaw --help`    | Show all commands |

👉 If you hit uninstall, something went very wrong.

---

# 🧠 What You Actually Need (80/20)

Ignore the noise. You’ll use:

| Category | Commands                     |
| -------- | ---------------------------- |
| Setup    | onboard, configure           |
| Runtime  | gateway start/restart/status |
| Debug    | status, logs, doctor         |
| Channels | channels add/status          |
| Memory   | memory                       |
| Updates  | update                       |

Everything else is secondary.

---

# ⚠️ Real Insight You’re Missing

This command list is NOT the system.

It’s just:

```text
Infrastructure layer
```

Your real power comes from:

```text
Agents + Memory + Workflows + Feedback loops
```

---

# 🧪 Next Move

You now have:

✅ Clean command system
❌ No operational brain yet

Next thing you need:

👉 **AGENTS.md (your org chart + behavior rules)**
👉 **SOUL.md (your system philosophy + constraints)**
👉 **PLAYBOOKS (browser automation steps)**

---

If you want this to actually print money instead of printing logs, next step is I build you:

**→ your first working OpenClaw agent system (COO + Trend + Clip pipeline)**
You handed me a raw command dump that looks like someone rage-documented their terminal. Let’s turn it into something a **system builder actually uses**, not a confused intern clicking random commands.

---

# 🧠 Cleaned OpenClaw Command System

## ⚙️ 1. Setup / Onboarding (FIRST STEP)

| Command                                                                           | Purpose                |
| --------------------------------------------------------------------------------- | ---------------------- |
| `openclaw onboard`                                                                | Full setup wizard      |
| `openclaw onboard --anthropic-api-key YOUR_KEY`                                   | Setup with Anthropic   |
| `openclaw onboard --auth-choice anthropic-api-key --anthropic-api-key YOUR_KEY`   | Force Anthropic config |
| `openclaw onboard --auth-choice openrouter-api-key --openrouter-api-key YOUR_KEY` | Use OpenRouter         |

👉 Use once. Don’t spam this like a caveman.

---

## 🧱 2. Core Setup & Recovery

| Command              | Purpose                     |
| -------------------- | --------------------------- |
| `openclaw setup`     | Initialize workspace        |
| `openclaw configure` | Edit credentials + channels |
| `openclaw reset`     | Nuke config (when broken)   |

👉 Reset = last resort, not your default debugging strategy.

---

## 🧠 3. Memory System (CRITICAL for your goals)

| Command                                 | Purpose              |
| --------------------------------------- | -------------------- |
| `mkdir -p ~/.openclaw/workspace/memory` | Create memory folder |
| `openclaw memory`                       | Manage/search memory |

👉 This is your **learning loop backbone**

---

## 🚀 4. Gateway (YOUR SYSTEM HEARTBEAT)

| Command                      | Purpose                   |
| ---------------------------- | ------------------------- |
| `openclaw gateway install`   | Auto-start service        |
| `openclaw gateway start`     | Start system              |
| `openclaw gateway stop`      | Stop system               |
| `openclaw gateway restart`   | Restart (MOST USED)       |
| `openclaw gateway status`    | Check if alive            |
| `openclaw gateway run`       | Debug mode (logs visible) |
| `openclaw gateway uninstall` | Remove service            |

👉 If your agents “feel dead” → it’s this.

---

## 🩺 5. Debugging / Health

| Command           | Purpose              |
| ----------------- | -------------------- |
| `openclaw status` | Full system overview |
| `openclaw doctor` | Auto-fix suggestions |
| `openclaw health` | Quick ping           |
| `openclaw logs`   | Live activity logs   |

👉 If you skip logs, you deserve confusion.

---

## ⚙️ 6. Config Management

| Command                          | Purpose       |
| -------------------------------- | ------------- |
| `openclaw config get models`     | Current model |
| `openclaw config get auth`       | API setup     |
| `openclaw config file`           | Locate config |
| `openclaw config validate`       | Check errors  |
| `nano ~/.openclaw/openclaw.json` | Manual edit   |

👉 This is where you break things accidentally.

---

## 📡 7. Channels (DISCORD = YOUR COMMAND CENTER)

| Command                    | Purpose              |
| -------------------------- | -------------------- |
| `openclaw channels list`   | See channels         |
| `openclaw channels status` | Connection state     |
| `openclaw channels add`    | Add Discord/Telegram |
| `openclaw channels logs`   | Debug messaging      |

👉 Your entire system depends on this working cleanly.

---

## 🔄 8. Updates

| Command                  | Purpose         |
| ------------------------ | --------------- |
| `openclaw update`        | Update system   |
| `openclaw update status` | Check version   |
| `openclaw --version`     | Current version |

👉 Running outdated versions while building “bleeding edge AI” is peak irony.

---

## 🤖 9. Models & Skills

| Command           | Purpose          |
| ----------------- | ---------------- |
| `openclaw models` | Available models |
| `openclaw skills` | Installed skills |

👉 Skills = how your bots actually DO things

---

## 🖥️ 10. Dashboard / UI

| Command              | Purpose            |
| -------------------- | ------------------ |
| `openclaw dashboard` | Open control panel |

👉 Optional, but useful for sanity.

---

## 🧾 11. Sessions & History

| Command             | Purpose            |
| ------------------- | ------------------ |
| `openclaw sessions` | Past conversations |

👉 Useful for debugging agent decisions.

---

## 🧨 12. Advanced / Nuclear Options

| Command              | Purpose           |
| -------------------- | ----------------- |
| `openclaw uninstall` | Remove everything |
| `openclaw --help`    | Show all commands |

👉 If you hit uninstall, something went very wrong.

---

# 🧠 What You Actually Need (80/20)

Ignore the noise. You’ll use:

| Category | Commands                     |
| -------- | ---------------------------- |
| Setup    | onboard, configure           |
| Runtime  | gateway start/restart/status |
| Debug    | status, logs, doctor         |
| Channels | channels add/status          |
| Memory   | memory                       |
| Updates  | update                       |

Everything else is secondary.

---

# ⚠️ Real Insight You’re Missing

This command list is NOT the system.

It’s just:

```text
Infrastructure layer
```

Your real power comes from:

```text
Agents + Memory + Workflows + Feedback loops
```

---

# 🧪 Next Move

You now have:

✅ Clean command system
❌ No operational brain yet

Next thing you need:

👉 **AGENTS.md (your org chart + behavior rules)**
👉 **SOUL.md (your system philosophy + constraints)**
👉 **PLAYBOOKS (browser automation steps)**

---

If you want this to actually print money instead of printing logs, next step is I build you:

**→ your first working OpenClaw agent system (COO + Trend + Clip pipeline)**
