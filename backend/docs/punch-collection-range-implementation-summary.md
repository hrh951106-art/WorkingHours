# 收卡范围逻辑实现总结

## 完成时间
2025-01-15

## 实现概述

本次更新实现了完整的收卡范围计算逻辑，包括有排班和未排班日期的处理，以及收卡范围交叉时的成对归属。

## 核心功能

### 1. 有排班日期的收卡范围

**公式**：
```
收卡范围 = [排班开始时间 − 开始早范围, 排班结束时间 + 结束晚范围]
```

**实现**：
- `calculateScheduledRange()` 方法
- 考虑班次段的 startDate/endDate（跨夜班次）
- 应用 beforeShiftMins 和 afterShiftMins 配置

**代码位置**：
- `backend/src/modules/punch/punch-collection-range.service.ts`
- `backend/src/modules/punch/pairing.service.ts` 中的 `getPunchesForShift()` 方法

### 2. 未排班日期的收卡范围

#### 2.1 前后都有排班

**公式**：
```
收卡范围 = [前一天结束时间+1min, 后一天开始时间-1min]
```

**实现**：
- `calculateCombinedRange()` 方法
- 获取前一天和后一天的收卡范围
- 计算交叉范围

#### 1.2 只有前一天有排班

**公式**：
```
收卡范围 = [前一天结束时间+1min, 23:59:59]
```

**实现**：
- `calculatePreviousDayRange()` 方法
- 使用前一天的收卡结束时间

#### 2.3 只有后一天有排班

**公式**：
```
收卡范围 = [00:00:00, 后一天开始时间-1min]
```

**实现**：
- `calculateNextDayRange()` 方法
- 使用后一天的收卡开始时间

#### 2.4 前后都无排班

**公式**：
```
收卡范围 = [00:00:00, 23:59:59]
```

**实现**：
- `calculateFullDayRange()` 方法
- 使用全天范围

### 3. 收卡范围交叉处理

**功能**：
- 检查两个收卡范围是否交叉
- 计算交叉范围的中间时间点
- 根据中间时间点归属打卡记录

**实现**：
- `checkRangesOverlap()` 方法
- `getOverlapMidpoint()` 方法
- `assignPunchesToRanges()` 方法

## 技术实现

### 新增服务

**PunchCollectionRangeService**

位置：`backend/src/modules/punch/punch-collection-range.service.ts`

主要方法：
```typescript
// 计算收卡范围
async calculateCollectionRange(
  employeeNo: string,
  targetDate: Date,
  beforeShiftMins: number = 120,
  afterShiftMins: number = 120,
): Promise<CollectionRange>

// 查找最近的排班
private async findNearestSchedule(
  employeeNo: string,
  targetDate: Date,
  direction: 'PREVIOUS' | 'NEXT',
): Promise<any | null>

// 检查范围交叉
checkRangesOverlap(range1: CollectionRange, range2: CollectionRange): boolean

// 获取交叉中间点
getOverlapMidpoint(range1: CollectionRange, range2: CollectionRange): Date | null

// 归属打卡记录
assignPunchesToRanges(
  punchRecords: any[],
  ranges: CollectionRange[],
  midpoint: Date,
): Map<number, any[]>
```

### 修改的服务

**PairingService**

位置：`backend/src/modules/punch/pairing.service.ts`

新增方法：
```typescript
// 处理未排班日期
private async handleUnscheduledDay(
  employeeNo: string,
  pairDate: Date,
  punchRule: any,
  dayStart: Date,
  dayEnd: Date,
): Promise<any>

// 为未排班日期创建打卡对
private async createPunchPairsForUnscheduledDay(
  employeeNo: string,
  pairDate: Date,
  punchRecords: any[],
  punchRule: any,
  accountId: number | null,
  deviceGroupConfigs: Map<number, any>,
  collectionRange: CollectionRange,
): Promise<any[]>

// 获取指定时间范围内的打卡记录
private async getPunchRecordsInRange(
  employeeNo: string,
  startTime: Date,
  endTime: Date,
  punchRule: any,
): Promise<any[]>
```

修改方法：
```typescript
// pairPunches 方法增加了未排班日期的处理
async pairPunches(employeeNo: string, pairDate: Date, ruleId?: number)
```

## 数据结构

### CollectionRange 接口

```typescript
export interface CollectionRange {
  startTime: Date;
  endTime: Date;
  source: 'SCHEDULED' | 'PREVIOUS_DAY' | 'NEXT_DAY' | 'FULL_DAY' | 'COMBINED';
}
```

**source 类型说明**：
- `SCHEDULED`：有排班日期，使用班次收卡范围
- `PREVIOUS_DAY`：未排班，只有前一天有排班
- `NEXT_DAY`：未排班，只有后一天有排班
- `FULL_DAY`：未排班，前后都无排班
- `COMBINED`：未排班，前后都有排班

### PunchPair 扩展

**未排班日期的摆卡记录**：
- `shiftId`：null（表示未排班）
- `shiftName`："未排班"
- `pairDate`：实际打卡日期

## 业务流程

### 1. 有排班日期的摆卡流程

```
1. 获取员工排班信息
2. 计算收卡范围 = [班次开始-前范围, 班次结束+后范围]
3. 获取收卡范围内的打卡记录
4. 合并账户
5. 应用摆卡间隔过滤
6. 成对收卡
7. 触发工时计算
```

### 2. 未排班日期的摆卡流程

```
1. 检测到无排班信息
2. 查找前后排班日期
3. 计算收卡范围：
   - 前后都有排班 → 使用组合范围
   - 只有前一天 → 使用前一天+1min 到 23:59
   - 只有后一天 → 使用 00:00 到后一天-1min
   - 前后都无 → 使用全天范围
4. 获取收卡范围内的打卡记录
5. 合并账户
6. 应用摆卡间隔过滤
7. 成对收卡（shiftId=null, shiftName="未排班"）
8. 触发工时计算
```

### 3. 收卡范围交叉处理流程

```
1. 检测到收卡范围交叉
2. 计算交叉范围
3. 找到交叉范围的中间时间点
4. 根据中间时间点归属打卡记录：
   - 早于中间点 → 归属到前一个范围
   - 晚于中间点 → 归属到后一个范围
5. 分别进行摆卡处理
```

## 日志输出

### 收卡范围日志

```
[收卡范围] 员工: TEST001, 日期: 2025-01-15, 范围: 2025-01-14T19:01:00.000Z - 2025-01-16T05:59:00.000Z, 类型: COMBINED
```

### 摆卡间隔过滤日志

```
[摆卡间隔过滤] 员工: TEST001, 日期: 2025-01-15, 账户: 100, 过滤前: 15张卡, 过滤后: 8张卡, 间隔: 5分钟
```

### 工时计算日志

```
触发工时计算 - 摆卡记录ID: 123, 员工: TEST001, 日期: 2025-01-15
工时计算成功 - 摆卡记录ID: 123, 生成 2 条结果
```

## 配置说明

### 打卡规则配置

**PunchRule 表**：
- `beforeShiftMins`：班次前范围（分钟），默认120
- `afterShiftMins`：班次后范围（分钟），默认120
- `configs`：设备组配置（JSON格式）
- `deviceGroupIntervals`：设备组间隔配置（关联表）

**示例**：
```json
{
  "beforeShiftMins": 120,
  "afterShiftMins": 120,
  "configs": [
    {
      "groupId": 100,
      "pairingInterval": 5
    }
  ]
}
```

## 测试场景

### 1. 有排班日期
- 班次：08:00 - 17:00
- 收卡范围：06:00 - 19:00

### 2. 未排班 - 前后都有排班
- 前一天：08:00 - 17:00
- 后一天：08:00 - 17:00
- 当天收卡范围：19:01 - 05:59（第二天）

### 3. 未排班 - 只有前一天
- 前一天：08:00 - 17:00
- 当天收卡范围：19:01 - 23:59

### 4. 未排班 - 只有后一天
- 后一天：08:00 - 17:00
- 当天收卡范围：00:00 - 05:59

### 5. 未排班 - 前后都无
- 当天收卡范围：00:00 - 23:59

### 6. 收卡范围交叉
- 前一天夜班：22:00 - 06:00
- 当天未排班
- 后一天白班：08:00 - 17:00
- 交叉范围：06:00 - 08:00
- 中间点：07:00

## 性能优化

### 1. 数据库查询优化

- 使用索引：`scheduleDate`、`employeeNo`
- 减少查询次数：预先加载排班信息
- 使用 `findFirst` 而不是 `findMany`

### 2. 缓存策略（建议）

- 缓存排班信息（按员工和日期）
- 缓存收卡范围计算结果
- 缓存设备组配置

### 3. 批量处理优化

- 批量摆卡时预先加载所有相关排班
- 并行处理多个员工
- 使用事务保证数据一致性

## 兼容性

### 向后兼容

- ✅ 原有的有排班日期逻辑保持不变
- ✅ 新增的未排班日期逻辑不影响现有功能
- ✅ PunchPair 表结构无需修改
- ✅ API 接口无需修改

### 数据库迁移

无需数据库迁移：
- 使用现有的表结构
- 未排班日期的 shiftId 为 null
- shiftName 字段存储 "未排班"

## 已知问题

### 1. 性能问题

- 未排班日期需要查询前后排班，可能影响性能
- 建议：优化查询逻辑，添加缓存

### 2. 边界情况

- 收卡范围跨天时的处理
- 连续多天未排班的处理
- 建议：增加更多测试场景

### 3. 收卡范围交叉

- 当前实现了基本的成对归属逻辑
- 复杂场景可能需要进一步优化
- 建议：根据实际使用情况调整

## 未来改进方向

### 短期（1-2周）

1. ✅ 实现基本收卡范围计算
2. ✅ 支持未排班日期处理
3. ✅ 实现收卡范围交叉处理
4. ✅ 集成到摆卡流程

### 中期（1-2月）

1. 性能优化
   - 添加缓存机制
   - 优化数据库查询
   - 批量处理优化

2. 功能增强
   - 支持更复杂的收卡范围规则
   - 支持跨天收卡范围
   - 支持多种班次类型

3. 监控和日志
   - 添加性能监控
   - 完善日志输出
   - 添加统计报表

### 长期（3-6月）

1. UI 界面
   - 收卡范围配置界面
   - 收卡范围可视化
   - 摆卡结果展示

2. 高级功能
   - 智能收卡范围建议
   - 异常收卡范围检测
   - 收卡范围优化建议

3. 系统集成
   - 与排班系统深度集成
   - 与考勤系统联动
   - 与工时计算系统联动

## 相关文档

- 收卡范围测试指南：`backend/docs/punch-collection-range-test-guide.md`
- 摆卡间隔过滤算法：`backend/docs/punch-interval-filter.md`
- 摆卡逻辑测试指南：`backend/docs/pairing-logic-test-guide.md`
- 摆卡逻辑改进总结：`backend/docs/pairing-logic-improvement-summary.md`
- 数据库模型：`backend/prisma/schema.prisma`

## 联系方式

如有问题或建议，请联系开发团队。
