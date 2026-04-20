const http = require("http");
const https = require("https");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = 8899;
const HOST = process.env.MISSION_CONTROL_HOST || "0.0.0.0";
const BASE_DIR = __dirname;
const HTML_PATH = path.join(BASE_DIR, "mission-control.html");
const DATA_PATH = path.join(BASE_DIR, "mc-data.json");
const ACTIVITY_PATH = path.join(BASE_DIR, "mc-activity.json");
const CRON_SAMPLE_PATH = path.join(BASE_DIR, "mc-cron-sample.json");
const JSON_LIMIT_BYTES = 1024 * 1024;

const startedAt = Date.now();
let lastDataRefreshAt = new Date().toISOString();

ensureFile(DATA_PATH, "{}\n");
ensureFile(ACTIVITY_PATH, "[]\n");
ensureFile(CRON_SAMPLE_PATH, "[]\n");

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
    const { exec } = require("child_process");
    const command = 'git log --pretty=format:{"hash":"%H","shortHash":"%h","subject":"%s","author":"%an","date":"%aI"} -n 20';
    exec(command, { cwd: path.resolve(BASE_DIR, "..") }, (error, stdout) => {
      if (error) {
        resolve([]);
        return;
      }

      const aheadBehindCommand = "git rev-list --left-right --count origin/main...main";
      exec(aheadBehindCommand, { cwd: path.resolve(BASE_DIR, "..") }, (aheadBehindError, aheadBehindStdout) => {
        const [behindCountRaw = "0", aheadCountRaw = "0"] = String(aheadBehindStdout || "0 0").trim().split(/\s+/);
        const behindCount = Number(behindCountRaw) || 0;
        const aheadCount = Number(aheadCountRaw) || 0;

        const rows = stdout
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return null;
            }
          })
          .filter(Boolean)
          .map((entry, index) => ({
            ...entry,
            pushed: index >= aheadCount,
            branch: "main",
            remote: "origin"
          }));

        resolve({
          ahead: aheadCount,
          behind: behindCount,
          entries: rows
        });
      });
    });
  });
}

function createId() {
  return `mc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
