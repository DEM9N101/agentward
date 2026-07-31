# Design

## The problem

Installing agent tooling is a permission grant that nobody records. An MCP server is a process launched with your account. A skill is instruction text the model obeys. A hook is a shell command fired on an event you never see. None of it has a manifest, a lock file, or a diff when it changes.

Meanwhile the ecosystem grew fast enough that the tooling to inspect it never got written. Registries grade themselves in the cloud. Nothing looks at the installed state on a real machine, because doing so means tracking a dozen vendors' config formats forever, and there is no money in it.

That maintenance burden is the reason the gap exists. It is also the reason this project is structured so that adding a vendor is a table entry and adding a rule is a pure function.

## Shape

Three stages, connected by two data types and nothing else.

```
discover/  ->  Artifact[]  ->  rules/  ->  Finding[]  ->  report/
```

`Artifact` is anything on disk that can influence or act for an agent. `Finding` is a problem with one artifact. Reporters only see findings. Rules only see artifacts. Discovery only sees the filesystem. Nothing reaches across.

This matters because the three stages fail differently. Discovery meets malformed files and permission errors. Rules meet weird text. Reporters meet a terminal that may not do colour. Keeping them apart means a bug in one cannot corrupt the others, and each is testable on its own: rules are tested with hand-built artifacts and no filesystem at all.

### Artifacts

Normalized in `src/model.js`. Every artifact carries `vendor`, `kind`, `name`, `file`, optional `line`, structured `data`, raw `text`, and inferred `capabilities`.

Capabilities answer the question people actually have. Not "is this malicious" but "what could this do to me". A stdio MCP server gets `execute-code`, `read-files`, `write-files` and `network` regardless of the tools it advertises, because MCP defines no sandbox and the process runs as you.

### Rules

Each rule is `{ id, title, appliesTo, run }` where `run(artifact)` returns findings. Pure, synchronous, no I/O. A rule that throws is a bug in agentward rather than a reason to abandon a scan, so the engine collects errors and keeps going.

Rule ids are stable and namespaced by category (AW1xx credentials, AW2xx injection, AW3xx exfiltration, AW4xx permissions, AW5xx provenance, AW6xx integrity). Stability matters because ids appear in baselines and in SARIF, and people write them into config.

### Findings and redaction

Redaction happens inside the `finding()` factory, not in individual rules.

This was a deliberate move after a real bug. Two separate rules built evidence from raw config values and leaked a usable token prefix into output that the README tells people is safe to publish. Any rule can forget. The factory cannot be bypassed, so it is the only correct place for the guarantee.

Excerpts are redacted before they are sliced, for the same reason: a window that cuts through the middle of a secret leaves a working prefix behind, and redacting afterwards silently fails to match it.

## Decisions worth defending

**Zero dependencies, enforced in CI.** A supply-chain scanner with a supply chain undermines its own claim. This is why `src/toml.js` exists: Codex stores MCP servers in TOML, and 200 lines of parser is cheaper than a dependency in this specific project.

**No network access, ever.** No telemetry, no update check, no reputation service. The claim is verifiable by reading the source, which contains no HTTP client. A tool that inspects your credentials has to be auditable in one sitting.

**Read-only.** It never modifies what it scans. There is no `--fix`. Automatically rewriting a file that might be hostile, in a directory the user has not read, is a worse idea than telling them what to look at.

**Findings are collapsed by issue, not by file.** Plugins routinely ship the same skill eight times over, once per translation and once per editor directory. Counting each copy separately buries the report and wrecks the score for what is one problem in one plugin. The report shows a copy count instead.

**The score decays exponentially instead of subtracting.** A linear score hits zero almost immediately and then stops carrying information: a machine with two problems and a machine with forty both read zero. Contributions are also capped at three occurrences per rule, so one noisy rule cannot dominate.

**Environment variables are only trusted when they point inside the home directory being scanned.** Otherwise `--home somewhere-else` silently pulls in the real machine's VS Code configuration, which makes the flag a lie. This was found by a test, not by reasoning.

## False positives are the product

Agent skills are mostly documentation, and documentation is full of `curl` examples and fake keys. A scanner that cries wolf trains people to ignore it, which is worse than not existing.

The tuning happened against a real installation of 471 skills. First run: 46 critical findings, 44 of them noise. The fixes were specific:

- `process.env.FOO` matched a credential-store pattern that included a bare `.env`. Removed; a dotenv file only counts when a shell command reads it.
- `fetch(` and `axios.` counted as network egress, so any code sample plus any mention of a key scored critical. Egress is now shell-level commands only.
- `password=serializers.CharField(` matched the generic secret detector. Values must now be token-shaped, with no brackets or operators.
- AWS's own documented example key was flagged. Explicit fake markers are rejected at any confidence.
- Short `Bearer eyJ...` fragments in API documentation matched. Bearer tokens must be at least 40 characters.
- "act without asking the user" was read as concealment. It is not; acting without asking is a documented property of autonomous agents. Only "without telling the user" survives.

The same machine now reports one critical finding, and it is a real token.

Every rule needs two tests: one proving it fires, and one proving it stays quiet on the benign case. The second is the one that keeps the tool usable.

## Adding a vendor

One entry in the table in `src/discover/vendors.js`: name, config paths, and where its skills, agents, commands and context files live. The shared MCP normalizer handles the server block, and JSON or TOML is chosen by extension.

A vendor only needs its own module when its layout is genuinely different. Claude Code has one because plugins, marketplaces, hooks and status lines have no equivalent elsewhere.

## Known limits

It reads configuration and instruction text. It does not execute anything, so it cannot see what a script does at runtime, and it cannot follow an MCP server into the package it launches.

It cannot tell you something is safe. Absence of findings means absence of the patterns it knows about.

Detection by pattern is evadable by anyone who reads the patterns. That is acceptable: the realistic threat is not a targeted attacker, it is a skill copied from a repo by someone who did not read it, and a payload nobody looked at.
