/**
 * What is in the directory next to the instructions.
 *
 * A skill is presented to you as a markdown file. The directory it lives in can
 * hold anything, and the agent will happily run it.
 */
import path from 'node:path';
import { finding } from '../model.js';

/** Big enough to bury something in, without you scrolling to the end. */
const LARGE_SKILL_BYTES = 256 * 1024;
const MANY_FILES = 150;

export const integrityRules = [
  {
    id: 'AW601',
    title: 'Executable bundled with a skill',
    appliesTo: (art) => art.kind === 'skill',
    run(art) {
      const executables = art.data?.executables ?? [];
      if (!executables.length) return [];
      const shown = executables.slice(0, 5).map((p) => path.basename(p));
      const binaries = executables.filter((p) => /\.(?:exe|dll|so|dylib|node|jar|scr|com|msi)$/i.test(p));
      return [
        finding(art, {
          ruleId: 'AW601',
          title: `Skill "${art.name}" ships ${executables.length} executable file${executables.length === 1 ? '' : 's'}`,
          severity: binaries.length ? 'high' : 'low',
          evidence: shown.join(', ') + (executables.length > 5 ? `, +${executables.length - 5} more` : ''),
          why: binaries.length
            ? 'A compiled binary inside a skill cannot be reviewed by reading the skill. You are trusting it on the strength of a markdown file.'
            : 'The skill carries scripts alongside its instructions. That is common and often fine, but those scripts run with your privileges and nothing shows them to you.',
          fix: 'Read what the skill actually invokes. Compiled binaries in a skill directory deserve a hard look before you keep it.',
        }),
      ];
    },
  },

  {
    id: 'AW602',
    title: 'Symlink escaping the skill directory',
    appliesTo: (art) => art.kind === 'skill',
    run(art) {
      const escaping = art.data?.escapingSymlinks ?? [];
      if (!escaping.length) return [];
      return [
        finding(art, {
          ruleId: 'AW602',
          title: `Skill "${art.name}" links outside its own directory`,
          severity: 'high',
          evidence: escaping
            .slice(0, 3)
            .map((s) => `${path.basename(s.path)} -> ${s.target ?? 'broken'}`)
            .join(', '),
          why: 'A symlink pointing out of the skill directory reaches files the skill was never given, and it survives a review that only reads the skill folder.',
          fix: 'Follow each link and confirm the target is meant to be reachable.',
        }),
      ];
    },
  },

  {
    id: 'AW603',
    title: 'Oversized instruction file',
    appliesTo: (art) => art.kind === 'skill' || art.kind === 'context-file',
    run(art) {
      const size = (art.text ?? '').length;
      if (size < LARGE_SKILL_BYTES) return [];
      return [
        finding(art, {
          ruleId: 'AW603',
          title: `${art.kind === 'skill' ? 'Skill' : 'Context file'} "${art.name}" is ${Math.round(size / 1024)} KB of instructions`,
          severity: 'low',
          evidence: `${size.toLocaleString()} characters`,
          why: 'Nobody reads to the bottom of a file this size, which makes the bottom of the file a good hiding place. It also consumes context on every load.',
          fix: 'Split it, or read the whole thing once and confirm it says only what you expect.',
        }),
      ];
    },
  },

  {
    id: 'AW604',
    title: 'Unusually large skill payload',
    appliesTo: (art) => art.kind === 'skill',
    run(art) {
      const fileCount = art.data?.fileCount ?? 0;
      if (fileCount < MANY_FILES) return [];
      return [
        finding(art, {
          ruleId: 'AW604',
          title: `Skill "${art.name}" contains ${fileCount} files`,
          severity: 'info',
          evidence: `${fileCount} files, ${Math.round((art.data?.totalBytes ?? 0) / 1024)} KB`,
          why: 'A skill this large is effectively an application. Its size is not itself a problem, but it means no one has reviewed all of it.',
          fix: 'Know what it is before you rely on it.',
        }),
      ];
    },
  },

  {
    id: 'AW605',
    title: 'Skill name uses confusable characters',
    appliesTo: (art) => art.kind === 'skill' || art.kind === 'command',
    run(art) {
      // Non-ASCII in an identifier is how one name is made to look like another.
      const suspicious = /[^\x00-\x7F]/.exec(art.name ?? '');
      if (!suspicious) return [];
      return [
        finding(art, {
          ruleId: 'AW605',
          title: `${art.kind} name "${art.name}" contains non-ASCII characters`,
          severity: 'medium',
          evidence: [...art.name].map((c) => (c.charCodeAt(0) > 127 ? `U+${c.codePointAt(0).toString(16).toUpperCase()}` : c)).join(''),
          why: 'Cyrillic and Greek letters that look identical to Latin ones let one name impersonate another, so the thing you invoke is not the thing you installed.',
          fix: 'Compare against the name you expected, character by character.',
        }),
      ];
    },
  },
];
