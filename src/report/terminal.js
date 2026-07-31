/**
 * The default report. Optimized for the thirty seconds someone actually spends
 * looking at it: what you have, what is worst, what to do.
 */
import { CATEGORIES } from '../rules/index.js';

const COLOR = {
  reset: '\u001b[0m',
  bold: '\u001b[1m',
  dim: '\u001b[2m',
  red: '\u001b[31m',
  yellow: '\u001b[33m',
  blue: '\u001b[34m',
  cyan: '\u001b[36m',
  green: '\u001b[32m',
  magenta: '\u001b[35m',
  grey: '\u001b[90m',
};

const SEVERITY_STYLE = {
  critical: { color: COLOR.red, label: 'CRITICAL' },
  high: { color: COLOR.magenta, label: 'HIGH' },
  medium: { color: COLOR.yellow, label: 'MEDIUM' },
  low: { color: COLOR.blue, label: 'LOW' },
  info: { color: COLOR.grey, label: 'INFO' },
};

function supportsColor(stream = process.stdout) {
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR) return true;
  return Boolean(stream.isTTY);
}

export function renderTerminal(result, { color = supportsColor(), verbose = false, cwd = process.cwd() } = {}) {
  const c = (code, text) => (color ? `${code}${text}${COLOR.reset}` : text);
  const lines = [];
  const shown = verbose ? result.findings : result.findings.filter((f) => f.severity !== 'info');

  lines.push('');
  lines.push(c(COLOR.bold, '  agentward') + c(COLOR.grey, `  v${result.version}`));
  lines.push(c(COLOR.grey, '  what your AI agents can actually do to this machine'));
  lines.push('');

  // What is installed.
  const { byVendor, byKind, total } = result.summary;
  lines.push(`  ${c(COLOR.bold, String(total))} artifacts across ${c(COLOR.bold, String(Object.keys(byVendor).length))} agent installs`);
  const kindOrder = ['mcp-server', 'skill', 'hook', 'subagent', 'command', 'plugin', 'context-file', 'settings'];
  const kindBits = kindOrder.filter((k) => byKind[k]).map((k) => `${byKind[k]} ${plural(k, byKind[k])}`);
  if (kindBits.length) lines.push(c(COLOR.grey, `  ${kindBits.join('  ·  ')}`));
  const vendorBits = Object.entries(byVendor).map(([v, n]) => `${v} (${n})`);
  if (vendorBits.length) lines.push(c(COLOR.grey, `  ${vendorBits.join('  ·  ')}`));
  lines.push('');

  if (!shown.length) {
    lines.push(`  ${c(COLOR.green, 'Nothing to flag.')} ${c(COLOR.grey, `Score ${result.score}/100 (${result.grade}).`)}`);
    lines.push('');
    return lines.join('\n');
  }

  // Findings, grouped by severity.
  for (const severity of ['critical', 'high', 'medium', 'low', 'info']) {
    const group = shown.filter((f) => f.severity === severity);
    if (!group.length) continue;
    const style = SEVERITY_STYLE[severity];
    lines.push(`  ${c(style.color + COLOR.bold, style.label)} ${c(COLOR.grey, `(${group.length})`)}`);
    lines.push('');

    for (const f of group) {
      const copies = f.occurrences > 1 ? c(COLOR.grey, `  (${f.occurrences} copies)`) : '';
      lines.push(`  ${c(style.color, '●')} ${c(COLOR.bold, f.title)}${copies}`);
      lines.push(`     ${c(COLOR.grey, `${relative(f.file, cwd)}${f.line ? `:${f.line}` : ''}  [${f.ruleId}]`)}`);
      if (f.evidence) lines.push(`     ${c(COLOR.cyan, f.evidence)}`);
      lines.push(`     ${wrap(f.why, 5)}`);
      lines.push(`     ${c(COLOR.green, '→ ')}${wrap(f.fix, 5).trimStart()}`);
      lines.push('');
    }
  }

  // Score.
  const scoreColor = result.score >= 85 ? COLOR.green : result.score >= 60 ? COLOR.yellow : COLOR.red;
  const counted = ['critical', 'high', 'medium', 'low']
    .filter((s) => result.counts[s])
    .map((s) => `${result.counts[s]} ${s}`)
    .join(', ');

  lines.push(c(COLOR.grey, '  ' + '─'.repeat(60)));
  lines.push(`  ${c(scoreColor + COLOR.bold, `${result.score}/100 (${result.grade})`)}  ${c(COLOR.grey, counted || 'no findings')}`);
  if (result.counts.info && !verbose) {
    lines.push(c(COLOR.grey, `  ${result.counts.info} informational finding${result.counts.info === 1 ? '' : 's'} hidden, use --verbose`));
  }
  if (result.suppressed) lines.push(c(COLOR.grey, `  ${result.suppressed} suppressed by baseline`));
  if (result.errors.length) {
    lines.push(c(COLOR.grey, `  ${result.errors.length} rule error(s); please report at https://github.com/DEM9N101/agentward/issues`));
  }
  lines.push(c(COLOR.grey, `  scanned in ${result.durationMs} ms, entirely offline`));
  lines.push('');

  return lines.join('\n');
}

/** "settings" is already plural; everything else takes an s. */
function plural(word, count) {
  if (count === 1 || word.endsWith('s')) return word;
  return `${word}s`;
}

function relative(file, cwd) {
  if (!file) return '';
  const home = process.env.HOME ?? process.env.USERPROFILE;
  if (home && file.startsWith(home)) return `~${file.slice(home.length)}`.replace(/\\/g, '/');
  return file.replace(/\\/g, '/');
}

/** Wrap prose to a readable width with a hanging indent. */
function wrap(text, indent, width = 78) {
  if (!text) return '';
  const pad = ' '.repeat(indent);
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line.length + word.length + 1 > width - indent) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.join(`\n${pad}`);
}

export { CATEGORIES };
