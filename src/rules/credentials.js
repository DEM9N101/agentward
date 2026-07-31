/**
 * Credentials sitting in agent config files.
 *
 * This matters more than ordinary secret sprawl: an agent config is readable by
 * every skill, hook and MCP server the agent loads, and those are exactly the
 * things you installed from a stranger's README.
 */
import { finding } from '../model.js';
import { findSecrets, maskSecret } from '../secrets.js';
import { lineAt } from './util.js';

const READERS_OF_CONFIG =
  'Any skill, hook or MCP server the agent loads can read this file, and so can anything that syncs or backs it up.';

export const credentialRules = [
  {
    id: 'AW101',
    title: 'Credential stored in plaintext in an MCP server definition',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      const surface = JSON.stringify({
        args: art.data?.args ?? [],
        env: art.data?.env ?? {},
        headers: art.data?.headers ?? {},
        url: art.data?.url ?? null,
      });
      return findSecrets(surface).map((hit) =>
        finding(art, {
          ruleId: 'AW101',
          title: `${hit.label} in plaintext in MCP server "${art.name}"`,
          severity: hit.confidence === 'high' ? 'critical' : 'high',
          evidence: `${hit.label}: ${maskSecret(hit.value)}`,
          why: `The credential is stored unencrypted in the server definition. ${READERS_OF_CONFIG} If this file is ever shared, committed or synced, the credential goes with it.`,
          fix: 'Move the value into an environment variable your shell provides at launch, or into your OS keychain, and reference it indirectly. Then rotate the exposed credential, because it must be treated as leaked.',
        }),
      );
    },
  },

  {
    id: 'AW102',
    title: 'Credential inside a skill, hook or command',
    appliesTo: (art) => ['skill', 'hook', 'command', 'subagent'].includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      return findSecrets(text).map((hit) =>
        finding(art, {
          ruleId: 'AW102',
          title: `${hit.label} hardcoded in ${art.kind} "${art.name}"`,
          // Skills are largely documentation, so a generic match here is a
          // weaker signal than the same match in a config file.
          severity: hit.confidence === 'high' ? 'critical' : 'low',
          line: lineAt(text, hit.index),
          evidence: `${hit.label}: ${maskSecret(hit.value)}`,
          why: 'A credential written into instruction text is read by the model on every invocation, which means it can end up quoted into a transcript, a log, or an upstream API request.',
          fix: 'Remove the literal value, read it from the environment at run time, and rotate it.',
        }),
      );
    },
  },

  {
    id: 'AW103',
    title: 'Credential in an always-loaded context file',
    appliesTo: (art) => art.kind === 'context-file',
    run(art) {
      const text = art.text ?? '';
      return findSecrets(text).map((hit) =>
        finding(art, {
          ruleId: 'AW103',
          title: `${hit.label} in ${art.name}`,
          severity: 'critical',
          line: lineAt(text, hit.index),
          evidence: `${hit.label}: ${maskSecret(hit.value)}`,
          why: 'This file is injected into every prompt, so the credential is transmitted to the model provider on every single request you make.',
          fix: 'Delete the credential from the file and rotate it immediately.',
        }),
      );
    },
  },

  {
    id: 'AW104',
    title: 'Credential in a settings file',
    appliesTo: (art) => art.kind === 'settings',
    run(art) {
      const text = art.text ?? '';
      return findSecrets(text).map((hit) =>
        finding(art, {
          ruleId: 'AW104',
          title: `${hit.label} in ${art.name}`,
          severity: hit.confidence === 'high' ? 'high' : 'medium',
          line: lineAt(text, hit.index),
          evidence: `${hit.label}: ${maskSecret(hit.value)}`,
          why: `The value is stored unencrypted. ${READERS_OF_CONFIG}`,
          fix: 'Move it to an environment variable or your OS keychain, then rotate it.',
        }),
      );
    },
  },

  {
    id: 'AW105',
    title: 'Credentials exported into the agent environment',
    appliesTo: (art) => art.kind === 'environment',
    run(art) {
      const names = art.data?.names ?? [];
      if (!names.length) return [];
      const real = findSecrets(art.text ?? '');
      if (!real.length) return [];
      return [
        finding(art, {
          ruleId: 'AW105',
          title: `${real.length} credential-bearing environment variable${real.length === 1 ? '' : 's'} inherited by every agent subprocess`,
          severity: 'low',
          evidence: names.slice(0, 8).join(', '),
          why: 'Every MCP server and hook the agent launches inherits this environment, so all of them can read these values regardless of what they were installed to do.',
          fix: 'Scope credentials to the process that needs them rather than exporting them from your shell profile.',
        }),
      ];
    },
  },
];
