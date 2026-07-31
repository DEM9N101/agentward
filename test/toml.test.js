import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToml } from '../src/toml.js';

test('parses a Codex-style MCP config', () => {
  const config = parseToml(
    [
      '# a comment',
      'model = "gpt-5.4"',
      'approval_policy = "on-request"',
      '',
      '[mcp_servers.filesystem]',
      'command = "npx"',
      'args = ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"]',
      '',
      '[mcp_servers.github]',
      'command = "docker"',
      'args = ["run", "-i", "ghcr.io/github/mcp"]',
      'env = { GITHUB_TOKEN = "abc123" }',
      '',
    ].join('\n'),
  );

  assert.equal(config.model, 'gpt-5.4');
  assert.deepEqual(Object.keys(config.mcp_servers), ['filesystem', 'github']);
  assert.equal(config.mcp_servers.filesystem.command, 'npx');
  assert.deepEqual(config.mcp_servers.filesystem.args, ['-y', '@modelcontextprotocol/server-filesystem', '/tmp']);
  assert.equal(config.mcp_servers.github.env.GITHUB_TOKEN, 'abc123');
});

test('handles multi-line arrays', () => {
  const config = parseToml(['[tool]', 'args = [', '  "a",', '  "b",', ']', ''].join('\n'));
  assert.deepEqual(config.tool.args, ['a', 'b']);
});

test('does not treat a # inside a string as a comment', () => {
  const config = parseToml('url = "https://example.com/#anchor"');
  assert.equal(config.url, 'https://example.com/#anchor');
});

test('reads booleans, numbers and dotted keys', () => {
  const config = parseToml(['enabled = true', 'timeout = 1800', 'a.b.c = "deep"'].join('\n'));
  assert.equal(config.enabled, true);
  assert.equal(config.timeout, 1800);
  assert.equal(config.a.b.c, 'deep');
});

test('supports array of tables', () => {
  const config = parseToml(['[[server]]', 'name = "one"', '', '[[server]]', 'name = "two"'].join('\n'));
  assert.equal(config.server.length, 2);
  assert.equal(config.server[1].name, 'two');
});

test('malformed input yields an object rather than throwing', () => {
  assert.doesNotThrow(() => parseToml('[[[broken\nkey = = ='));
  assert.deepEqual(parseToml(''), {});
  assert.deepEqual(parseToml(null), {});
});
