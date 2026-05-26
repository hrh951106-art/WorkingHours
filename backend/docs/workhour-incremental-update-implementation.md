# WorkHourResult 增量更新机制实施文档

## ✅ 完成时间
2026-04-23

---

## 🎯 需求背景

1. **数据来源区分**: 需要标记 WorkHourResult 表中数据的来源
   - 计算推送的数据
   - 工时报表的数据
   - 手动录入的数据

2. **增量更新**: 当计算结果变更时，自动更新 WorkHourResult
   - 删除旧的推送数据
   - 插入新的推送数据
   - 保持数据一致性

---

## 📊 数据库表结构更新

### WorkHourResult 表新增字段

```prisma
model WorkHourResult {
  id                        Int      @id @default(autoincrement())
  employeeNo                String
  employeeId                Int?
  calcDate                  DateTime
  shiftId                   Int?
  shiftName                 String?
  definitionAttendanceCodeId  Int?
  definitionAttendanceCodeStr String?
  calcAttendanceCode        String
  workHours                 Float
  source                    Int      @default(1) // ✅ 新增：数据来源标记
  sourceType                String   @default("CALCULATED")
  sourceId                  Int?
  sourceBatchId             String?  // ✅ 新增：批次ID
  accountId                 Int?
  accountName               String?
  status                    String   @default("DRAFT")
  remark                    String?
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt

  @@index([source, sourceId])     // ✅ 新增索引
  @@index([sourceBatchId])       // ✅ 新增索引
}
```

### source 字段定义

| 值 | 含义 | sourceType | 说明 |
|----|------|------------|------|
| 1 | 计算推送 | CALCULATED | 从计算管理模块自动推送 |
| 2 | 工时报表 | REPORTED | 从工时报表模块录入 |
| 3 | 手动录入 | MANUAL | 手动录入的数据 |
| 4-9 | 预留 | - | 预留给其他数据来源 |

### sourceBatchId 字段

- **格式**: `BATCH-{timestamp}-{uuid}`
- **作用**: 标识同一次推送的所有记录
- **示例**: `BATCH-1713862400000-a1b2c3d4`
- **用途**:
  - 追溯数据批次
  - 支持批量操作
  - 便于问题排查

---

## 🔄 增量更新逻辑

### 核心流程

```
1. 生成批次ID
   sourceBatchId = BATCH-{timestamp}-{uuid}

2. 按员工+日期分组
   groupKey = employeeNo_date (例如: "202604003_2026-04-15")

3. 对每个分组执行事务:
   ├─ 步骤1: 删除旧数据
   │  DELETE FROM WorkHourResult
   │  WHERE employeeNo = ?
   │    AND calcDate BETWEEN ? AND ?
   │    AND source = 1  ← 只删除计算推送的数据
   │
   └─ 步骤2: 插入新数据
      INSERT INTO WorkHourResult (...)
      VALUES (..., source=1, sourceBatchId=?)

4. 返回结果
   {
     success: 2,
     failed: 0,
     deleted: 2,  ← 删除的旧数据数量
     errors: []
   }
```

### 示例场景

#### 场景1: 数据变更导致数量减少

**初始状态** (第1次推送):
```
张三 2026-04-15:
  - 数据1: NORMAL_WORK, 8.0小时 (source=1, sourceBatchId=BATCH-001)
  - 数据2: PRODUCTION_WORK, 1.0小时 (source=1, sourceBatchId=BATCH-001)
```

**计算结果变更** (第2次推送):
```
CalcResult 只计算出一条数据:
  - 数据: NORMAL_WORK, 9.0小时
```

**增量更新过程**:
```sql
-- 步骤1: 删除旧数据
DELETE FROM WorkHourResult
WHERE employeeNo = '202604003'
  AND calcDate = '2026-04-15'
  AND source = 1;
-- 删除: 2 条

-- 步骤2: 插入新数据
INSERT INTO WorkHourResult (...)
VALUES (..., 9.0, source=1, sourceBatchId=BATCH-002);
-- 插入: 1 条
```

**最终状态**:
```
张三 2026-04-15:
  - 数据: NORMAL_WORK, 9.0小时 (source=1, sourceBatchId=BATCH-002)
```

#### 场景2: 数据变更导致数量增加

**初始状态**:
```
张三 2026-04-15:
  - 数据: NORMAL_WORK, 8.0小时 (source=1, sourceBatchId=BATCH-001)
```

**计算结果变更**:
```
CalcResult 计算出两条数据:
  - 数据1: NORMAL_WORK, 8.0小时
  - 数据2: PRODUCTION_WORK, 1.0小时
```

**增量更新过程**:
```sql
-- 步骤1: 删除旧数据
DELETE FROM WorkHourResult
WHERE employeeNo = '202604003'
  AND calcDate = '2026-04-15'
  AND source = 1;
-- 删除: 1 条

-- 步骤2: 插入新数据
INSERT INTO WorkHourResult (...) VALUES (...8.0小时);
INSERT INTO WorkHourResult (...) VALUES (...1.0小时);
-- 插入: 2 条
```

**最终状态**:
```
张三 2026-04-15:
  - 数据1: NORMAL_WORK, 8.0小时 (source=1, sourceBatchId=BATCH-002)
  - 数据2: PRODUCTION_WORK, 1.0小时 (source=1, sourceBatchId=BATCH-002)
```

#### 场景3: 保护其他来源数据

**初始状态**:
```
张三 2026-04-15:
  - 计算数据: NORMAL_WORK, 8.0小时 (source=1, sourceBatchId=BATCH-001)
  - 手动录入: OVERTIME_WORK, 2.0小时 (source=3)
  - 工时报表: SPECIAL_WORK, 1.0小时 (source=2)
```

**计算结果变更**:
```
CalcResult 重新计算，只有一条 NORMAL_WORK 数据
```

**增量更新过程**:
```sql
-- 步骤1: 只删除 source=1 的数据
DELETE FROM WorkHourResult
WHERE employeeNo = '202604003'
  AND calcDate = '2026-04-15'
  AND source = 1;  ← 注意这个条件
-- 删除: 1 条（只删除计算数据）

-- 手动录入和工时报表的数据不受影响 ✅
```

**最终状态**:
```
张三 2026-04-15:
  - 计算数据: NORMAL_WORK, 9.0小时 (source=1, sourceBatchId=BATCH-002) ← 更新
  - 手动录入: OVERTIME_WORK, 2.0小时 (source=3) ← 保留 ✅
  - 工时报表: SPECIAL_WORK, 1.0小时 (source=2) ← 保留 ✅
```

---

## 🔧 技术实现

### 1. 批次ID生成

```typescript
import { v4 as uuidv4 } from 'uuid';

const sourceBatchId = `BATCH-${Date.now()}-${uuidv4().substring(0, 8)}`;

// 示例输出:
// BATCH-1713862400000-a1b2c3d4
```

### 2. 按员工和日期分组

```typescript
const employeeDateGroups = new Map<string, typeof calcResults>();

calcResults.forEach(result => {
  const dateStr = result.calcDate.toISOString().split('T')[0];
  const key = `${result.employeeNo}_${dateStr}`;

  if (!employeeDateGroups.has(key)) {
    employeeDateGroups.set(key, []);
  }

  employeeDateGroups.get(key)!.push(result);
});
```

### 3. 事务处理

```typescript
await this.prisma.$transaction(async (tx) => {
  // 步骤1: 删除旧数据
  const deleteResult = await tx.workHourResult.deleteMany({
    where: {
      employeeNo: employeeNo,
      calcDate: { gte: dayStart, lte: dayEnd },
      source: 1, // ✅ 只删除计算推送的数据
    },
  });

  // 步骤2: 插入新数据
  for (const calcResult of groupCalcResults) {
    await tx.workHourResult.create({
      data: {
        // ... 其他字段
        source: 1, // ✅ 数据来源标记
        sourceType: 'CALCULATED',
        sourceBatchId: sourceBatchId, // ✅ 批次ID
      },
    });
  }
});
```

### 4. 返回结果

```typescript
{
  success: 2,      // 成功插入数量
  failed: 0,       // 失败数量
  deleted: 2,      // ✅ 删除的旧数据数量
  errors: []       // 错误信息列表
}
```

---

## 📊 数据查询示例

### 查询特定来源的数据

```sql
-- 查询所有计算推送的数据
SELECT * FROM WorkHourResult WHERE source = 1;

-- 查询所有手动录入的数据
SELECT * FROM WorkHourResult WHERE source = 3;

-- 查询所有工时报表的数据
SELECT * FROM WorkHourResult WHERE source = 2;
```

### 查询同一批次的数据

```sql
-- 查询某次推送的所有数据
SELECT * FROM WorkHourResult
WHERE sourceBatchId = 'BATCH-1713862400000-a1b2c3d4';
```

### 统计数据来源分布

```sql
SELECT
  source,
  CASE source
    WHEN 1 THEN '计算推送'
    WHEN 2 THEN '工时报表'
    WHEN 3 THEN '手动录入'
    ELSE '其他'
  END as source_name,
  COUNT(*) as count
FROM WorkHourResult
GROUP BY source;
```

### 查询员工的完整工时数据

```sql
SELECT
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr as attendance_code,
  workHours,
  CASE source
    WHEN 1 THEN '计算推送'
    WHEN 2 THEN '工时报表'
    WHEN 3 THEN '手动录入'
    ELSE '其他'
  END as source_name,
  sourceBatchId
FROM WorkHourResult
WHERE employeeNo = '202604003'
  AND calcDate = '2026-04-15'
ORDER BY source, id;
```

---

## 🧪 测试验证

### 测试1: 基础推送和更新

```bash
# 1. 登录获取token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

# 2. 触发计算（第1次）
curl -X POST http://localhost:3001/api/calculate/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calcDate": "2026-04-15",
    "employeeNo": "202604003"
  }'

# 3. 查询 WorkHourResult
sqlite3 prisma/dev.db "
SELECT
  id,
  employeeNo,
  calcDate,
  definitionAttendanceCodeStr,
  workHours,
  source,
  sourceBatchId
FROM WorkHourResult
WHERE employeeNo = '202604003'
  AND calcDate = '2026-04-15'
ORDER BY id;
"

# 4. 修改 CalcResult 数据后再次触发计算（第2次）
# 查看是否正确删除旧数据并插入新数据
```

### 测试2: 数据来源隔离

```sql
-- 手动插入一条手动录入数据
INSERT INTO WorkHourResult (
  employeeNo, calcDate, definitionAttendanceCodeStr,
  calcAttendanceCode, workHours, source, sourceType
) VALUES (
  '202604003', '2026-04-15', 'OVERTIME_WORK',
  'A04', 2.0, 3, 'MANUAL'
);

-- 触发计算推送
-- 验证手动录入的数据是否被保留（source=3不会被删除）
```

### 测试3: 批次ID查询

```sql
-- 查看最近几次推送的批次
SELECT
  sourceBatchId,
  COUNT(*) as count,
  MIN(createdAt) as first_time,
  MAX(createdAt) as last_time
FROM WorkHourResult
WHERE sourceBatchId IS NOT NULL
GROUP BY sourceBatchId
ORDER BY first_time DESC
LIMIT 5;
```

---

## ✅ 实施清单

### 数据库更新
- [x] ✅ 添加 `source` 字段（Int类型，默认值1）
- [x] ✅ 添加 `sourceBatchId` 字段（String类型，可选）
- [x] ✅ 添加 `source` 索引
- [x] ✅ 添加 `sourceBatchId` 索引
- [x] ✅ 运行数据库迁移

### Service 更新
- [x] ✅ 添加批次ID生成逻辑
- [x] ✅ 实现按员工+日期分组
- [x] ✅ 实现先删除旧数据的逻辑
- [x] ✅ 使用事务确保数据一致性
- [x] ✅ 返回统计信息（包括删除数量）

### 文档
- [x] ✅ 创建增量更新机制文档

---

## 🎯 关键优势

### 1. 数据隔离

不同来源的数据互不影响：
- 计算推送（source=1）可以被覆盖
- 手动录入（source=3）不会被删除
- 工时报表（source=2）不会被删除

### 2. 数据一致性

使用事务确保操作的原子性：
- 要么全部成功
- 要么全部回滚
- 不会出现删除了但没插入的情况

### 3. 可追溯性

通过 sourceBatchId 追溯：
- 知道某条数据是哪一次推送的
- 可以回滚某个批次的推送
- 便于问题排查

### 4. 增量更新效率

只更新需要更新的数据：
- 按员工+日期精确删除
- 不影响其他员工其他日期的数据
- 不影响其他来源的数据

---

## 📝 使用场景

### 场景1: 重新计算

当排班或打卡规则变更后，重新计算工时：
```
旧数据: NORMAL_WORK(8h) + PRODUCTION_WORK(1h)
新数据: NORMAL_WORK(9h)

结果: 删除2条旧数据，插入1条新数据 ✅
```

### 场景2: 修正错误

当计算结果发现错误，修正后重新推送：
```
旧数据: PRODUCTION_WORK(2h) - 错误
新数据: PRODUCTION_WORK(1.5h) - 正确

结果: 删除1条错误数据，插入1条正确数据 ✅
```

### 场景3: 批量重新计算

批量重新计算某个日期范围的工时：
```
100名员工 × 10天 = 1000条记录
每天每人的数据都会先删除旧数据再插入新数据

结果: 准确更新，不会累积冗余数据 ✅
```

---

## ⚠️ 注意事项

### 1. source 字段值必须正确

```typescript
// ✅ 正确
source: 1  // 计算推送
source: 2  // 工时报表
source: 3  // 手动录入

// ❌ 错误
source: 0
source: 4-9  // 未定义的值
```

### 2. sourceBatchId 格式一致

```typescript
// ✅ 正确格式
const sourceBatchId = `BATCH-${Date.now()}-${uuidv4().substring(0, 8)}`;

// ✅ 示例
sourceBatchId = "BATCH-1713862400000-a1b2c3d4"
```

### 3. 删除条件必须包含 source

```typescript
// ✅ 正确：只删除计算推送的数据
where: {
  employeeNo,
  calcDate: { gte: dayStart, lte: dayEnd },
  source: 1,  ← 必须有
}

// ❌ 错误：会删除所有来源的数据
where: {
  employeeNo,
  calcDate: { gte: dayStart, lte: dayEnd },
  // 缺少 source 条件
}
```

---

## 📚 相关文件

### 数据库
- `/backend/prisma/schema.prisma` - WorkHourResult 表定义

### 后端
- `/backend/src/modules/calculate/work-hour-push.service.ts` - 推送服务（已更新）

### 文档
- `/backend/docs/workhour-incremental-update-implementation.md` - 本文档

---

## 🎉 总结

1. ✅ **数据来源标记**: 通过 `source` 字段区分不同来源的数据
2. ✅ **增量更新机制**: 先删除旧数据再插入新数据，确保数据一致性
3. ✅ **批次追溯**: 通过 `sourceBatchId` 追溯每次推送
4. ✅ **数据隔离**: 不同来源的数据互不影响
5. ✅ **事务保证**: 使用事务确保操作的原子性

**实施完成时间**: 2026-04-23
**状态**: ✅ 全部功能已实现并测试通过
