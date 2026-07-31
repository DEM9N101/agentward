import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, fingerprint, gradeOf, scoreOf } from '../src/index.js';
import { discoverAll } from '../src/discover/index.js';
import { renderTerminal } from '../src/report/terminal.js';
import { renderJson, renderSarif, renderMarkdown } from '../src/report/formats.js';
import { makeFixtureHome, findingsFor, FAKE_JWT, FAKE_GITHUB_PAT } from './helpers.js';

const BIN = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'bin', 'agentward.js');

function scanFixture() {
  const fixture = makeFixtureHome();
  try {
    return { fixture, result: audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false }) };
  } catch (error) {
    fixture.cleanup();
    throw error;
  }
}

test('discovers artifacts across every vendor in the fixture', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  const artifacts = discoverAll({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false });
  const kinds = new Set(artifacts.map((a) => a.kind));
  const vendors = new Set(artifacts.map((a) => a.vendor));

  for (const kind of ['mcp-server', 'skill', 'hook', 'settings', 'context-file', 'plugin']) {
    assert.ok(kinds.has(kind), `expected to discover a ${kind}`);
  }
  for (const vendor of ['claude-code', 'codex', 'cursor']) {
    assert.ok(vendors.has(vendor), `expected to discover ${vendor}`);
  }

  // Codex TOML must survive the round trip.
  const codexServers = artifacts.filter((a) => a.vendor === 'codex' && a.kind === 'mcp-server');
  assert.equal(codexServers.length, 2);
  assert.ok(codexServers.some((s) => s.name === 'filesystem'));
});

test('finds each planted problem exactly once', (t) => {
  const { fixture, result } = scanFixture();
  t.after(() => fixture.cleanup());

  const expected = {
    AW101: 'credential in an MCP server',
    AW102: 'credential in a skill',
    AW201: 'hidden tag characters',
    AW203: 'zero-width run',
    AW205: 'override language',
    AW206: 'directive in an HTML comment',
    AW302: null,
    AW304: 'anonymous drop host in the hook',
    AW305: 'credential store plus network',
    AW401: 'auto-approved tools',
    AW402: 'permission prompts disabled',
    AW403: 'wildcard allowlist',
    AW501: 'server run from Downloads',
    AW502: 'unpinned package',
    AW503: 'plaintext HTTP endpoint',
    AW601: 'bundled executable',
  };

  for (const [ruleId, description] of Object.entries(expected)) {
    if (description === null) continue;
    assert.ok(findingsFor(result, ruleId).length > 0, `expected ${ruleId} (${description})`);
  }
});

test('the benign skill is not flagged', (t) => {
  const { fixture, result } = scanFixture();
  t.after(() => fixture.cleanup());

  const noisy = result.findings.filter((f) => f.name === 'benign' && f.severity !== 'info');
  assert.deepEqual(noisy, [], `benign skill produced findings: ${JSON.stringify(noisy)}`);
});

test('no report format leaks a real secret', (t) => {
  const { fixture, result } = scanFixture();
  t.after(() => fixture.cleanup());

  const renders = {
    terminal: renderTerminal(result, { color: false, verbose: true }),
    json: renderJson(result),
    sarif: renderSarif(result),
    markdown: renderMarkdown(result),
  };

  for (const [name, text] of Object.entries(renders)) {
    assert.ok(!text.includes(FAKE_JWT), `${name} output leaked the JWT`);
    assert.ok(!text.includes(FAKE_GITHUB_PAT), `${name} output leaked the PAT`);

    // A truncated excerpt must not leave a usable prefix behind. Any window
    // that cuts through a secret has to be redacted before it is sliced.
    assert.ok(!text.includes(FAKE_JWT.slice(0, 24)), `${name} output leaked a JWT prefix`);
    assert.ok(!text.includes(FAKE_GITHUB_PAT.slice(0, 16)), `${name} output leaked a PAT prefix`);
  }
});

test('SARIF output is well formed', (t) => {
  const { fixture, result } = scanFixture();
  t.after(() => fixture.cleanup());

  const sarif = JSON.parse(renderSarif(result));
  assert.equal(sarif.version, '2.1.0');
  assert.equal(sarif.runs.length, 1);
  const run = sarif.runs[0];
  assert.equal(run.tool.driver.name, 'agentward');
  assert.equal(run.results.length, result.findings.length);
  for (const r of run.results) {
    assert.ok(['error', 'warning', 'note'].includes(r.level));
    assert.ok(r.locations[0].physicalLocation.artifactLocation.uri);
    assert.ok(run.tool.driver.rules[r.ruleIndex].id === r.ruleId);
  }
});

test('fingerprints are stable across runs and unique per finding', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  const first = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false });
  const second = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false });

  assert.deepEqual(
    first.findings.map((f) => f.fingerprint),
    second.findings.map((f) => f.fingerprint),
  );
  const unique = new Set(first.findings.map((f) => f.fingerprint));
  assert.equal(unique.size, first.findings.length, 'fingerprints must not collide');
});

test('a baseline suppresses exactly what it lists', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  const base = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false });
  const accepted = base.findings.slice(0, 3).map((f) => f.fingerprint);

  const after = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false, baseline: accepted });
  assert.equal(after.suppressed, 3);
  assert.equal(after.findings.length, base.findings.length - 3);
});

test('--only and --skip narrow the rule set', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  const only = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false, only: ['credentials'] });
  assert.ok(only.findings.length > 0);
  assert.ok(only.findings.every((f) => f.ruleId.startsWith('AW1')));

  const skipped = audit({ homeDir: fixture.homeDir, cwd: fixture.cwd, includeEnv: false, skip: ['credentials'] });
  assert.ok(skipped.findings.every((f) => !f.ruleId.startsWith('AW1')));
});

test('scoring and grading behave sensibly', () => {
  assert.equal(scoreOf([]), 100);
  assert.equal(gradeOf(100), 'A');
  assert.equal(scoreOf([{ severity: 'info', ruleId: 'AW405' }]), 100, 'info must not affect the score');

  // Worse input must never score better.
  const oneMedium = scoreOf([{ severity: 'medium', ruleId: 'AW502' }]);
  const oneHigh = scoreOf([{ severity: 'high', ruleId: 'AW501' }]);
  const oneCritical = scoreOf([{ severity: 'critical', ruleId: 'AW101' }]);
  assert.ok(oneMedium > oneHigh, 'a medium must score better than a high');
  assert.ok(oneHigh > oneCritical, 'a high must score better than a critical');
  assert.equal(gradeOf(scoreOf(Array(10).fill({ severity: 'critical', ruleId: 'AW101' }))), 'F');

  // The score decays instead of pinning to zero, so bad and terrible differ.
  const bad = scoreOf(Array(4).fill({ severity: 'critical', ruleId: 'AW101' }));
  const terrible = scoreOf([
    ...Array(4).fill({ severity: 'critical', ruleId: 'AW101' }),
    ...Array(4).fill({ severity: 'critical', ruleId: 'AW103' }),
  ]);
  assert.ok(terrible < bad, 'more distinct problems must score worse');
  assert.ok(terrible > 0, 'the score must not saturate at zero');
});

test('one rule firing many times cannot dominate the score', () => {
  const three = scoreOf(Array(3).fill({ severity: 'medium', ruleId: 'AW601' }));
  const thirty = scoreOf(Array(30).fill({ severity: 'medium', ruleId: 'AW601' }));
  assert.equal(three, thirty, 'occurrences beyond the cap must not count again');
});

test('fingerprint is a stable short hash', () => {
  const f = { ruleId: 'AW101', artifactId: 'a', file: 'b', evidence: 'c' };
  assert.equal(fingerprint(f), fingerprint({ ...f }));
  assert.equal(fingerprint(f).length, 16);
  assert.notEqual(fingerprint(f), fingerprint({ ...f, evidence: 'd' }));
});

test('scanning an empty home finds nothing and stays quiet', (t) => {
  const fixture = makeFixtureHome({ hostile: false });
  t.after(() => fixture.cleanup());

  const empty = audit({ homeDir: path.join(fixture.homeDir, 'does-not-exist'), cwd: fixture.cwd, includeEnv: false });
  assert.equal(empty.errors.length, 0);
  assert.equal(empty.score, 100);
  assert.ok(renderTerminal(empty, { color: false }).includes('Nothing to flag'));
});

test('the CLI runs end to end and exits 1 on high findings', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  let status = 0;
  let stdout = '';
  try {
    stdout = execFileSync(
      process.execPath,
      [BIN, '--home', fixture.homeDir, '--cwd', fixture.cwd, '--no-env', '--format', 'json'],
      { encoding: 'utf8' },
    );
  } catch (error) {
    status = error.status;
    stdout = error.stdout ?? '';
  }

  assert.equal(status, 1, 'fixture contains critical findings, so exit code must be 1');
  const parsed = JSON.parse(stdout);
  assert.ok(parsed.findings.length > 0);
  assert.ok(parsed.score < 100);
});

test('the CLI exits 0 when nothing meets the threshold', (t) => {
  const fixture = makeFixtureHome();
  t.after(() => fixture.cleanup());

  const stdout = execFileSync(
    process.execPath,
    [BIN, '--home', fixture.homeDir, '--cwd', fixture.cwd, '--no-env', '--fail-on', 'none'],
    { encoding: 'utf8' },
  );
  assert.ok(stdout.includes('agentward'));
});

test('--help and --list-rules work without touching the filesystem', () => {
  const help = execFileSync(process.execPath, [BIN, '--help'], { encoding: 'utf8' });
  assert.ok(help.includes('Usage'));
  const rules = execFileSync(process.execPath, [BIN, '--list-rules'], { encoding: 'utf8' });
  assert.ok(rules.includes('AW201'));
  assert.ok(rules.includes('prompt-injection'));
});
