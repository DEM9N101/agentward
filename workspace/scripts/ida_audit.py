"""IDAPython audit script.

Run inside IDA Pro 9.1 (File -> Script file...) against the loaded database.
Enumerates functions, flags calls to dangerous sinks, and emits a markdown
report alongside the IDB. Designed to be invoked headlessly via idat64
(`idat64 -A -S"ida_audit.py" <target>`), or via the MCP server tool loop.
"""

import os
import idaapi, idautils, idc

SINKS = {
    "strcpy", "strcat", "sprintf", "vsprintf", "gets", "scanf",
    "memcpy", "memmove", "bcopy", "read", "recv",
    "system", "popen", "execve", "execl", "execlp",
    "malloc", "calloc", "realloc", "free",
}

def func_calls(fva):
    out = []
    f = idaapi.get_func(fva)
    if not f:
        return out
    for ea in idautils.FuncItems(fva):
        if idc.print_insn_mnem(ea) in ("call", "jmp"):
            tgt = idc.get_operand_value(ea, 0)
            name = idc.get_name(tgt) or ""
            name = name.lstrip("_").split("@")[0]
            if name in SINKS:
                out.append((ea, name))
    return out

def main():
    out_path = os.path.join(idc.get_idb_path().rsplit(".", 1)[0] + "_audit.md")
    rows = []
    for fva in idautils.Functions():
        hits = func_calls(fva)
        if hits:
            fn = idc.get_func_name(fva)
            for ea, sink in hits:
                rows.append((fn, hex(ea), sink))
    with open(out_path, "w") as f:
        f.write("# IDA audit — dangerous call sites\n\n")
        f.write("| function | address | sink |\n|---|---|---|\n")
        for r in rows:
            f.write("| `%s` | `%s` | `%s` |\n" % r)
    print("[audit] wrote", out_path, "with", len(rows), "rows")

if __name__ == "__main__":
    main()
