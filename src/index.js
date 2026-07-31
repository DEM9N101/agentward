/**
 * Public API. `audit()` is the whole tool; the CLI is a thin wrapper.
 */
import crypto from 'node:crypto';
import { discoverAll } from './discover/index.js';
import { runRules, categoryOf } from './rules/index.js';
import { compareFindings, SEVERITY } from './model.js';
import { home } from './fs-util.js';

export const VERSION = '0.1.0';

const SEVERITY_WEIGHT = { critical: 25, high: 10, medium: 4, low: 1, info: 0 };

/**
 * One noisy rule firing forty times says the same thing as it firing three
 * times, so each rule's contribution is capped.
 */
const MAX_OCCURRENCES_COUNTED = 3;

/** Controls how fast the score decays. Larger is more forgiving. */
const DECAY = 60;

/**
 * A stable identity for a finding, so an accepted risk stays accepted across
 * runs even as line numbers move.
 */
export function fingerprint(finding) {
  const basis = [finding.ruleId, finding.artifactId, finding.file, finding.evidence].join('|');
  return crypto.createHash('sha256').update(basis).digest('hex').slice(0, 16);
}

/**
 * Exponential decay rather than straight subtraction.
 *
 * A linear score bottoms out at zero almost immediately and then stops telling
 * you anything: a machine with two problems and a machine with forty both read
 * "0". Decay keeps every result distinguishable while still making a single
 * critical finding hurt.
 */
export function scoreOf(findings) {
  const perRule = new Map();
  for (const f of findings) {
    const key = f.ruleId ?? f.severity;
    perRule.set(key, (perRule.get(key) ?? 0) + 1);
  }

  let deduction = 0;
  for (const f of findings) {
    const key = f.ruleId ?? f.severity;
    const seen = perRule.get(`counted:${key}`) ?? 0;
    if (seen >= MAX_OCCURRENCES_COUNTED) continue;
    perRule.set(`counted:${key}`, seen + 1);
    deduction += SEVERITY_WEIGHT[f.severity] ?? 0;
  }

  return Math.round(100 * Math.exp(-deduction / DECAY));
}

export function gradeOf(score) {
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  if (score >= 55) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/**
 * @param {Object} [options]
 * @param {string} [options.homeDir]
 * @param {string} [options.cwd]
 * @param {string[]} [options.only]    Rule ids or categories to run exclusively.
 * @param {string[]} [options.skip]    Rule ids or categories to exclude.
 * @param {string[]} [options.baseline] Fingerprints to treat as accepted.
 * @param {boolean} [options.includeEnv]
 * @param {import('./model.js').Artifact[]} [options.artifacts] Pre-supplied, for tests.
 */
export function audit(options = {}) {
  const startedAt = Date.now();
  const artifacts = options.artifacts ?? discoverAll({
    homeDir: options.homeDir ?? home(),
    cwd: options.cwd ?? process.cwd(),
    includeEnv: options.includeEnv !== false,
  });

  const { findings: raw, errors } = runRules(artifacts, { only: options.only, skip: options.skip });

  const baseline = new Set(options.baseline ?? []);
  const findings = [];
  let suppressed = 0;

  /**
   * Plugins routinely ship the same skill many times over: one copy per
   * translation, per editor directory, per vendored path. Counting each copy
   * separately buries the report and wrecks the score, when it is one problem
   * in one plugin. Collapse them and keep a count.
   */
  const byIssue = new Map();

  for (const f of raw) {
    const withId = { ...f, fingerprint: fingerprint(f), category: f.category ?? categoryOf(f.ruleId) };
    if (baseline.has(withId.fingerprint)) {
      suppressed++;
      continue;
    }

    const issueKey = [f.ruleId, f.kind, f.name, f.evidence].join('|');
    const existing = byIssue.get(issueKey);
    if (existing) {
      existing.occurrences++;
      if (existing.otherFiles.length < 20) existing.otherFiles.push(withId.file);
      continue;
    }

    withId.occurrences = 1;
    withId.otherFiles = [];
    byIssue.set(issueKey, withId);
    findings.push(withId);
  }

  findings.sort(compareFindings);

  const counts = Object.fromEntries(SEVERITY.map((s) => [s, 0]));
  for (const f of findings) counts[f.severity]++;

  const scored = findings.filter((f) => f.severity !== 'info');
  const score = scoreOf(scored);

  return {
    version: VERSION,
    scannedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    artifacts,
    findings,
    counts,
    suppressed,
    errors,
    score,
    grade: gradeOf(score),
    summary: summarize(artifacts),
  };
}

/** Counts by vendor and kind, for the "here is what you have installed" header. */
export function summarize(artifacts) {
  const byVendor = {};
  const byKind = {};
  for (const art of artifacts) {
    byVendor[art.vendor] = (byVendor[art.vendor] ?? 0) + 1;
    byKind[art.kind] = (byKind[art.kind] ?? 0) + 1;
  }
  return { total: artifacts.length, byVendor, byKind };
}

export { discoverAll, runRules };
