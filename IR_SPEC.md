
### Control/Meta
1. LABEL name 
2. CALL name 
3. RETURN 

### Inputs
1. LOCAL_READ x:
    Create a symbolic BitVec(32) for local x 
2. LOCAL_GET x:
    Push local into the stack
3. LOCAL_SET x 
    pop top value and store in x
    

### Constants 
1. CONST_I32 n 
    Push constant BitVec value 

### Arithmetic/Bitwise (i32) 
All are BitVec(32) i32 

1. I32_ADD; pop b, a; push a + b
2. I32_SUB
3. I32_MULT
4. I32_AND
5. I32_AND/OR/XOR
6. I32_SHL/SHR

### Comparison
1. I32_LT_S; bvslt(a, b)
2. I32_LT_u
3. I32_EQZ
4. I32_EQ

### Branching 
1. BR_IF label 
2. BR label
3. IF_TRUE/FALSE

### Memory
1. I32_LOAD
2. I32_STORE
 


## Example 

wasm : 

local.read a
local.read b
local.get a
local.get b
i32.add
i32.const 10
i32.lt_s
br_if L_win



IR: 
LOCAL_READ a
LOCAL_READ b
LOCAL_GET a
LOCAL_GET b
I32_ADD
CONST_I32 10
I32_LT_S
BR_IF L_win
