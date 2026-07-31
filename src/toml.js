/**
 * A deliberately small TOML reader.
 *
 * Codex stores MCP servers in `config.toml`, so we need TOML, but pulling a
 * dependency into a supply-chain scanner to read a config file would be
 * self-defeating. This covers the subset config files actually use: tables,
 * array-of-tables, dotted keys, strings, numbers, booleans, arrays and inline
 * tables. Anything it cannot parse is skipped rather than thrown.
 */

export function parseToml(input) {
  const root = {};
  if (typeof input !== 'string' || !input) return root;

  let current = root;
  const lines = input.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    let line = stripComment(lines[i]).trim();
    if (!line) continue;

    // [table] or [[array of tables]]
    const table = line.match(/^\[(\[?)([^\]]+)\]?\]$/);
    if (table) {
      const isArray = table[1] === '[';
      const parts = splitKeyPath(table[2]);
      current = descend(root, parts, isArray);
      continue;
    }

    const eq = indexOfTopLevelEquals(line);
    if (eq === -1) continue;
    const rawKey = line.slice(0, eq).trim();
    let rawValue = line.slice(eq + 1).trim();

    // A value can open a multi-line array; join until brackets balance.
    while (isUnbalanced(rawValue) && i + 1 < lines.length) {
      i++;
      rawValue += ` ${stripComment(lines[i]).trim()}`;
    }

    const keyPath = splitKeyPath(rawKey);
    const leaf = keyPath.pop();
    const target = keyPath.length ? descend(current, keyPath, false) : current;
    const value = parseValue(rawValue);
    if (value !== undefined) target[unquote(leaf)] = value;
  }

  return root;
}

function stripComment(line) {
  let out = '';
  let quote = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      out += ch;
      if (ch === quote && line[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      out += ch;
      continue;
    }
    if (ch === '#') break;
    out += ch;
  }
  return out;
}

function indexOfTopLevelEquals(line) {
  let quote = null;
  let depth = 0;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quote) {
      if (ch === quote && line[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
    else if (ch === '=' && depth === 0) return i;
  }
  return -1;
}

function isUnbalanced(value) {
  let depth = 0;
  let quote = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote) {
      if (ch === quote && value[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') depth--;
  }
  return depth > 0;
}

function splitKeyPath(key) {
  const parts = [];
  let buf = '';
  let quote = null;
  for (let i = 0; i < key.length; i++) {
    const ch = key[i];
    if (quote) {
      if (ch === quote && key[i - 1] !== '\\') quote = null;
      else buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === '.') {
      parts.push(buf.trim());
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}

function descend(root, parts, isArrayTable) {
  let node = root;
  parts.forEach((part, idx) => {
    const key = unquote(part);
    const last = idx === parts.length - 1;
    if (last && isArrayTable) {
      if (!Array.isArray(node[key])) node[key] = [];
      const entry = {};
      node[key].push(entry);
      node = entry;
      return;
    }
    if (Array.isArray(node[key])) {
      node = node[key][node[key].length - 1];
      return;
    }
    if (typeof node[key] !== 'object' || node[key] === null) node[key] = {};
    node = node[key];
  });
  return node;
}

function unquote(s) {
  if (s.length >= 2 && ((s[0] === '"' && s.at(-1) === '"') || (s[0] === "'" && s.at(-1) === "'"))) {
    return s.slice(1, -1);
  }
  return s;
}

function parseValue(raw) {
  const value = raw.trim();
  if (!value) return undefined;

  if (value.startsWith('"""') || value.startsWith("'''")) {
    return value.replace(/^('''|""")/, '').replace(/('''|""")$/, '');
  }
  if (value[0] === '"') return unescapeBasic(value.slice(1, value.lastIndexOf('"')));
  if (value[0] === "'") return value.slice(1, value.lastIndexOf("'"));
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value[0] === '[') return parseArray(value);
  if (value[0] === '{') return parseInlineTable(value);

  const num = Number(value.replace(/_/g, ''));
  if (!Number.isNaN(num) && /^[-+0-9.eE_]+$/.test(value)) return num;
  return value;
}

function splitTopLevel(body) {
  const parts = [];
  let buf = '';
  let depth = 0;
  let quote = null;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quote) {
      buf += ch;
      if (ch === quote && body[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === '[' || ch === '{') depth++;
    if (ch === ']' || ch === '}') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) parts.push(buf);
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseArray(value) {
  const body = value.slice(1, value.lastIndexOf(']'));
  return splitTopLevel(body).map(parseValue).filter((v) => v !== undefined);
}

function parseInlineTable(value) {
  const body = value.slice(1, value.lastIndexOf('}'));
  const out = {};
  for (const pair of splitTopLevel(body)) {
    const eq = indexOfTopLevelEquals(pair);
    if (eq === -1) continue;
    const parsed = parseValue(pair.slice(eq + 1));
    if (parsed !== undefined) out[unquote(pair.slice(0, eq).trim())] = parsed;
  }
  return out;
}

function unescapeBasic(s) {
  return s.replace(/\\(["\\/bfnrt]|u[0-9a-fA-F]{4})/g, (_, esc) => {
    switch (esc[0]) {
      case 'n': return '\n';
      case 't': return '\t';
      case 'r': return '\r';
      case 'b': return '\b';
      case 'f': return '\f';
      case '"': return '"';
      case '\\': return '\\';
      case '/': return '/';
      case 'u': return String.fromCharCode(parseInt(esc.slice(1), 16));
      default: return esc;
    }
  });
}
