/**
 * Filesystem helpers. Every read here is defensive: this tool points at
 * directories full of other people's content, so a malformed file, a symlink
 * loop or a 2 GB blob must never take the scan down.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

/** Files larger than this are read only up to the cap. Skills are text. */
export const MAX_READ_BYTES = 1024 * 1024;

const BINARY_EXT = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.bmp', '.svg',
  '.zip', '.gz', '.tar', '.7z', '.rar', '.pdf', '.woff', '.woff2', '.ttf',
  '.mp3', '.mp4', '.mov', '.wav', '.webm', '.node', '.wasm', '.pyc', '.class',
]);

export const EXECUTABLE_EXT = new Set([
  '.exe', '.dll', '.scr', '.com', '.msi', '.bat', '.cmd', '.ps1', '.psm1',
  '.sh', '.bash', '.zsh', '.vbs', '.jar', '.app', '.dylib', '.so', '.node',
]);

export function home() {
  return os.homedir();
}

export function exists(p) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

export function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

export function statSafe(p) {
  try {
    return fs.statSync(p);
  } catch {
    return null;
  }
}

/** Read a text file, capped, never throwing. Returns '' on any failure. */
export function readText(file, maxBytes = MAX_READ_BYTES) {
  try {
    if (BINARY_EXT.has(path.extname(file).toLowerCase())) return '';
    const stat = fs.statSync(file);
    if (!stat.isFile()) return '';
    if (stat.size <= maxBytes) return fs.readFileSync(file, 'utf8');
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(maxBytes);
      const read = fs.readSync(fd, buf, 0, maxBytes, 0);
      return buf.subarray(0, read).toString('utf8');
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return '';
  }
}

/** Parse JSON without throwing. Tolerates a UTF-8 BOM and trailing commas. */
export function readJson(file) {
  const raw = readText(file);
  if (!raw) return null;
  return parseJson(raw);
}

export function parseJson(raw) {
  const text = raw.replace(/^\uFEFF/, '');
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(text.replace(/,(\s*[}\]])/g, '$1'));
    } catch {
      return null;
    }
  }
}

/** Read a JSONL file into an array, skipping unparseable lines. */
export function readJsonl(file, maxLines = 5000) {
  const raw = readText(file);
  if (!raw) return [];
  const out = [];
  for (const line of raw.split(/\r?\n/)) {
    if (out.length >= maxLines) break;
    if (!line.trim()) continue;
    const parsed = parseJson(line);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Walk a directory, breadth-limited and depth-limited, never following
 * symlinks out of the tree.
 * @returns {{ path: string, name: string, depth: number, isSymlink: boolean }[]}
 */
export function walk(root, { maxDepth = 6, maxEntries = 20000, filter } = {}) {
  const results = [];
  if (!isDir(root)) return results;
  const queue = [{ dir: root, depth: 0 }];
  const seen = new Set();

  while (queue.length && results.length < maxEntries) {
    const { dir, depth } = queue.shift();
    let real;
    try {
      real = fs.realpathSync(dir);
    } catch {
      continue;
    }
    if (seen.has(real)) continue;
    seen.add(real);

    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules' || entry.name === '.git') continue;
        if (depth < maxDepth) queue.push({ dir: full, depth: depth + 1 });
        continue;
      }
      const record = { path: full, name: entry.name, depth, isSymlink: entry.isSymbolicLink() };
      if (!filter || filter(record)) results.push(record);
      if (results.length >= maxEntries) break;
    }
  }
  return results;
}

/** Find the 1-based line number of a substring, for report anchoring. */
export function lineOf(text, needle) {
  if (!text || !needle) return undefined;
  const idx = text.indexOf(needle);
  if (idx === -1) return undefined;
  return text.slice(0, idx).split('\n').length;
}

/**
 * Directories any process running as this user can drop a file into. Code
 * executed from here has no meaningful provenance.
 */
export function isUserWritableTransientPath(p) {
  if (!p) return false;
  const norm = p.replace(/\\/g, '/').toLowerCase();
  const patterns = [
    '/downloads/', '/download/', '/temp/', '/tmp/', '/appdata/local/temp/',
    '/desktop/', '/public/', '/users/public/', '/var/tmp/', '/dev/shm/',
  ];
  return patterns.some((frag) => norm.includes(frag));
}
