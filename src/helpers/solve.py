import z3

def solve_constraints(constraints: list) -> z3.ModelRef | None:
    if not constraints:
        return None
    
    solver = z3.Solver()
    solver.append(constraints)
    
    if solver.check() == z3.sat:
        model = solver.model()
        return model
    else:
        return None
    
def is_sat(constraints):
    solver = z3.Solver()
    for c in constraints:
        solver.add(c)
    return solver.check() == z3.sat
