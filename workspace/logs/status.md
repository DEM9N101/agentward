# Autonomous Binary Audit — Status

**Active phase:** Phase 2 complete (synthetic pipeline verified); Phase 3
blocked on IDA Pro connectivity.

## Phase 1 — bootstrap ✓
Workspace, tooling check, REA/IDA-MCP candidates cloned. Full detail in
`bootstrap.log`. One hard constraint surfaced below.

## Phase 2 — target & IDA integration ◐
- `./workspace/binaries/` was empty at start → synthetic ELF built with
  three known defects (`strcpy`, `memcpy`-len, UAF) to prove the pipeline
  end-to-end. Replace it with the real target when ready.
- IDA Pro 9.1 integration test **cannot run from this container**. The
  Pro binary and the MCP plugin live on the user's local machine; this
  cloud session has no path to localhost there. See `bootstrap.log` for
  the local install steps.

## Phase 3 — audit loop (partial, native-tool fallback)
Without IDA, ran a static heuristic sweep with `objdump` / `nm` /
`readelf` / `strings`:
- Baseline: `workspace/logs/enum.md`
- Candidates: `workspace/logs/vulnerability_candidates.md`
- IDAPython script staged for the moment IDA is reachable:
  `workspace/scripts/ida_audit.py` (enumerates sinks, writes
  `<idb>_audit.md`).

## What the user needs to do next
1. Drop a real target binary into `workspace/binaries/` (ELF, Mach-O or
   PE — stripped/unstripped both fine).
2. On the local machine with IDA Pro 9.1 installed, follow the
   `ida-pro-mcp` install steps in `bootstrap.log` and either run Claude
   Code locally against it, or tunnel the MCP endpoint into this session.

## Findings so far (synthetic binary — illustrative)
See `vulnerability_candidates.md`. All three planted bugs detected by
the fallback pass; running `ida_audit.py` against the IDB would add
pseudo-C context and xrefs.
