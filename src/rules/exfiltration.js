/**
 * Getting data off your machine.
 *
 * Individually, "reads a file" and "makes a request" are ordinary. Together in
 * one skill they are the whole attack, so this module scores the combination
 * higher than either half.
 */
import { finding } from '../model.js';
import { lineAt, snippet, commandSurface, matches } from './util.js';

const RAW_IP_URL = /\bhttps?:\/\/(?:\d{1,3}\.){3}\d{1,3}(?::\d+)?/gi;

const PIPE_TO_SHELL =
  /(?:curl|wget|iwr|invoke-webrequest|invoke-restmethod)\b[^\n|;]{0,200}\|\s*(?:sudo\s+)?(?:ba|z|k|da)?sh\b|(?:iwr|invoke-webrequest|invoke-restmethod)\b[^\n|;]{0,200}\|\s*(?:iex|invoke-expression)/gi;

/** Hosts whose entire purpose is receiving data from somewhere else. */
const DROP_HOSTS =
  /\b(?:webhook\.site|requestbin\.\w+|pipedream\.net|ngrok\.(?:io|app|dev)|pastebin\.com|paste\.ee|hastebin\.com|ix\.io|0x0\.st|transfer\.sh|file\.io|termbin\.com|oast\.(?:fun|live|me|pro|site)|interact\.sh|burpcollaborator\.net|dnslog\.cn|localtunnel\.me|tmpfiles\.org|gofile\.io|anonfiles\.com|bashupload\.com)\b/gi;

/**
 * Places credentials actually live.
 *
 * Deliberately excludes a bare `.env`: `process.env.FOO`, `--env-file=.env` and
 * "never commit your .env" appear in a large share of legitimate skills, so
 * matching it produces noise and nothing else. A `.env` file being *read by a
 * shell command* is handled separately below.
 */
const CREDENTIAL_STORES =
  /(?:~|\$HOME|%USERPROFILE%)?[\\/]?\.(?:ssh[\\/](?:id_[a-z0-9]+|authorized_keys)|aws[\\/]credentials|config[\\/]gcloud|netrc|npmrc|pypirc|docker[\\/]config\.json|kube[\\/]config|gnupg)\b|\b_netrc\b|\bid_rsa\b|\bcookies\.sqlite\b|\bLogin Data\b|\bsecurity\s+find-generic-password\b|\bkeychain_dump\b|\bcredential\s+manager\b/gi;

/** A dotenv file being read by a command, as opposed to merely mentioned. */
const ENV_FILE_READ =
  /\b(?:cat|type|Get-Content|gc|source|\.)\s+["']?(?:[^\s"']*[\\/])?\.env(?:\.[a-z]+)?\b/gi;

/** Sending a file body or command output outward. */
const OUTBOUND_PAYLOAD =
  /(?:--data-binary|--data|-d)\s+["']?@|(?:-F|--form)\s+["']?[^=\s]+=@|\bcurl\b[^\n]{0,200}\$\((?:cat|type|env|printenv)\b|\bcurl\b[^\n]{0,200}`(?:cat|env)\b|-Body\s+\$?\(?\s*(?:Get-Content|Get-ChildItem|gc)\b/gi;

/**
 * Egress at the shell level only. `fetch(` and `axios.` appear in every
 * frontend code sample in every skill, so including them would make the
 * combined credentials-plus-network signal meaningless.
 */
const EGRESS_COMMAND =
  /\b(?:curl|wget|nc|netcat|scp|rsync|sftp|Invoke-WebRequest|Invoke-RestMethod|iwr|irm|Start-BitsTransfer)\b/gi;

const EXEC_KINDS = ['skill', 'hook', 'command', 'subagent', 'mcp-server'];

/** Hooks and MCP servers run without you looking; skills need you to invoke them. */
function weight(art, base) {
  const order = ['info', 'low', 'medium', 'high', 'critical'];
  const unattended = art.kind === 'hook' || art.kind === 'mcp-server';
  if (!unattended) return base;
  const idx = order.indexOf(base);
  return order[Math.min(order.length - 1, idx + 1)];
}

export const exfiltrationRules = [
  {
    id: 'AW301',
    title: 'Network request to a bare IP address',
    appliesTo: (art) => EXEC_KINDS.includes(art.kind),
    run(art) {
      const text = commandSurface(art);
      const out = [];
      for (const m of matches(RAW_IP_URL, text)) {
        if (/(?:127\.0\.0\.1|0\.0\.0\.0|localhost)/.test(m[0])) continue;
        if (/^https?:\/\/(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(m[0])) continue;
        out.push(
          finding(art, {
            ruleId: 'AW301',
            title: `${art.kind} "${art.name}" contacts a bare IP address`,
            severity: weight(art, 'high'),
            line: lineAt(art.text ?? '', m.index),
            evidence: m[0],
            why: 'Legitimate services are reached by hostname. A hardcoded public IP avoids DNS logging and domain reputation, and cannot be checked against a certificate the way a hostname can.',
            fix: 'Find out what is at that address before running this again.',
          }),
        );
        break;
      }
      return out;
    },
  },

  {
    id: 'AW302',
    title: 'Downloaded script piped straight into a shell',
    appliesTo: (art) => EXEC_KINDS.includes(art.kind),
    run(art) {
      const text = commandSurface(art);
      const m = PIPE_TO_SHELL.exec(text);
      PIPE_TO_SHELL.lastIndex = 0;
      if (!m) return [];
      return [
        finding(art, {
          ruleId: 'AW302',
          title: `${art.kind} "${art.name}" pipes a download directly into a shell`,
          severity: weight(art, 'high'),
          line: lineAt(art.text ?? '', m.index),
          evidence: snippet(text, m.index, 80),
          why: 'Whatever that URL serves at the moment it runs is executed with your privileges, unreviewed. The content can differ every time, and can differ for you specifically.',
          fix: 'Download to a file, read it, then run it.',
        }),
      ];
    },
  },

  {
    id: 'AW303',
    title: 'Local data sent outbound',
    appliesTo: (art) => EXEC_KINDS.includes(art.kind),
    run(art) {
      const text = commandSurface(art);
      const m = OUTBOUND_PAYLOAD.exec(text);
      OUTBOUND_PAYLOAD.lastIndex = 0;
      if (!m) return [];
      return [
        finding(art, {
          ruleId: 'AW303',
          title: `${art.kind} "${art.name}" uploads local file or command output`,
          // Uploading a file is the documented purpose of plenty of legitimate
          // APIs, so this only becomes urgent when it runs unattended.
          severity: weight(art, 'medium'),
          line: lineAt(art.text ?? '', m.index),
          evidence: snippet(text, m.index, 80),
          why: 'This sends the contents of a local file or the output of a local command to a remote endpoint.',
          fix: 'Confirm what is being sent and where. If you did not write this, treat it as exfiltration.',
        }),
      ];
    },
  },

  {
    id: 'AW304',
    title: 'Request to an anonymous drop host',
    appliesTo: (art) => EXEC_KINDS.includes(art.kind),
    run(art) {
      const text = commandSurface(art);
      const m = DROP_HOSTS.exec(text);
      DROP_HOSTS.lastIndex = 0;
      if (!m) return [];
      return [
        finding(art, {
          ruleId: 'AW304',
          title: `${art.kind} "${art.name}" contacts ${m[0]}`,
          severity: weight(art, 'high'),
          line: lineAt(art.text ?? '', m.index),
          evidence: snippet(text, m.index, 80),
          why: 'That host exists to receive data anonymously from somewhere else. It is a normal thing to see in a penetration test and an alarming thing to see in a skill you installed.',
          fix: 'Unless you set this up deliberately, remove it and assume anything it could reach has been read.',
        }),
      ];
    },
  },

  {
    id: 'AW305',
    title: 'Reads a credential store',
    appliesTo: (art) => EXEC_KINDS.includes(art.kind),
    run(art) {
      const text = commandSurface(art);
      CREDENTIAL_STORES.lastIndex = 0;
      ENV_FILE_READ.lastIndex = 0;
      const m = CREDENTIAL_STORES.exec(text) ?? ENV_FILE_READ.exec(text);
      CREDENTIAL_STORES.lastIndex = 0;
      ENV_FILE_READ.lastIndex = 0;
      if (!m) return [];

      EGRESS_COMMAND.lastIndex = 0;
      const alsoSends = EGRESS_COMMAND.test(text);
      EGRESS_COMMAND.lastIndex = 0;

      return [
        finding(art, {
          ruleId: 'AW305',
          title: alsoSends
            ? `${art.kind} "${art.name}" reads credentials and makes network requests`
            : `${art.kind} "${art.name}" reads a credential store`,
          severity: alsoSends ? 'critical' : weight(art, 'medium'),
          line: lineAt(art.text ?? '', m.index),
          evidence: snippet(text, m.index, 70),
          why: alsoSends
            ? 'The same artifact both touches a credential store and makes outbound requests. That combination is the shape of credential theft, whatever the stated purpose is.'
            : 'This reads a location where credentials are kept. That may be legitimate, but it is worth knowing about.',
          fix: alsoSends
            ? 'Do not run this until you have read it line by line. If you did not write it, rotate the credentials it can reach.'
            : 'Confirm the artifact needs that access to do its stated job.',
        }),
      ];
    },
  },
];
