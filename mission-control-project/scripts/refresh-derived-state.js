const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, execFileSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');
const appDir = path.join(projectRoot, 'app');
const outPath = path.join(appDir, 'mc-derived-state.json');
const fallbackDataPath = path.join(appDir, 'mc-data.json');
const openclawHome = path.join(os.homedir(), '.openclaw');
const workspaceDir = path.join(openclawHome, 'workspace');
const configPath = path.join(openclawHome, 'openclaw.json');
const sessionDir = path.join(openclawHome, 'agents', 'main', 'sessions');
const logPath = path.join(os.homedir(), 'AppData', 'Local', 'Temp', 'openclaw', 'openclaw-2026-04-20.log');
const workQueuePath = path.join(workspaceDir, 'work-queue.md');
const projectRegistryPath = path.join(workspaceDir, 'memory', 'projects.md');
const worklogPath = path.join(workspaceDir, 'WORKLOG.md');
const projectWorklogPath = path.join(projectRoot, 'WORKLOG.md');
const diaryPath = path.join(projectRoot, 'DEVELOPER-DIARY.md');

function truncate(text, max = 4000) {
  text = String(text || '').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function stripWrappingCodeTicks(value) {
  const text = String(value || '').trim();
  return text.replace(/^`+|`+$/g, '').trim();
}

function loadProjectRegistryItems() {
  const registryPath = projectRegistryPath;
  if (!fs.existsSync(registryPath)) return [];

  return fs.readFileSync(registryPath, 'utf8')
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'))
    .slice(2)
    .map((row) => row.split('|').slice(1, -1).map((cell) => stripWrappingCodeTicks(cell)))
    .filter((cells) => cells.length >= 8)
    .map(([project, priority, status, feature, pbi, blocker, nextAction, projectPath]) => ({
      project,
      priority,
      status,
      feature,
      pbi,
      blocker,
      nextAction,
      path: projectPath
    }));
}

function summarizeCommandLine(commandLine) {
  return truncate(String(commandLine || '').replace(/\s+/g, ' '), 220);
}

function normalizeWindowsProcessTimestamp(value) {
  const text = String(value || '').trim();
  const match = text.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
  if (!match) return text || null;
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

function loadOpenClawManagedProcesses() {
  if (process.platform !== 'win32') return [];

  try {
    const raw = execFileSync('wmic', [
      'process',
      'where',
      "name='powershell.exe' or name='node.exe' or name='cmd.exe'",
      'get',
      'ProcessId,Name,CommandLine',
      '/format:csv'
    ], {
      stdio: ['ignore', 'pipe', 'ignore']
    }).toString().trim();

    if (!raw) return [];
    const items = raw
      .split(/\r?\n/)
      .slice(1)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(',');
        if (parts.length < 4) return null;
        const [nodeName, commandLine, name, processId] = parts;
        return {
          Node: nodeName,
          CommandLine: commandLine || '',
          Name: name || '',
          ProcessId: processId || ''
        };
      })
      .filter(Boolean)
      .filter((entry) => /openclaw|ralph\.ps1/i.test(entry.CommandLine || ''));

    return items
      .map((entry) => {
        const commandLine = String(entry.CommandLine || '');
        const normalized = commandLine.toLowerCase();
        const isRalph = /ralph\.ps1/i.test(commandLine);
        const isGateway = /gateway --port|\\.openclaw\\gateway\.cmd|node_modules\\openclaw.*\bgateway\b/i.test(commandLine);
        const isShell = /powershell|cmd\.exe/i.test(String(entry.Name || ''));
        const kind = isRalph ? 'loop-runner-shell' : isGateway ? 'gateway-service' : isShell ? 'shell' : 'openclaw-process';
        const label = isRalph
          ? 'Ralph PowerShell loop'
          : isGateway
            ? 'OpenClaw Gateway'
            : normalized.includes('openclaw')
              ? 'OpenClaw runtime process'
              : (entry.Name || 'OpenClaw process');

        return {
          pid: Number(entry.ProcessId) || 0,
          name: entry.Name || 'process',
          label,
          kind,
          shell: isShell,
          startedAt: normalizeWindowsProcessTimestamp(entry.CreationDate),
          command: summarizeCommandLine(commandLine)
        };
      })
      .sort((a, b) => {
        const priority = { 'loop-runner-shell': 0, 'gateway-service': 1, shell: 2, 'openclaw-process': 3 };
        return (priority[a.kind] ?? 9) - (priority[b.kind] ?? 9);
      });
  } catch {
    return [];
  }
}

function loadCompanyRuntimeSummary() {
  const projectItems = loadProjectRegistryItems();
  const currentWork = projectItems
    .filter((item) => /in progress|not done|active/i.test(item.status || ''))
    .slice(0, 4);
  const managedProcesses = loadOpenClawManagedProcesses();
  const activeShells = managedProcesses.filter((entry) => entry.shell);
  const gatewayProcess = managedProcesses.find((entry) => entry.kind === 'gateway-service');
  const ralphProcess = managedProcesses.find((entry) => entry.kind === 'loop-runner-shell');

  const workflowDiagram = [
    '[Affan / Discord operator]',
    '            |',
    '            v',
    '[OpenClaw Gateway + CLI]',
    '            |',
    '            v',
    '[Ralph loop runner]',
    '            |',
    '            v',
    '[Read AGENTS.md + projects.md + work-queue.md]',
    '            |',
    '            v',
    '[COO -> Critic -> Operator -> Analyst -> Archivist]',
    '            |',
    '            v',
    '[One bounded validated slice]',
    '            |',
    '            v',
    '[Update Mission Control + logs + state + notify Discord]'
  ].join('\n');

  const orgChart = [
    '[COO / Sosai]',
    ' |-- [Critic] challenge plan before work',
    ' |-- [Operator] execute one bounded slice',
    ' |-- [Analyst] validate the result',
    ' |-- [Archivist] update queue, registry, logs, memory',
    ' `-- [Writer] format operator-facing summaries'
  ].join('\n');

  const softwareDiagram = [
    '[Discord approved channel]',
    '          |',
    '          v',
    '[OpenClaw Gateway]',
    '          |',
    '          v',
    '[OpenClaw CLI agent turns]',
    '          |',
    '          v',
    '[PowerShell: ralph.ps1]',
    '          |',
    '          v',
    '[Mission Control work + tests + logs]'
  ].join('\n');

  const softwareStack = [
    {
      id: 'gateway',
      label: 'OpenClaw Gateway',
      status: gatewayProcess ? 'running' : 'not-detected',
      detail: gatewayProcess ? `PID ${gatewayProcess.pid} • ${gatewayProcess.command}` : 'No live gateway process reflected from OpenClaw-managed commands.'
    },
    {
      id: 'ralph',
      label: 'Ralph loop runner',
      status: ralphProcess ? 'running' : 'not-detected',
      detail: ralphProcess ? `PID ${ralphProcess.pid} • ${ralphProcess.command}` : 'No live Ralph loop runner reflected right now.'
    },
    {
      id: 'agent-turns',
      label: 'OpenClaw fresh agent turns',
      status: ralphProcess ? 'active' : 'ready',
      detail: ralphProcess ? 'Ralph is promoting fresh runs through the OpenClaw CLI.' : 'Ready for fresh-run continuation when the loop runner is active.'
    }
  ];

  return {
    refreshedAt: new Date().toISOString(),
    currentWork,
    managedProcesses,
    activeShells,
    softwareStack,
    workflowDiagram,
    orgChart,
    softwareDiagram
  };
}

function classifyDocumentEntry(filePath, type) {
  const base = path.basename(filePath);
  const ext = path.extname(base).toLowerCase();
  const normalized = base.toLowerCase();

  let sourceKind = type;
  let fileKind = ext ? ext.replace(/^\./, '') : 'text';

  if (type === 'daily-memory') {
    sourceKind = 'daily-memory';
    fileKind = 'memory-log';
  } else if (type === 'workspace-doc') {
    sourceKind = 'workspace-doc';
    if (/^heartbeat\.md$/i.test(base)) fileKind = 'heartbeat';
    else if (/^memory\.md$/i.test(base)) fileKind = 'memory-root';
    else if (/^projects\.md$/i.test(base)) fileKind = 'project-registry';
    else fileKind = 'workspace-doc';
  } else if (type === 'project-doc') {
    sourceKind = 'project-doc';
    if (/worklog/.test(normalized)) fileKind = 'worklog';
    else if (/diary/.test(normalized)) fileKind = 'developer-diary';
    else if (/spec-audit/.test(normalized)) fileKind = 'spec-audit';
    else if (/portability/.test(normalized)) fileKind = 'portability-guide';
    else if (/automation-architecture/.test(normalized)) fileKind = 'automation-architecture';
    else if (/token-cost-analysis/.test(normalized)) fileKind = 'cost-analysis';
    else if (/^\d+-/.test(base)) fileKind = 'source-prompt';
  }

  return { sourceKind, fileKind };
}

function readMarkdownEntry(filePath, type) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  const stat = fs.statSync(filePath);
  const lines = content.split(/\r?\n/).filter(Boolean);
  const classification = classifyDocumentEntry(filePath, type);
  return {
    id: filePath,
    title: path.basename(filePath),
    type,
    sourceKind: classification.sourceKind,
    fileKind: classification.fileKind,
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

function extractTextContent(content) {
  if (!Array.isArray(content)) return '';
  return content
    .filter((item) => item && item.type === 'text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n\n')
    .trim();
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
    const role = entry.message.role === 'assistant' ? 'assistant' : 'user';
    const text = extractTextContent(entry.message.content);
    if (!text) return null;
    return {
      id: entry.id,
      from: role === 'assistant' ? 'Sosai' : 'User',
      to: role === 'assistant' ? 'User' : 'Sosai',
      role,
      message: truncate(text),
      visibility: 'discord-session-transcript',
      timestamp: entry.timestamp
    };
  }).filter(Boolean).slice(-100).reverse();
}

function parseGitStatusLines(output) {
  const lines = String(output || '').split(/\r?\n/).filter(Boolean);
  const changedFiles = [];
  const summary = {
    dirty: false,
    clean: true,
    stagedCount: 0,
    unstagedCount: 0,
    untrackedCount: 0,
    conflictedCount: 0,
    renamedCount: 0,
    deletedCount: 0,
    changedCount: 0,
    stagedFiles: [],
    unstagedFiles: [],
    untrackedFiles: [],
    conflictedFiles: [],
    renamedFiles: [],
    deletedFiles: [],
    externalChangeCount: 0,
    repoLocalChangeCount: 0,
    externalChangedFiles: [],
    repoChangedFiles: []
  };

  lines.forEach((line) => {
    const statusCode = line.slice(0, 2);
    const filePath = line.slice(3).trim();
    if (!filePath) return;

    const staged = statusCode[0];
    const unstaged = statusCode[1];
    const entry = {
      path: filePath,
      code: statusCode,
      staged: staged !== ' ' && staged !== '?',
      unstaged: unstaged !== ' ',
      untracked: statusCode === '??',
      conflicted: /[AUUDCR]/.test(staged) && /[AUUDCR]/.test(unstaged),
      renamed: statusCode.includes('R'),
      deleted: statusCode.includes('D'),
      external: filePath.startsWith('..')
    };

    if (entry.untracked) {
      summary.untrackedCount += 1;
      summary.untrackedFiles.push(filePath);
    } else {
      if (entry.staged) {
        summary.stagedCount += 1;
        summary.stagedFiles.push(filePath);
      }
      if (entry.unstaged) {
        summary.unstagedCount += 1;
        summary.unstagedFiles.push(filePath);
      }
      if (entry.conflicted || statusCode.includes('U')) {
        summary.conflictedCount += 1;
        summary.conflictedFiles.push(filePath);
      }
    }

    if (entry.renamed) {
      summary.renamedCount += 1;
      summary.renamedFiles.push(filePath);
    }

    if (entry.deleted) {
      summary.deletedCount += 1;
      summary.deletedFiles.push(filePath);
    }

    if (entry.external) {
      summary.externalChangeCount += 1;
      summary.externalChangedFiles.push(filePath);
    } else {
      summary.repoLocalChangeCount += 1;
      summary.repoChangedFiles.push(filePath);
    }

    changedFiles.push(entry);
  });

  summary.changedCount = changedFiles.length;
  summary.dirty = summary.changedCount > 0;
  summary.clean = !summary.dirty;
  return { summary, changedFiles };
}

function emptyGitSnapshot(overrides = {}) {
  return {
    available: false,
    pathStatus: 'unavailable',
    repo: null,
    branch: null,
    remote: null,
    remoteUrl: null,
    upstream: null,
    remoteHost: null,
    repoRoot: null,
    currentScope: null,
    worktrees: [],
    ahead: 0,
    behind: 0,
    entries: [],
    workingTree: {
      dirty: false,
      clean: true,
      stagedCount: 0,
      unstagedCount: 0,
      untrackedCount: 0,
      conflictedCount: 0,
      changedCount: 0,
      stagedFiles: [],
      unstagedFiles: [],
      untrackedFiles: [],
      conflictedFiles: []
    },
    changedFiles: [],
    ...overrides
  };
}

const gitSnapshotCache = new Map();

function loadGitSnapshot(targetPath, options = {}) {
  const logLimit = Number(options.logLimit) > 0 ? Number(options.logLimit) : 20;
  const normalizedTargetPath = String(targetPath || '').trim();
  if (!normalizedTargetPath) return emptyGitSnapshot({ pathStatus: 'missing-path' });

  const resolvedTargetPath = path.resolve(normalizedTargetPath);
  const cacheKey = `${resolvedTargetPath}::${logLimit}`;
  if (gitSnapshotCache.has(cacheKey)) return gitSnapshotCache.get(cacheKey);

  if (!fs.existsSync(resolvedTargetPath)) {
    const snapshot = emptyGitSnapshot({ pathStatus: 'missing-path' });
    gitSnapshotCache.set(cacheKey, snapshot);
    return snapshot;
  }

  try {
    const repoRoot = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const remoteUrl = execFileSync('git', ['config', '--get', 'remote.origin.url'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
    const upstream = remoteUrl
      ? execFileSync('git', ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      : null;
    const repo = remoteUrl ? remoteUrl.split('/').pop().replace(/\.git$/i, '') : path.basename(repoRoot || resolvedTargetPath);
    const remoteHostMatch = remoteUrl.match(/^(?:https?:\/\/|ssh:\/\/)?(?:[^@]+@)?([^/:]+)/i);
    const remoteHost = remoteHostMatch ? remoteHostMatch[1] : null;
    const aheadBehindArgs = upstream
      ? ['rev-list', '--left-right', '--count', `${upstream}...${branch}`]
      : ['rev-list', '--left-right', '--count', `${branch}...${branch}`];
    const aheadBehind = execFileSync('git', aheadBehindArgs, { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split(/\s+/);
    const log = execFileSync('git', ['log', '--pretty=format:%H%x1f%h%x1f%s%x1f%an%x1f%aI', '-n', String(logLimit)], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const statusOutput = execFileSync('git', ['status', '--short'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const worktreeOutput = execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: resolvedTargetPath, stdio: ['ignore', 'pipe', 'ignore'] }).toString();
    const { summary: workingTree, changedFiles } = parseGitStatusLines(statusOutput);
    const worktrees = worktreeOutput
      .split(/\r?\n\r?\n/)
      .map((block) => block.split(/\r?\n/).filter(Boolean))
      .map((lines) => {
        if (!lines.length) return null;
        const worktreeLine = lines.find((line) => line.startsWith('worktree '));
        const branchLine = lines.find((line) => line.startsWith('branch '));
        const detached = lines.includes('detached');
        return worktreeLine ? {
          path: worktreeLine.slice('worktree '.length).trim(),
          branch: branchLine ? branchLine.slice('branch '.length).trim().replace(/^refs\/heads\//, '') : null,
          detached
        } : null;
      })
      .filter(Boolean);
    const currentScope = worktrees.find((entry) => path.resolve(entry.path) === resolvedTargetPath) || { path: resolvedTargetPath, branch };
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
      .map((entry, index) => ({ ...entry, repo, branch, remote: remoteUrl ? 'origin' : 'local', remoteUrl, upstream, remoteHost, pushed: index >= ahead }));
    const snapshot = {
      available: true,
      pathStatus: 'repo',
      repo,
      branch,
      remote: remoteUrl ? 'origin' : 'local',
      remoteUrl,
      upstream,
      remoteHost,
      repoRoot,
      currentScope,
      worktrees,
      ahead,
      behind,
      entries,
      workingTree,
      changedFiles
    };
    gitSnapshotCache.set(cacheKey, snapshot);
    return snapshot;
  } catch {
    const snapshot = emptyGitSnapshot({ pathStatus: 'not-repo' });
    gitSnapshotCache.set(cacheKey, snapshot);
    return snapshot;
  }
}

function loadGit() {
  return loadGitSnapshot(projectRoot, { logLimit: 20 });
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
      configAudit: loadConfigAuditSummary(),
      companyRuntime: loadCompanyRuntimeSummary()
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

function loadWorkQueuePbis() {
  if (!fs.existsSync(workQueuePath)) return [];

  const lines = fs.readFileSync(workQueuePath, 'utf8').split(/\r?\n/);
  const items = [];
  let currentProject = '';
  let currentFeature = '';
  let current = null;
  let collectingSuccessCriteria = false;

  const flush = () => {
    if (!current || !current.title) return;
    current.successCriteria = current.successCriteria.filter(Boolean);
    items.push(current);
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const projectMatch = line.match(/^##\s+Project:\s+(.+)$/);
    if (projectMatch) {
      flush();
      current = null;
      currentProject = projectMatch[1].trim();
      currentFeature = '';
      collectingSuccessCriteria = false;
      continue;
    }

    const featureMatch = line.match(/^###\s+Feature:\s+(.+)$/);
    if (featureMatch) {
      flush();
      current = null;
      currentFeature = featureMatch[1].trim();
      collectingSuccessCriteria = false;
      continue;
    }

    const pbiMatch = line.match(/^####\s+PBI:\s+(.+)$/);
    if (pbiMatch) {
      flush();
      current = {
        project: currentProject,
        feature: currentFeature,
        title: pbiMatch[1].trim(),
        owner: 'Shared',
        status: 'not_done',
        nextAction: '',
        blocker: 'none',
        successCriteria: []
      };
      collectingSuccessCriteria = false;
      continue;
    }

    if (!current) continue;

    const ownerMatch = line.match(/^-\s+Owner:\s+(.+)$/);
    if (ownerMatch) {
      current.owner = ownerMatch[1].trim();
      collectingSuccessCriteria = false;
      continue;
    }

    const statusMatch = line.match(/^-\s+Status:\s+`?([^`]+)`?$/);
    if (statusMatch) {
      current.status = statusMatch[1].trim().toLowerCase();
      collectingSuccessCriteria = false;
      continue;
    }

    if (/^-\s+Success Criteria:\s*$/.test(line)) {
      collectingSuccessCriteria = true;
      continue;
    }

    const nextActionMatch = line.match(/^-\s+Next Action:\s+(.+)$/);
    if (nextActionMatch) {
      current.nextAction = nextActionMatch[1].trim();
      collectingSuccessCriteria = false;
      continue;
    }

    const blockerMatch = line.match(/^-\s+Blocker:\s+(.+)$/);
    if (blockerMatch) {
      current.blocker = blockerMatch[1].trim();
      collectingSuccessCriteria = false;
      continue;
    }

    if (collectingSuccessCriteria) {
      const criteriaMatch = line.match(/^\s*-\s+(.+)$/);
      if (criteriaMatch) {
        current.successCriteria.push(criteriaMatch[1].trim());
        continue;
      }
      if (line.trim()) collectingSuccessCriteria = false;
    }
  }

  flush();
  return items;
}

function derivePriorities(worklogContent, workQueuePbis = []) {
  if (workQueuePbis.length) {
    return workQueuePbis
      .filter((item) => item.status === 'in_progress' || item.status === 'not_done' || item.status === 'blocked')
      .slice(0, 4)
      .map((item, index) => ({
        id: `priority-${index + 1}-${slugify(`${item.project}-${item.title}`)}`,
        text: `${item.project}: ${item.title}`,
        done: false
      }));
  }

  return extractSectionBullets(worklogContent, '## Current goals').slice(0, 4).map((text, index) => ({
    id: `priority-${index + 1}-${slugify(text)}`,
    text,
    done: false
  }));
}

function deriveAgileTasks(worklogContent, workQueuePbis = []) {
  const actions = parseWorklogActions(worklogContent);
  const baseTimeMs = fs.existsSync(worklogPath) ? fs.statSync(worklogPath).mtimeMs : Date.now();
  let offset = 0;
  const nextTimestamp = () => new Date(baseTimeMs - offset++ * 60000).toISOString();

  const queueTasks = workQueuePbis.map((item, index) => {
    const isBlocked = item.status === 'blocked';
    const column = item.status === 'in_progress'
      ? 'in-progress'
      : item.status === 'done'
        ? 'done'
        : 'backlog';
    const detailParts = [
      item.feature ? `Feature: ${item.feature}` : '',
      item.nextAction ? `Next: ${item.nextAction}` : '',
      isBlocked && item.blocker && !/^none$/i.test(item.blocker) ? `Blocked: ${item.blocker}` : ''
    ].filter(Boolean);

    return {
      id: `work-queue-${index + 1}-${slugify(`${item.project}-${item.title}`)}`,
      title: item.title,
      description: detailParts.join(' • ') || 'Reflected from workspace work queue.',
      priority: inferPriority(`${item.project} ${item.feature} ${item.title}`),
      column,
      assignee: item.owner || 'Shared',
      type: isBlocked ? 'Blocked PBI' : item.status === 'in_progress' ? 'Active PBI' : item.status === 'done' ? 'Completed PBI' : 'Queued PBI',
      area: item.project || inferArea(item.title),
      createdAt: nextTimestamp(),
      source: 'workspace work-queue',
      project: item.project,
      feature: item.feature,
      blocker: item.blocker,
      nextAction: item.nextAction
    };
  });

  if (queueTasks.length) {
    const doneFromWorklog = actions
      .filter((item) => /^Success$/i.test(item.status))
      .slice(-4)
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

    return [...queueTasks.filter((task) => task.column !== 'done'), ...doneFromWorklog, ...queueTasks.filter((task) => task.column === 'done')];
  }

  const currentGoals = extractSectionBullets(worklogContent, '## Current goals');
  const openTasks = extractSectionBullets(worklogContent, '## Open tasks now');

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

function deriveCheckingIn(worklogContent, agileTasks, futureWork, projects = []) {
  const knownCaveats = extractSectionBullets(worklogContent, '## Known caveats');
  const activeTask = agileTasks.find((task) => task.column === 'in-progress') || agileTasks.find((task) => task.column === 'backlog') || null;
  const missionControlProject = projects.find((project) => /mission control/i.test(project?.name || '')) || null;
  const reflectedBlockers = missionControlProject?.blocker && !/^none$/i.test(missionControlProject.blocker)
    ? [missionControlProject.blocker]
    : [];
  const reflectedNextSteps = [missionControlProject?.nextAction, ...futureWork.map((item) => item.text)]
    .filter(Boolean)
    .slice(0, 3);

  return {
    projectDirectory: missionControlProject?.path || projectRoot,
    currentTask: missionControlProject?.currentPbi || activeTask?.title || 'No active reflected task',
    blockers: [...reflectedBlockers, ...knownCaveats].slice(0, 3),
    nextSteps: reflectedNextSteps
  };
}

function getStructuredProjectTasks(agileTasks, projectName) {
  const normalizedProjectName = String(projectName || '').trim().toLowerCase();
  if (!normalizedProjectName) return [];

  const explicitlyLinkedTasks = agileTasks.filter((task) => String(task.project || '').trim().toLowerCase() === normalizedProjectName);
  if (explicitlyLinkedTasks.length) return explicitlyLinkedTasks;

  return agileTasks.filter((task) => {
    if (task.project) return false;
    return new RegExp(slugify(projectName || '').replace(/-/g, '.*'), 'i').test(task.title || '');
  });
}

function syncFallbackMissionControlState(payload) {
  const existing = readJsonSafe(fallbackDataPath, {});
  const existingTasks = Array.isArray(existing.tasks) ? existing.tasks : [];
  const reflectedTasks = Array.isArray(payload.agileTasks) ? payload.agileTasks : [];
  const preservedLocalTasks = existingTasks.filter((task) => {
    if (!task || typeof task !== 'object') return false;
    return !['workspace work-queue', 'WORKLOG action log', 'WORKLOG current goals', 'WORKLOG open tasks'].includes(task.source);
  });
  const next = {
    ...existing,
    tasks: [...reflectedTasks, ...preservedLocalTasks],
    projects: Array.isArray(payload.projects) ? payload.projects : existing.projects,
    checkingIn: payload.checkingIn && typeof payload.checkingIn === 'object' ? payload.checkingIn : existing.checkingIn,
    assistantAudit: Array.isArray(payload.assistantAudit)
      ? { items: payload.assistantAudit }
      : (existing.assistantAudit || { items: [] })
  };

  fs.writeFileSync(fallbackDataPath, JSON.stringify(next, null, 2) + '\n', 'utf8');
  console.log(`Synced fallback Mission Control state in ${fallbackDataPath}`);
}

function loadProjectDocuments() {
  const projectDocumentPaths = [
    projectWorklogPath,
    path.join(projectRoot, 'DEVELOPER-DIARY.md'),
    path.join(projectRoot, 'SPEC-AUDIT.md'),
    path.join(projectRoot, 'PORTABILITY.md'),
    path.join(projectRoot, 'AUTOMATION-ARCHITECTURE.md'),
    path.join(projectRoot, 'TOKEN-COST-ANALYSIS.md'),
    path.join(projectRoot, '0-Memory.md'),
    path.join(projectRoot, '1-create-HTML-prompt.md'),
    path.join(projectRoot, '2-create-modules.md'),
    path.join(projectRoot, '3-backend-server.md'),
    path.join(projectRoot, '4-config.md'),
    path.join(projectRoot, '5-mcp-server.md'),
    path.join(projectRoot, '6-SEO-agent.md'),
    path.join(projectRoot, '7-prompt-caching.md'),
    path.join(projectRoot, '8-Layered-AI-Model-Stack.md')
  ];
  return projectDocumentPaths.map((docPath) => readMarkdownEntry(docPath, 'project-doc')).filter(Boolean);
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

function normalizeProjectStatus(status) {
  return String(status || 'unknown').toLowerCase().replace(/\s+/g, '-');
}

function normalizeProjectPriority(priority, missionControl = false) {
  const normalized = String(priority || '').trim().toLowerCase();
  if (['p0', 'p1', 'critical', 'highest', 'high'].includes(normalized)) return 'high';
  if (['p2', 'medium', 'normal'].includes(normalized)) return 'medium';
  if (['p3', 'p4', 'low'].includes(normalized)) return 'low';
  return missionControl ? 'high' : 'medium';
}

function loadProjects(agileTasks) {
  const registryPath = projectRegistryPath;
  const registry = fs.existsSync(registryPath) ? fs.readFileSync(registryPath, 'utf8') : '';
  const lines = registry.split(/\r?\n/).filter((line) => line.trim().startsWith('|'));
  const projectRows = lines.slice(2);
  const missionDone = agileTasks.filter((task) => task.column === 'done').length;
  const missionTotal = agileTasks.length || 1;

  return projectRows.map((row) => {
    const cells = row.split('|').slice(1, -1).map((cell) => stripWrappingCodeTicks(cell));
    const isExpandedRegistry = cells.length >= 8;
    const [
      name,
      priorityOrStatus,
      statusOrStack,
      featureOrNotes,
      pbiOrPath,
      blocker,
      nextAction,
      explicitPath
    ] = cells;

    const legacyStatus = priorityOrStatus;
    const legacyStack = statusOrStack;
    const legacyNotes = featureOrNotes;
    const legacyPath = pbiOrPath;

    const priority = isExpandedRegistry ? priorityOrStatus : (/(mission control)/i.test(name || '') ? 'high' : 'medium');
    const status = isExpandedRegistry ? statusOrStack : legacyStatus;
    const stack = isExpandedRegistry ? featureOrNotes : legacyStack;
    const currentPbi = isExpandedRegistry ? pbiOrPath : '';
    const notes = isExpandedRegistry
      ? [currentPbi, nextAction].filter(Boolean).join(' • ')
      : legacyNotes;
    const projectPath = isExpandedRegistry ? explicitPath : legacyPath;

    const missionControl = /mission control/i.test(name || '');
    const relatedTasks = getStructuredProjectTasks(agileTasks, name);
    const doneTasks = relatedTasks.filter((task) => task.column === 'done').length;
    const percent = missionControl
      ? Math.round((missionDone / missionTotal) * 100)
      : relatedTasks.length ? Math.round((doneTasks / relatedTasks.length) * 100) : 0;

    const repoPulseSource = projectPath ? loadGitSnapshot(projectPath, { logLimit: 5 }) : emptyGitSnapshot({ pathStatus: 'missing-path' });
    const latestEntry = repoPulseSource.entries[0] || null;
    const repoLocalChangeCount = Number(repoPulseSource.workingTree?.repoLocalChangeCount) || 0;
    const externalChangeCount = Number(repoPulseSource.workingTree?.externalChangeCount) || 0;
    const repoPulse = {
      available: Boolean(repoPulseSource.available),
      pathStatus: repoPulseSource.pathStatus,
      repo: repoPulseSource.repo || null,
      branch: repoPulseSource.branch || null,
      remote: repoPulseSource.remote || null,
      ahead: Number(repoPulseSource.ahead) || 0,
      behind: Number(repoPulseSource.behind) || 0,
      dirty: Boolean(repoPulseSource.workingTree?.dirty),
      changedCount: Number(repoPulseSource.workingTree?.changedCount) || 0,
      repoLocalChangeCount,
      externalChangeCount,
      repoChangedFiles: Array.isArray(repoPulseSource.workingTree?.repoChangedFiles) ? repoPulseSource.workingTree.repoChangedFiles.slice(0, 6) : [],
      externalChangedFiles: Array.isArray(repoPulseSource.workingTree?.externalChangedFiles) ? repoPulseSource.workingTree.externalChangedFiles.slice(0, 6) : [],
      repoRoot: repoPulseSource.repoRoot || null,
      currentScope: repoPulseSource.currentScope?.path || repoPulseSource.currentScope || null,
      latest: latestEntry ? {
        shortHash: latestEntry.shortHash,
        subject: latestEntry.subject,
        date: latestEntry.date,
        author: latestEntry.author,
        pushed: Boolean(latestEntry.pushed)
      } : null
    };

    return {
      id: `project-${slugify(name)}`,
      name: name || 'Unnamed project',
      status: normalizeProjectStatus(status),
      owner: missionControl ? 'Sosai' : 'Shared',
      priority: normalizeProjectPriority(priority, missionControl),
      description: notes || stack || 'No project notes captured yet.',
      percent,
      stack: stack || 'Unspecified',
      path: projectPath || '',
      blocker: isExpandedRegistry ? (blocker || 'None') : 'None',
      currentPbi: isExpandedRegistry ? (currentPbi || '') : '',
      nextAction: isExpandedRegistry ? (nextAction || '') : '',
      taskCount: relatedTasks.length,
      activeTaskCount: relatedTasks.filter((task) => task.column === 'in-progress').length,
      doneTaskCount: doneTasks,
      repoPulse
    };
  });
}

const worklogContent = fs.existsSync(worklogPath) ? fs.readFileSync(worklogPath, 'utf8') : '';
const memoryEntries = listMarkdownEntries(path.join(workspaceDir, 'memory'), 'daily-memory');
const documents = [
  'AGENTS.md','SOUL.md','USER.md','TOOLS.md','HEARTBEAT.md','MEMORY.md'
].map((name) => readMarkdownEntry(path.join(workspaceDir, name), 'workspace-doc')).filter(Boolean).concat(loadProjectDocuments());
const conversations = loadConversations();
const safeConversationDocuments = conversations
  .filter((entry) => entry.role === 'user')
  .slice(-20)
  .map((entry) => ({
    id: `conversation:${entry.id}`,
    title: `Conversation note ${entry.timestamp || entry.id}`,
    type: 'conversation-note',
    sourceKind: 'conversation-note',
    fileKind: 'conversation-note',
    summary: truncate(entry.message, 220),
    content: truncate(entry.message, 4000),
    timestamp: entry.timestamp || new Date().toISOString(),
    path: 'session-transcript'
  }));
const git = loadGit();
const apiInventory = loadApiInventory();
const futureWork = loadFutureWork();
const workQueuePbis = loadWorkQueuePbis();
const priorities = derivePriorities(worklogContent, workQueuePbis);
const agileTasks = deriveAgileTasks(worklogContent, workQueuePbis);
const gatewayReflection = loadGatewayReflection();
const openclawFootprint = loadOpenClawFootprint();
const command = { agents: loadConfiguredAgents(), decisions: [] };
const projects = loadProjects(agileTasks);
const checkingIn = deriveCheckingIn(worklogContent, agileTasks, futureWork, projects);
const assistantAudit = loadAssistantAudit(memoryEntries, documents, conversations, git, apiInventory, checkingIn, gatewayReflection, openclawFootprint);

const payload = {
  generatedAt: new Date().toISOString(),
  sourceState: {
    workspaceDir,
    workQueuePath,
    workspaceWorklogPath: worklogPath,
    projectWorklogPath,
    projectRegistryPath,
    missionControlDerivedStatePath: outPath
  },
  priorities,
  projects,
  command,
  memoryEntries,
  documents: [...documents, ...safeConversationDocuments],
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
syncFallbackMissionControlState(payload);
