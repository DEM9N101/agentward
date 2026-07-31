/**
 * Shared vocabulary. Discovery produces Artifacts, rules turn Artifacts into
 * Findings, reporters render Findings. Nothing else crosses those seams.
 */

import { redact } from './secrets.js';

export const SEVERITY = /** @type {const} */ (['critical', 'high', 'medium', 'low', 'info']);

export const SEVERITY_RANK = Object.fromEntries(SEVERITY.map((s, i) => [s, SEVERITY.length - i]));

/**
 * Things an artifact can do to you, inferred rather than declared. This is the
 * question people actually have: not "is it malicious" but "what could it do".
 */
export const CAPABILITY = {
  EXEC: 'execute-code',
  FS_READ: 'read-files',
  FS_WRITE: 'write-files',
  NETWORK: 'network',
  CREDENTIALS: 'uses-credentials',
  PROMPT: 'steers-the-model',
};

/**
 * @typedef {Object} Artifact
 * @property {string} id            Stable identifier, e.g. "claude-code:mcp:github".
 * @property {string} vendor        Which agent product it belongs to.
 * @property {string} kind          mcp-server | skill | hook | subagent | command | settings | plugin | context-file
 * @property {string} name
 * @property {string} file          Absolute path it was found in.
 * @property {number} [line]
 * @property {Record<string, any>} [data]  Normalized structured form.
 * @property {string} [text]        Raw text, for content rules.
 * @property {string[]} [capabilities]
 * @property {string} [scope]       "user" | "project" | "system"
 */

/**
 * @typedef {Object} Finding
 * @property {string} ruleId
 * @property {string} title
 * @property {'critical'|'high'|'medium'|'low'|'info'} severity
 * @property {string} artifactId
 * @property {string} vendor
 * @property {string} kind
 * @property {string} name
 * @property {string} file
 * @property {number} [line]
 * @property {string} evidence   Already redacted. Safe to paste in public.
 * @property {string} why
 * @property {string} fix
 */

/** @returns {Artifact} */
export function artifact(fields) {
  return {
    capabilities: [],
    scope: 'user',
    data: {},
    ...fields,
  };
}

/** Longest evidence we will print. Long enough to identify, short enough to read. */
const MAX_EVIDENCE = 200;

/**
 * @returns {Finding}
 *
 * Evidence is redacted here rather than in each rule. Rules build evidence from
 * raw config values, and any one of them forgetting to redact would leak a
 * live credential into a report we tell people is safe to publish. Doing it at
 * the single point every finding passes through makes that impossible.
 */
export function finding(art, fields) {
  const evidence = fields.evidence == null ? '' : redact(String(fields.evidence));
  return {
    artifactId: art.id,
    vendor: art.vendor,
    kind: art.kind,
    name: art.name,
    file: art.file,
    line: art.line,
    ...fields,
    evidence: evidence.length > MAX_EVIDENCE ? `${evidence.slice(0, MAX_EVIDENCE)}...` : evidence,
  };
}

/** Highest severity first, then by rule id so output is deterministic. */
export function compareFindings(a, b) {
  const bySeverity = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
  if (bySeverity !== 0) return bySeverity;
  if (a.ruleId !== b.ruleId) return a.ruleId < b.ruleId ? -1 : 1;
  if (a.artifactId !== b.artifactId) return a.artifactId < b.artifactId ? -1 : 1;
  return (a.evidence ?? '').localeCompare(b.evidence ?? '');
}
