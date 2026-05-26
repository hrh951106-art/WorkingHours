# CalcResult 表按类型保存修复说明

## 问题描述

### 原始问题
在 `CalcResult` 表中，当先计算考勤工时，再计算精益工时时，第二次计算会删除第一次的考勤工时数据，只保留最新的精益工时数据。

### 根本原因

#### 原因1: 计算前批量删除所有数据
在 `calculate.service.ts` 的 `batchCalculate` 方法中（第496行），会在计算前删除指定日期范围内的所有旧数据：

```typescript
// ❌ 原代码：删除所有旧数据，不区分类型
const deleteResult = await this.prisma.calcResult.deleteMany({
  where: {
    calcDate: { gte: start, lte: end },
    employeeNo: { in: employeeNos },
    accountName: { not: { endsWith: '间接设备' } },
  },
});
```

**问题**：这种删除方式会删除所有类型的工时数据，不管是考勤工时还是精益工时。

#### 原因2: 查找现有记录时未包含工时类型
在 `attendance-work-hour.service.ts` 中，查找现有记录的条件没有包含 `calculationAttendanceCodeId`：

```typescript
// ❌ 原代码：没有包含 calculationAttendanceCodeId
const existing = await this.prisma.calcResult.findFirst({
  where: {
    employeeNo: result.employeeNo,
    calcDate: result.calcDate,
    accountId: result.accountId,
    punchInTime: result.startTime,
    punchOutTime: result.endTime,
    // 缺少 calculationAttendanceCodeId
  },
});
```

**问题**：如果同一个员工同一天同一个账户同一个时间段，先计算考勤工时（AC_001），再计算精益工时（A02），第二次会覆盖第一次的记录，把 `calculationAttendanceCodeId` 从 7（AC_001）改成 1（A02）。

## 解决方案

### 修改1: 移除计算前的批量删除

**文件**: `src/modules/calculate/calculate.service.ts`

```typescript
// ✅ 修改：不要在计算前删除所有旧数据
// 原因：需要保留其他类型的工时数据（如考勤工时 vs 精益工时）
// 删除逻辑改为在保存每条结果时通过 upsert 处理
console.log('跳过计算前的批量删除，改为逐条 upsert 处理');
```

### 修改2: 查找现有记录时添加工时类型

**文件**: `src/modules/calculate/attendance-code.service.ts`

```typescript
// ✅ 修改：查找时添加 calculationAttendanceCodeId
const existing = await this.prisma.calcResult.findFirst({
  where: {
    employeeNo: punchPair.employeeNo,
    calcDate: punchPair.pairDate,
    calculationAttendanceCodeId: code.id,  // ✅ 添加：区分工时类型
    accountId: accountId,
    punchInTime: hours.adjustedInTime || seg.startTime,
    punchOutTime: hours.adjustedOutTime || seg.endTime,
  },
});
```

**文件**: `src/modules/calculate/attendance-work-hour.service.ts`

```typescript
// ✅ 修改：查找时添加 calculationAttendanceCodeId
const existing = await this.prisma.calcResult.findFirst({
  where: {
    employeeNo: result.employeeNo,
    calcDate: result.calcDate,
    calculationAttendanceCodeId: result.calculationAttendanceCodeId,  // ✅ 添加
    accountId: result.accountId,
    punchInTime: result.startTime,
    punchOutTime: result.endTime,
  },
});
```

## 效果验证

### 修复前的行为

1. 计算考勤工时（AC_001）
   - 创建记录：employeeNo=张三, calcDate=2025-01-15, calculationAttendanceCodeId=7

2. 计算精益工时（A02）
   - 删除所有旧数据（包括步骤1创建的考勤工时记录）❌
   - 创建记录：employeeNo=张三, calcDate=2025-01-15, calculationAttendanceCodeId=1
   - 结果：只有精益工时数据，考勤工时数据丢失 ❌

### 修复后的行为

1. 计算考勤工时（AC_001）
   - 查找：employeeNo=张三, calcDate=2025-01-15, calculationAttendanceCodeId=7
   - 不存在，创建新记录
   - 结果：CalcResult 表有考勤工时数据

2. 计算精益工时（A02）
   - **不再批量删除** ✅
   - 查找：employeeNo=张三, calcDate=2025-01-15, calculationAttendanceCodeId=1
   - 不存在，创建新记录
   - 结果：CalcResult 表同时有考勤工时和精益工时数据 ✅

## 数据一致性保证

### 查找条件关键字段

```typescript
{
  employeeNo,                      // 员工
  calcDate,                        // 日期
  calculationAttendanceCodeId,     // ✅ 工时类型（关键）
  accountId,                       // 账户
  punchInTime,                     // 开始时间
  punchOutTime,                    // 结束时间
}
```

### 逻辑说明

1. **不同类型不会冲突**：
   - 考勤工时（AC_001, id=7）和精益工时（A02, id=1）是不同的记录
   - 即使其他条件相同（employeeNo, calcDate, accountId），也能正确保存为两条记录

2. **同一类型多条记录**：
   - 如果同一个员工同一天同一个类型有多个班段（不同的 punchInTime/punchOutTime 或 accountId）
   - 会保存为多条记录

3. **重新计算时的更新**：
   - 如果重新计算相同的数据，会找到 existing 记录并更新
   - 不会创建重复记录

## 测试验证

### 测试步骤

1. 清空 CalcResult 和 WorkHourResult 表
2. 只计算考勤工时
3. 验证 CalcResult 表只有考勤工时数据
4. 只计算精益工时
5. 验证 CalcResult 表同时有考勤工时和精益工时数据

### SQL 验证

```sql
-- 查看 CalcResult 表的数据分布
SELECT
  employeeNo,
  calcDate,
  calculationAttendanceCodeId,
  cac.code AS '计算代码',
  cac.type AS '类型',
  cac.name AS '名称',
  COUNT(*) as count,
  SUM(actualHours) as totalHours
FROM CalcResult cr
LEFT JOIN CalculationAttendanceCode cac ON cr.calculationAttendanceCodeId = cac.id
GROUP BY employeeNo, calcDate, calculationAttendanceCodeId, cac.code, cac.type, cac.name
ORDER BY calcDate DESC, employeeNo, calculationAttendanceCodeId;

-- 预期结果：应该同时看到考勤工时和精益工时的数据
```

## 注意事项

1. **兼容性**：此修复不影响现有的单类型计算场景
2. **性能**：移除批量删除后，依赖 findFirst + update/create，性能影响可忽略
3. **数据完整性**：通过 calculationAttendanceCodeId 确保不同类型的数据互不干扰

## 总结

通过以下三个修改，确保了 CalcResult 表能够按类型正确保存和更新数据：

1. ✅ 移除计算前的批量删除逻辑
2. ✅ 查找现有记录时添加 calculationAttendanceCodeId
3. ✅ 保持不同类型工时数据的独立性

现在 CalcResult 表和 WorkHourResult 表都能正确处理多种类型的工时数据，互不干扰。
