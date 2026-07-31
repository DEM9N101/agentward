import test from 'node:test';
import assert from 'node:assert/strict';
import { findSecrets, redact, maskSecret, entropy, looksLikePlaceholder } from '../src/secrets.js';
import { FAKE_JWT, FAKE_GITHUB_PAT } from './helpers.js';

test('detects a JWT', () => {
  const hits = findSecrets(`authorization:Bearer ${FAKE_JWT}`);
  assert.ok(hits.some((h) => h.id === 'jwt'), 'expected a jwt hit');
});

/**
 * Every fake token below is assembled from parts rather than written as one
 * literal. They are invented values, but they are shaped convincingly enough
 * that GitHub push protection rejects the commit when they appear whole, which
 * is a fair signal that the patterns match reality. Please keep the
 * concatenation if you edit these.
 */
const fake = {
  aws: `AKIA${'4NPQRSTUVWX2Y3Z6'}`,
  slack: `xoxb-${'497264919843'}-${'4917263849102'}-${'Kq7ZmR3xTvW9pLn2Bd6Yc4Hg'}`,
  anthropic: `sk-ant-${'api03'}-${'Zq4rT7yWpL2mNb9vXc5hJk8dFg3sRa6E'}`,
  google: `AIza${'SyBx9Kq2mNp7Rt4Wv6Zc1Ld8Fg3Hj5Ka0Qe'}`,
};

test('detects vendor-prefixed tokens', () => {
  const cases = [
    [FAKE_GITHUB_PAT, 'github-pat'],
    [fake.aws, 'aws-akid'],
    [fake.slack, 'slack'],
    [fake.anthropic, 'anthropic'],
    [fake.google, 'google'],
  ];
  for (const [value, id] of cases) {
    const hits = findSecrets(`key = ${value}`);
    assert.ok(hits.some((h) => h.id === id), `expected ${id} for ${value}`);
  }
});

test("AWS's own documented example key is treated as a placeholder", () => {
  assert.equal(findSecrets('aws_access_key_id = AKIAIOSFODNN7EXAMPLE').length, 0);
});

test('ignores placeholders and env references', () => {
  const benign = [
    '"apiKey": "YOUR_API_KEY_HERE"',
    '"token": "${GITHUB_TOKEN}"',
    '"password": "%DB_PASSWORD%"',
    '"secret": "<your-secret>"',
    '"apiKey": "changeme-changeme"',
    '"token": "xxxxxxxxxxxxxxxxxxxx"',
  ];
  for (const line of benign) {
    assert.equal(findSecrets(line).length, 0, `should not flag: ${line}`);
  }
});

test('ignores low-entropy prose in a secret-shaped slot', () => {
  assert.equal(findSecrets('password: correcthorsebattery').length, 0);
});

test('flags a high-entropy generic credential', () => {
  const hits = findSecrets('client_secret = "gT7xQ2p-Lm94Zk1BvR8sWfHd3Nc0Jy6E"');
  assert.equal(hits.length, 1);
  assert.equal(hits[0].confidence, 'medium');
});

test('a path is never a secret', () => {
  assert.ok(looksLikePlaceholder('C:/Users/admin/Downloads/server.py'));
  assert.ok(looksLikePlaceholder('https://example.com/some/long/path'));
  assert.equal(findSecrets('"token_path": "/home/me/.config/token.json"').length, 0);
});

test('credentials embedded in a URL are caught', () => {
  const hits = findSecrets('postgres://admin:s3cUr3P4ssw0rdXyz@db.example.com:5432/app');
  assert.ok(hits.some((h) => h.id === 'basic-auth-url'));
});

test('entropy separates random from repetitive', () => {
  assert.ok(entropy('aaaaaaaaaaaaaaaa') < 1);
  assert.ok(entropy('gT7xQ2pLm94Zk1BvR8sWfHd3') > 3.5);
});

test('masking keeps a value identifiable but unusable', () => {
  const masked = maskSecret(FAKE_GITHUB_PAT);
  assert.ok(masked.startsWith('ghp_'));
  assert.ok(masked.includes('chars'));
  assert.ok(!masked.includes(FAKE_GITHUB_PAT));
});

test('redaction removes the full secret from output', () => {
  const text = `run with ${FAKE_JWT} please`;
  const out = redact(text);
  assert.ok(!out.includes(FAKE_JWT), 'redacted output must not contain the secret');
  assert.ok(out.includes('REDACTED'));
});

test('empty and null input are safe', () => {
  assert.deepEqual(findSecrets(''), []);
  assert.deepEqual(findSecrets(null), []);
  assert.equal(redact(''), '');
});
