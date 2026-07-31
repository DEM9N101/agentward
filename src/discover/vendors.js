/**
 * Every other agent product. They differ in where the file lives and whether
 * it is JSON or TOML; the MCP block inside is the same shape, so one
 * table-driven scanner covers them all. Adding a new product is one entry.
 */
import path from 'node:path';
import os from 'node:os';
import { artifact, CAPABILITY } from '../model.js';
import { readJson, readText, exists, isDir, home, parseJson } from '../fs-util.js';
import { parseToml } from '../toml.js';
import { normalizeMcpServers, collectMcpMaps } from './mcp.js';
import { discoverSkills, discoverMarkdownDefs, discoverContextFile } from './markdown.js';

/**
 * An environment variable is only trusted when it points inside the home
 * directory being scanned. Otherwise `--home /somewhere/else` would silently
 * pull in the real machine's configuration, which makes the flag a lie and
 * breaks any test that relies on it.
 */
function envPathWithin(homeDir, value, fallback) {
  if (!value) return fallback;
  const a = value.replace(/\\/g, '/').toLowerCase();
  const b = homeDir.replace(/\\/g, '/').toLowerCase();
  return a.startsWith(b) ? value : fallback;
}

/** VS Code stores its user directory somewhere different on every platform. */
function vscodeUserDirs(homeDir) {
  const dirs = [];
  if (process.platform === 'win32') {
    const appData = envPathWithin(homeDir, process.env.APPDATA, path.join(homeDir, 'AppData', 'Roaming'));
    dirs.push(path.join(appData, 'Code', 'User'), path.join(appData, 'Code - Insiders', 'User'));
  } else if (process.platform === 'darwin') {
    dirs.push(path.join(homeDir, 'Library', 'Application Support', 'Code', 'User'));
  } else {
    const configHome = envPathWithin(homeDir, process.env.XDG_CONFIG_HOME, path.join(homeDir, '.config'));
    dirs.push(path.join(configHome, 'Code', 'User'));
  }
  return dirs;
}

/**
 * @returns {{ vendor: string, label: string, configs: string[], skills?: string[],
 *   agents?: string[], commands?: string[], context?: string[] }[]}
 */
export function vendorSpecs(homeDir = home()) {
  const j = (...p) => path.join(homeDir, ...p);
  const vscode = vscodeUserDirs(homeDir).flatMap((dir) => [
    path.join(dir, 'mcp.json'),
    path.join(dir, 'settings.json'),
    path.join(dir, 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json'),
    path.join(dir, 'globalStorage', 'rooveterinaryinc.roo-cline', 'settings', 'mcp_settings.json'),
  ]);

  return [
    {
      vendor: 'codex',
      label: 'OpenAI Codex CLI',
      configs: [j('.codex', 'config.toml'), j('.codex', 'config.json')],
      skills: [j('.codex', 'skills')],
      context: [j('.codex', 'AGENTS.md')],
    },
    {
      vendor: 'cursor',
      label: 'Cursor',
      configs: [j('.cursor', 'mcp.json')],
      skills: [j('.cursor', 'skills')],
      commands: [j('.cursor', 'commands')],
      context: [j('.cursorrules')],
    },
    {
      vendor: 'windsurf',
      label: 'Windsurf',
      configs: [j('.codeium', 'windsurf', 'mcp_config.json'), j('.windsurf', 'mcp_config.json')],
      context: [j('.windsurfrules')],
    },
    {
      vendor: 'gemini-cli',
      label: 'Gemini CLI',
      configs: [j('.gemini', 'settings.json')],
      skills: [j('.gemini', 'skills')],
      context: [j('.gemini', 'GEMINI.md')],
    },
    {
      vendor: 'opencode',
      label: 'opencode',
      configs: [j('.config', 'opencode', 'opencode.json'), j('.opencode', 'opencode.json')],
      skills: [j('.config', 'opencode', 'skills')],
      agents: [j('.config', 'opencode', 'agent')],
      context: [j('.config', 'opencode', 'AGENTS.md')],
    },
    {
      vendor: 'openclaw',
      label: 'OpenClaw',
      configs: [j('.openclaw', 'config.json'), j('.openclaw', 'openclaw.json'), j('.config', 'openclaw', 'config.json')],
      skills: [j('.openclaw', 'skills')],
      context: [j('.openclaw', 'AGENTS.md')],
    },
    {
      vendor: 'continue',
      label: 'Continue',
      configs: [j('.continue', 'config.json'), j('.continue', 'config.yaml')],
    },
    {
      vendor: 'cagent',
      label: 'cagent',
      configs: [j('.config', 'cagent', 'config.json'), j('.config', 'cagent', 'cagent.json')],
    },
    {
      vendor: 'zed',
      label: 'Zed',
      configs: [j('.config', 'zed', 'settings.json')],
    },
    {
      vendor: 'vscode',
      label: 'VS Code / Cline / Roo',
      configs: vscode,
    },
    {
      vendor: 'librechat',
      label: 'LibreChat',
      configs: [j('.librechat', 'librechat.yaml')],
    },
  ];
}

/** JSON or TOML, decided by extension. YAML is read as text only. */
function loadConfig(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.toml') return parseToml(readText(file));
  if (ext === '.yaml' || ext === '.yml') return null;
  return readJson(file);
}

export function discoverVendors({ homeDir = home(), cwd = process.cwd() } = {}) {
  const artifacts = [];

  for (const spec of vendorSpecs(homeDir)) {
    for (const file of spec.configs) {
      if (!exists(file)) continue;
      const raw = readText(file);
      const config = loadConfig(file);
      if (!config) continue;

      for (const { servers } of collectMcpMaps(config)) {
        artifacts.push(...normalizeMcpServers(servers, { vendor: spec.vendor, file, raw }));
      }

      artifacts.push(
        artifact({
          id: `${spec.vendor}:settings:${path.basename(file)}`,
          vendor: spec.vendor,
          kind: 'settings',
          name: path.basename(file),
          file,
          capabilities: [],
          text: raw,
          data: { raw: config, label: spec.label },
        }),
      );
    }

    for (const dir of spec.skills ?? []) {
      if (isDir(dir)) artifacts.push(...discoverSkills(dir, { vendor: spec.vendor }));
    }
    for (const dir of spec.agents ?? []) {
      if (isDir(dir)) artifacts.push(...discoverMarkdownDefs(dir, { vendor: spec.vendor, kind: 'subagent' }));
    }
    for (const dir of spec.commands ?? []) {
      if (isDir(dir)) artifacts.push(...discoverMarkdownDefs(dir, { vendor: spec.vendor, kind: 'command' }));
    }
    for (const file of spec.context ?? []) {
      if (exists(file)) artifacts.push(...discoverContextFile(file, { vendor: spec.vendor }));
    }
  }

  artifacts.push(...discoverProjectFiles(cwd));
  return artifacts;
}

/** Files that ship inside a repo you just cloned. */
function discoverProjectFiles(cwd) {
  const out = [];
  const contextFiles = ['AGENTS.md', 'GEMINI.md', '.cursorrules', '.windsurfrules', '.github/copilot-instructions.md'];
  for (const rel of contextFiles) {
    const file = path.join(cwd, rel);
    if (exists(file)) out.push(...discoverContextFile(file, { vendor: 'project', scope: 'project' }));
  }

  for (const rel of ['.cursor/mcp.json', '.vscode/mcp.json', '.opencode/opencode.json']) {
    const file = path.join(cwd, rel);
    if (!exists(file)) continue;
    const raw = readText(file);
    const config = parseJson(raw);
    if (!config) continue;
    for (const { servers } of collectMcpMaps(config)) {
      out.push(...normalizeMcpServers(servers, { vendor: 'project', file, raw, scope: 'project' }));
    }
  }

  const skillDirs = ['.claude/skills', '.cursor/skills', 'skills'];
  for (const rel of skillDirs) {
    const dir = path.join(cwd, rel);
    if (isDir(dir)) out.push(...discoverSkills(dir, { vendor: 'project', scope: 'project' }));
  }

  return out;
}

/** Environment variables holding credentials that any agent subprocess inherits. */
export function discoverInheritedEnv() {
  const interesting = Object.entries(process.env).filter(([key]) =>
    /(_KEY|_TOKEN|_SECRET|_PASSWORD|API_KEY|ACCESS_KEY|CREDENTIAL)/i.test(key),
  );
  if (!interesting.length) return [];
  return [
    artifact({
      id: 'system:env:inherited',
      vendor: 'system',
      kind: 'environment',
      name: 'inherited environment',
      file: '(process environment)',
      capabilities: [CAPABILITY.CREDENTIALS],
      text: interesting.map(([k, v]) => `${k}=${v}`).join('\n'),
      data: { names: interesting.map(([k]) => k) },
    }),
  ];
}

export { vscodeUserDirs };
