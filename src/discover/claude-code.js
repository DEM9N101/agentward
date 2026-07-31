/**
 * Claude Code has the widest surface of any current agent: MCP servers,
 * skills, plugins from third-party marketplaces, hooks that run shell commands
 * on every event, subagents, slash commands and always-loaded context files.
 */
import path from 'node:path';
import { artifact, CAPABILITY } from '../model.js';
import { readJson, readText, exists, isDir, home, lineOf, walk } from '../fs-util.js';
import { normalizeMcpServers } from './mcp.js';
import { discoverSkills, discoverMarkdownDefs, discoverContextFile } from './markdown.js';

const VENDOR = 'claude-code';

export function discoverClaudeCode({ homeDir = home(), cwd = process.cwd() } = {}) {
  const artifacts = [];
  const claudeDir = path.join(homeDir, '.claude');
  if (!exists(claudeDir) && !exists(path.join(homeDir, '.claude.json'))) return artifacts;

  artifacts.push(...fromClaudeJson(path.join(homeDir, '.claude.json')));

  for (const name of ['settings.json', 'settings.local.json']) {
    artifacts.push(...fromSettings(path.join(claudeDir, name), 'user'));
  }

  artifacts.push(...discoverSkills(path.join(claudeDir, 'skills'), { vendor: VENDOR, origin: 'user' }));
  artifacts.push(...discoverPluginSkills(path.join(claudeDir, 'plugins', 'cache')));
  artifacts.push(...discoverMarkdownDefs(path.join(claudeDir, 'agents'), { vendor: VENDOR, kind: 'subagent' }));
  artifacts.push(...discoverMarkdownDefs(path.join(claudeDir, 'commands'), { vendor: VENDOR, kind: 'command' }));
  artifacts.push(...discoverHookScripts(path.join(claudeDir, 'hooks')));

  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    const file = path.join(claudeDir, name);
    if (exists(file)) artifacts.push(...discoverContextFile(file, { vendor: VENDOR }));
  }

  artifacts.push(...discoverMarketplaces(claudeDir));

  // Project scope: the repo you happen to be standing in.
  const projectDir = path.join(cwd, '.claude');
  if (isDir(projectDir)) {
    for (const name of ['settings.json', 'settings.local.json']) {
      artifacts.push(...fromSettings(path.join(projectDir, name), 'project'));
    }
    artifacts.push(
      ...discoverSkills(path.join(projectDir, 'skills'), { vendor: VENDOR, scope: 'project', origin: 'project' }),
    );
    artifacts.push(
      ...discoverMarkdownDefs(path.join(projectDir, 'agents'), { vendor: VENDOR, kind: 'subagent', scope: 'project' }),
    );
    artifacts.push(
      ...discoverMarkdownDefs(path.join(projectDir, 'commands'), { vendor: VENDOR, kind: 'command', scope: 'project' }),
    );
  }
  for (const name of ['.mcp.json']) {
    const file = path.join(cwd, name);
    if (exists(file)) {
      const raw = readText(file);
      const cfg = readJson(file);
      artifacts.push(
        ...normalizeMcpServers(cfg?.mcpServers, { vendor: VENDOR, file, raw, scope: 'project' }),
      );
    }
  }
  for (const name of ['CLAUDE.md', 'AGENTS.md']) {
    const file = path.join(cwd, name);
    if (exists(file)) {
      artifacts.push(...discoverContextFile(file, { vendor: VENDOR, scope: 'project' }));
    }
  }

  return artifacts;
}

function fromClaudeJson(file) {
  if (!exists(file)) return [];
  const raw = readText(file, 8 * 1024 * 1024);
  const cfg = readJson(file);
  if (!cfg) return [];

  const out = normalizeMcpServers(cfg.mcpServers, { vendor: VENDOR, file, raw, scope: 'user' });

  for (const [projectPath, project] of Object.entries(cfg.projects ?? {})) {
    if (!project || typeof project !== 'object') continue;
    out.push(
      ...normalizeMcpServers(project.mcpServers, {
        vendor: VENDOR,
        file,
        raw,
        scope: 'project',
        idPrefix: `${VENDOR}:${path.basename(projectPath)}`,
      }),
    );
  }
  return out;
}

function fromSettings(file, scope) {
  if (!exists(file)) return [];
  const raw = readText(file);
  const cfg = readJson(file);
  if (!cfg) return [];

  const out = normalizeMcpServers(cfg.mcpServers, { vendor: VENDOR, file, raw, scope });

  out.push(
    artifact({
      id: `${VENDOR}:settings:${scope}:${path.basename(file)}`,
      vendor: VENDOR,
      kind: 'settings',
      name: path.basename(file),
      file,
      scope,
      capabilities: [],
      text: raw,
      data: {
        permissions: cfg.permissions ?? null,
        enabledPlugins: cfg.enabledPlugins ?? null,
        extraKnownMarketplaces: cfg.extraKnownMarketplaces ?? null,
        env: cfg.env ?? null,
        statusLine: cfg.statusLine ?? null,
        raw: cfg,
      },
    }),
  );

  out.push(...hooksFromSettings(cfg, file, raw, scope));
  return out;
}

function hooksFromSettings(cfg, file, raw, scope) {
  const out = [];
  const hooks = cfg.hooks;
  if (!hooks || typeof hooks !== 'object') return out;

  for (const [event, entries] of Object.entries(hooks)) {
    for (const entry of [].concat(entries ?? [])) {
      const matcher = entry?.matcher ?? '*';
      for (const hook of [].concat(entry?.hooks ?? entry ?? [])) {
        const command = hook?.command ?? (typeof hook === 'string' ? hook : null);
        if (!command) continue;
        out.push(
          artifact({
            id: `${VENDOR}:hook:${event}:${matcher}:${out.length}`,
            vendor: VENDOR,
            kind: 'hook',
            name: `${event} (${matcher})`,
            file,
            line: lineOf(raw, command.slice(0, 40)),
            scope,
            capabilities: [CAPABILITY.EXEC, CAPABILITY.FS_READ, CAPABILITY.NETWORK],
            text: command,
            data: { event, matcher, command, type: hook?.type ?? 'command' },
          }),
        );
      }
    }
  }

  // A status line is a shell command executed on every render, in the same
  // position of trust as a hook, but nobody thinks of it that way.
  const statusLine = cfg.statusLine;
  if (statusLine?.command) {
    out.push(
      artifact({
        id: `${VENDOR}:hook:statusLine`,
        vendor: VENDOR,
        kind: 'hook',
        name: 'statusLine',
        file,
        line: lineOf(raw, 'statusLine'),
        scope,
        capabilities: [CAPABILITY.EXEC, CAPABILITY.FS_READ, CAPABILITY.NETWORK],
        text: statusLine.command,
        data: { event: 'StatusLine', matcher: '*', command: statusLine.command, type: statusLine.type ?? 'command' },
      }),
    );
  }
  return out;
}

function discoverPluginSkills(cacheDir) {
  if (!isDir(cacheDir)) return [];
  const skills = discoverSkills(cacheDir, { vendor: VENDOR, origin: 'plugin' });
  for (const skill of skills) {
    // .../plugins/cache/<marketplace>/<plugin>/<version>/skills/<name>/SKILL.md
    const rel = path.relative(cacheDir, skill.file).split(/[\\/]/);
    skill.data.marketplace = rel[0] ?? null;
    skill.data.plugin = rel[1] ?? null;
    skill.data.version = rel[2] ?? null;
    skill.data.origin = 'plugin';
  }
  return skills;
}

function discoverHookScripts(dir) {
  if (!isDir(dir)) return [];
  const files = walk(dir, { maxDepth: 3, maxEntries: 500 });
  return files
    .filter((f) => /\.(sh|bash|ps1|cmd|bat|js|mjs|cjs|py)$/i.test(f.name))
    .map((f) =>
      artifact({
        id: `${VENDOR}:hook-script:${f.name}`,
        vendor: VENDOR,
        kind: 'hook',
        name: f.name,
        file: f.path,
        capabilities: [CAPABILITY.EXEC, CAPABILITY.FS_READ, CAPABILITY.NETWORK],
        text: readText(f.path),
        data: { event: 'script', matcher: '*', command: f.path, type: 'file' },
      }),
    );
}

function discoverMarketplaces(claudeDir) {
  const out = [];
  const candidates = [
    path.join(claudeDir, 'plugins', 'known_marketplaces.json'),
    path.join(claudeDir, 'plugins', 'installed_plugins.json'),
    path.join(claudeDir, 'marketplace.json'),
  ];

  for (const file of candidates) {
    if (!exists(file)) continue;
    const cfg = readJson(file);
    if (!cfg) continue;
    const entries = cfg.marketplaces ?? cfg.plugins ?? cfg;
    if (!entries || typeof entries !== 'object') continue;

    for (const [name, value] of Object.entries(entries)) {
      if (!value || typeof value !== 'object') continue;
      const source = value.source ?? value.repo ?? value.url ?? null;
      out.push(
        artifact({
          id: `${VENDOR}:plugin-source:${name}`,
          vendor: VENDOR,
          kind: 'plugin',
          name,
          file,
          capabilities: [CAPABILITY.PROMPT, CAPABILITY.EXEC],
          text: JSON.stringify(value),
          data: { source, raw: value },
        }),
      );
    }
  }
  return out;
}
