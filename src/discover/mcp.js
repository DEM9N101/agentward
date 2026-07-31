/**
 * Every agent product invented its own config file and then agreed on the same
 * MCP server shape inside it. This normalizes that shape once so the vendor
 * modules stay thin.
 */
import { artifact, CAPABILITY } from '../model.js';
import { findSecrets } from '../secrets.js';
import { lineOf } from '../fs-util.js';

/**
 * @param {Record<string, any>} servers  The `mcpServers` map.
 * @param {{ vendor: string, file: string, raw?: string, scope?: string, idPrefix?: string }} ctx
 */
export function normalizeMcpServers(servers, ctx) {
  if (!servers || typeof servers !== 'object') return [];
  const out = [];

  for (const [name, cfg] of Object.entries(servers)) {
    if (!cfg || typeof cfg !== 'object') continue;

    const command = cfg.command ?? cfg.cmd ?? null;
    const args = Array.isArray(cfg.args) ? cfg.args : [];
    const env = cfg.env && typeof cfg.env === 'object' ? cfg.env : {};
    const url = cfg.url ?? cfg.serverUrl ?? cfg.endpoint ?? null;
    const headers = cfg.headers && typeof cfg.headers === 'object' ? cfg.headers : {};
    const transport = cfg.type ?? cfg.transport ?? (command ? 'stdio' : url ? 'http' : 'unknown');
    const autoApprove = cfg.autoApprove ?? cfg.alwaysAllow ?? cfg.auto_approve ?? null;
    const disabled = cfg.disabled === true || cfg.enabled === false;

    const capabilities = [];
    if (command) {
      // A stdio server is a local process launched with your privileges. There
      // is no sandbox in the protocol; it can do whatever you can do.
      capabilities.push(CAPABILITY.EXEC, CAPABILITY.FS_READ, CAPABILITY.FS_WRITE, CAPABILITY.NETWORK);
    }
    if (url) capabilities.push(CAPABILITY.NETWORK);

    const credentialSurface = JSON.stringify({ env, headers, args, url });
    if (findSecrets(credentialSurface).length > 0) capabilities.push(CAPABILITY.CREDENTIALS);

    const searchable = [command, ...args.map(String), url].filter(Boolean).join(' ');

    out.push(
      artifact({
        id: `${ctx.idPrefix ?? ctx.vendor}:mcp:${name}`,
        vendor: ctx.vendor,
        kind: 'mcp-server',
        name,
        file: ctx.file,
        line: ctx.raw ? lineOf(ctx.raw, `"${name}"`) : undefined,
        scope: ctx.scope ?? 'user',
        capabilities,
        text: searchable,
        data: { command, args, env, url, headers, transport, autoApprove, disabled, raw: cfg },
      }),
    );
  }

  return out;
}

/**
 * Pull `mcpServers`-shaped maps out of a parsed config, wherever the vendor
 * decided to put them.
 */
export function collectMcpMaps(config) {
  if (!config || typeof config !== 'object') return [];
  const found = [];
  const candidates = [
    ['mcpServers', config.mcpServers],
    ['mcp_servers', config.mcp_servers],
    ['servers', config.servers],
    ['mcp', config.mcp?.servers ?? (isServerMap(config.mcp) ? config.mcp : null)],
    ['context_servers', config.context_servers],
  ];
  for (const [key, value] of candidates) {
    if (value && typeof value === 'object' && !Array.isArray(value)) found.push({ key, servers: value });
  }
  return found;
}

function isServerMap(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value).some(
    (v) => v && typeof v === 'object' && ('command' in v || 'url' in v || 'type' in v),
  );
}
