const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const os = require("os");

const PORT = 8899;
const HOST = process.env.MISSION_CONTROL_HOST || "0.0.0.0";
const BASE_DIR = __dirname;
const HTML_PATH = path.join(BASE_DIR, "mission-control.html");
const DATA_PATH = path.join(BASE_DIR, "mc-data.json");
const ACTIVITY_PATH = path.join(BASE_DIR, "mc-activity.json");
const CRON_SAMPLE_PATH = path.join(BASE_DIR, "mc-cron-sample.json");
const LIVE_CONSOLE_PATH = path.join(BASE_DIR, "mc-live-console.json");
const DERIVED_STATE_PATH = path.join(BASE_DIR, "mc-derived-state.json");
const JSON_LIMIT_BYTES = 1024 * 1024;
const API_HINTS = [
  { env: "ANTHROPIC_API_KEY", vendor: "Anthropic", service: "Claude API", billingUrl: "https://console.anthropic.com/settings/billing" },
  { env: "OPENAI_API_KEY", vendor: "OpenAI", service: "OpenAI API", billingUrl: "https://platform.openai.com/settings/organization/billing/overview" },
  { env: "OPENROUTER_API_KEY", vendor: "OpenRouter", service: "OpenRouter", billingUrl: "https://openrouter.ai/settings/credits" },
  { env: "GOOGLE_API_KEY", vendor: "Google", service: "Google AI / Gemini", billingUrl: "https://aistudio.google.com/" },
  { env: "TAVILY_API_KEY", vendor: "Tavily", service: "Tavily Search", billingUrl: "https://app.tavily.com/" },
  { env: "SERPAPI_API_KEY", vendor: "SerpApi", service: "SerpApi", billingUrl: "https://serpapi.com/dashboard" },
  { env: "DISCORD_BOT_TOKEN", vendor: "Discord", service: "Discord Bot", billingUrl: "https://discord.com/developers/applications" }
];
const OPENCLAW_HOME = path.join(os.homedir(), ".openclaw");
const WORKSPACE_DIR = path.join(OPENCLAW_HOME, "workspace");
const OPENCLAW_CONFIG_PATH = path.join(OPENCLAW_HOME, "openclaw.json");
const SESSION_DIR = path.join(OPENCLAW_HOME, "agents", "main", "sessions");

const startedAt = Date.now();
let lastDataRefreshAt = new Date().toISOString();

ensureFile(DATA_PATH, "{}\n");
ensureFile(ACTIVITY_PATH, "[]\n");
ensureFile(CRON_SAMPLE_PATH, "[]\n");
ensureFile(LIVE_CONSOLE_PATH, "[]\n");
ensureFile(DERIVED_STATE_PATH, "{}\n");

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const requestUrl = new URL(req.url, `http://${req.headers.host || `${HOST}:${PORT}`}`);

  try {
    if (req.method === "GET" && requestUrl.pathname === "/") {
      await serveHtml(res);
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/favicon.ico") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/status") {
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, {
        connection_health: "online",
        uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
        started_at: new Date(startedAt).toISOString(),
        last_data_refresh_timestamp: lastDataRefreshAt
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/data") {
      const data = readJsonFile(DATA_PATH, {});
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, data);
    }

    if (req.method === "POST" && requestUrl.pathname === "/mc/data") {
      const payload = await readJsonBody(req);
      writeJsonFile(DATA_PATH, payload);
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, {
        ok: true,
        saved_at: lastDataRefreshAt
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/weather") {
      const city = (requestUrl.searchParams.get("city") || "").trim();
      if (!city) {
        return sendJson(res, 400, { error: "Missing required query parameter: city" });
      }

      const weather = await fetchWeather(city);
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, weather);
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/activity") {
      const activity = readJsonFile(ACTIVITY_PATH, []);
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, activity.slice(-200).reverse());
    }

    if (req.method === "POST" && requestUrl.pathname === "/mc/activity") {
      const payload = await readJsonBody(req);
      const activity = readJsonFile(ACTIVITY_PATH, []);
      const entry = {
        id: payload.id || createId(),
        timestamp: new Date().toISOString(),
        ...payload
      };

      activity.push(entry);
      writeJsonFile(ACTIVITY_PATH, activity.slice(-1000));
      lastDataRefreshAt = entry.timestamp;

      return sendJson(res, 201, {
        ok: true,
        entry
      });
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/git-log") {
      const gitLog = await getGitLog();
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, gitLog);
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/cron-jobs") {
      const jobs = readJsonFile(CRON_SAMPLE_PATH, []);
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, jobs);
    }

    if (req.method === "POST" && requestUrl.pathname === "/mc/cron-jobs") {
      const payload = await readJsonBody(req);
      const jobs = readJsonFile(CRON_SAMPLE_PATH, []);
      const entry = {
        id: payload.id || createId(),
        name: payload.name || "Unnamed Job",
        schedule: payload.schedule || "manual",
        status: payload.status || "scheduled",
        lastRunAt: payload.lastRunAt || null,
        nextRunAt: payload.nextRunAt || null,
        notes: payload.notes || "",
        source: payload.source || "mission-control"
      };
      jobs.unshift(entry);
      writeJsonFile(CRON_SAMPLE_PATH, jobs.slice(0, 50));
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 201, { ok: true, entry });
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/live-console") {
      const entries = readJsonFile(LIVE_CONSOLE_PATH, []);
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, entries.slice(-200).reverse());
    }

    if (req.method === "POST" && requestUrl.pathname === "/mc/live-console") {
      const payload = await readJsonBody(req);
      const entries = readJsonFile(LIVE_CONSOLE_PATH, []);
      const entry = {
        id: payload.id || createId(),
        timestamp: new Date().toISOString(),
        actor: payload.actor || "Sosai",
        scope: payload.scope || "mission-control",
        message: payload.message || "",
        level: payload.level || "info"
      };
      entries.push(entry);
      writeJsonFile(LIVE_CONSOLE_PATH, entries.slice(-1000));
      lastDataRefreshAt = entry.timestamp;
      return sendJson(res, 201, { ok: true, entry });
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/api-inventory-scan") {
      const inventory = getSafeApiInventoryScan();
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, inventory);
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/workspace-snapshot") {
      const snapshot = getWorkspaceSnapshot();
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, snapshot);
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/conversation-history") {
      const history = getConversationHistory();
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, history);
    }

    if (req.method === "GET" && requestUrl.pathname === "/mc/derived-state") {
      const derived = readJsonFile(DERIVED_STATE_PATH, {});
      lastDataRefreshAt = new Date().toISOString();
      return sendJson(res, 200, derived);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    sendJson(res, statusCode, {
      error: error.message || "Internal server error"
    });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Mission Control server running at http://localhost:${PORT}`);
  console.log(`Serving dashboard: ${HTML_PATH}`);
});

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

async function serveHtml(res) {
  const html = await fs.promises.readFile(HTML_PATH, "utf8");
  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(html);
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload, null, 2));
}

function ensureFile(filePath, fallbackContents) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, fallbackContents, "utf8");
  }
}

function readJsonFile(filePath, fallbackValue) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    if (!raw) return fallbackValue;
    return JSON.parse(raw);
  } catch (error) {
    return fallbackValue;
  }
}

function writeJsonFile(filePath, payload) {
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;

      if (Buffer.byteLength(raw) > JSON_LIMIT_BYTES) {
        const error = new Error("Request body too large");
        error.statusCode = 413;
        reject(error);
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        error.statusCode = 400;
        error.message = "Invalid JSON body";
        reject(error);
      }
    });

    req.on("error", (error) => {
      error.statusCode = 400;
      reject(error);
    });
  });
}

function fetchWeather(city) {
  return new Promise((resolve, reject) => {
    const weatherUrl = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;

    https
      .get(weatherUrl, { headers: { "User-Agent": "MissionControl/1.0" } }, (response) => {
        let raw = "";

        response.on("data", (chunk) => {
          raw += chunk;
        });

        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 400) {
            const error = new Error(`Weather request failed with status ${response.statusCode}`);
            error.statusCode = 502;
            reject(error);
            return;
          }

          try {
            const parsed = JSON.parse(raw);
            const current = parsed.current_condition && parsed.current_condition[0];
            if (!current) {
              const error = new Error("Weather data unavailable");
              error.statusCode = 502;
              reject(error);
              return;
            }

            resolve({
              city,
              temperature: current.temp_C,
              condition: current.weatherDesc && current.weatherDesc[0] ? current.weatherDesc[0].value : "Unknown",
              feels_like: current.FeelsLikeC
            });
          } catch (error) {
            error.statusCode = 502;
            error.message = "Failed to parse weather response";
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        error.statusCode = 502;
        reject(error);
      });
  });
}

function getGitLog() {
  return new Promise((resolve) => {
    try {
      const { execFileSync } = require("child_process");
      const repoDir = path.resolve(BASE_DIR, "..");
      const branchName = String(execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir, stdio: ['ignore', 'pipe', 'ignore'] }) || 'main').trim() || 'main';
      const remoteUrl = String(execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd: repoDir, stdio: ['ignore', 'pipe', 'ignore'] }) || '').trim();
      const repoName = remoteUrl ? remoteUrl.split('/').pop().replace(/\.git$/i, '') : path.basename(repoDir);
      const remoteName = remoteUrl ? 'origin' : 'local';
      const aheadBehindArgs = remoteUrl
        ? ['rev-list', '--left-right', '--count', `${remoteName}/${branchName}...${branchName}`]
        : ['rev-list', '--left-right', '--count', `${branchName}...${branchName}`];
      const [behindCountRaw = '0', aheadCountRaw = '0'] = String(execFileSync('git', aheadBehindArgs, { cwd: repoDir, stdio: ['ignore', 'pipe', 'ignore'] }) || '0 0').trim().split(/\s+/);
      const rawLog = String(execFileSync('git', ['log', '--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI', '-n', '20'], { cwd: repoDir, stdio: ['ignore', 'pipe', 'ignore'] }) || '');
      const behindCount = Number(behindCountRaw) || 0;
      const aheadCount = Number(aheadCountRaw) || 0;
      const entries = rawLog
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => {
          const [hash, shortHash, subject, author, date] = line.split('\u001f');
          return hash ? { hash, shortHash, subject, author, date } : null;
        })
        .filter(Boolean)
        .map((entry, index) => ({
          ...entry,
          pushed: index >= aheadCount,
          branch: branchName,
          remote: remoteName,
          repo: repoName,
          remoteUrl
        }));

      resolve({
        ahead: aheadCount,
        behind: behindCount,
        branch: branchName,
        remote: remoteName,
        repo: repoName,
        remoteUrl,
        entries
      });
    } catch {
      resolve({
        ahead: 0,
        behind: 0,
        branch: 'unknown',
        remote: 'local',
        repo: path.basename(path.resolve(BASE_DIR, '..')),
        remoteUrl: '',
        entries: []
      });
    }
  });
}

function getSafeApiInventoryScan() {
  const envProviders = API_HINTS
    .filter((hint) => Boolean(process.env[hint.env]))
    .map((hint) => ({
      id: `scan-${hint.env.toLowerCase()}`,
      vendor: hint.vendor,
      service: hint.service,
      status: "env-detected",
      maskedKey: maskSecret(process.env[hint.env]),
      billingUrl: hint.billingUrl,
      source: `env:${hint.env}`,
      notes: "Detected from environment metadata only. Raw secrets are not exposed."
    }));

  const configProviders = getConfigBackedProviders();
  const merged = dedupeProviders([...envProviders, ...configProviders]);

  return {
    status: merged.length ? "config-and-env-metadata-detected" : "no-known-env-secrets-detected",
    lastScannedAt: new Date().toISOString(),
    coverage: "environment metadata plus openclaw.json config metadata",
    providers: merged
  };
}

function getConfigBackedProviders() {
  const config = readJsonFile(OPENCLAW_CONFIG_PATH, {});
  const providers = [];

  const discordTokenId = config.channels?.discord?.token?.id;
  if (discordTokenId) {
    providers.push({
      id: "config-discord-token",
      vendor: "Discord",
      service: "Discord Bot",
      status: "configured-in-openclaw-json",
      maskedKey: `${discordTokenId.slice(0, 4)}••••`,
      billingUrl: "https://discord.com/developers/applications",
      source: "openclaw.json:channels.discord.token.id",
      notes: "Token source referenced in config; raw token not exposed."
    });
  }

  const authProfiles = config.auth?.profiles || {};
  Object.entries(authProfiles).forEach(([profileName, profile]) => {
    providers.push({
      id: `auth-${profileName}`,
      vendor: profile.provider || "unknown",
      service: `Auth profile ${profileName}`,
      status: `auth:${profile.mode || 'unknown'}`,
      maskedKey: profile.email ? `email:${profile.email}` : "profile-configured",
      billingUrl: providerBillingUrl(profile.provider),
      source: `openclaw.json:auth.profiles.${profileName}`,
      notes: "Auth profile discovered from config metadata."
    });
  });

  const skillEntries = config.skills?.entries || {};
  Object.entries(skillEntries).forEach(([skillName, skillConfig]) => {
    if (skillConfig && typeof skillConfig === "object") {
      Object.entries(skillConfig).forEach(([key, value]) => {
        if (/key|token|secret/i.test(key) && typeof value === "string") {
          providers.push({
            id: `skill-${skillName}-${key}`,
            vendor: skillName,
            service: `${skillName} (${key})`,
            status: "configured-in-openclaw-json",
            maskedKey: maskSecret(value),
            billingUrl: null,
            source: `openclaw.json:skills.entries.${skillName}.${key}`,
            notes: "Discovered in skill config metadata."
          });
        }
      });
    }
  });

  return providers;
}

function providerBillingUrl(provider) {
  const normalized = String(provider || "").toLowerCase();
  if (normalized.includes("openai")) return "https://platform.openai.com/settings/organization/billing/overview";
  if (normalized.includes("anthropic")) return "https://console.anthropic.com/settings/billing";
  if (normalized.includes("discord")) return "https://discord.com/developers/applications";
  return null;
}

function dedupeProviders(items) {
  const merged = new Map();
  items.forEach((item) => {
    const key = item.id || `${item.vendor}-${item.service}-${item.source}`;
    merged.set(key, { ...(merged.get(key) || {}), ...item });
  });
  return Array.from(merged.values());
}

function getWorkspaceSnapshot() {
  const memoryDir = path.join(WORKSPACE_DIR, "memory");
  const memoryEntries = listMarkdownEntries(memoryDir, "daily-memory");
  const rootDocs = [
    path.join(WORKSPACE_DIR, "AGENTS.md"),
    path.join(WORKSPACE_DIR, "SOUL.md"),
    path.join(WORKSPACE_DIR, "USER.md"),
    path.join(WORKSPACE_DIR, "TOOLS.md"),
    path.join(WORKSPACE_DIR, "HEARTBEAT.md"),
    path.join(WORKSPACE_DIR, "MEMORY.md")
  ]
    .filter((filePath) => fs.existsSync(filePath))
    .map((filePath) => readMarkdownEntry(filePath, "workspace-doc"));

  return {
    memoryEntries,
    documents: rootDocs
  };
}

function listMarkdownEntries(dirPath, type) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith(".md"))
    .map((name) => readMarkdownEntry(path.join(dirPath, name), type))
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function readMarkdownEntry(filePath, type) {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    const stats = fs.statSync(filePath);
    const lines = content.split(/\r?\n/).filter(Boolean);
    return {
      id: filePath,
      title: path.basename(filePath),
      type,
      summary: truncateText(lines.slice(0, 3).join(" "), 220),
      content: truncateText(content, 4000),
      timestamp: stats.mtime.toISOString(),
      path: filePath
    };
  } catch {
    return null;
  }
}

function getConversationHistory() {
  if (!fs.existsSync(SESSION_DIR)) return [];
  const files = fs.readdirSync(SESSION_DIR)
    .filter((name) => name.toLowerCase().endsWith(".jsonl"))
    .map((name) => path.join(SESSION_DIR, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  const latest = files[0];
  if (!latest) return [];
  const lines = fs.readFileSync(latest, "utf8").split(/\r?\n/).filter(Boolean);
  const messages = [];

  lines.forEach((line) => {
    try {
      const entry = JSON.parse(line);
      if (entry.type !== "message" || !entry.message) return;
      const role = entry.message.role;
      const textParts = Array.isArray(entry.message.content)
        ? entry.message.content.filter((item) => item.type === "text" && item.text).map((item) => item.text)
        : [];
      const text = textParts.join("\n\n").trim();
      if (!text) return;
      messages.push({
        id: entry.id,
        from: role === "assistant" ? "Sosai" : role === "user" ? "User" : role,
        to: role === "assistant" ? "User" : "Sosai",
        message: truncateText(text, 4000),
        visibility: "discord-session-transcript",
        timestamp: entry.timestamp
      });
    } catch {
      return;
    }
  });

  return messages.slice(-80).reverse();
}

function truncateText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function maskSecret(value) {
  if (!value || typeof value !== "string") return "not-present";
  if (value.length <= 8) return `${value.slice(0, 2)}••••`;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function createId() {
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
