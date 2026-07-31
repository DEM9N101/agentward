/**
 * How much the agent is allowed to do without asking you.
 *
 * Nothing here is a vulnerability. These are settings someone chose, usually to
 * stop being interrupted. The point is that they are invisible once set, and
 * they decide what a malicious skill can accomplish.
 */
import { finding, CAPABILITY } from '../model.js';
import { lineAt, snippet } from './util.js';

const DANGEROUS_SETTINGS = [
  { key: 'skipDangerousModePermissionPrompt', label: 'dangerous-mode prompt suppressed' },
  { key: 'dangerouslySkipPermissions', label: 'permission checks skipped' },
  { key: 'bypassPermissions', label: 'permissions bypassed' },
  { key: 'autoApproveAll', label: 'everything auto-approved' },
  { key: 'yolo', label: 'YOLO mode' },
  { key: 'autoAcceptEdits', label: 'edits auto-accepted' },
];

const WILDCARD_PERMISSION = /^(?:\*|Bash\(\*\)|Bash\(.*\*.*\)|.*\(\*\))$/;

/** Events that fire on their own, with no user action in between. */
const UNATTENDED_EVENTS = new Set([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'Stop',
  'SubagentStop', 'Notification', 'PreCompact', 'StatusLine',
]);

export const permissionRules = [
  {
    id: 'AW401',
    title: 'MCP server tools are auto-approved',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      const auto = art.data?.autoApprove;
      if (!auto) return [];
      const list = Array.isArray(auto) ? auto : auto === true ? ['(all tools)'] : [];
      if (!list.length) return [];
      return [
        finding(art, {
          ruleId: 'AW401',
          title: `MCP server "${art.name}" runs ${list.length === 1 && list[0] === '(all tools)' ? 'every tool' : `${list.length} tools`} without asking`,
          severity: list[0] === '(all tools)' ? 'high' : 'medium',
          evidence: list.slice(0, 10).join(', ') + (list.length > 10 ? `, +${list.length - 10} more` : ''),
          why: 'These tools execute with no confirmation. If the server is ever compromised or updated with new behaviour, the first you learn of it is afterwards.',
          fix: 'Trim the auto-approve list to read-only tools, or remove it and accept the prompts.',
        }),
      ];
    },
  },

  {
    id: 'AW402',
    title: 'Permission prompts disabled globally',
    appliesTo: (art) => art.kind === 'settings',
    run(art) {
      const raw = art.data?.raw ?? {};
      const text = art.text ?? '';
      const out = [];
      for (const { key, label } of DANGEROUS_SETTINGS) {
        if (raw[key] !== true) continue;
        out.push(
          finding(art, {
            ruleId: 'AW402',
            title: `${label} in ${art.name}`,
            severity: 'high',
            line: lineAt(text, text.indexOf(key)),
            evidence: `"${key}": true`,
            why: 'Confirmation prompts are the control that stops a bad instruction from becoming a bad action. With this set, any skill, hook or MCP server that gets a foothold acts immediately and silently.',
            fix: `Set "${key}" to false, or scope it to a throwaway environment rather than your main machine.`,
          }),
        );
      }
      return out;
    },
  },

  {
    id: 'AW403',
    title: 'Wildcard permission allowlist',
    appliesTo: (art) => art.kind === 'settings',
    run(art) {
      const allow = art.data?.permissions?.allow;
      if (!Array.isArray(allow)) return [];
      const wild = allow.filter((entry) => typeof entry === 'string' && WILDCARD_PERMISSION.test(entry.trim()));
      if (!wild.length) return [];
      return [
        finding(art, {
          ruleId: 'AW403',
          title: `Wildcard permission rule in ${art.name}`,
          severity: 'high',
          evidence: wild.slice(0, 6).join(', '),
          why: 'A wildcard allow rule pre-approves commands you have not seen yet, including ones a future skill will construct.',
          fix: 'Replace the wildcard with the specific commands you actually want to allow.',
        }),
      ];
    },
  },

  {
    id: 'AW404',
    title: 'Shell command runs automatically on an agent event',
    appliesTo: (art) => art.kind === 'hook',
    run(art) {
      const event = art.data?.event ?? '';
      if (!UNATTENDED_EVENTS.has(event)) return [];
      const command = String(art.data?.command ?? '');
      if (!command) return [];
      return [
        finding(art, {
          ruleId: 'AW404',
          title: `Hook on ${event} executes a shell command`,
          severity: art.data?.matcher === '*' || !art.data?.matcher ? 'low' : 'info',
          evidence: snippet(command, 0, 90),
          why: `This command runs on every ${event} with no prompt and no visible output. It is the quietest place on the machine to put something.`,
          fix: 'Confirm you wrote it, and that the script it points at has not been modified since.',
        }),
      ];
    },
  },

  {
    id: 'AW405',
    title: 'Unsandboxed local process',
    appliesTo: (art) => art.kind === 'mcp-server',
    run(art) {
      if (!art.capabilities?.includes(CAPABILITY.EXEC)) return [];
      const command = String(art.data?.command ?? '');
      return [
        finding(art, {
          ruleId: 'AW405',
          title: `MCP server "${art.name}" runs as an unsandboxed local process`,
          severity: 'info',
          evidence: `${command} ${(art.data?.args ?? []).slice(0, 2).join(' ')}`.trim(),
          why: 'MCP places no limits on a stdio server. It is a normal process with your user account, so it can read every file you can read and open any connection you can open, regardless of the tools it advertises.',
          fix: 'This is how MCP works rather than a flaw. Keep the list short and know who wrote each one.',
        }),
      ];
    },
  },
];
