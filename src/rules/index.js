import { credentialRules } from './credentials.js';
import { injectionRules } from './injection.js';
import { exfiltrationRules } from './exfiltration.js';
import { permissionRules } from './permissions.js';
import { provenanceRules } from './provenance.js';
import { integrityRules } from './integrity.js';

export const CATEGORIES = {
  AW1: 'credentials',
  AW2: 'prompt-injection',
  AW3: 'exfiltration',
  AW4: 'permissions',
  AW5: 'provenance',
  AW6: 'integrity',
};

/** @type {{ id: string, title: string, appliesTo: (a: any) => boolean, run: (a: any) => any[] }[]} */
export const RULES = [
  ...credentialRules,
  ...injectionRules,
  ...exfiltrationRules,
  ...permissionRules,
  ...provenanceRules,
  ...integrityRules,
];

export function categoryOf(ruleId) {
  return CATEGORIES[ruleId.slice(0, 3)] ?? 'other';
}

/**
 * Run every applicable rule over every artifact.
 *
 * A rule that throws is a bug in agentward, not a reason to abandon the scan,
 * so failures are collected and surfaced rather than propagated.
 *
 * @param {import('../model.js').Artifact[]} artifacts
 * @param {{ only?: string[], skip?: string[] }} [options]
 */
export function runRules(artifacts, { only, skip } = {}) {
  const findings = [];
  const errors = [];

  for (const rule of RULES) {
    if (only?.length && !only.includes(rule.id) && !only.includes(categoryOf(rule.id))) continue;
    if (skip?.length && (skip.includes(rule.id) || skip.includes(categoryOf(rule.id)))) continue;

    for (const art of artifacts) {
      if (!rule.appliesTo(art)) continue;
      try {
        const produced = rule.run(art) ?? [];
        for (const f of produced) findings.push({ category: categoryOf(f.ruleId), ...f });
      } catch (error) {
        errors.push({ rule: rule.id, artifact: art.id, message: String(error?.message ?? error) });
      }
    }
  }

  return { findings, errors };
}
