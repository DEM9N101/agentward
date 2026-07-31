/**
 * Argument parsing and process wiring. All logic lives in `audit()`; this file
 * decides what to print and what to exit with.
 */
import fs from 'node:fs';
import path from 'node:path';
import { audit, VERSION } from './index.js';
import { renderTerminal } from './report/terminal.js';
import { renderJson, renderSarif, renderMarkdown, renderBaseline } from './report/formats.js';
import { RULES, categoryOf } from './rules/index.js';
import { parseJson } from './fs-util.js';

const HELP = `
  agentward v${VERSION}
  Audit what your AI agents can actually do to this machine.

  Usage
    npx agentward [options]

  Options
    --format <fmt>      terminal (default), json, sarif, markdown
    --output <file>     write the report to a file instead of stdout
    --verbose, -v       include informational findings
    --only <ids>        run only these rules or categories (comma separated)
    --skip <ids>        skip these rules or categories (comma separated)
    --baseline <file>   suppress findings listed in a baseline file
    --write-baseline <file>
                        accept every current finding and write a baseline
    --fail-on <sev>     exit non-zero at or above this severity
                        (critical, high, medium, low, none; default high)
    --home <dir>        scan a different home directory
    --cwd <dir>         treat this directory as the project scope
    --no-env            do not inspect the inherited environment
    --list-rules        print every rule and exit
    --version           print version and exit
    --help, -h          this text

  Exit codes
    0  nothing at or above the --fail-on threshold
    1  findings at or above the threshold
    2  agentward itself failed

  agentward never makes a network request and never writes to anything it
  scans. Reports are redacted, so they are safe to paste into an issue.
`;

const SEVERITY_ORDER = ['info', 'low', 'medium', 'high', 'critical'];

export function parseArgs(argv) {
  const options = {
    format: 'terminal',
    output: null,
    verbose: false,
    only: [],
    skip: [],
    baseline: null,
    writeBaseline: null,
    failOn: 'high',
    homeDir: undefined,
    cwd: undefined,
    includeEnv: true,
    listRules: false,
    help: false,
    version: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    switch (arg) {
      case '--format': options.format = String(next() ?? '').toLowerCase(); break;
      case '--output': case '-o': options.output = next(); break;
      case '--verbose': case '-v': options.verbose = true; break;
      case '--only': options.only = splitList(next()); break;
      case '--skip': options.skip = splitList(next()); break;
      case '--baseline': options.baseline = next(); break;
      case '--write-baseline': options.writeBaseline = next() ?? '.agentward-baseline.json'; break;
      case '--fail-on': options.failOn = String(next() ?? 'high').toLowerCase(); break;
      case '--home': options.homeDir = next(); break;
      case '--cwd': options.cwd = next(); break;
      case '--no-env': options.includeEnv = false; break;
      case '--list-rules': options.listRules = true; break;
      case '--version': case '-V': options.version = true; break;
      case '--help': case '-h': options.help = true; break;
      default:
        if (arg.startsWith('-')) throw new Error(`Unknown option: ${arg}`);
    }
  }
  return options;
}

function splitList(value) {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadBaseline(file) {
  if (!file) return [];
  if (!fs.existsSync(file)) return [];
  const parsed = parseJson(fs.readFileSync(file, 'utf8'));
  if (!parsed) return [];
  const entries = parsed.accepted ?? parsed;
  if (!Array.isArray(entries)) return [];
  return entries.map((e) => (typeof e === 'string' ? e : e.fingerprint)).filter(Boolean);
}

function listRules() {
  const byCategory = new Map();
  for (const rule of RULES) {
    const category = categoryOf(rule.id);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(rule);
  }
  const lines = [''];
  for (const [category, rules] of byCategory) {
    lines.push(`  ${category}`);
    for (const rule of rules) lines.push(`    ${rule.id}  ${rule.title}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function run(argv = process.argv.slice(2), io = {}) {
  const out = io.stdout ?? process.stdout;
  const err = io.stderr ?? process.stderr;

  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    err.write(`${error.message}\nTry --help.\n`);
    return 2;
  }

  if (options.help) {
    out.write(HELP);
    return 0;
  }
  if (options.version) {
    out.write(`${VERSION}\n`);
    return 0;
  }
  if (options.listRules) {
    out.write(listRules());
    return 0;
  }

  let result;
  try {
    result = audit({
      homeDir: options.homeDir,
      cwd: options.cwd,
      only: options.only,
      skip: options.skip,
      includeEnv: options.includeEnv,
      baseline: loadBaseline(options.baseline),
    });
  } catch (error) {
    err.write(`agentward failed: ${error?.stack ?? error}\n`);
    return 2;
  }

  if (options.writeBaseline) {
    fs.mkdirSync(path.dirname(path.resolve(options.writeBaseline)), { recursive: true });
    fs.writeFileSync(options.writeBaseline, renderBaseline(result));
    out.write(`Wrote ${result.findings.length} accepted findings to ${options.writeBaseline}\n`);
    return 0;
  }

  let rendered;
  switch (options.format) {
    case 'json': rendered = renderJson(result); break;
    case 'sarif': rendered = renderSarif(result); break;
    case 'markdown': case 'md': rendered = renderMarkdown(result); break;
    case 'terminal': case 'text': rendered = renderTerminal(result, { verbose: options.verbose }); break;
    default:
      err.write(`Unknown format: ${options.format}\n`);
      return 2;
  }

  if (options.output) {
    fs.mkdirSync(path.dirname(path.resolve(options.output)), { recursive: true });
    fs.writeFileSync(options.output, rendered.endsWith('\n') ? rendered : `${rendered}\n`);
    out.write(`Report written to ${options.output}\n`);
  } else {
    out.write(rendered.endsWith('\n') ? rendered : `${rendered}\n`);
  }

  if (options.failOn === 'none') return 0;
  const threshold = SEVERITY_ORDER.indexOf(options.failOn);
  if (threshold === -1) {
    err.write(`Unknown severity for --fail-on: ${options.failOn}\n`);
    return 2;
  }
  const triggered = result.findings.some((f) => SEVERITY_ORDER.indexOf(f.severity) >= threshold);
  return triggered ? 1 : 0;
}
