/**
 * Prompt injection hidden inside things you installed.
 *
 * A skill is instructions, and instructions are code for a model. The
 * dangerous case is not a skill that says something bad in plain sight, it is
 * a skill that says something bad where your eyes cannot follow: Unicode tag
 * characters, zero-width runs, bidi overrides, HTML comments.
 */
import { finding } from '../model.js';
import { lineAt, snippet, matches } from './util.js';

/** Unicode tag block. Renders as nothing, reaches the model as ASCII. */
const TAG_CHARS = /[\u{E0000}-\u{E007F}]/gu;
const ZERO_WIDTH = /[\u200B-\u200D\u2060\u180E]/g;
const BIDI_OVERRIDE = /[\u202A-\u202E\u2066-\u2069]/g;
const VARIATION_SELECTORS = /[\uFE00-\uFE0F]|[\u{E0100}-\u{E01EF}]/gu;

/** Phrases that only appear when text is talking past you, to the model. */
const OVERRIDE_PHRASES = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above|earlier)\s+(?:instructions?|prompts?|rules?)/i,
  /disregard\s+(?:all\s+)?(?:previous|prior|the\s+above|your)\s+(?:instructions?|rules?|guidelines?)/i,
  /do\s+not\s+(?:tell|inform|mention\s+(?:this\s+)?to|reveal\s+(?:this\s+)?to)\s+the\s+user/i,
  // "without asking the user" is deliberately absent: acting without asking is
  // a normal, openly documented property of autonomous agents. Concealment is
  // the signal, not autonomy.
  /without\s+(?:telling|informing|notifying)\s+the\s+user/i,
  /(?:never|do\s*n[o']?t)\s+(?:mention|log|report|display)\s+(?:this|these\s+(?:steps|actions|instructions))/i,
  /you\s+are\s+now\s+(?:in\s+)?(?:developer|god|admin|unrestricted|dan)\s+mode/i,
  /(?:reveal|print|output|repeat)\s+(?:your|the)\s+(?:system\s+prompt|initial\s+instructions|hidden\s+instructions)/i,
  /this\s+(?:instruction|message)\s+(?:overrides|supersedes|takes\s+precedence\s+over)/i,
  /pretend\s+(?:that\s+)?(?:the\s+user\s+)?(?:approved|authorized|confirmed)/i,
];

/** Text that tries to talk the agent out of its own guardrails. */
const SAFETY_DISABLE = [
  /--dangerously-skip-permissions/i,
  /--yolo\b/i,
  /\bbypassPermissions\b/i,
  /\bskipDangerousModePermissionPrompt\b/i,
  /auto[- ]?approve\s+(?:all|every|any)\b/i,
  /disable\s+(?:the\s+)?(?:safety|guardrails?|permission\s+prompts?|confirmation)/i,
  /run\s+(?:this\s+)?without\s+(?:asking|confirmation|permission)/i,
];

const HTML_COMMENT = /<!--([\s\S]{0,4000}?)-->/g;

/** Comment content that reads like an order rather than a note. */
const IMPERATIVE_IN_COMMENT =
  /\b(?:you\s+must|always\s+|never\s+|ignore|disregard|instead\s+of|do\s+not\s+tell|execute|run\s+the\s+following|send\s+(?:the\s+)?(?:contents?|file|data)|curl|wget|fetch\()/i;

const BASE64_BLOB = /\b[A-Za-z0-9+/]{200,}={0,2}\b/g;

/** Decode Unicode tag characters back into the ASCII they smuggle. */
export function decodeTagChars(text) {
  let out = '';
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp >= 0xe0000 && cp <= 0xe007f) out += String.fromCharCode(cp - 0xe0000);
  }
  return out.replace(/[\u0000-\u001F\u007F]/g, '');
}

const TEXT_KINDS = ['skill', 'context-file', 'command', 'subagent'];

export const injectionRules = [
  {
    id: 'AW201',
    title: 'Invisible Unicode tag characters carrying hidden text',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const found = text.match(TAG_CHARS);
      if (!found?.length) return [];
      const decoded = decodeTagChars(text);
      const index = text.search(TAG_CHARS);
      return [
        finding(art, {
          ruleId: 'AW201',
          title: `Hidden instructions smuggled in Unicode tag characters in ${art.kind} "${art.name}"`,
          severity: 'critical',
          line: lineAt(text, index),
          evidence: decoded
            ? `${found.length} tag chars decoding to: ${JSON.stringify(decoded.slice(0, 160))}`
            : `${found.length} Unicode tag characters`,
          why: 'Unicode tag characters render as nothing at all, so this text is invisible in every editor and on GitHub, but the model receives it as ordinary instructions. There is no legitimate reason for them to appear in a skill.',
          fix: 'Treat this file as hostile. Do not run it. Remove the skill, and report it to whoever distributed it.',
        }),
      ];
    },
  },

  {
    id: 'AW202',
    title: 'Bidirectional text override',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const found = text.match(BIDI_OVERRIDE);
      if (!found?.length) return [];
      const index = text.search(BIDI_OVERRIDE);
      return [
        finding(art, {
          ruleId: 'AW202',
          title: `Bidi override characters in ${art.kind} "${art.name}"`,
          severity: 'high',
          line: lineAt(text, index),
          evidence: `${found.length} bidirectional control character(s)`,
          why: 'Bidi controls reorder how text displays without changing what is actually there, so what you read can differ from what the model reads. This is the Trojan Source technique.',
          fix: 'Inspect the raw bytes of this file. Unless it genuinely contains right-to-left prose, remove the controls.',
        }),
      ];
    },
  },

  {
    id: 'AW203',
    title: 'Zero-width character run',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const found = text.match(ZERO_WIDTH);
      // A stray zero-width space is a copy-paste accident. A run is a payload.
      if (!found || found.length < 4) return [];
      const index = text.search(ZERO_WIDTH);
      return [
        finding(art, {
          ruleId: 'AW203',
          title: `${found.length} zero-width characters in ${art.kind} "${art.name}"`,
          severity: 'medium',
          line: lineAt(text, index),
          evidence: `${found.length} zero-width characters starting at line ${lineAt(text, index) ?? '?'}`,
          why: 'Zero-width characters are invisible when rendered and can encode a hidden message or watermark that the model still reads.',
          fix: 'Strip zero-width characters and confirm the visible text is the whole text.',
        }),
      ];
    },
  },

  {
    id: 'AW204',
    title: 'Variation-selector steganography',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const found = text.match(VARIATION_SELECTORS);
      // Emoji legitimately use one selector each; a dense run is encoding.
      if (!found || found.length < 16) return [];
      const index = text.search(VARIATION_SELECTORS);
      return [
        finding(art, {
          ruleId: 'AW204',
          title: `Dense variation-selector run in ${art.kind} "${art.name}"`,
          severity: 'medium',
          line: lineAt(text, index),
          evidence: `${found.length} variation selectors`,
          why: 'Long runs of variation selectors are a known way to hide an arbitrary payload inside otherwise innocent text.',
          fix: 'Inspect the raw bytes. If this is not emoji formatting, treat the file as hostile.',
        }),
      ];
    },
  },

  {
    id: 'AW205',
    title: 'Instruction override language',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const out = [];
      for (const phrase of OVERRIDE_PHRASES) {
        const m = phrase.exec(text);
        if (!m) continue;
        out.push(
          finding(art, {
            ruleId: 'AW205',
            title: `Instruction-override language in ${art.kind} "${art.name}"`,
            severity: art.kind === 'context-file' ? 'high' : 'medium',
            line: lineAt(text, m.index),
            evidence: snippet(text, m.index),
            why: 'This text tries to override instructions or to act while keeping you uninformed. Legitimate skills describe a task; they do not ask the model to hide what it is doing.',
            fix: 'Read the surrounding section. If the intent is to conceal behaviour from you, remove the skill.',
          }),
        );
        break; // One finding per artifact is enough to send you to the file.
      }
      return out;
    },
  },

  {
    id: 'AW206',
    title: 'Hidden instructions in an HTML comment',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const out = [];
      for (const m of matches(HTML_COMMENT, text)) {
        const body = m[1] ?? '';
        if (body.length < 24 || !IMPERATIVE_IN_COMMENT.test(body)) continue;
        out.push(
          finding(art, {
            ruleId: 'AW206',
            title: `Directive hidden in an HTML comment in ${art.kind} "${art.name}"`,
            severity: 'high',
            line: lineAt(text, m.index),
            evidence: snippet(body, 0, 90),
            why: 'HTML comments do not render in a markdown preview or on GitHub, but the model reads the raw file, so a comment is a place to put instructions you will not see.',
            fix: 'Read the comment in the raw file and decide whether you meant to run it.',
          }),
        );
      }
      return out.slice(0, 3);
    },
  },

  {
    id: 'AW207',
    title: 'Text that argues for disabling safety controls',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      for (const phrase of SAFETY_DISABLE) {
        const m = phrase.exec(text);
        if (!m) continue;
        return [
          finding(art, {
            ruleId: 'AW207',
            title: `${art.kind} "${art.name}" instructs the agent to bypass permission prompts`,
            severity: 'high',
            line: lineAt(text, m.index),
            evidence: snippet(text, m.index),
            why: 'Permission prompts are the last thing standing between a bad instruction and your filesystem. Content that talks the agent past them is removing your only checkpoint.',
            fix: 'Confirm you intended this. If the skill came from someone else, treat it as hostile.',
          }),
        ];
      }
      return [];
    },
  },

  {
    id: 'AW208',
    title: 'Large encoded blob in instruction text',
    appliesTo: (art) => TEXT_KINDS.includes(art.kind),
    run(art) {
      const text = art.text ?? '';
      const out = [];
      for (const m of matches(BASE64_BLOB, text)) {
        // Skip data URIs for images, which are noisy but benign.
        const before = text.slice(Math.max(0, m.index - 40), m.index);
        if (/data:image\//i.test(before)) continue;
        out.push(
          finding(art, {
            ruleId: 'AW208',
            title: `${m[0].length}-character encoded blob in ${art.kind} "${art.name}"`,
            severity: 'medium',
            line: lineAt(text, m.index),
            evidence: `${m[0].slice(0, 40)}... (${m[0].length} chars)`,
            why: 'An opaque encoded blob in instruction text cannot be reviewed by reading it, which is usually the point.',
            fix: 'Decode it and confirm what it contains before using the skill.',
          }),
        );
        break;
      }
      return out;
    },
  },
];
