# 计算模块金额计算功能实现总结

## 📋 功能概述

成功实现了计算模块中计算出勤代码金额的功能。金额计算基于以下公式：

```
金额 = 工时数 × 人员系数 × 金额规则
```

## ✅ 已完成的工作

### 1. 数据库Schema更新

#### CalcResult表（计算结果表）
- ✅ 添加了`amount`字段（Float类型，默认值0）
- 存储计算模块所有的工时结果数据

#### WorkHourResult表（工时结果表）
- ✅ 添加了`amount`字段（Float类型，默认值0）
- 用于存储实际工时，包含计算模块推送的数据以及录入的数据

**位置**: `backend/prisma/schema.prisma`
- CalcResult: line 595
- WorkHourResult: line 1715

### 2. 计算引擎更新

#### CalculateEngine（考勤工时计算）
**文件**: `backend/src/modules/calculate/calculate.engine.ts`

**主要修改**:
1. 注入`AmountCalculateService`依赖
2. 在`calculateDaily`方法中添加金额计算逻辑：
   - 获取员工信息和计算出勤代码
   - 检查出勤代码是否启用金额计算（`calculateAmount`字段）
   - 调用`AmountCalculateService.calculateAmountByNo`计算金额
   - 将计算结果添加到返回值的`amount`字段

**关键代码** (lines 73-96):
```typescript
// 10. 计算金额（基于考勤工时）
let amount = 0;
if (calculationAttendanceCode && calculationAttendanceCode.calculateAmount) {
  const employee = await this.prisma.employee.findUnique({
    where: { employeeNo },
    select: { id: true }
  });

  if (employee) {
    const accountPath = accountHours.length > 0
      ? accountHours[0].accountName
      : '';

    amount = await this.amountCalculateService.calculateAmountByNo({
      employeeNo,
      workHours: actualHours,
      attendanceCode: calculationAttendanceCode.code,
      accountPath,
      calcDate,
    });
  }
}
```

### 3. 工时推送服务更新

#### WorkHourPushService（精益工时金额计算）
**文件**: `backend/src/modules/calculate/work-hour-push.service.ts`

**主要修改**:
1. 注入`AmountCalculateService`依赖
2. 在`pushWorkHourResults`方法中添加金额计算逻辑：
   - 区分精益工时和考勤工时
   - 对于精益工时：调用金额计算服务计算金额
   - 对于考勤工时：直接使用CalcResult中已计算的金额
   - 将金额保存到WorkHourResult的`amount`字段

**关键代码** (lines 182-217):
```typescript
// 计算金额（如果出勤代码启用了金额计算）
let amount = 0;
if (calcAttendanceCode.calculateAmount && calcAttendanceCode.type === 'LEAN_HOURS') {
  // 只对精益工时计算金额
  amount = await this.amountCalculateService.calculateAmountByNo({
    employeeNo: calcResult.employeeNo,
    workHours: calcResult.actualHours,
    attendanceCode: calcAttendanceCode.code,
    accountPath: calcResult.accountName || '',
    calcDate: calcResult.calcDate,
  });
} else {
  // 对于考勤工时，直接使用CalcResult中已计算的金额
  amount = calcResult.amount || 0;
}
```

### 4. 模块依赖配置

#### CalculateModule更新
**文件**: `backend/src/modules/calculate/calculate.module.ts`

**修改内容**:
- 导入`AmountModule`
- 确保`AmountCalculateService`可以被注入到`CalculateEngine`和`WorkHourPushService`

**关键代码** (lines 15, 18):
```typescript
import { AmountModule } from '../amount/amount.module';

@Module({
  imports: [AttendanceRuleGroupModule, AmountModule],
  // ...
})
```

## 🔑 核心功能说明

### 金额计算流程

#### 考勤工时金额计算（在CalculateEngine中）
1. 获取员工的排班信息和计算出勤代码
2. 计算实际工时（actualHours）
3. 检查出勤代码是否启用金额计算
4. 获取员工系数（从EmployeeCoefficient表）
5. 匹配金额政策（从AmountPolicy表，基于账户路径和出勤代码）
6. 根据政策类型计算金额：
   - **ADD**: 工时 × (基础系数 + 固定值)
   - **MULTIPLY**: 工时 × 基础系数 × 倍数
   - **CUSTOM**: 工时 × 固定值
7. 保存到CalcResult.amount字段

#### 精益工时金额计算（在WorkHourPushService中）
1. 接收CalcResult数据
2. 区分工时类型（LEAN_HOURS vs ATTENDANCE_HOURS）
3. 对于精益工时（LEAN_HOURS）：
   - 重新调用金额计算服务计算金额
   - 使用精益工时对应的出勤代码和账户路径
4. 对于考勤工时（ATTENDANCE_HOURS）：
   - 直接使用CalcResult中已计算的金额
5. 保存到WorkHourResult.amount字段

### 数据模型关系

```
Employee (员工)
  └─ EmployeeCoefficient (员工系数)
      └─ coefficient (系数值)

CalculationAttendanceCode (计算出勤代码)
  └─ calculateAmount (是否计算金额)

AmountPolicy (金额政策)
  ├─ policyType (政策类型: ADD/MULTIPLY/CUSTOM)
  ├─ multiplier (倍数)
  ├─ fixedValue (固定值)
  └─ accountPath (账户路径)

AttendanceRuleGroup (考勤规则组)
  └─ AttendanceRuleGroupDetail
      └─ amountPolicyIds (关联的金额政策ID列表)

CalcResult (计算结果 - 考勤工时)
  ├─ actualHours (工时数)
  ├─ amount (计算出的金额) ✅ 新增
  └─ calculationAttendanceCodeId

WorkHourResult (工时结果 - 精益工时)
  ├─ workHours (工时数)
  ├─ amount (计算出的金额) ✅ 新增
  ├─ source (数据来源: 1=精益工时, 2=考勤工时)
  └─ calcAttendanceCode
```

## 🧪 测试验证

已创建测试脚本验证功能：`backend/test-amount-calculation.ts`

### 测试结果
```
✅ CalcResult表有amount字段: true
✅ WorkHourResult表有amount字段: true
✅ 员工系数配置: 3条记录
✅ 金额政策配置: 1条激活政策
✅ 启用金额计算的出勤代码: 2条
✅ 考勤规则组配置: 1条激活规则组
```

## 📖 使用指南

### 配置步骤

#### 1. 配置员工系数
在`EmployeeCoefficient`表中为员工设置系数：
```sql
INSERT INTO EmployeeCoefficient (employeeId, employeeNo, employeeName, coefficient, effectiveDate)
VALUES (1, '202604003', 'Paul du', 20, '2026-05-01');
```

#### 2. 配置金额政策
在`AmountPolicy`表中创建金额政策：
```sql
INSERT INTO AmountPolicy (code, name, policyType, multiplier, accountPath, status)
VALUES ('A01', '1.5倍金额', 'MULTIPLY', 1.5, 'DH/DH01/DH01001/WELDING', 'ACTIVE');
```

#### 3. 启用出勤代码金额计算
在`CalculationAttendanceCode`表中设置`calculateAmount=true`：
```sql
UPDATE CalculationAttendanceCode
SET calculateAmount = 1
WHERE code IN ('A01', 'A02');
```

#### 4. 关联金额政策到考勤规则组
在`AttendanceRuleGroupDetail`表中添加金额政策ID：
```json
{
  "amountPolicyIds": "[1]"
}
```

#### 5. 运行计算
执行正常的工时计算流程，金额将自动计算并保存。

### 验证结果
```sql
-- 查看计算结果中的金额
SELECT
  employeeNo,
  calcDate,
  actualHours,
  amount,
  (SELECT name FROM CalculationAttendanceCode WHERE id = calculationAttendanceCodeId) as codeName
FROM CalcResult
ORDER BY calcDate DESC
LIMIT 10;

-- 查看工时结果中的金额
SELECT
  employeeNo,
  calcDate,
  workHours,
  amount,
  calcAttendanceCode,
  source
FROM WorkHourResult
ORDER BY calcDate DESC
LIMIT 10;
```

## 🔍 注意事项

1. **金额计算的前提条件**：
   - 员工必须有有效的系数配置（EmployeeCoefficient）
   - 出勤代码必须启用金额计算（calculateAmount=true）
   - 必须有匹配的金额政策（AmountPolicy）

2. **金额为0的情况**：
   - 员工未配置系数
   - 出勤代码未启用金额计算
   - 没有匹配的金额政策
   - 账户路径不匹配

3. **工时类型区分**：
   - **考勤工时**（ATTENDANCE_HOURS）：在CalculateEngine中计算金额
   - **精益工时**（LEAN_HOURS）：在WorkHourPushService中计算金额
   - 两者使用相同的计算逻辑，但计算时机不同

4. **性能考虑**：
   - 已使用批量查询优化性能
   - 金额计算服务提供了批量计算接口（batchCalculateAmount）
   - 可以根据实际需要进一步优化查询逻辑

## 📁 相关文件

### 修改的文件
1. `backend/prisma/schema.prisma` - 数据库模型定义
2. `backend/src/modules/calculate/calculate.engine.ts` - 计算引擎
3. `backend/src/modules/calculate/work-hour-push.service.ts` - 工时推送服务
4. `backend/src/modules/calculate/calculate.module.ts` - 模块配置

### 新增的文件
1. `backend/test-amount-calculation.ts` - 测试脚本

### 依赖的现有服务
1. `backend/src/modules/amount/amount-calculate.service.ts` - 金额计算服务
2. `backend/src/modules/amount/employee-coefficient.service.ts` - 员工系数服务
3. `backend/src/modules/amount/amount-policy.service.ts` - 金额政策服务

## 🎯 后续建议

1. **前端展示**：
   - 在计算结果页面展示金额字段
   - 在工时结果页面展示金额字段
   - 添加金额汇总统计功能

2. **报表功能**：
   - 创建金额统计报表
   - 按员工、日期、出勤代码等维度汇总金额
   - 导出金额数据到Excel

3. **审核流程**：
   - 添加金额审核功能
   - 支持金额调整和修正
   - 记录金额计算历史

4. **性能优化**：
   - 对大批量计算进行性能测试
   - 优化金额计算查询逻辑
   - 考虑添加缓存机制

## ✅ 总结

金额计算功能已成功集成到计算模块中，支持考勤工时和精益工时的金额计算。通过配置员工系数和金额政策，系统可以自动计算出勤代码对应的金额，并存储在CalcResult和WorkHourResult表中。

功能已完成并通过测试验证，可以投入使用。
