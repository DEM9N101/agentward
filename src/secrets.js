/**
 * Secret detection.
 *
 * Two layers: high-confidence vendor patterns (a `ghp_` prefix is not a
 * coincidence) and a generic `key = value` layer gated behind entropy and
 * placeholder checks, because half the configs on earth contain
 * `"apiKey": "YOUR_KEY_HERE"` and reporting those trains people to ignore us.
 */

/** @typedef {{ id: string, label: string, re: RegExp, group?: number }} SecretPattern */

/** @type {SecretPattern[]} */
export const VENDOR_PATTERNS = [
  { id: 'jwt', label: 'JSON Web Token', re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { id: 'anthropic', label: 'Anthropic API key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}/g },
  // Ordered after, and excluding, the Anthropic prefix: `sk-ant-...` would
  // otherwise be swallowed by the more general OpenAI shape.
  { id: 'openai', label: 'OpenAI API key', re: /\bsk-(?!ant-)(?:proj-|svcacct-)?[A-Za-z0-9_-]{20,}/g },
  { id: 'github-pat', label: 'GitHub personal access token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}/g },
  { id: 'github-fine', label: 'GitHub fine-grained token', re: /\bgithub_pat_[A-Za-z0-9_]{22,}/g },
  { id: 'aws-akid', label: 'AWS access key id', re: /\b(?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16}\b/g },
  { id: 'slack', label: 'Slack token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}/g },
  { id: 'google', label: 'Google API key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { id: 'gitlab', label: 'GitLab token', re: /\bglpat-[A-Za-z0-9_-]{20,}/g },
  { id: 'stripe', label: 'Stripe live key', re: /\b[rs]k_live_[0-9a-zA-Z]{16,}/g },
  { id: 'npm', label: 'npm token', re: /\bnpm_[A-Za-z0-9]{36}\b/g },
  { id: 'huggingface', label: 'Hugging Face token', re: /\bhf_[A-Za-z0-9]{30,}/g },
  { id: 'sendgrid', label: 'SendGrid key', re: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/g },
  { id: 'telegram', label: 'Telegram bot token', re: /\b\d{8,10}:[A-Za-z0-9_-]{35}\b/g },
  { id: 'discord-webhook', label: 'Discord webhook URL', re: /https:\/\/(?:ptb\.|canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g },
  { id: 'private-key', label: 'Private key block', re: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY(?: BLOCK)?-----/g },
  // Real bearer tokens are long. A short one is a documentation example, and
  // agent skills are full of documentation examples.
  { id: 'bearer', label: 'Bearer token', re: /\bBearer\s+([A-Za-z0-9._~+/=-]{40,})/gi, group: 1 },
  {
    id: 'basic-auth-url',
    label: 'Credentials embedded in URL',
    re: /\b[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:([^\s/@]{10,})@/gi,
    group: 1,
    minEntropy: 2.8,
  },
];

/** Words that appear where a password would go, in every tutorial ever written. */
const FILLER_PASSWORD =
  /^(?:pass(?:word|wd)?|secret|token|user(?:name)?|admin|root|db[_-]?pass\w*|my[_-]?\w+|p{2,}w{0,2}d|credentials?)$/i;

/** A value the author already trimmed for display is not a live credential. */
const TRUNCATED = /(?:\.\.\.|…|<truncated>|\bsnip\b)/i;

/**
 * Credentials are opaque strings. Anything containing brackets, quotes or
 * operators is a fragment of code, and skills are mostly code samples:
 * `password=serializers.CharField(` is not a password.
 */
const TOKEN_SHAPE = /^[A-Za-z0-9_\-+/=.~]{16,}$/;

/** A reference to a credential is the correct way to handle one, not a leak. */
const ENV_REFERENCE = /(?:process\.env|import\.meta\.env|os\.environ|getenv|System\.getenv|\$env:|ENV\[)/i;

/** Generic `secret-ish name = long value` detection, entropy gated. */
const GENERIC_RE =
  /\b(api[_-]?key|apikey|auth[_-]?token|access[_-]?token|refresh[_-]?token|client[_-]?secret|secret[_-]?key|password|passwd|token|secret)\b["']?\s*[:=]\s*["']?([^\s"',}\]]{12,})/gi;

/** Values that look like a secret slot but hold no secret. */
const PLACEHOLDER_RE =
  /^(?:\$\{?[A-Z0-9_]+\}?|%[A-Z0-9_]+%|<[^>]+>|\{\{[^}]+\}\}|null|undefined|true|false|none|empty)$/i;

/** Markers that say "this is not a real credential" in any context. */
const EXPLICIT_FAKE =
  /(your[_-]?|example|sample|dummy|placeholder|change[_-]?me|redacted|xxxx|test[_-]?key|fake|insert[_-]?|replace[_-]?|todo)/i;

/**
 * Weaker tells. A run of sequential characters means nothing inside a token
 * that already carries a vendor prefix, but it is decisive for a generic
 * `secret = "..."` match.
 */
const WEAK_FAKE = /(abcdef|1234567890|s3cret|hunter2|qwerty|letmein)/i;

/** Shannon entropy in bits per character. */
export function entropy(value) {
  if (!value) return 0;
  const counts = new Map();
  for (const ch of value) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let bits = 0;
  for (const n of counts.values()) {
    const p = n / value.length;
    bits -= p * Math.log2(p);
  }
  return bits;
}

/**
 * Reject values that are clearly not live credentials.
 *
 * @param {string} value
 * @param {'high'|'medium'} [confidence] A vendor-prefixed match earns the
 *   benefit of the doubt on weaker tells; a generic match does not.
 */
export function looksLikePlaceholder(value, confidence = 'medium') {
  if (PLACEHOLDER_RE.test(value)) return true;
  if (EXPLICIT_FAKE.test(value)) return true;
  if (TRUNCATED.test(value)) return true;
  if (FILLER_PASSWORD.test(value)) return true;
  if (confidence !== 'high' && WEAK_FAKE.test(value)) return true;
  // A path, a URL without credentials, or a bare filename is not a secret.
  if (/^(?:[A-Za-z]:[\\/]|\.{0,2}[\\/]|https?:\/\/)/.test(value) && !/:\/\/[^\s/:@]+:[^\s/@]+@/.test(value)) return true;
  // Repeated single character, e.g. "xxxxxxxxxxxx".
  if (/^(.)\1+$/.test(value)) return true;
  return false;
}

/**
 * Find secrets in a blob of text.
 * @param {string} text
 * @returns {{ id: string, label: string, value: string, index: number, confidence: 'high'|'medium' }[]}
 */
export function findSecrets(text) {
  if (!text) return [];
  /** @type {Map<string, any>} */
  const hits = new Map();

  for (const pattern of VENDOR_PATTERNS) {
    pattern.re.lastIndex = 0;
    let m;
    while ((m = pattern.re.exec(text)) !== null) {
      const value = pattern.group ? m[pattern.group] : m[0];
      if (!value || looksLikePlaceholder(value, 'high')) continue;
      if (pattern.minEntropy && entropy(value) < pattern.minEntropy) continue;
      // Keyed by value, not by pattern: a JWT inside an Authorization header
      // matches both the jwt and bearer patterns, and it is still one secret.
      if (!hits.has(value)) {
        hits.set(value, { id: pattern.id, label: pattern.label, value, index: m.index, confidence: 'high' });
      }
      if (m.index === pattern.re.lastIndex) pattern.re.lastIndex++;
    }
  }

  GENERIC_RE.lastIndex = 0;
  let g;
  while ((g = GENERIC_RE.exec(text)) !== null) {
    const value = g[2];
    if (looksLikePlaceholder(value)) continue;
    if (!TOKEN_SHAPE.test(value)) continue;
    if (ENV_REFERENCE.test(value)) continue;
    // Long and disordered enough to plausibly be a real credential.
    if (value.length < 16 || entropy(value) < 3.2) continue;
    const alreadyKnown = [...hits.values()].some((h) => h.value.includes(value) || value.includes(h.value));
    if (!alreadyKnown && !hits.has(value)) {
      hits.set(value, {
        id: 'generic',
        label: `Possible credential in \`${g[1]}\``,
        value,
        index: g.index,
        confidence: 'medium',
      });
    }
  }

  return [...hits.values()].sort((a, b) => a.index - b.index);
}

/**
 * Mask a secret so a report can be shared publicly but the owner can still
 * tell which credential is meant.
 */
export function maskSecret(value) {
  if (!value) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  return `${value.slice(0, 4)}...${value.slice(-2)} (${value.length} chars)`;
}

/** Redact every detectable secret inside a string. */
export function redact(text) {
  if (!text) return text;
  let out = text;
  for (const { value } of findSecrets(text)) {
    out = out.split(value).join(`[REDACTED ${maskSecret(value)}]`);
  }
  return out;
}
