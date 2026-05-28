/**
 * 出勤代码配置说明
 * 解释 calculateHours、calculateAmount 和 calcAttendanceCode 的含义
 */

## 数据流程

```
用户申报 (hourType: A06)
    ↓
DefinitionAttendanceCode (定义出勤代码)
    code: A06
    name: 作业工时
    calcAttendanceCode: AC_005  ← 配置3：指向计算出勤代码
    ↓
CalculationAttendanceCode (计算出勤代码)
    code: AC_005
    name: 作业工时
    calculateHours: 1            ← 配置1：是否计算工时
    calculateAmount: 1           ← 配置2：是否计算金额
    ↓
金额计算服务 (AmountCalculateService)
    使用员工系数 × 工时数 × 金额规则
    ↓
WorkHourResult (工时结果表)
    amount: 80.0
    calculateAmount: 80.0
```

## 配置详解

### 配置1：calculateHours = 1
**表**：CalculationAttendanceCode
**字段**：calculateHours
**含义**：该计算出勤代码是否参与工时计算

- **0**：不计算工时（该出勤代码不会产生工时结果）
- **1**：计算工时（该出勤代码会产生工时结果）

**示例**：
```sql
-- AC_005: 作业工时，calculateHours = 1
-- 表示：作业工时需要计算工时数

-- AC_004: 出勤工时，calculateHours = 1
-- 表示：出勤工时需要计算工时数
```

**为什么重要**：
- 如果设置为 0，即使员工有这个出勤记录，也不会生成工时结果
- 用于控制哪些出勤类型需要纳入工时统计

---

### 配置2：calculateAmount = 1
**表**：CalculationAttendanceCode
**字段**：calculateAmount
**含义**：该计算出勤代码是否计算金额

- **0**：不计算金额（工时为0，金额为0）
- **1**：计算金额（根据员工系数和金额规则计算）

**示例**：
```sql
-- AC_005: 作业工时，calculateAmount = 1
-- 表示：作业工时需要计算金额

-- AC_004: 出勤工时，calculateAmount = 0
-- 表示：出勤工时不计算金额（只是记录出勤时间）
```

**金额计算公式**：
```
基础金额 = 员工系数 × 工时数

有金额规则：
  ADD: 金额 = 工时数 × (员工系数 + 固定值)
  MULTIPLY: 金额 = 工时数 × 员工系数 × 倍数
  CUSTOM: 金额 = 工时数 × 固定值

无金额规则：
  金额 = 工时数 × 员工系数
```

**为什么重要**：
- 控制哪些工时类型需要计算工资/费用
- 有些工时（如培训、开会）可能不需要计算金额

---

### 配置3：calcAttendanceCode = 'AC_005'
**表**：DefinitionAttendanceCode
**字段**：calcAttendanceCode
**含义**：定义出勤代码对应的计算出勤代码

**作用**：建立"用户看到的代码"与"系统计算的代码"之间的映射关系

**示例**：
```sql
-- DefinitionAttendanceCode (用户申报时看到的)
code: A06 (作业工时)
name: 作业工时
calcAttendanceCode: AC_005  ← 指向系统计算使用的代码

-- CalculationAttendanceCode (系统计算时使用的)
code: AC_005
name: 作业工时
calculateHours: 1
calculateAmount: 1
```

**为什么需要这个映射**：
1. **用户友好**：用户看到简短的代码（A06）
2. **系统灵活**：系统可以使用更详细的代码（AC_005）
3. **多对一映射**：多个定义代码可以映射到同一个计算代码

**示例场景**：
```sql
-- 场景：多种作业类型使用相同的金额计算规则

-- DefinitionAttendanceCode
A06 - 作业工时 → calcAttendanceCode: AC_005
A07 - 辅助工时 → calcAttendanceCode: AC_005
A08 - 加班工时 → calcAttendanceCode: AC_005

-- CalculationAttendanceCode
AC_005 - 通用作业工时
  calculateHours: 1
  calculateAmount: 1
  员工系数: 20
  金额规则: 无

-- 结果：A06、A07、A08 都使用相同的金额计算规则
```

---

## 实际案例：工时申报单 LABOR202605282354253068

### 修复前的问题
```sql
-- CalculationAttendanceCode
AC_005: calculateHours = 0  ❌
AC_005: calculateAmount = 0 ❌

-- DefinitionAttendanceCode
A06: calcAttendanceCode = NULL  ❌
```

**结果**：金额计算返回 0
- 因为 calculateHours = 0，系统认为不计算工时
- 因为 calculateAmount = 0，系统认为不计算金额
- 因为 calcAttendanceCode = NULL，系统找不到计算代码

### 修复后的配置
```sql
-- CalculationAttendanceCode
AC_005: calculateHours = 1  ✅
AC_005: calculateAmount = 1 ✅

-- DefinitionAttendanceCode
A06: calcAttendanceCode = 'AC_005'  ✅
```

**结果**：金额计算返回 80.0 元
- calculateHours = 1 → 系统计算工时：4 小时
- calculateAmount = 1 → 系统计算金额
- calcAttendanceCode = 'AC_005' → 找到计算代码
- 金额 = 员工系数(20) × 工时数(4) = 80 元

---

## 配置检查清单

### 创建新的出勤代码时，需要检查：

1. **DefinitionAttendanceCode（定义出勤代码）**
   - [ ] code: 用户看到的代码（如 A06）
   - [ ] name: 显示名称（如 作业工时）
   - [ ] calcAttendanceCode: 对应的计算代码（如 AC_005）

2. **CalculationAttendanceCode（计算出勤代码）**
   - [ ] code: 系统计算的代码（如 AC_005）
   - [ ] name: 计算代码名称（如 作业工时）
   - [ ] calculateHours: 是否计算工时（0 或 1）
   - [ ] calculateAmount: 是否计算金额（0 或 1）
   - [ ] type: 工时类型（LEAN_HOURS 或 ATTENDANCE_HOURS）

3. **EmployeeCoefficient（员工系数）**
   - [ ] employeeNo: 员工工号
   - [ ] coefficient: 系数（如 20）
   - [ ] effectiveDate: 生效日期

4. **AmountPolicy（金额规则，可选）**
   - [ ] attendanceCodes: 适用的出勤代码（如 ["AC_005"]）
   - [ ] accountPath: 适用的账户路径
   - [ ] policyType: 规则类型（ADD/MULTIPLY/CUSTOM）
   - [ ] multiplier/fixedValue: 规则参数

---

## 常见配置场景

### 场景1：普通计薪工时
```sql
-- 定义代码：A06 作业工时
-- 计算代码：AC_005
-- calculateHours: 1（计算工时）
-- calculateAmount: 1（计算金额）
-- 结果：员工做作业工时，会计算工时和金额
```

### 场景2：不计薪工时（如培训）
```sql
-- 定义代码：A10 培训工时
-- 计算代码：AC_010
-- calculateHours: 1（计算工时）
-- calculateAmount: 0（不计算金额）
-- 结果：员工参加培训，记录工时但不计算金额
```

### 场景3：不计算工时的出勤（如请假）
```sql
-- 定义代码：A05 请假
-- 计算代码：AC_005（或不配置）
-- calculateHours: 0（不计算工时）
-- calculateAmount: 0（不计算金额）
-- 结果：请假不产生工时结果，只在考勤记录中体现
```

### 场景4：特殊金额规则
```sql
-- 定义代码：A08 加班工时
-- 计算代码：AC_008
-- calculateHours: 1（计算工时）
-- calculateAmount: 1（计算金额）
-- 金额规则：MULTIPLY × 1.5（1.5倍工资）
-- 结果：加班工时按 1.5 倍计算金额
```

---

## 总结

这三个配置构成了工时和金额计算的核心逻辑：

1. **calculateHours**：控制是否计算工时
2. **calculateAmount**：控制是否计算金额
3. **calcAttendanceCode**：建立用户代码与计算代码的映射

**正确的配置流程**：
1. 创建 CalculationAttendanceCode（计算代码），设置 calculateHours 和 calculateAmount
2. 创建 DefinitionAttendanceCode（定义代码），设置 calcAttendanceCode 指向计算代码
3. 确保员工有对应的 EmployeeCoefficient（员工系数）
4. （可选）配置 AmountPolicy（金额规则）

**验证方法**：
- 创建工时申报单并审批
- 检查 WorkHourResult 表中的 amount 和 calculateAmount 字段是否有值
- 查看后端日志中的金额计算过程
