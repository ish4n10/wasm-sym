
def parse_code(text: str) -> list:
    program = []
    lines = text.strip().split('\n')
    
    for line in lines:
        line = line.strip()
        
        # Strip inline comments (; ...)
        comment_pos = line.find(';')
        if comment_pos != -1:
            line = line[:comment_pos].strip()
        
        if not line or line.startswith('#'):
            continue
        
        parts = line.split(None, 1)  
        instruction = parts[0]
        
        if len(parts) > 1:
            arg_str = parts[1].strip()
            try:
                arg = int(arg_str)
            except ValueError:
                arg = arg_str
            program.append((instruction, arg))
        else:
            program.append((instruction,))
    
    return program

