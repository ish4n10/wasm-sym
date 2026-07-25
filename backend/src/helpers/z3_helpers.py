import z3
import re


def z3_to_readable(expr) -> str:
    s = str(expr)
    s = re.sub(r'\bIf\(([^,]+),\s*([^,]+),\s*([^)]+)\)', lambda m: f'if({_z(m.group(1))},{_z(m.group(2))},{_z(m.group(3))})', s)
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
    return s


def _z(s: str) -> str:
    return z3_to_readable(s)
