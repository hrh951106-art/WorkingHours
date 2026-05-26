# 班次连接点跨班次配对处理说明

## 概述

本文档说明班次连接点跨班次配对的处理逻辑。当两个班次连在一起时，如果员工的进卡在前一个班次，出卡在后一个班次，系统会自动在连接点插入虚拟打卡记录，使得两个班次都能正确配对。

## 业务场景

### 典型场景

**排班配置**：
```
班次A：08:00 - 12:00
班次B：12:00 - 17:00
连接点：12:00
```

**打卡数据**：
```
08:00 - 进 (设备1)
14:00 - 出 (设备1)
```

**问题分析**：
- 08:00的进卡归属于班次A（08:00-12:00）
- 14:00的出卡归属于班次B（12:00-17:00）
- 班次A有进卡无出卡
- 班次B有出卡无进卡
- 如果按班次分别配对，两个班次都无法完成配对

**系统处理**：
1. 检测到班次A和班次B相连（连接点12:00）
2. 检测到班次A有进卡（08:00），班次B有出卡（14:00）
3. 自动在连接点插入虚拟打卡：
   - 12:00:00 - OUT（虚拟，归属班次A）
   - 12:00:00 - IN（虚拟，归属班次B）
4. 最终配对：
   - 班次A：08:00:00(IN) + 12:00:00(OUT虚拟) → 工时：4小时
   - 班次B：12:00:00(IN虚拟) + 14:00:00(OUT) → 工时：2小时

## 处理逻辑

### 1. 连接点检测

```typescript
// 判断条件：下一个班次开始时间 <= 当前班次结束时间 + 1分钟
const junctionThreshold = new Date(currentShiftEnd.getTime() + 60 * 1000);

if (nextShiftStart <= junctionThreshold) {
  // 存在连接点，使用中间时间点作为连接点
  const junctionTime = new Date(
    (currentShiftEnd.getTime() + nextShiftStart.getTime()) / 2
  );
}
```

**示例**：
- 班次A结束：12:00
- 班次B开始：12:00
- 连接点：(12:00 + 12:00) / 2 = 12:00

### 2. 跨班次配对检测

```typescript
// 1. 将打卡记录分配到各个班次
const shiftPunchesMap = assignPunchesToShifts(punchRecords, schedules, junctions);

// 2. 检测跨班次连接点的配对
const crossJunctionPairs = [];

for (const junction of junctions) {
  // 获取前一个班次和后一个班次的打卡记录
  const previousShiftPunches = shiftPunchesMap.get(junction.previousShiftId) || [];
  const nextShiftPunches = shiftPunchesMap.get(junction.nextShiftId) || [];

  // 找出前一个班次的进卡（在连接点之前的）
  const previousInPunches = previousShiftPunches.filter(
    p => p.punchType === 'IN' && p.punchTime < junction.junctionTime
  );

  // 找出后一个班次的出卡（在连接点之后的）
  const nextOutPunches = nextShiftPunches.filter(
    p => p.punchType === 'OUT' && p.punchTime > junction.junctionTime
  );

  // 如果前一个班次有进卡，后一个班次有出卡，则可以配对
  if (previousInPunches.length > 0 && nextOutPunches.length > 0) {
    // 取最后一个进卡和第一个出卡进行配对
    const lastInPunch = previousInPunches[previousInPunches.length - 1];
    const firstOutPunch = nextOutPunches[0];

    crossJunctionPairs.push({
      junction,
      inPunch: lastInPunch,
      outPunch: firstOutPunch,
    });
  }
}
```

**关键点**：
- 前一个班次的进卡必须在连接点之前
- 后一个班次的出卡必须在连接点之后
- 取最后一个进卡和第一个出卡进行配对

### 3. 虚拟打卡创建

```typescript
// 为每个跨班次配对创建虚拟打卡记录
for (const pair of crossJunctionPairs) {
  const { junction, inPunch, outPunch } = pair;

  // 创建虚拟打卡记录：时间点出（前一个班次）
  const virtualOutPunch = await createVirtualPunch(
    employeeNo,
    junction.junctionTime,
    'OUT',
    inPunch.deviceId,
    inPunch.accountId,
    `VIRTUAL_JUNCTION_OUT_${junction.previousShiftId}_${junction.nextShiftId}`
  );

  // 创建虚拟打卡记录：时间点进（后一个班次）
  const virtualInPunch = await createVirtualPunch(
    employeeNo,
    junction.junctionTime,
    'IN',
    outPunch.deviceId,
    outPunch.accountId,
    `VIRTUAL_JUNCTION_IN_${junction.previousShiftId}_${junction.nextShiftId}`
  );
}
```

**虚拟打卡特点**：
- 时间：连接点时间
- 类型：OUT（给前一个班次）、IN（给后一个班次）
- 标记：`VIRTUAL_JUNCTION_OUT_{shiftId}_{nextShiftId}`
- 账户：继承原始打卡的账户ID
- 设备：继承原始打卡的设备ID

## 测试场景

### 场景1：标准跨班次配对

**排班**：
```
班次A：08:00 - 12:00
班次B：12:00 - 17:00
```

**打卡**：
```
08:00 - IN
14:00 - OUT
```

**预期**：
```
班次A：08:00(IN) + 12:00(OUT虚拟)
班次B：12:00(IN虚拟) + 14:00(OUT)
```

### 场景2：有中间打卡的情况

**排班**：
```
班次A：08:00 - 12:00
班次B：12:00 - 17:00
```

**打卡**：
```
08:00 - IN
10:00 - OUT
10:30 - IN
14:00 - OUT
```

**预期**：
```
班次A：08:00(IN) + 10:00(OUT)
班次A：10:30(IN) + 12:00(OUT虚拟)
班次B：12:00(IN虚拟) + 14:00(OUT)
```

### 场景3：多个跨班次配对

**排班**：
```
班次A：08:00 - 12:00
班次B：12:00 - 17:00
班次C：17:00 - 22:00
```

**打卡**：
```
08:00 - IN
11:00 - OUT
11:30 - IN
14:00 - OUT
16:00 - IN
20:00 - OUT
```

**预期**：
```
班次A：08:00(IN) + 11:00(OUT)
班次A：11:30(IN) + 12:00(OUT虚拟)
班次B：12:00(IN虚拟) + 14:00(OUT)
班次B：16:00(IN) + 17:00(OUT虚拟)
班次C：17:00(IN虚拟) + 20:00(OUT)
```

### 场景4：无跨班次配对

**排班**：
```
班次A：08:00 - 12:00
班次B：12:00 - 17:00
```

**打卡**：
```
08:00 - IN
11:00 - OUT
13:00 - IN
17:00 - OUT
```

**预期**：
```
班次A：08:00(IN) + 11:00(OUT)
班次B：13:00(IN) + 17:00(OUT)
不插入虚拟打卡（因为班次A有出卡，班次B有进卡）
```

## 数据库验证

### 查看虚拟打卡记录

```sql
SELECT
  id,
  employeeNo,
  punchTime,
  punchType,
  deviceId,
  accountId,
  source,
  createdAt
FROM PunchRecord
WHERE source LIKE 'VIRTUAL_JUNCTION%'
  AND employeeNo = 'TEST001'
ORDER BY punchTime;
```

### 查看摆卡结果

```sql
SELECT
  pp.id,
  pp.employeeNo,
  pp.pairDate,
  pp.shiftId,
  pp.shiftName,
  pp.inPunchTime,
  pp.outPunchTime,
  pp.workHours,
  pp.accountId,
  in_pr.source as inPunchSource,
  out_pr.source as outPunchSource
FROM PunchPair pp
LEFT JOIN PunchRecord in_pr ON pp.inPunchId = in_pr.id
LEFT JOIN PunchRecord out_pr ON pp.outPunchId = out_pr.id
WHERE pp.employeeNo = 'TEST001'
  AND pp.pairDate = '2025-01-15'
ORDER BY pp.inPunchTime;
```

## 日志输出

### 处理开始

```
[班次连接点] 员工: TEST001, 日期: 2025-01-15, 检测到 1 个连接点
```

### 检测到跨班次配对

```
[班次连接点] 员工: TEST001, 检测到 1 个跨班次连接点配对
```

### 插入虚拟打卡

```
[班次连接点] 员工: TEST001, 时间点: 2025-01-15T12:00:00.000Z, 进卡: 2025-01-15T08:00:00.000Z, 出卡: 2025-01-15T14:00:00.000Z, 插入虚拟打卡: 2025-01-15T12:00:00.000Z
```

### 处理完成

```
[班次连接点] 员工: TEST001, 日期: 2025-01-15, 原始打卡: 2张, 插入虚拟打卡: 2张, 总计: 4张
```

## API测试

### 单员工摆卡

```bash
curl -X POST http://localhost:3000/api/punch/pairing \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employeeNo": "TEST001",
    "pairDate": "2025-01-15"
  }'
```

### 批量摆卡

```bash
curl -X POST http://localhost:3000/api/punch/pairing/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "pairDate": "2025-01-15"
  }'
```

## 注意事项

### 1. 虚拟打卡的识别

虚拟打卡记录通过 `source` 字段标识：
- 格式：`VIRTUAL_JUNCTION_OUT_{前班次ID}_{后班次ID}`
- 格式：`VIRTUAL_JUNCTION_IN_{前班次ID}_{后班次ID}`

这些虚拟打卡记录：
- 不会同步到考勤机
- 不会被删除（除非手动删除摆卡记录）
- 在日志中会有特殊标识

### 2. 工时计算

虚拟打卡记录参与工时计算：
- 班次A：计算到连接点的工时
- 班次B：计算从连接点开始的工时

**示例**：
```
班次A：08:00(IN) + 12:00(OUT虚拟) → 工时：4小时
班次B：12:00(IN虚拟) + 14:00(OUT) → 工时：2小时
```

### 3. 账户处理

如果原始打卡有劳动力账户：
- 虚拟出卡继承进卡的账户ID
- 虚拟进卡继承出卡的账户ID
- 如果进卡和出卡的账户不同，以各自的账户为准

### 4. 多个跨班次配对

如果一天有多个跨班次配对（例如3个班次连续相连），每个连接点都会独立处理：
- 检测每个连接点是否有跨班次配对
- 为每个配对创建虚拟打卡
- 确保每个班次都能正确配对

## 与旧逻辑的区别

### 旧逻辑（已废弃）

旧逻辑只检测"连接点±1分钟范围内"的打卡记录：
```typescript
// 旧逻辑：只检测连接点附近的打卡
const beforeJunction = new Date(junction.junctionTime.getTime() - 60 * 1000);
const afterJunction = new Date(junction.junctionTime.getTime() + 60 * 1000);

if (punchTime >= beforeJunction && punchTime <= afterJunction) {
  // 处理跨越连接点的打卡
}
```

**问题**：
- 14:00的出卡离12:00的连接点很远（2小时）
- 不会被检测为跨越连接点的打卡
- 无法正确处理跨班次配对

### 新逻辑（当前实现）

新逻辑检测跨班次的配对：
```typescript
// 新逻辑：检测跨班次配对
const previousInPunches = previousShiftPunches.filter(
  p => p.punchType === 'IN' && p.punchTime < junction.junctionTime
);
const nextOutPunches = nextShiftPunches.filter(
  p => p.punchType === 'OUT' && p.punchTime > junction.junctionTime
);
```

**优势**：
- 可以处理任意时间跨度的跨班次配对
- 更符合实际业务场景
- 自动插入虚拟打卡，确保正确配对

## 总结

班次连接点跨班次配对功能解决了员工跨班次工作时的打卡配对问题，通过自动插入虚拟打卡记录，确保每个班次都能正确配对并计算工时。

**核心价值**：
- ✅ 自动处理跨班次配对
- ✅ 无需手动干预
- ✅ 工时计算准确
- ✅ 支持多种复杂场景
