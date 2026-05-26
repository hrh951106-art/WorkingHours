# 工时结果按类型全量更新功能说明

## 功能概述

实现了工时结果按类型全量更新的功能，确保在计算工时时，只删除和插入对应类型的工时数据，避免不同类型工时数据的相互影响。

## 核心特性

### 1. 按类型全量更新

- **只计算考勤工时**: 只删除和插入 source=2 的考勤工时数据，不影响精益工时(source=1)
- **只计算精益工时**: 只删除和插入 source=1 的精益工时数据，不影响考勤工时(source=2)
- **同时计算两种**: 删除和插入 source in [1,2] 的所有数据

### 2. 自动推送机制

在以下场景都会自动推送工时结果到 WorkHourResult 表：
- ✅ 单个员工单日计算 (`calculate` API)
- ✅ 批量计算 (`batchCalculate` API)
- ✅ 考勤工时计算 (`calculateAttendanceWorkHour` API)
- ✅ 批量考勤工时计算 (`calculateAttendanceWorkHoursBatch` API)
- ✅ 日期范围考勤工时计算 (`calculateAttendanceWorkHoursByDateRange` API)

## 数据流程

```
┌─────────────────┐
│  计算模块计算工时  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CalcResult 表    │
│ (使用 CalculationAttendanceCode)
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│ WorkHourPushService        │
│ - 通过 calcAttendanceCode   │
│   映射到 DefinitionAttendanceCode
│ - 根据 type 确定 source 值  │
│ - 只删除对应类型的旧数据     │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────┐
│ WorkHourResult 表│
│ (使用 DefinitionAttendanceCode)
│ - source=1: 精益工时
│ - source=2: 考勤工时
└─────────────────┘
```

## 实现细节

### 工时类型映射

| CalculationAttendanceCode.type | DefinitionAttendanceCode | source |
|-------------------------------|------------------------|--------|
| LEAN_HOURS | A01_PROCESS, A02_LINE, A04_WORKSHOP | 1 |
| ATTENDANCE_HOURS | AC_001 | 2 |

### 删除逻辑

```typescript
// 统计本次计算涉及的类型
const involvedTypes = new Set<number>();
groupCalcResults.forEach(result => {
  const calcAttendanceCode = result.calculationAttendanceCode;
  if (calcAttendanceCode) {
    // ATTENDANCE_HOURS -> source=2, LEAN_HOURS -> source=1
    const source = calcAttendanceCode.type === 'ATTENDANCE_HOURS' ? 2 : 1;
    involvedTypes.add(source);
  }
});

// 只删除本次涉及的类型的旧数据
const deleteResult = await tx.workHourResult.deleteMany({
  where: {
    employeeNo: employeeNo,
    calcDate: { gte: dayStart, lte: dayEnd },
    source: { in: Array.from(involvedTypes) }, // ✅ 关键：按类型删除
  },
});
```

## 代码变更

### 1. work-hour-push.service.ts

**关键变更**：
- ✅ 修改删除逻辑，从 `source in [1, 2]` 改为 `source in Array.from(involvedTypes)`
- ✅ 添加类型统计逻辑，确定本次计算涉及的工时类型
- ✅ 增强日志输出，显示涉及的工时类型信息

### 2. attendance-work-hour.service.ts

**关键变更**：
- ✅ 注入 `WorkHourPushService` 依赖
- ✅ 在 `calculateDaily` 方法返回前调用推送服务
- ✅ 添加推送结果的日志记录

## 使用示例

### 场景1: 只计算考勤工时

```bash
# 调用考勤工时计算 API
POST /calculate/attendance-work-hours
{
  "employeeNos": ["E001", "E002"],
  "calcDate": "2025-01-15"
}
```

**行为**：
1. 计算考勤工时，保存到 CalcResult（使用 AC_001，type=ATTENDANCE_HOURS）
2. 推送到 WorkHourResult 时：
   - 只删除 source=2 的旧数据
   - 只插入 source=2 的新数据
   - 不影响 source=1 的精益工时数据

**日志示例**：
```
[WorkHourPushService] 员工 E001 日期 2025-01-15 涉及的工时类型: 考勤工时(source=2)
[WorkHourPushService] 删除结果: count=5, 类型: 考勤工时(source=2)
```

### 场景2: 只计算精益工时

```bash
# 调用精益工时计算 API
POST /calculate/batch
{
  "startDate": "2025-01-15",
  "endDate": "2025-01-15",
  "employeeNos": ["E001"]
}
```

**行为**：
1. 计算精益工时，保存到 CalcResult（使用 A01, A02, A04，type=LEAN_HOURS）
2. 推送到 WorkHourResult 时：
   - 只删除 source=1 的旧数据
   - 只插入 source=1 的新数据
   - 不影响 source=2 的考勤工时数据

**日志示例**：
```
[WorkHourPushService] 员工 E001 日期 2025-01-15 涉及的工时类型: 精益工时(source=1)
[WorkHourPushService] 删除结果: count=3, 类型: 精益工时(source=1)
```

### 场景3: 同时计算两种类型

如果一次计算中同时包含精益工时和考勤工时的出勤代码：

**行为**：
1. 删除 source in [1, 2] 的所有旧数据
2. 插入 source=1 和 source=2 的新数据

**日志示例**：
```
[WorkHourPushService] 员工 E001 日期 2025-01-15 涉及的工时类型: 精益工时(source=1), 考勤工时(source=2)
[WorkHourPushService] 删除结果: count=8, 类型: 精益工时(source=1), 考勤工时(source=2)
```

## 数据验证

### 查看推送结果

```sql
-- 查看最新推送的数据
SELECT
  w.employeeNo,
  w.calcDate,
  w.definitionAttendanceCodeStr AS '定义代码',
  w.calcAttendanceCode AS '计算代码',
  w.workHours,
  CASE w.source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  w.sourceBatchId,
  w.createdAt
FROM WorkHourResult w
WHERE w.sourceType = 'CALCULATED'
ORDER BY w.calcDate DESC, w.employeeNo, w.source
LIMIT 50;
```

### 统计各类型工时数据量

```sql
-- 统计各类型的工时数据
SELECT
  calcDate,
  source,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  COUNT(*) AS count,
  SUM(workHours) AS totalHours
FROM WorkHourResult
WHERE sourceType = 'CALCULATED'
GROUP BY calcDate, source
ORDER BY calcDate DESC, source;
```

## 注意事项

1. **必须配置映射关系**: 只有在 `DefinitionAttendanceCode` 表中配置了 `calcAttendanceCode` 的出勤代码才会被推送

2. **状态必须为 ACTIVE**: 只有状态为 `ACTIVE` 的定义出勤代码才会生效

3. **类型必须正确配置**: `CalculationAttendanceCode` 的 `type` 字段必须正确设置（LEAN_HOURS 或 ATTENDANCE_HOURS）

4. **事务保证**: 同一员工同日期的数据使用事务保证原子性

5. **错误不影响主流程**: 推送失败不会影响计算主流程，只会记录错误日志

## 配置检查清单

- [ ] CalculationAttendanceCode 表的 type 字段是否正确配置
- [ ] DefinitionAttendanceCode 表的 calcAttendanceCode 字段是否配置
- [ ] DefinitionAttendanceCode 表的 status 字段是否为 ACTIVE
- [ ] 是否有足够的映射关系覆盖所有需要推送的计算出勤代码

## 故障排查

### 问题1: 数据没有被推送

**检查**:
1. 查看 DefinitionAttendanceCode 是否配置了对应的 calcAttendanceCode
2. 查看 CalculationAttendanceCode 的 status 是否为 ACTIVE
3. 查看日志中是否有 "未配置映射关系" 的警告

### 问题2: 推送的数据类型不正确

**检查**:
1. 查看 CalculationAttendanceCode 的 type 字段是否正确
2. 查看推送日志中的 "工时类型" 信息
3. 查询 WorkHourResult 表的 source 字段值

### 问题3: 删除了不该删除的数据

**检查**:
1. 查看推送日志中 "涉及的工时类型" 信息
2. 确认 involvedTypes 是否正确计算
3. 检查删除条件是否使用了正确的 source 值
