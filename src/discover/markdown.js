/**
 * Skills, subagents, slash commands and context files are all "a markdown file
 * whose text is fed to a model". They differ only in where they live and how
 * they are triggered, so one scanner covers them all.
 */
import path from 'node:path';
import fs from 'node:fs';
import { artifact, CAPABILITY } from '../model.js';
import { readText, walk, statSafe, EXECUTABLE_EXT } from '../fs-util.js';

/** Extract the leading `---` frontmatter block. Not a full YAML parser. */
export function parseFrontmatter(text) {
  const match = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text ?? '');
  if (!match) return { attrs: {}, body: text ?? '' };

  const attrs = {};
  let key = null;
  for (const line of match[1].split(/\r?\n/)) {
    if (/^\s*#/.test(line) || !line.trim()) continue;
    const kv = /^([A-Za-z0-9_.-]+)\s*:\s*(.*)$/.exec(line);
    if (kv) {
      key = kv[1];
      const value = kv[2].trim().replace(/^["']|["']$/g, '');
      attrs[key] = value === '' ? [] : value;
      continue;
    }
    const item = /^\s*-\s+(.*)$/.exec(line);
    if (item && key) {
      if (!Array.isArray(attrs[key])) attrs[key] = attrs[key] ? [attrs[key]] : [];
      attrs[key].push(item[1].trim().replace(/^["']|["']$/g, ''));
    }
  }
  return { attrs, body: text.slice(match[0].length) };
}

/**
 * A skill's directory is part of its attack surface: bundled scripts run with
 * the agent's privileges, and nothing displays them to you.
 */
function inspectSkillDirectory(dir) {
  const files = walk(dir, { maxDepth: 4, maxEntries: 2000 });
  const executables = [];
  const symlinks = [];
  let totalBytes = 0;

  for (const file of files) {
    const ext = path.extname(file.name).toLowerCase();
    if (EXECUTABLE_EXT.has(ext)) executables.push(file.path);
    if (file.isSymlink) {
      let target = null;
      try {
        target = fs.realpathSync(file.path);
      } catch {
        target = null;
      }
      if (!target || !target.startsWith(fs.realpathSync(dir))) symlinks.push({ path: file.path, target });
    }
    const stat = statSafe(file.path);
    if (stat) totalBytes += stat.size;
  }

  return { fileCount: files.length, executables, escapingSymlinks: symlinks, totalBytes };
}

/**
 * Scan a directory tree for SKILL.md files.
 * @param {string} root
 * @param {{ vendor: string, scope?: string, origin?: string }} ctx
 */
export function discoverSkills(root, ctx) {
  const out = [];
  const files = walk(root, { maxDepth: 8, maxEntries: 20000, filter: (f) => f.name.toLowerCase() === 'skill.md' });

  for (const file of files) {
    const text = readText(file.path);
    if (!text) continue;
    const { attrs, body } = parseFrontmatter(text);
    const dir = path.dirname(file.path);
    const name = String(attrs.name ?? path.basename(dir));
    const dirInfo = inspectSkillDirectory(dir);
    const stat = statSafe(file.path);

    const capabilities = [CAPABILITY.PROMPT];
    if (dirInfo.executables.length) capabilities.push(CAPABILITY.EXEC);

    out.push(
      artifact({
        id: `${ctx.vendor}:skill:${path.relative(root, dir).replace(/\\/g, '/') || name}`,
        vendor: ctx.vendor,
        kind: 'skill',
        name,
        file: file.path,
        scope: ctx.scope ?? 'user',
        capabilities,
        text: body,
        data: {
          description: attrs.description ?? '',
          allowedTools: attrs['allowed-tools'] ?? attrs.allowedTools ?? null,
          frontmatter: attrs,
          dir,
          origin: ctx.origin ?? null,
          modifiedAt: stat?.mtimeMs ?? null,
          ...dirInfo,
        },
      }),
    );
  }

  return out;
}

/**
 * Scan a flat directory of markdown definitions (subagents, slash commands).
 * @param {string} dir
 * @param {{ vendor: string, kind: string, scope?: string }} ctx
 */
export function discoverMarkdownDefs(dir, ctx) {
  const files = walk(dir, { maxDepth: 3, maxEntries: 2000, filter: (f) => f.name.toLowerCase().endsWith('.md') });
  const out = [];

  for (const file of files) {
    const text = readText(file.path);
    if (!text) continue;
    const { attrs, body } = parseFrontmatter(text);
    const name = String(attrs.name ?? path.basename(file.name, '.md'));
    out.push(
      artifact({
        id: `${ctx.vendor}:${ctx.kind}:${name}`,
        vendor: ctx.vendor,
        kind: ctx.kind,
        name,
        file: file.path,
        scope: ctx.scope ?? 'user',
        capabilities: [CAPABILITY.PROMPT],
        text: body,
        data: { frontmatter: attrs, description: attrs.description ?? '' },
      }),
    );
  }
  return out;
}

/**
 * Context files (CLAUDE.md, AGENTS.md, GEMINI.md) are injected into every
 * single prompt, which makes them the highest-leverage place to hide an
 * instruction.
 */
export function discoverContextFile(file, ctx) {
  const text = readText(file);
  if (!text) return [];
  return [
    artifact({
      id: `${ctx.vendor}:context:${path.basename(file)}`,
      vendor: ctx.vendor,
      kind: 'context-file',
      name: path.basename(file),
      file,
      scope: ctx.scope ?? 'user',
      capabilities: [CAPABILITY.PROMPT],
      text,
      data: { alwaysLoaded: true },
    }),
  ];
}
