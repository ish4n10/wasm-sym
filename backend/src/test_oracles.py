from engine import explore
from helpers.types import Program


def run_test(name: str, program: Program, description: str):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print(f"{description}")
    print(f"{'='*60}")
    findings = explore(program)
    print(f"\nTotal findings: {len(findings)}")
    for f in findings:
        print(f"  type: {f['type']}")
        print(f"  pc:   {f['pc']}")
        print(f"  constraints: {f['constraints']}")
        print(f"  model:")
        if f['model']:
            for d in f['model'].decls():
                print(f"    {d.name()} = {f['model'][d]}")
    print()


# ---- 1. UNREACHABLE on some but not all inputs ----
test1: Program = [
    ("local.get", 0),
    ("i32.const", 10),
    ("i32.lt_s",),
    ("br_if", 5),
    ("HALT",),
    ("unreachable",),
]
run_test("unreachable", test1,
         "x<10 -> unreachable, x>=10 -> HALT")

# ---- 2. DIV_BY_ZERO ----
test2: Program = [
    ("local.get", 0),
    ("local.get", 1),
    ("i32.div_s",),
    ("HALT",),
]
run_test("div_by_zero", test2,
         "i32.div_s with symbolic dividend/divisor. Trap if divisor==0 or INT32_MIN/-1.")

# ---- 3. IN-BOUNDS LOAD (guarded) ----
test3: Program = [
    ("local.get", 0),
    ("i32.const", 65532),
    ("i32.lt_u",),
    ("br_if", 5),
    ("HALT",),
    ("local.get", 0),
    ("i32.load",),
    ("HALT",),
]
run_test("in_bounds_guarded", test3,
         "Guard: address < 65532 -> i32.load (always in-bounds). Expect 0 findings.")

# ---- 4. OUT-OF-BOUNDS LOAD (unrestricted symbolic address) ----
test4: Program = [
    ("local.get", 0),
    ("i32.load",),
    ("HALT",),
]
run_test("out_of_bounds_load", test4,
         "Fully symbolic address, no guard. Expect 1 finding for out-of-bounds (address >= 65533).")

# ---- 5. INT32_MIN / -1 concrete trap ----
test5: Program = [
    ("i32.const", -2147483648),
    ("i32.const", -1),
    ("i32.div_s",),
    ("HALT",),
]
run_test("int32_min_div_minus1", test5,
         "Concrete INT32_MIN / -1. Trap always fires. Expect 1 finding.")

# ---- 6. MEMORY.GROW ----
# grow by 1 page, then load from a high address that's valid after grow
# memory_pages = 1 initially, after grow = 2, size = 131072
# address = 65535 should be valid (65535 + 4 = 65539 <= 131072)
test6: Program = [
    ("i32.const", 1),
    ("memory.grow",),
    ("i32.const", 65535),
    ("i32.load",),
    ("HALT",),
]
run_test("memory_grow", test6,
         "Grow by 1 page, load from address 65535 (valid after grow). Expect 0 findings.")

# ---- 7. MEMORY.GROW failure ----
# grow by -1 (negative), should fail
test7: Program = [
    ("i32.const", -1),
    ("memory.grow",),
    ("HALT",),
]
run_test("memory_grow_fail_negative", test7,
         "Grow by -1 (negative). Trap fires. Expect 1 memory_grow_failure finding.")
