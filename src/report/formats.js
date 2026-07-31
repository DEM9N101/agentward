/**
 * Machine-readable output. SARIF exists so a scan can run in CI and land in
 * GitHub's Security tab without anyone writing glue.
 */
import { VERSION } from '../index.js';
import { RULES, categoryOf } from '../rules/index.js';

export function renderJson(result) {
  return JSON.stringify(
    {
      version: result.version,
      scannedAt: result.scannedAt,
      durationMs: result.durationMs,
      score: result.score,
      grade: result.grade,
      counts: result.counts,
      suppressed: result.suppressed,
      summary: result.summary,
      findings: result.findings,
      errors: result.errors,
    },
    null,
    2,
  );
}

/** Only the fingerprints, for `--write-baseline`. */
export function renderBaseline(result) {
  return JSON.stringify(
    {
      version: 1,
      createdAt: new Date().toISOString(),
      note: 'Findings listed here are treated as accepted risks and suppressed on future runs.',
      accepted: result.findings.map((f) => ({
        fingerprint: f.fingerprint,
        ruleId: f.ruleId,
        title: f.title,
      })),
    },
    null,
    2,
  );
}

const SARIF_LEVEL = { critical: 'error', high: 'error', medium: 'warning', low: 'note', info: 'note' };
const SARIF_RANK = { critical: 100, high: 80, medium: 50, low: 20, info: 5 };

export function renderSarif(result) {
  const usedRules = [...new Set(result.findings.map((f) => f.ruleId))];
  const ruleIndex = new Map(usedRules.map((id, i) => [id, i]));

  return JSON.stringify(
    {
      $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
      version: '2.1.0',
      runs: [
        {
          tool: {
            driver: {
              name: 'agentward',
              version: VERSION,
              informationUri: 'https://github.com/DEM9N101/agentward',
              rules: usedRules.map((id) => {
                const rule = RULES.find((r) => r.id === id);
                return {
                  id,
                  name: rule?.title ?? id,
                  shortDescription: { text: rule?.title ?? id },
                  properties: { category: categoryOf(id) },
                };
              }),
            },
          },
          results: result.findings.map((f) => ({
            ruleId: f.ruleId,
            ruleIndex: ruleIndex.get(f.ruleId),
            level: SARIF_LEVEL[f.severity] ?? 'note',
            rank: SARIF_RANK[f.severity] ?? 5,
            message: { text: `${f.title}. ${f.why} ${f.fix}` },
            partialFingerprints: { agentwardFingerprint: f.fingerprint },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: toUri(f.file) },
                  region: f.line ? { startLine: f.line } : undefined,
                },
              },
            ],
          })),
        },
      ],
    },
    null,
    2,
  );
}

function toUri(file) {
  if (!file) return 'unknown';
  return file.replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:');
}

export function renderMarkdown(result) {
  const lines = [];
  lines.push('# agentward report');
  lines.push('');
  lines.push(`**Score ${result.score}/100 (${result.grade})** — scanned ${result.summary.total} artifacts in ${result.durationMs} ms, entirely offline.`);
  lines.push('');

  const counted = ['critical', 'high', 'medium', 'low', 'info']
    .filter((s) => result.counts[s])
    .map((s) => `${result.counts[s]} ${s}`)
    .join(' · ');
  if (counted) lines.push(counted);
  lines.push('');

  lines.push('## What is installed');
  lines.push('');
  lines.push('| Vendor | Artifacts |');
  lines.push('| --- | --- |');
  for (const [vendor, count] of Object.entries(result.summary.byVendor).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${vendor} | ${count} |`);
  }
  lines.push('');

  if (!result.findings.length) {
    lines.push('## Findings');
    lines.push('');
    lines.push('Nothing to flag.');
    return lines.join('\n');
  }

  lines.push('## Findings');
  lines.push('');
  for (const f of result.findings) {
    lines.push(`### ${f.severity.toUpperCase()} — ${f.title}`);
    lines.push('');
    lines.push(`\`${f.ruleId}\` · \`${f.file}${f.line ? `:${f.line}` : ''}\``);
    lines.push('');
    if (f.evidence) {
      lines.push('```');
      lines.push(f.evidence);
      lines.push('```');
      lines.push('');
    }
    lines.push(f.why);
    lines.push('');
    lines.push(`**Fix:** ${f.fix}`);
    lines.push('');
  }
  return lines.join('\n');
}
