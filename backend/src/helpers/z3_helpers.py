import z3
import re


def z3_to_readable(expr) -> str:
    s = str(expr)
    s = s.replace('ULT', '<u')
    s = s.replace('ULE', '<=u')
    s = s.replace('UGT', '>u')
    s = s.replace('UGE', '>=u')
    s = s.replace('SLT', '<')
    s = s.replace('SLE', '<=')
    s = s.replace('SGT', '>')
    s = s.replace('SGE', '>=')
    s = re.sub(r'\bNot\((.+)\)', r'not(\1)', s)
    s = re.sub(r'\bAnd\((.+)\)', r'(\1)', s)
    s = re.sub(r'\bOr\((.+)\)', r'(\1)', s)
    s = re.sub(r'\bExtract\((\d+),\s*(\d+),\s*(.+)\)', r'\3[\2:\1]', s)
    s = re.sub(r'\bZeroExt\((\d+),\s*(.+)\)', r'zext(\1,\2)', s)
    s = re.sub(r'\bConcat\((.+)\)', r'concat(\1)', s)
    s = re.sub(r'\bSelect\(([^,]+),\s*([^)]+)\)', r'\2[\1]', s)
    s = re.sub(r'(\w+)\[0:0\] == 0', r'(\1 & 1) == 0', s)
    s = _fix_unsigned_add(s)
    return s


def _fix_unsigned_add(s: str) -> str:
    def repl(m):
        var = m.group(2)
        num = int(m.group(1))
        k = 96 - num
        if k <= 0:
            return m.group(0)
        if k == 1:
            return f"{var} - 1"
        return f"{var} - {k}"
    return re.sub(r'42949672(\d\d) \+ ([^)\s]+)', repl, s)


def _z(s: str) -> str:
    return z3_to_readable(s)
