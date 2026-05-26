# 工时结果同步功能说明

## 功能概述

当计算模块算出工时结果往 `CalcResult` 表存储数据时，自动同步将数据写入 `WorkHourResult` 表。

## 数据流程

```
计算模块计算工时
  ↓
CalcResult 表 (使用 CalculationAttendanceCode)
  ↓
通过 DefinitionAttendanceCode.calcAttendanceCode 映射
  ↓
WorkHourResult 表 (使用 DefinitionAttendanceCode)
```

## 映射关系���例

| 计算代码 (CalculationAttendanceCode) | 定义代码 (DefinitionAttendanceCode) | 工时类型 | Source值 |
|-------------------------------------|-----------------------------------|---------|---------|
| A01 (工序工时)                         | A01_PROCESS (工序工时)              | LEAN_HOURS | 1       |
| A02 (线体工时)                         | A02_LINE (线体工时)                 | LEAN_HOURS | 1       |
| A04 (车间工时)                         | A04_WORKSHOP (车间工时)             | LEAN_HOURS | 1       |
| AC_001 (出勤工时)                      | AC_001 (出勤工时)                   | ATTENDANCE_HOURS | 2 |

## 工时类型区分

### 精益工时 (LEAN_HOURS)
- **Source 值**: 1
- **用途**: 生产作业相关的工时统计
- **包含类型**: 工序工时、线体工时、车间工时

### 考勤工时 (ATTENDANCE_HOURS)
- **Source 值**: 2
- **用途**: 员工考勤相关的工时统计
- **包含类型**: 出勤工时

## 配置映射关系

### 方法1: 直接SQL操作

```sql
-- 添加新的定义出勤代码映射
INSERT INTO DefinitionAttendanceCode (
  code, name, type, unit, calculateHours, priority, color, status,
  calcAttendanceCode, description, calculateAmount, deductMealTime, includeExtraHours,
  createdAt, updatedAt
) VALUES (
  'NEW_CODE',      -- 定义代码（唯一）
  '新工时类型',     -- 显示名称
  'LEAN_HOURS',    -- 类型：LEAN_HOURS 或 ATTENDANCE_HOURS
  'HOURS',         -- 单位
  1,               -- 是否计算工时
  0,               -- 优先级
  '#1890ff',       -- 显示颜色
  'ACTIVE',        -- 状态
  'CALC_CODE',     -- 映射的计算代码（CalculationAttendanceCode.code）
  '描述信息',       -- 描述
  0,               -- 是否计算金额
  0,               -- 是否扣用餐
  0,               -- 是否包含班外时数
  datetime('now'), -- 创建时间
  datetime('now')  -- 更新时间
);
```

### 方法2: 通过API接口

前端页面 `/calculate/attendance-code-definition` 可以管理定义出勤代码。

## 数据同步逻辑

### 增量更新流程

1. **生成批次ID**: 每次推送生成唯一的 `sourceBatchId`
2. **删除旧数据**: 删除同员工同日期的旧计算推送数据（source in [1, 2]）
3. **插入新数据**: 插入新的工时结果，使用相同的 `sourceBatchId`

### 字段映射

| CalcResult 字段 | WorkHourResult 字段 | 说明 |
|----------------|-------------------|------|
| employeeNo | employeeNo | 员工工号 |
| employee.id | employeeId | 员工ID |
| calcDate | calcDate | 计算日期 |
| shiftId | shiftId | 班次ID |
| shiftName | shiftName | 班次名称 |
| punchInTime | startTime | 开始时间 |
| punchOutTime | endTime | 结束时间 |
| calculationAttendanceCode.code | calcAttendanceCode | 计算出勤代码（原始）|
| - | definitionAttendanceCodeId | 定义出勤代码ID（映射后）|
| - | definitionAttendanceCodeStr | 定义出勤代码字符串（映射后）|
| actualHours | workHours | 工时数值 |
| - | source | 数据来源：1=精益工时, 2=考勤工时 |
| - | sourceType | 来源类型：CALCULATED |
| id | sourceId | 来源计算结果ID |
| - | sourceBatchId | 推送批次ID |
| accountId | accountId | 劳动力账户ID |
| accountName | accountName | 劳动力账户名称 |
| - | status | 状态：CONFIRMED |

## 查询示例

### 查看所有映射关系

```sql
SELECT
  dac.id,
  dac.code AS '定义代码',
  dac.name AS '定义名称',
  dac.type AS '工时类型',
  dac.calcAttendanceCode AS '计算代码',
  cac.name AS '计算名称',
  CASE dac.type
    WHEN 'LEAN_HOURS' THEN 'source=1'
    WHEN 'ATTENDANCE_HOURS' THEN 'source=2'
  END AS 'Source'
FROM DefinitionAttendanceCode dac
LEFT JOIN CalculationAttendanceCode cac ON dac.calcAttendanceCode = cac.code
WHERE dac.status = 'ACTIVE'
ORDER BY dac.type, dac.priority;
```

### 查看工时结果数据

```sql
-- 查看精益工时（source=1）
SELECT employeeNo, calcDate, definitionAttendanceCodeStr, workHours
FROM WorkHourResult
WHERE source = 1
ORDER BY calcDate DESC, employeeNo;

-- 查看考勤工时（source=2）
SELECT employeeNo, calcDate, definitionAttendanceCodeStr, workHours
FROM WorkHourResult
WHERE source = 2
ORDER BY calcDate DESC, employeeNo;

-- 查看最新推送的批次数据
SELECT sourceBatchId, COUNT(*) as count, SUM(workHours) as totalHours
FROM WorkHourResult
WHERE sourceBatchId IS NOT NULL
GROUP BY sourceBatchId
ORDER BY sourceBatchId DESC;
```

## 注意事项

1. **必须配置映射关系**: 只有在 `DefinitionAttendanceCode` 表中配置了 `calcAttendanceCode` 的出勤代码才会被推送
2. **状态必须为 ACTIVE**: 只有状态为 `ACTIVE` 的定义出勤代码才会生效
3. **增量更新**: 每次推送会删除同员工同日期的旧数据，确保数据一致性
4. **事务保证**: 同一员工同日期的数据使用事务保证原子性
5. **类型区分**: 精益工时和考勤工时使用不同的 source 值，便于后续查询和统计

## 当前映射配置

### 精益工时 (source=1)

- **A01_PROCESS** → A01 (工序工时)
- **A02_LINE** → A02 (线体工时)
- **A04_WORKSHOP** → A04 (车间工时)

### 考勤工时 (source=2)

- **AC_001** → AC_001 (出勤工时)

## 测试验证

运行计算后，检查 WorkHourResult 表：

```sql
-- 验证数据是否成功推送
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
  w.sourceBatchId
FROM WorkHourResult w
WHERE w.sourceType = 'CALCULATED'
ORDER BY w.calcDate DESC, w.employeeNo
LIMIT 20;
```
