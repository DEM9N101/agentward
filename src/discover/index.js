import { home } from '../fs-util.js';
import { discoverClaudeCode } from './claude-code.js';
import { discoverVendors, discoverInheritedEnv } from './vendors.js';

/**
 * Find everything on this machine that can influence or act on behalf of an
 * AI agent.
 *
 * @param {{ homeDir?: string, cwd?: string, includeEnv?: boolean }} [options]
 * @returns {import('../model.js').Artifact[]}
 */
export function discoverAll({ homeDir = home(), cwd = process.cwd(), includeEnv = true } = {}) {
  const artifacts = [
    ...discoverClaudeCode({ homeDir, cwd }),
    ...discoverVendors({ homeDir, cwd }),
    ...(includeEnv ? discoverInheritedEnv() : []),
  ];

  // Two vendors can point at the same file (a shared settings.json); keep one.
  const seen = new Set();
  return artifacts.filter((a) => {
    const key = `${a.id}|${a.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { discoverClaudeCode, discoverVendors };
