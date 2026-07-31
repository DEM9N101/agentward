/**
 * Where the code came from.
 *
 * Most agent installs happen by pasting a JSON snippet from a README. Nothing
 * records who wrote it, nothing pins a version, and nothing tells you when it
 * changes underneath you.
 */
import path from 'node:path';
import { finding } from '../model.js';
import { isUserWritableTransientPath } from '../fs-util.js';
import { snippet } from './util.js';

/** `npx -y thing` with no version resolves to whatever was published last. */
const UNPINNED_RUNNER = /\b(?:npx|bunx|pnpx|dlx)\b/;
const UNPINNED_PY_RUNNER = /\b(?:uvx|pipx\s+run)\b/;
const VERSION_PINNED = /@(?:\d+\.\d+|\^|~|>=|\d)/;

export const provenanceRules = [
  {
    id: 'AW501',
    title: 'Code executed from a user-writable location',
    appliesTo: (art) => art.kind === 'mcp-server' || art.kind === 'hook',
    run(art) {
      const candidates = [art.data?.command, ...(art.data?.args ?? []), art.data?.cwd].filter(
        (v) => typeof v === 'string',
      );
      const hit = candidates.find((c) => isUserWritableTransientPath(c));
      if (!hit) return [];
      return [
        finding(art, {
          ruleId: 'AW501',
          title: `"${art.name}" executes code from ${path.dirname(hit).split(/[\\/]/).slice(-2).join('/')}`,
          severity: 'high',
          evidence: hit,
          why: 'Downloads, Desktop and temp directories are writable by every process running as you, and their contents have no provenance. A file there can be replaced without touching anything privileged.',
          fix: 'Move the server into a directory you control and install it as a real package, or at minimum out of Downloads and temp.',
        }),
      ];
    },
  },

  {
    id: 'AW502',
    title: 'Unpinned package fetched at launch',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      const command = String(art.data?.command ?? '');
      const args = (art.data?.args ?? []).map(String);
      const isNode = UNPINNED_RUNNER.test(command);
      const isPy = UNPINNED_PY_RUNNER.test(command);
      if (!isNode && !isPy) return [];

      const pkg = args.find((a) => !a.startsWith('-') && a !== 'run');
      if (!pkg) return [];
      if (VERSION_PINNED.test(pkg) && !/@latest$/.test(pkg)) return [];

      return [
        finding(art, {
          ruleId: 'AW502',
          title: `MCP server "${art.name}" installs ${pkg} unpinned on every launch`,
          severity: 'medium',
          evidence: `${command} ${args.join(' ')}`,
          why: 'The version you audited is not the version that runs tomorrow. Whoever can publish that package can change what executes on your machine, with no action from you.',
          fix: `Pin an exact version, for example ${pkg.replace(/@latest$/, '')}@1.2.3, and update deliberately.`,
        }),
      ];
    },
  },

  {
    id: 'AW503',
    title: 'Remote MCP endpoint over plaintext HTTP',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      const url = String(art.data?.url ?? '');
      const inArgs = (art.data?.args ?? []).map(String).find((a) => /^http:\/\//i.test(a));
      const target = /^http:\/\//i.test(url) ? url : inArgs;
      if (!target) return [];
      if (/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])/i.test(target)) return [];
      return [
        finding(art, {
          ruleId: 'AW503',
          title: `MCP server "${art.name}" talks over unencrypted HTTP`,
          severity: 'high',
          evidence: target,
          why: 'Requests and responses, including any authorization header, travel in the clear and can be read or modified by anything on the path.',
          fix: 'Switch the endpoint to HTTPS. Treat any credential sent over it as exposed.',
        }),
      ];
    },
  },

  {
    id: 'AW504',
    title: 'Plugin installed from a third-party marketplace',
    appliesTo: (art) => art.kind === 'plugin',
    run(art) {
      const source = art.data?.source;
      const repo =
        typeof source === 'string'
          ? source
          : source?.repo ?? source?.source?.repo ?? source?.url ?? source?.source?.url ?? null;
      if (!repo) return [];
      return [
        finding(art, {
          ruleId: 'AW504',
          title: `Plugin source "${art.name}" resolves to ${repo}`,
          severity: 'info',
          evidence: String(repo),
          why: 'Plugins carry skills, hooks and MCP servers, so adding a marketplace is a standing grant of code execution to whoever controls that repository.',
          fix: 'Check you recognise the owner, and that you still want it. Remove marketplaces you no longer use.',
        }),
      ];
    },
  },

  {
    id: 'AW505',
    title: 'Loose script with no package boundary',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      const args = (art.data?.args ?? []).map(String);
      const command = String(art.data?.command ?? '');
      if (!/(?:^|[\\/])(?:python[\d.]*|node|deno|bun|ruby|perl|pwsh|powershell)(?:\.exe)?$/i.test(command)) return [];
      const script = args.find((a) => /\.(?:py|js|mjs|cjs|rb|pl|ps1|ts)$/i.test(a));
      if (!script) return [];
      if (/[\\/](?:site-packages|node_modules|dist-packages|Cellar)[\\/]/i.test(script)) return [];
      if (isUserWritableTransientPath(script)) return []; // AW501 already said it louder.
      return [
        finding(art, {
          ruleId: 'AW505',
          title: `MCP server "${art.name}" runs a standalone script`,
          severity: 'low',
          evidence: snippet(script, 0, 100),
          why: 'The script sits outside any package manager, so there is no version, no checksum and no record of where it came from. Nothing will tell you if it changes.',
          fix: 'Keep it in version control, or install it as a package so changes are visible.',
        }),
      ];
    },
  },
];
