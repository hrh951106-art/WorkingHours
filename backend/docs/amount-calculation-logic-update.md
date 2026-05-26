# 金额计算逻辑更新总结

## 📋 更新概述

根据新的业务需求，金额计算逻辑已更新为：

**新计算规则**：
1. **无金额规则匹配**：`金额 = 人员系数 × 工时数`
2. **有金额规则匹配**：`金额 = 人员系数 × 金额规则系数 × 工时数`

**核心变更**：
- ✅ 移除了"没有匹配规则时返回0"的逻辑
- ✅ 所有出勤代码和账户默认使用人员系数计算金额
- ✅ 支持多账户分别计算并累加
- ✅ 金额规则基于出勤代码+劳动力账户组合匹配

## 🔍 详细说明

### 1. 计算逻辑

#### 场景1：无金额规则
```typescript
金额 = 工时数 × 人员系数
```
- 适用条件：没有匹配到金额��策
- 示例：4小时 × 20（系数）= 80元

#### 场景2：有金额规则 - MULTIPLY（翻倍）
```typescript
金额 = 工时数 × 人员系数 × 倍数
```
- 适用条件：匹配到MULTIPLY类型的金额政策
- 示例：3小时 × 20（系数）× 1.5（倍数）= 90元

#### 场景3：有金额规则 - ADD（增加）
```typescript
金额 = 工时数 × (人员系数 + 固定值)
```
- 适用条件：匹配到ADD类型的金额政策
- 示例：3小时 × (20 + 5) = 75元

#### 场景4：有金额规则 - CUSTOM（自定义）
```typescript
金额 = 工时数 × 固定值
```
- 适用条件：匹配到CUSTOM类型的金额政策
- 不使用人员系数

### 2. 多账户计算

当CalcResult包含多个账户时（accountHours字段），系统会：
1. 遍历每个账户
2. 根据账户路径和出勤代码匹配金额规则
3. 分别计算每个账户的金额
4. 累加所有账户的金额作为总金额

**示例**：
```
人员系数：20
金额规则：A01出勤代码 + A账户 + 1.5倍

账户A（3小时，A01代码）：3 × 20 × 1.5 = 90元
账户B（4小时，A01代码）：4 × 20 × 1.0 = 80元（B账户不匹配规则）
总计：90 + 80 = 170元
```

## ✅ 修改的文件

### 1. AmountCalculateService
**文件**：`backend/src/modules/amount/amount-calculate.service.ts`

**主要变更**：
- 修改`calculateAmount`方法：没有匹配规则时返回人员系数×工时，而不是0
- 新增`calculateAmountForAccounts`方法：支持多账户金额计算
- 修改`calculateAmountByNo`方法：与calculateAmount保持一致的逻辑
- 新增`calculateAmountForAccountsByNo`方法：支持按员工编号的多账户金额计算

**关键代码**：
```typescript
if (!policy) {
  // ✅ 没有匹配到金额规则，只使用人员系数
  finalAmount = workHours * baseCoefficient;
} else {
  // ✅ 匹配到金额规则，结合人员系数和金额规则系数
  switch (policy.policyType) {
    case 'MULTIPLY':
      const multiplier = policy.multiplier || 1;
      finalAmount = workHours * baseCoefficient * multiplier;
      break;
    // ... 其他类型
  }
}
```

### 2. CalculateEngine
**文件**：`backend/src/modules/calculate/calculate.engine.ts`

**主要变更**：
- 修改金额计算逻辑：使用`calculateAmountForAccountsByNo`支持多账户
- 当有多个账户时，分别计算并累加
- 当没有账户时，使用总工时计算

**关键代码**：
```typescript
if (accountHours.length > 0) {
  amount = await this.amountCalculateService.calculateAmountForAccountsByNo({
    employeeNo,
    attendanceCode: calculationAttendanceCode.code,
    accountHours,
    calcDate,
  });
} else {
  amount = await this.amountCalculateService.calculateAmountByNo({
    employeeNo,
    workHours: actualHours,
    attendanceCode: calculationAttendanceCode.code,
    accountPath: '',
    calcDate,
  });
}
```

### 3. WorkHourPushService
**文件**：`backend/src/modules/calculate/work-hour-push.service.ts`

**主要变更**：
- 对精益工时也使用多账户金额计算
- 解析accountHours字段，支持多账户场景

**关键代码**：
```typescript
if (calcAttendanceCode.type === 'LEAN_HOURS') {
  let accountHours = [];
  try {
    accountHours = JSON.parse(calcResult.accountHours || '[]');
  } catch (e) {
    accountHours = [];
  }

  if (accountHours.length > 0) {
    amount = await this.amountCalculateService.calculateAmountForAccountsByNo({
      employeeNo: calcResult.employeeNo,
      attendanceCode: calcAttendanceCode.code,
      accountHours,
      calcDate: calcResult.calcDate,
    });
  }
}
```

## 🧪 测试验证

已创建完整的测试脚本：`backend/test-new-amount-calculation.ts`

### 测试结果
```
✅ 场景1：A01出勤代码 + A账户（匹配金额规则）- 90元
✅ 场景2：A02出勤代码 + A账户（不匹配金额规则）- 80元
✅ 场景3：多账户计算 - A01: 170元, A02: 140元
```

所有测试通过！

## 📖 使用指南

### 配置步骤

#### 1. 配置员工系数
```sql
INSERT INTO EmployeeCoefficient (
  employeeId, employeeNo, employeeName,
  coefficient, effectiveDate, status
)
VALUES (
  1, '202604003', 'Paul du',
  20, '2026-05-01', 'ACTIVE'
);
```

#### 2. 配置金额政策
```sql
INSERT INTO AmountPolicy (
  code, name, policyType, multiplier,
  accountPath, attendanceCodes, status
)
VALUES (
  'AP001', 'A账户1.5倍', 'MULTIPLY', 1.5,
  'A', '["A01"]', 'ACTIVE'
);
```

#### 3. 启用出勤代码金额计算
```sql
UPDATE CalculationAttendanceCode
SET calculateAmount = 1
WHERE code IN ('A01', 'A02');
```

### 计算示例

**示例1：有金额规则匹配**
```
人员系数：20
出勤代码：A01
账户：A
工时：3小时
金额规则：A01 + A账户 + 1.5倍

金额 = 3 × 20 × 1.5 = 90元
```

**示例2：无金额规则匹配**
```
人员系数：20
出勤代码：A02
账户：A
工时：4小时
金额规则：无（只有A01的规则）

金额 = 4 × 20 × 1.0 = 80元
```

**示例3：多账户计算**
```
人员系数：20
出勤代码：A01
账户A：3小时（匹配规则1.5倍）
账户B：4小时（不匹配规则）

金额A = 3 × 20 × 1.5 = 90元
金额B = 4 × 20 × 1.0 = 80元
总金额 = 90 + 80 = 170元
```

## 🔑 关键要点

1. **默认计算**：所有出勤代码和账户都默认使用人员系数计算金额
2. **规则增强**：金额规则用于在特定条件下增强计算结果（翻倍、增加等）
3. **灵活匹配**：基于出勤代码+账户路径的组合匹配规则
4. **多账户支持**：自动处理多个账户的金额计算和累加
5. **精确计算**：金额保留2位小数

## 📊 数据流程

```
员工信息
  └─ EmployeeCoefficient (系数)
      ↓
计算出勤代码 (CalculationAttendanceCode)
  ├─ calculateAmount: true
  └─ code
      ↓
劳动力账户 (accountHours)
  ├─ accountName (账户路径)
  └─ hours (工时数)
      ↓
金额政策匹配 (AmountPolicy)
  ├─ accountPath (账户路径)
  ├─ attendanceCodes (出勤代码列表)
  └─ policyType (规则类型)
      ↓
金额计算
  ├─ 有规则：人员系数 × 规则系数 × 工时
  └─ 无规则：人员系数 × 工时
      ↓
结果存储
  ├─ CalcResult.amount (计算结果表 - 存储计算模块所有的工时结果数据)
  └─ WorkHourResult.amount (工时结果表 - 用于存储实际工时，包含计算模块推送的数据以及录入的数据)
```

## 🎯 后续建议

1. **性能优化**：
   - 对大批量计算进行性能测试
   - 考虑缓存金额政策匹配结果
   - 优化多账户计算的查询逻辑

2. **功能增强**：
   - 添加金额计算历史记录
   - 支持金额调整和修正
   - 添加金额审核流程

3. **报表功能**：
   - 创建金额统计报表
   - 按员工、日期、出勤代码等维度汇总
   - 导出金额数据到Excel

## ✅ 总结

金额计算逻辑已成功更新，现在支持：
- ✅ 无金额规则时使用人员系数计算
- ✅ 有金额规则时结合人员系数和规则系数计算
- ✅ 基于出勤代码+账户路径的灵活匹配
- ✅ 多账户分别计算并累加
- ✅ 考勤工时和精益工时的金额计算

所有测试通过，功能可以投入使用！
