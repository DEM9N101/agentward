import { redact } from '../secrets.js';

/**
 * A short, single-line, redacted excerpt around a match. Safe to publish.
 *
 * Redaction happens *before* slicing. Redacting afterwards silently fails
 * whenever the window cuts through the middle of a secret, which leaves a
 * usable prefix in a report people are encouraged to paste into issues.
 */
export function snippet(text, index = 0, radius = 60) {
  if (!text) return '';

  const safe = redact(text);
  // Redaction changes the string length, so recover the window by anchoring on
  // the surrounding words rather than the original offset.
  const anchor = text.slice(Math.max(0, index - 12), index + 12);
  const safeAnchor = redact(anchor);
  const at = safe.indexOf(safeAnchor);
  const centre = at === -1 ? Math.min(index, Math.max(0, safe.length - 1)) : at + Math.floor(safeAnchor.length / 2);

  const start = Math.max(0, centre - radius);
  const end = Math.min(safe.length, centre + radius);
  const prefix = start > 0 ? '...' : '';
  const suffix = end < safe.length ? '...' : '';
  const body = safe.slice(start, end).replace(/\s+/g, ' ').trim();
  return `${prefix}${body}${suffix}`;
}

/** 1-based line number of a character offset. */
export function lineAt(text, index) {
  if (!text || index == null) return undefined;
  return text.slice(0, index).split('\n').length;
}

/**
 * Everything a shell-ish artifact might execute, as one searchable string.
 * Deduplicated, because a hook's `command` and its `text` are the same string
 * and repeating it doubles every excerpt.
 */
export function commandSurface(art) {
  const parts = [];
  if (art.data?.command) parts.push(String(art.data.command));
  if (Array.isArray(art.data?.args)) parts.push(...art.data.args.map(String));
  if (art.data?.url) parts.push(String(art.data.url));
  if (art.text) parts.push(art.text);
  return [...new Set(parts)].join(' ');
}

/** Run a global regex and yield every match without infinite-looping. */
export function* matches(re, text) {
  if (!text) return;
  const rx = new RegExp(re.source, re.flags.includes('g') ? re.flags : `${re.flags}g`);
  let m;
  while ((m = rx.exec(text)) !== null) {
    yield m;
    if (m.index === rx.lastIndex) rx.lastIndex++;
  }
}
