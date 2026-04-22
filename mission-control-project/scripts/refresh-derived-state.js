const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'app');
const outPath = path.join(appDir, 'mc-derived-state.json');
const openclawHome = path.join(os.homedir(), '.openclaw');
const workspaceDir = path.join(openclawHome, 'workspace');
const configPath = path.join(openclawHome, 'openclaw.json');
const sessionDir = path.join(openclawHome, 'agents', 'main', 'sessions');
const logPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp', 'openclaw', 'openclaw-2026-04-20.log');
const worklogPath = path.join(projectRoot, 'WORKLOG.md');
const diaryPath = path.join(projectRoot, 'DEVELOPER-DIARY.md');

function truncate(text, max = 4000) {
  text = String(text || '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function readMarkdownEntry(filePath, type) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const lines = content.split(/\r?\n/).filter(Boolean);
  return {
    id: filePath,
    title: path.basename(filePath),
    type,
    summary: truncate(lines.slice(0, 3).join(' '), 220),
    content: truncate(content, 4000),
    timestamp: stat.mtime.toISOString(),
    path: filePath
  };
}

function listMarkdownEntries(dirPath, type) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath)
    .filter((name) => name.toLowerCase().endsWith('.md'))
    .map((name) => readMarkdownEntry(path.join(dirPath, name), type))
    .filter(Boolean)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function loadConversations() {
  if (!fs.existsSync(sessionDir)) return [];
  const files = fs.readdirSync(sessionDir)
    .filter((name) => name.endsWith('.jsonl'))
    .map((name) => path.join(sessionDir, name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  const latest = files[0];
  if (!latest) return [];
  return fs.readFileSync(latest, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(Boolean).filter((entry) => entry.type === 'message' && entry.message).map((entry) => {
    const texts = Array.isArray(entry.message.content) ? entry.message.content.filter((c) => c.type === 'text' && c.text).map((c) => c.text) : [];
    const text = texts.join('\n\n').trim();
    if (!text) return null;
    return {
      id: entry.id,
      from: entry.message.role === 'assistant' ? 'Sosai' : 'User',
      to: entry.message.role === 'assistant' ? 'User' : 'Sosai',
      message: truncate(text),
      visibility: 'discord-session-transcript',
      timestamp: entry.timestamp
    };
  }).filter(Boolean).slice(-100).reverse();
}

function loadGit() {
  try {
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const remoteUrl = execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const repo = remoteUrl ? remoteUrl.split('/').pop().replace(/\.git$/i, '') : path.basename(projectRoot);
    const aheadBehindArgs = remoteUrl
      ? ['rev-list', '--left-right', '--count', `origin/${branch}...${branch}`]
      : ['rev-list', '--left-right', '--count', `${branch}...${branch}`];
    const aheadBehind = execFileSync('git', aheadBehindArgs, { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split(/\s+/);
    const log = execFileSync('git', ['log', '--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI', '-n', '20'], { cwd: projectRoot, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const ahead = Number(aheadBehind[1] || 0) || 0;
    const behind = Number(aheadBehind[0] || 0) || 0;
    const entries = log
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const [hash, shortHash, subject, author, date] = line.split('\u001f');
        return hash ? { hash, shortHash, subject, author, date } : null;
      })
      .filter(Boolean)
      .map((entry, index) => ({ ...entry, repo, branch, remote: remoteUrl ? 'origin' : 'local', remoteUrl, pushed: index >= ahead }));
    return { repo, branch, remote: remoteUrl ? 'origin' : 'local', ahead, behind, entries };
  } catch {
    return { repo: null, branch: null, remote: null, ahead: 0, behind: 0, entries: [] };
  }
}

function maskSecret(value) {
  value = String(value || '').trim();
  if (!value) return 'not-present';
  if (value.length <= 8) return `${value.slice(0, 2)}••••`;
  return `${value.slice(0, 4)}••••${value.slice(-4)}`;
}

function providerBillingUrl(provider) {
  const normalized = String(provider || '').toLowerCase();
  if (normalized.includes('openai')) return 'https://platform.openai.com/settings/organization/billing/overview';
  if (normalized.includes('anthropic')) return 'https://console.anthropic.com/settings/billing';
  if (normalized.includes('discord')) return 'https://discord.com/developers/applications';
  if (normalized.includes('google')) return 'https://aistudio.google.com/';
  return null;
}

function loadApiInventory() {
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const providers = [];

  const authProfiles = config.auth?.profiles || {};
  Object.entries(authProfiles).forEach(([profileName, profile]) => {
    providers.push({
      id: `auth-${profileName}`,
      vendor: profile.provider || 'unknown',
      service: `Auth profile ${profileName}`,
      status: `auth:${profile.mode || 'unknown'}`,
      maskedKey: profile.email ? `email:${profile.email}` : 'profile-configured',
      billingUrl: providerBillingUrl(profile.provider),
      source: `openclaw.json:auth.profiles.${profileName}`,
      notes: 'Auth profile discovered from config metadata.'
    });
  });

  const discordTokenId = config.channels?.discord?.token?.id;
  if (discordTokenId) {
    providers.push({
      id: 'config-discord-token',
      vendor: 'Discord',
      service: 'Discord Bot',
      status: 'configured-in-openclaw-json',
      maskedKey: `${discordTokenId.slice(0, 4)}••••`,
      billingUrl: 'https://discord.com/developers/applications',
      source: 'openclaw.json:channels.discord.token.id',
      notes: 'Token reference discovered in config metadata.'
    });
  }

  const skillEntries = config.skills?.entries || {};
  Object.entries(skillEntries).forEach(([skillName, skillConfig]) => {
    if (!skillConfig || typeof skillConfig !== 'object') return;
    Object.entries(skillConfig).forEach(([key, value]) => {
      if (/key|token|secret/i.test(key) && typeof value === 'string') {
        providers.push({
          id: `skill-${skillName}-${key}`,
          vendor: skillName,
          service: `${skillName} (${key})`,
          status: 'configured-in-openclaw-json',
          maskedKey: maskSecret(value),
          billingUrl: null,
          source: `openclaw.json:skills.entries.${skillName}.${key}`,
          notes: 'Configured secret discovered in skill metadata.'
        });
      }
    });
  });

  return {
    scanStatus: {
      status: providers.length ? 'config-metadata-detected' : 'no-config-managed-keys-detected',
      lastScannedAt: new Date().toISOString(),
      coverage: 'openclaw.json config metadata',
      notes: 'Masked only. Raw secrets are not exposed.'
    },
    providers
  };
}

function loadGatewayReflection() {
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const discord = config.channels?.discord || {};
  const guild = discord.guilds?.['782665843640238131'] || {};
  const logs = fs.existsSync(logPath) ? fs.readFileSync(logPath, 'utf8').split(/\r?\n/).filter(Boolean).slice(-80) : [];
  const highlights = logs.filter((line) => /discord|gateway|reaction|unauthorized|token|pairing|required|allowinsecureauth/i.test(line)).slice(-20);

  return {
    summary: {
      gatewayBind: '127.0.0.1:18789',
      dashboardUrl: 'http://127.0.0.1:18789/',
      discordAckReaction: discord.ackReaction || null,
      reactionNotifications: guild.reactionNotifications || null,
      groupPolicy: discord.groupPolicy || null,
      configuredGuilds: Object.keys(discord.guilds || {}),
      requireMention: guild.requireMention ?? null
    },
    warnings: [
      discord.groupPolicy === 'allowlist' && !discord.allowFrom && !discord.groupAllowFrom
        ? 'Discord allowlist warning: groupPolicy is allowlist while groupAllowFrom/allowFrom is empty.'
        : null,
      config.gateway?.controlUi?.allowInsecureAuth === true
        ? 'Gateway security warning: gateway.controlUi.allowInsecureAuth=true'
        : null
    ].filter(Boolean),
    recentLogHighlights: highlights
  };
}

function summarizeDirectory(dirName, options = {}) {
  const targetPath = path.join(openclawHome, dirName);
  if (!fs.existsSync(targetPath)) {
    return {
      path: targetPath,
      exists: false,
      itemCount: 0,
      sample: []
    };
  }

  const entries = fs.readdirSync(targetPath, { withFileTypes: true });
  const sample = entries.slice(0, options.sampleSize || 6).map((entry) => ({
    name: entry.name,
    kind: entry.isDirectory() ? 'dir' : 'file'
  }));

  return {
    path: targetPath,
    exists: true,
    itemCount: entries.length,
    sample
  };
}

function readJsonSafe(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function sanitizeAuditArg(arg) {
  const value = String(arg || '');
  if (!value) return '';
  if (/^sk-[a-z0-9_-]+/i.test(value)) return `${value.slice(0, 4)}••••`;
  if (/token|secret|api[_-]?key/i.test(value)) return '[masked-flag]';
  if (value.length > 48 && /[a-z0-9_-]{24,}/i.test(value)) return `${value.slice(0, 4)}••••${value.slice(-4)}`;
  return value;
}

function summarizeAuditCommand(argv = []) {
  if (!Array.isArray(argv) || !argv.length) return 'unknown-command';
  return argv
    .slice(1, 6)
    .map((part) => sanitizeAuditArg(path.basename(String(part || ''))))
    .join(' ')
    .trim() || 'unknown-command';
}

function loadConfigHealthSummary() {
  const filePath = path.join(openclawHome, 'logs', 'config-health.json');
  const data = readJsonSafe(filePath, {});
  const entries = data && typeof data === 'object' ? data.entries || {} : {};
  const trackedPaths = Object.keys(entries);
  const suspiciousPaths = trackedPaths.filter((entryPath) => entries[entryPath]?.lastObservedSuspiciousSignature);
  const latestObservedAt = trackedPaths
    .map((entryPath) => entries[entryPath]?.lastKnownGood?.observedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    filePath,
    exists: fs.existsSync(filePath),
    trackedPathCount: trackedPaths.length,
    suspiciousPathCount: suspiciousPaths.length,
    suspiciousPaths: suspiciousPaths.map((entryPath) => path.basename(entryPath)),
    latestObservedAt
  };
}

function loadConfigAuditSummary() {
  const filePath = path.join(openclawHome, 'logs', 'config-audit.jsonl');
  if (!fs.existsSync(filePath)) {
    return {
      filePath,
      exists: false,
      recentEvents: [],
      suspiciousEventCount: 0,
      recentSuspiciousEvents: []
    };
  }

  const parsedEntries = fs.readFileSync(filePath, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); } catch { return null; }
    })
    .filter(Boolean);

  const recentEvents = parsedEntries
    .slice(-120)
    .slice(-6)
    .reverse()
    .map((entry) => ({
      ts: entry.ts || null,
      event: entry.event || 'unknown',
      source: entry.source || 'unknown',
      result: entry.result || null,
      cwd: entry.cwd ? path.basename(entry.cwd) : null,
      command: summarizeAuditCommand(entry.argv),
      suspiciousCount: Array.isArray(entry.suspicious) ? entry.suspicious.length : 0
    }));

  const suspiciousEntries = parsedEntries
    .filter((entry) => Array.isArray(entry.suspicious) && entry.suspicious.length)
    .slice(-6)
    .reverse()
    .map((entry) => ({
      ts: entry.ts || null,
      event: entry.event || 'unknown',
      phase: entry.phase || null,
      cwd: entry.cwd ? path.basename(entry.cwd) : null,
      command: summarizeAuditCommand(entry.argv),
      suspicious: entry.suspicious.slice(0, 6)
    }));

  return {
    filePath,
    exists: true,
    recentEvents,
    suspiciousEventCount: parsedEntries.filter((entry) => Array.isArray(entry.suspicious) && entry.suspicious.length).length,
    recentSuspiciousEvents: suspiciousEntries
  };
}

function loadExecApprovalsSummary() {
  const filePath = path.join(openclawHome, 'exec-approvals.json');
  const data = readJsonSafe(filePath, {});
  return {
    filePath,
    exists: fs.existsSync(filePath),
    socketPath: data?.socket?.path || null,
    maskedToken: data?.socket?.token ? maskSecret(data.socket.token) : null,
    defaultRuleCount: data?.defaults && typeof data.defaults === 'object' ? Object.keys(data.defaults).length : 0,
    agentOverrideCount: data?.agents && typeof data.agents === 'object' ? Object.keys(data.agents).length : 0
  };
}

function loadAgentRuntimeSummary() {
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const configured = Array.isArray(config.agents?.list) ? config.agents.list : [];
  const agentsRoot = path.join(openclawHome, 'agents');
  const configuredIds = configured.map((agent) => agent.id).filter(Boolean);
  const runtimeDirs = configuredIds.map((agentId) => {
    const agentPath = path.join(agentsRoot, agentId);
    const exists = fs.existsSync(agentPath);
    const runtimeEntries = exists ? fs.readdirSync(agentPath, { withFileTypes: true }) : [];
    const sessionsPath = path.join(agentPath, 'sessions');
    const sessionFiles = fs.existsSync(sessionsPath)
      ? fs.readdirSync(sessionsPath).filter((name) => name.endsWith('.jsonl'))
      : [];

    return {
      id: agentId,
      exists,
      runtimeEntryCount: runtimeEntries.length,
      runtimeEntries: runtimeEntries.slice(0, 6).map((entry) => entry.name),
      sessionCount: sessionFiles.length,
      sessionSample: sessionFiles.slice(0, 4)
    };
  });

  return {
    configuredCount: configuredIds.length,
    runtimeDirCount: runtimeDirs.filter((entry) => entry.exists).length,
    configuredIds,
    runtimeDirs
  };
}

function loadOpenClawFootprint() {
  const entries = fs.existsSync(openclawHome)
    ? fs.readdirSync(openclawHome, { withFileTypes: true }).map((entry) => ({
        name: entry.name,
        kind: entry.isDirectory() ? 'dir' : 'file'
      }))
    : [];
  const configArtifacts = entries.filter((entry) => /^openclaw\.json(\.bak(\.\d+)?)?|^openclaw\.json\.clobbered\./i.test(entry.name));
  const runtimeDirs = entries.filter((entry) => entry.kind === 'dir' && ['agents', 'memory', 'flows', 'tasks', 'logs', 'media', 'canvas', 'devices', 'voice-calls', 'workspace'].includes(entry.name));
  const runtimeStats = {
    agents: summarizeDirectory('agents'),
    memory: summarizeDirectory('memory'),
    flows: summarizeDirectory('flows'),
    tasks: summarizeDirectory('tasks'),
    logs: summarizeDirectory('logs'),
    media: summarizeDirectory('media'),
    canvas: summarizeDirectory('canvas'),
    devices: summarizeDirectory('devices'),
    voiceCalls: summarizeDirectory('voice-calls'),
    workspace: summarizeDirectory('workspace')
  };

  return {
    rootPath: openclawHome,
    topLevelCount: entries.length,
    runtimeDirs: runtimeDirs.map((entry) => entry.name),
    configArtifacts: configArtifacts.map((entry) => entry.name),
    notableFiles: entries.filter((entry) => entry.kind === 'file' && ['exec-approvals.json', 'gateway.cmd', 'update-check.json', 'openclaw.json'].includes(entry.name)).map((entry) => entry.name),
    runtimeStats,
    sessionFiles: summarizeDirectory(path.join('agents', 'main', 'sessions'), { sampleSize: 8 }),
    details: {
      agents: loadAgentRuntimeSummary(),
      stores: [
        { id: 'tasks', label: 'Task runs', ...runtimeStats.tasks },
        { id: 'flows', label: 'Flow registry', ...runtimeStats.flows },
        { id: 'logs', label: 'Runtime logs', ...runtimeStats.logs },
        { id: 'media', label: 'Media cache', ...runtimeStats.media }
      ],
      approvals: loadExecApprovalsSummary(),
      configHealth: loadConfigHealthSummary(),
      configAudit: loadConfigAuditSummary()
    }
  };
}

function loadAssistantAudit(memoryEntries, documents, conversations, git, apiInventory, checkingIn, gatewayReflection, openclawFootprint) {
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  return [
    {
      id: 'audit-memory',
      title: 'Workspace memory',
      summary: `${memoryEntries.length} reflected memory entries`,
      detail: memoryEntries.map((e) => `${e.title} • ${e.path}`).join('\n')
    },
    {
      id: 'audit-docs',
      title: 'Assistant docs',
      summary: `${documents.length} reflected control docs`,
      detail: documents.map((e) => `${e.title} • ${e.path}`).join('\n')
    },
    {
      id: 'audit-convos',
      title: 'Conversation bridge',
      summary: `${conversations.length} reflected conversation messages`,
      detail: conversations.slice(0, 12).map((e) => `${e.timestamp} • ${e.from}: ${truncate(e.message, 160)}`).join('\n\n')
    },
    {
      id: 'audit-config',
      title: 'Config coverage',
      summary: 'Reflecting `.openclaw/openclaw.json` metadata',
      detail: truncate(JSON.stringify({
        authProfiles: Object.keys(config.auth?.profiles || {}),
        skills: Object.keys(config.skills?.entries || {}),
        channels: Object.keys(config.channels || {}),
        plugins: Object.keys(config.plugins?.entries || {}),
        apiInventoryProviders: apiInventory.providers.map((p) => ({ vendor: p.vendor, service: p.service, source: p.source, maskedKey: p.maskedKey }))
      }, null, 2), 3000)
    },
    {
      id: 'audit-checking-in',
      title: 'Checking in status',
      summary: 'Compact status block for quick chat check-ins',
      detail: truncate(JSON.stringify(checkingIn, null, 2), 2000)
    },
    {
      id: 'audit-gateway',
      title: 'Gateway and Discord reflection',
      summary: 'Realtime gateway, Discord reaction, and warning snapshot',
      detail: truncate(JSON.stringify(gatewayReflection, null, 2), 3000)
    },
    {
      id: 'audit-openclaw-footprint',
      title: 'OpenClaw runtime footprint',
      summary: `${openclawFootprint.topLevelCount || 0} top-level entries reflected from .openclaw`,
      detail: truncate(JSON.stringify(openclawFootprint, null, 2), 3000)
    },
    {
      id: 'audit-git',
      title: 'Git audit',
      summary: `${git.entries.length} commit entries reflected`,
      detail: git.entries.map((e) => `${e.shortHash} • ${e.repo} • ${e.branch} • ${e.subject}`).join('\n')
    }
  ];
}

function loadFutureWork() {
  if (!fs.existsSync(worklogPath)) return [];
  const content = fs.readFileSync(worklogPath, 'utf8');
  return extractSectionBullets(content, '## Open tasks now').map((text, index) => ({
    id: `future-${index + 1}`,
    text
  }));
}

function extractSectionBullets(content, heading) {
  const idx = content.indexOf(heading);
  if (idx === -1) return [];
  const next = content.slice(idx + heading.length).split('\n## ')[0];
  return next
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

function inferPriority(text) {
  const value = String(text || '').toLowerCase();
  if (/gateway|security|approval|email|api|integrat|reflect|skill|memory|docs|mobile|lan/.test(value)) return 'high';
  if (/align|spec|agent|org chart|workflow|govern/.test(value)) return 'medium';
  return 'low';
}

function inferArea(text) {
  const value = String(text || '').toLowerCase();
  if (value.includes('gateway')) return 'Gateway Reflection';
  if (value.includes('email')) return 'Email Ops';
  if (value.includes('api')) return 'API Inventory';
  if (value.includes('approval')) return 'Approvals';
  if (value.includes('memory') || value.includes('docs')) return 'Memory & Docs';
  if (value.includes('skill')) return 'Skills';
  if (value.includes('agent') || value.includes('org chart')) return 'Agents';
  if (value.includes('lan') || value.includes('mobile')) return 'Runtime Access';
  if (value.includes('integrat') || value.includes('.openclaw')) return 'Integration';
  return 'Mission Control';
}

function parseWorklogActions(content) {
  const lines = String(content || '').split(/\r?\n/);
  const actions = [];
  let current = null;

  const flush = () => {
    if (!current || !current.title) return;
    current.notes = current.notes.filter(Boolean);
    actions.push(current);
  };

  for (const line of lines) {
    const headingMatch = line.match(/^####\s+\d+\.\s+(.+)$/);
    if (headingMatch) {
      flush();
      current = { title: headingMatch[1].trim(), status: 'Unknown', notes: [] };
      continue;
    }
    if (!current) continue;

    const statusMatch = line.match(/^- Status:\s*(.+)$/);
    if (statusMatch) {
      current.status = statusMatch[1].trim();
      continue;
    }

    const noteMatch = line.match(/^\s*-\s+(.+)$/);
    if (noteMatch) {
      current.notes.push(noteMatch[1].trim());
    }
  }

  flush();
  return actions;
}

function derivePriorities(worklogContent) {
  return extractSectionBullets(worklogContent, '## Current goals').slice(0, 4).map((text, index) => ({
    id: `priority-${index + 1}-${slugify(text)}`,
    text,
    done: false
  }));
}

function deriveAgileTasks(worklogContent) {
  const currentGoals = extractSectionBullets(worklogContent, '## Current goals');
  const openTasks = extractSectionBullets(worklogContent, '## Open tasks now');
  const actions = parseWorklogActions(worklogContent);
  const baseTimeMs = fs.existsSync(worklogPath) ? fs.statSync(worklogPath).mtimeMs : Date.now();
  let offset = 0;
  const nextTimestamp = () => new Date(baseTimeMs - offset++ * 60000).toISOString();

  const recurring = currentGoals.map((text, index) => ({
    id: `goal-${index + 1}-${slugify(text)}`,
    title: text,
    description: 'Reflected from WORKLOG current goals.',
    priority: inferPriority(text),
    column: 'recurring',
    assignee: 'Sosai',
    type: 'Goal',
    area: inferArea(text),
    createdAt: nextTimestamp(),
    source: 'WORKLOG current goals'
  }));

  const inProgress = actions
    .filter((item) => /^Partial success$/i.test(item.status))
    .slice(-4)
    .reverse()
    .map((item, index) => ({
      id: `in-progress-${index + 1}-${slugify(item.title)}`,
      title: item.title,
      description: item.notes[0] || 'Reflected from a partial-success worklog entry.',
      priority: inferPriority(item.title),
      column: 'in-progress',
      assignee: 'Sosai',
      type: 'Active Slice',
      area: inferArea(item.title),
      createdAt: nextTimestamp(),
      source: 'WORKLOG action log'
    }));

  const backlog = openTasks.map((text, index) => ({
    id: `backlog-${index + 1}-${slugify(text)}`,
    title: text,
    description: 'Reflected from WORKLOG open tasks.',
    priority: inferPriority(text),
    column: 'backlog',
    assignee: 'Sosai',
    type: 'Open Task',
    area: inferArea(text),
    createdAt: nextTimestamp(),
    source: 'WORKLOG open tasks'
  }));

  const done = actions
    .filter((item) => /^Success$/i.test(item.status))
    .slice(-6)
    .reverse()
    .map((item, index) => ({
      id: `done-${index + 1}-${slugify(item.title)}`,
      title: item.title,
      description: item.notes[0] || 'Reflected from a successful worklog entry.',
      priority: inferPriority(item.title),
      column: 'done',
      assignee: 'Sosai',
      type: 'Completed Slice',
      area: inferArea(item.title),
      createdAt: nextTimestamp(),
      source: 'WORKLOG action log'
    }));

  return [...recurring, ...backlog, ...inProgress, ...done];
}

function deriveCheckingIn(worklogContent, agileTasks, futureWork) {
  const knownCaveats = extractSectionBullets(worklogContent, '## Known caveats');
  const activeTask = agileTasks.find((task) => task.column === 'in-progress') || agileTasks.find((task) => task.column === 'backlog') || null;
  return {
    projectDirectory: projectRoot,
    currentTask: activeTask?.title || 'No active reflected task',
    blockers: knownCaveats.slice(0, 3),
    nextSteps: futureWork.slice(0, 3).map((item) => item.text)
  };
}

function loadProjectDocuments() {
  return [
    'WORKLOG.md',
    'DEVELOPER-DIARY.md',
    'SPEC-AUDIT.md',
    'PORTABILITY.md',
    'AUTOMATION-ARCHITECTURE.md',
    'TOKEN-COST-ANALYSIS.md',
    '0-Memory.md',
    '1-create-HTML-prompt.md',
    '2-create-modules.md',
    '3-backend-server.md',
    '4-config.md',
    '5-mcp-server.md',
    '6-SEO-agent.md',
    '7-prompt-caching.md',
    '8-Layered-AI-Model-Stack.md'
  ].map((name) => readMarkdownEntry(path.join(projectRoot, name), 'project-doc')).filter(Boolean);
}

function loadConfiguredAgents() {
  const config = fs.existsSync(configPath) ? JSON.parse(fs.readFileSync(configPath, 'utf8')) : {};
  const configured = Array.isArray(config.agents?.list) ? config.agents.list : [];
  const defaultModel = config.agents?.defaults?.model?.primary || 'default';
  const roleMap = {
    main: 'COO',
    researcher: 'Researcher',
    operator: 'Operator',
    critic: 'Critic',
    analyst: 'Analyst',
    archivist: 'Archivist',
    writer: 'Writer'
  };
  const teamMap = {
    main: 'Leadership',
    researcher: 'Research',
    operator: 'Operations',
    critic: 'Governance',
    analyst: 'Analysis',
    archivist: 'Memory',
    writer: 'Comms'
  };
  const capabilityMap = {
    main: ['Project > Feature > PBI orchestration', 'Delegation', 'Progress oversight'],
    researcher: ['Research', 'Source gathering', 'Context inputs'],
    operator: ['Execution', 'Browser/system/tool actions', 'Implementation'],
    critic: ['Risk review', 'Plan challenge', 'Quality gates'],
    analyst: ['Post-execution review', 'Performance evaluation', 'Improvement suggestions'],
    archivist: ['Memory updates', 'Decision trails', 'Lessons learned'],
    writer: ['Summaries', 'Reports', 'Briefings']
  };

  return configured.map((agent, index) => ({
    id: agent.id,
    name: agent.name || agent.identity?.name || agent.id,
    role: roleMap[agent.id] || agent.name || 'Specialist',
    status: agent.id === 'main' ? 'online' : 'ready',
    model: typeof agent.model === 'string'
      ? agent.model
      : agent.model?.primary || defaultModel,
    lastActive: new Date(Date.now() - index * 300000).toISOString(),
    description: truncate(agent.systemPromptOverride || `${agent.name || agent.id} configured in openclaw.json`, 220),
    capabilities: capabilityMap[agent.id] || ['Configured role agent'],
    performanceNotes: `Real configured agent reflected from ${configPath}`,
    activity: [
      {
        id: `${agent.id}-config-activity`,
        message: `Configured role agent loaded from openclaw.json as ${roleMap[agent.id] || agent.id}.`,
        timestamp: new Date().toISOString()
      }
    ],
    reportsTo: agent.id === 'main' ? null : 'main',
    team: teamMap[agent.id] || 'Operations'
  }));
}

function loadProjects(agileTasks) {
  const registryPath = path.join(workspaceDir, 'memory', 'projects.md');
  const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
  const lines = registry.split(/\r?\n/).filter((line) => line.trim().startsWith('|'));
  const projectRows = lines.slice(2);
  const missionDone = agileTasks.filter((task) => task.column === 'done').length;
  const missionTotal = agileTasks.length || 1;

  return projectRows.map((row) => {
    const cells = row.split('|').slice(1, -1).map((cell) => cell.trim());
    const [name, status, stack, notes, projectPath] = cells;
    const missionControl = /mission control/i.test(name || '');
    const relatedTasks = missionControl
      ? agileTasks
      : agileTasks.filter((task) => new RegExp(slugify(name || '').replace(/-/g, '.*'), 'i').test(task.title || ''));
    const doneTasks = relatedTasks.filter((task) => task.column === 'done').length;
    const percent = missionControl
      ? Math.round((missionDone / missionTotal) * 100)
      : relatedTasks.length ? Math.round((doneTasks / relatedTasks.length) * 100) : 0;

    return {
      id: `project-${slugify(name)}`,
      name: name || 'Unnamed project',
      status: (status || 'unknown').toLowerCase().replace(/\s+/g, '-'),
      owner: missionControl ? 'Sosai' : 'Shared',
      priority: missionControl ? 'high' : 'medium',
      description: notes || stack || 'No project notes captured yet.',
      percent,
      stack: stack || 'Unspecified',
      path: projectPath || '',
      taskCount: relatedTasks.length,
      activeTaskCount: relatedTasks.filter((task) => task.column === 'in-progress').length,
      doneTaskCount: doneTasks
    };
  });
}

const worklogContent = fs.existsSync(worklogPath) ? fs.readFileSync(worklogPath, 'utf8') : '';
const memoryEntries = listMarkdownEntries(path.join(workspaceDir, 'memory'), 'daily-memory');
const documents = [
  'AGENTS.md','SOUL.md','USER.md','TOOLS.md','HEARTBEAT.md','MEMORY.md'
].map((name) => readMarkdownEntry(path.join(workspaceDir, name), 'workspace-doc')).filter(Boolean).concat(loadProjectDocuments());
const conversations = loadConversations();
const git = loadGit();
const apiInventory = loadApiInventory();
const futureWork = loadFutureWork();
const priorities = derivePriorities(worklogContent);
const agileTasks = deriveAgileTasks(worklogContent);
const checkingIn = deriveCheckingIn(worklogContent, agileTasks, futureWork);
const gatewayReflection = loadGatewayReflection();
const openclawFootprint = loadOpenClawFootprint();
const command = { agents: loadConfiguredAgents(), decisions: [] };
const projects = loadProjects(agileTasks);
const assistantAudit = loadAssistantAudit(memoryEntries, documents, conversations, git, apiInventory, checkingIn, gatewayReflection, openclawFootprint);

const payload = {
  generatedAt: new Date().toISOString(),
  priorities,
  projects,
  command,
  memoryEntries,
  documents,
  conversations,
  assistantAudit,
  apiInventory,
  git,
  gatewayReflection,
  openclawFootprint,
  email: { sent: [] },
  futureWork,
  agileTasks,
  checkingIn
};

fs.writeFileSync(outPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
