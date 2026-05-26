# 工时推送的精确性说明

## 核心特性：按员工、日期、类型三维度精确推送

### 推送的精确性保证

工时推送服务采用**三维度精确过滤**机制，确保只处理本次计算涉及的数据：

```
┌─────────────────────────────────────────────────────┐
│              推送精确性保证机制                      │
├─────────────────────────────────────────────────────┤
│  维度1: 员工 (employeeNo)                           │
│  维度2: 日期 (calcDate)                             │
│  维度3: 类型 (source: 1=精益, 2=考勤)               │
├─────────────────────────────────────────────────────┤
│  删除条件: employeeNo AND calcDate AND source       │
│  插入数据: employeeNo AND calcDate AND source       │
└─────────────────────────────────────────────────────┘
```

## 代码实现分析

### 1. 按员工和日期分组

```typescript
// 按员工+日期分组
const employeeDateGroups = new Map<string, typeof calcResults>();
calcResults.forEach(result => {
  const dateStr = result.calcDate.toISOString().split('T')[0];
  const key = `${result.employeeNo}_${dateStr}`;  // ✅ 员工+日期作为key
  if (!employeeDateGroups.has(key)) {
    employeeDateGroups.set(key, []);
  }
  employeeDateGroups.get(key)!.push(result);
});
```

**说明**:
- 将所有计算结果按 `员工+日期` 进行分组
- 例如：`张三_2025-01-15` 是一个分组，`李四_2025-01-15` 是另一个分组
- 每个分组独立处理，互不影响

### 2. 精确删除条件

```typescript
await this.prisma.$transaction(async (tx) => {
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  // ✅ 三维度精确删除
  const deleteResult = await tx.workHourResult.deleteMany({
    where: {
      employeeNo: employeeNo,        // ✅ 只删除该员工
      calcDate: {                    // ✅ 只删除该日期
        gte: dayStart,
        lte: dayEnd,
      },
      source: {                      // ✅ 只删除涉及的类型
        in: Array.from(involvedTypes)
      },
    },
  });
});
```

**删除条件**:
```sql
DELETE FROM WorkHourResult
WHERE employeeNo = '张三'
  AND calcDate BETWEEN '2025-01-15 00:00:00' AND '2025-01-15 23:59:59'
  AND source IN (2)  -- 假设只计算了考勤工时
```

### 3. 只插入本次计算的数据

```typescript
// ✅ 只插入当前分组的数据
for (const calcResult of groupCalcResults) {
  await tx.workHourResult.create({
    data: {
      employeeNo: calcResult.employeeNo,      // ✅ 该员工
      calcDate: calcResult.calcDate,          // ✅ 该日期
      source: workHourSource,                 // ✅ 该类型
      // ... 其他字段
    },
  });
}
```

## 实际场景示例

### 场景1: 只计算张三某一天的考勤工时

**输入数据**:
```json
{
  "employeeNos": ["张三"],
  "calcDate": "2025-01-15"
}
```

**处理流程**:
1. 分组结果：`张三_2025-01-15` (1个分组)
2. 涉及的类型：`source=2` (考勤工时)
3. 删除条件：
   ```sql
   WHERE employeeNo = '张三'
     AND calcDate = '2025-01-15'
     AND source = 2
   ```
4. 插入数据：张三在 2025-01-15 的考勤工时数据

**结果**:
- ✅ 张三在 2025-01-15 的考勤工时数据被更新
- ✅ 张三在 2025-01-15 的精益工时数据**不受影响**
- ✅ 张三在其他日期的数据**不受影响**
- ✅ 其他员工的数据**不受影响**

### 场景2: 计算多个员工多天的精益工时

**输入数据**:
```json
{
  "employeeNos": ["张三", "李四"],
  "startDate": "2025-01-15",
  "endDate": "2025-01-16"
}
```

**处理流程**:
1. 分组结果：
   - `张三_2025-01-15`
   - `张三_2025-01-16`
   - `李四_2025-01-15`
   - `李四_2025-01-16`
2. 涉及的类型：`source=1` (精益工时)
3. 每个分组独立处理：
   - 删除张三在 2025-01-15 的精益工时
   - 插入张三在 2025-01-15 的新精益工时数据
   - 删除张三在 2025-01-16 的精益工时
   - 插入张三在 2025-01-16 的新精益工时数据
   - ... (李四同理)

**结果**:
- ✅ 只影响张三和李四在 2025-01-15、2025-01-16 的精益工时数据
- ✅ 不影响考勤工时数据
- ✅ 不影响其他员工的数据
- ✅ 不影响其他日期的数据

### 场景3: 只计算李四某一精益工时，保留其考勤工时

**输入**:
```json
{
  "employeeNos": ["李四"],
  "calcDate": "2025-01-15",
  "attendanceCodes": ["A01"]  // 只计算精益工时A01
}
```

**删除条件**:
```sql
WHERE employeeNo = '李四'
  AND calcDate = '2025-01-15'
  AND source IN (1)  -- 只删除精益工时
```

**结果**:
- ✅ 李四在 2025-01-15 的精益工时(source=1)被删除并重新计算
- ✅ 李四在 2025-01-15 的考勤工时(source=2)**完全保留**
- ✅ 日志显示：`涉及类型: 精益工时(source=1)`

## 数据安全性保证

### 事务保证

每个员工+日期的分组使用独立的事务：

```typescript
for (const [groupKey, groupCalcResults] of employeeDateGroups.entries()) {
  const [employeeNo, dateStr] = groupKey.split('_');

  try {
    // ✅ 独立事务：删除+插入
    await this.prisma.$transaction(async (tx) => {
      // 删除
      const deleteResult = await tx.workHourResult.deleteMany({...});

      // 插入
      for (const calcResult of groupCalcResults) {
        await tx.workHourResult.create({...});
      }
    });
  } catch (error) {
    // 单个分组失败不影响其他分组
    results.failed += groupCalcResults.length;
  }
}
```

**保证**:
- 如果张三的数据处理失败，不影响李四的数据处理
- 如果 2025-01-15 的处理失败，不影响 2025-01-16 的处理
- 每个分组的删除和插入是原子操作（要么全成功，要么全回滚）

### 错误隔离

```typescript
} catch (error) {
  results.failed += groupCalcResults.length;
  results.errors.push(
    `处理 ${employeeNo} ${dateStr} 失败: ${error.message}`,
  );
  // ✅ 继续处理下一个分组
}
```

## 日志示例

### 单员工单日计算

```
[WorkHourPushService] 开始推送工时结果，数量: 3
[WorkHourPushService] 分组数量: 1
[WorkHourPushService] 员工 张三 日期 2025-01-15 涉及的工时类型: 考勤工时(source=2)
[WorkHourPushService] 删除结果: count=3, 类型: 考勤工时(source=2)
[WorkHourPushService] 工时结果推送完成 - 成功: 3, 失败: 0, 删除旧数据: 3
```

**说明**: 只处理了张三在 2025-01-15 的考勤工时数据

### 多员工多日计算

```
[WorkHourPushService] 开始推送工时结果，数量: 12
[WorkHourPushService] 分组数量: 4
[WorkHourPushService] 员工 张三 日期 2025-01-15 涉及的工时类型: 精益工时(source=1)
[WorkHourPushService] 删除结果: count=2, 类型: 精益工时(source=1)
[WorkHourPushService] 员工 张三 日期 2025-01-16 涉及的工时类型: 精益工时(source=1)
[WorkHourPushService] 删除结果: count=3, 类型: 精益工时(source=1)
[WorkHourPushService] 员工 李四 日期 2025-01-15 涉及的工时类型: 精益工时(source=1)
[WorkHourPushService] 删除结果: count=3, 类型: 精益工时(source=1)
[WorkHourPushService] 员工 李四 日期 2025-01-16 涉及的工时类型: 精益工时(source=1)
[WorkHourPushService] 删除结果: count=4, 类型: 精益工时(source=1)
[WorkHourPushService] 工时结果推送完成 - 成功: 12, 失败: 0, 删除旧数据: 12
```

**说明**: 分别处理了每个员工每一天的数据

## SQL 验证

### 验证只删除了特定员工特定日期特定类型的数据

```sql
-- 查看张三在 2025-01-15 的数据
SELECT
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr AS '定义代码',
  workHours,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  source,
  sourceBatchId,
  createdAt
FROM WorkHourResult
WHERE employeeNo = '张三'
  AND calcDate = '2025-01-15'
ORDER BY source, createdAt DESC;
```

**预期结果**:
- 如果只计算了考勤工时：应该只有 source=2 的数据，且 sourceBatchId 相同
- source=1 的精益工时数据应该保持不变（createdAt 时间更早）

### 查看批量计算的影响范围

```sql
-- 统计每个员工每天的工时数据
SELECT
  employeeNo,
  calcDate,
  source,
  CASE source
    WHEN 1 THEN '精益工时'
    WHEN 2 THEN '考勤工时'
  END AS '工时类型',
  COUNT(*) AS count,
  SUM(workHours) AS totalHours,
  MAX(sourceBatchId) AS latestBatch
FROM WorkHourResult
WHERE calcDate BETWEEN '2025-01-15' AND '2025-01-16'
  AND sourceType = 'CALCULATED'
GROUP BY employeeNo, calcDate, source
ORDER BY employeeNo, calcDate, source;
```

## 关键点总结

### ✅ 推送的精确性

1. **按员工精确**: 只删除和插入指定员工的数据
2. **按日期精确**: 只删除和插入指定日期的数据
3. **按类型精确**: 只删除和插入指定类型的数据

### ✅ 数据的安全性

1. **事务保证**: 每个分组的删除和插入是原子的
2. **错误隔离**: 单个分组失败不影响其他分组
3. **不影响其他数据**: 其他员工、日期、类型的数据完全不受影响

### ✅ 日志的可追踪性

1. **分组信息**: 清晰显示按员工+日期的分组
2. **类型信息**: 显示本次涉及的工时类型
3. **删除信息**: 显示删除了多少条旧数据
4. **批次信息**: 每次推送有唯一的 sourceBatchId

## 注意事项

虽然代码已经实现了精确推送，但使用时仍需注意：

1. **确认计算范围**: 调用计算 API 时，明确指定员工、日期、出勤代码
2. **查看推送日志**: 确认推送的分组和类型是否符合预期
3. **验证数据结果**: 使用 SQL 查询验证只影响了预期的数据
4. **配置映射关系**: 确保 DefinitionAttendanceCode 正确配置了映射
