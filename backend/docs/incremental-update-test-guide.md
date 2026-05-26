# WorkHourResult 增量更新机制测试指南

## 📋 测试目标

验证 WorkHourResult 表的增量更新机制是否正常工作：

1. ✅ **数据来源标记**: source 字段正确标记数据来源（1=计算推送, 2=工时报表, 3=手动录入）
2. ✅ **批次ID生成**: sourceBatchId 字段正确生成唯一批次ID
3. ✅ **增量更新逻辑**: 重新计算时，先删除旧的计算推送数据，再插入新数据
4. ✅ **数据隔离**: 不同来源的数据互不影响（删除计算数据时，不影响手动数据）

---

## 🚀 快速开始

### 前置条件

1. 后端服务正在运行（`npm run start:dev`）
2. 数据库已初始化（`npx prisma db push`）
3. 存在测试员工数据（employeeNo=202604003）

### 运行测试

```bash
cd backend
./test-incremental-update.sh
```

---

## 📝 测试步骤详解

### 步骤 1: 环境检查

**目的**: 验证数据库表结构是否正确

**检查项**:
- WorkHourResult 表是否存在
- source 字段是否存在
- sourceBatchId 字段是否存在
- 相关索引是否存在

**预期结果**:
```
✅ source 字段存在
✅ sourceBatchId 字段存在
✅ source 索引存在
✅ sourceBatchId 索引存在
```

---

### 步骤 2: 获取认证 Token

**目的**: 登录系统获取 API 访问权限

**操作**:
```bash
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

**预期结果**:
```
✅ 登录成功，Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### 步骤 3: 清理测试数据

**目的**: 确保测试环境干净

**操作**:
```sql
DELETE FROM WorkHourResult
WHERE employeeNo='202604003' AND calcDate='2026-04-15';

DELETE FROM CalcResult
WHERE employeeNo='202604003' AND calcDate='2026-04-15';
```

**预期结果**:
```
✅ 清理完成
```

---

### 步骤 4: 第1次计算（初始推送）

**目的**: 测试初始推送功能

**操作**:
```bash
POST /api/calculate/calculate
{
  "calcDate": "2026-04-15",
  "employeeNo": "202604003"
}
```

**预期结果**:

CalcResult 表:
```
| id | employeeNo | calcDate    | calculationAttendanceCodeId | actualHours | status  |
|----|------------|-------------|-----------------------------|-------------|---------|
| 1  | 202604003  | 2026-04-15  | 1 (A02)                     | 9.0         | PENDING |
```

WorkHourResult 表:
```
| id | employeeNo | calcDate    | definitionAttendanceCodeStr | calcAttendanceCode | workHours | source | sourceType  | sourceBatchId                  |
|----|------------|-------------|-----------------------------|-------------------|-----------|--------|-------------|--------------------------------|
| 1  | 202604003  | 2026-04-15  | PRODUCTION_WORK             | A02               | 9.0       | 1      | CALCULATED  | BATCH-1713862400000-a1b2c3d4  |
```

**验证点**:
- ✅ source = 1 (计算推送)
- ✅ sourceType = 'CALCULATED'
- ✅ sourceBatchId 格式正确: `BATCH-{timestamp}-{uuid}`

---

### 步骤 5: 插入手动录入数据（测试数据隔离）

**目的**: 验证不同来源的数据能够共存

**操作**:
```sql
INSERT INTO WorkHourResult (
  employeeNo, calcDate, definitionAttendanceCodeStr,
  calcAttendanceCode, workHours, source, sourceType, status
) VALUES (
  '202604003', '2026-04-15', 'OVERTIME_WORK',
  'A04', 2.0, 3, 'MANUAL', 'CONFIRMED'
);
```

**预期结果**:

WorkHourResult 表:
```
| id | employeeNo | calcDate    | code             | calcAttendanceCode | workHours | source | sourceType  | sourceBatchId                  |
|----|------------|-------------|------------------|-------------------|-----------|--------|-------------|--------------------------------|
| 1  | 202604003  | 2026-04-15  | PRODUCTION_WORK  | A02               | 9.0       | 1      | CALCULATED  | BATCH-001                      |
| 2  | 202604003  | 2026-04-15  | OVERTIME_WORK    | A04               | 2.0       | 3      | MANUAL      | NULL                           |
```

**验证点**:
- ✅ 总记录数: 2 条（1 条计算数据，1 条手动数据）
- ✅ source = 1 的数据（计算推送）
- ✅ source = 3 的数据（手动录入）
- ✅ sourceType 正确区分

---

### 步骤 6: 第2次计算（测试增量更新）

**目的**: 验证重新计算时，旧数据被删除，新数据被插入

**操作**:
```bash
POST /api/calculate/calculate
{
  "calcDate": "2026-04-15",
  "employeeNo": "202604003"
}
```

**预期结果**:

WorkHourResult 表（更新后）:
```
| id | employeeNo | calcDate    | code             | calcAttendanceCode | workHours | source | sourceType  | sourceBatchId                  |
|----|------------|-------------|------------------|-------------------|-----------|--------|-------------|--------------------------------|
| 3  | 202604003  | 2026-04-15  | PRODUCTION_WORK  | A02               | 9.0       | 1      | CALCULATED  | BATCH-002                      |
| 2  | 202604003  | 2026-04-15  | OVERTIME_WORK    | A04               | 2.0       | 3      | MANUAL      | NULL                           |
```

**验证点**:
- ✅ 旧的计算数据（id=1, sourceBatchId=BATCH-001）已被删除
- ✅ 新的计算数据（id=3, sourceBatchId=BATCH-002）已被插入
- ✅ 手动数据（id=2, source=3）未被删除，仍然保留
- ✅ sourceBatchId 已更新为新的批次ID

---

### 步骤 7: 验证数据隔离

**目的**: 确认删除操作只影响计算数据，不影响其他来源的数据

**验证 SQL**:
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
WHERE employeeNo='202604003' AND calcDate='2026-04-15'
GROUP BY source;
```

**预期结果**:
```
| source | source_name | count |
|--------|-------------|-------|
| 1      | 计算推送     | 1     |
| 3      | 手动录入     | 1     |
```

**关键验证**:
- ✅ source=3 的数据在增量更新后仍然存在
- ✅ 证明数据隔离机制正常工作

---

### 步骤 8: 验证增量更新效果

**目的**: 确认旧批次数据已被彻底删除

**验证 SQL**:
```sql
-- 查询旧批次数据
SELECT COUNT(*) FROM WorkHourResult
WHERE sourceBatchId = 'BATCH-001';

-- 查询新批次数据
SELECT COUNT(*) FROM WorkHourResult
WHERE sourceBatchId = 'BATCH-002';
```

**预期结果**:
```
旧批次数据 (BATCH-001): 0 条
新批次数据 (BATCH-002): 1 条
```

**验证点**:
- ✅ 旧批次数据已被删除
- ✅ 只存在最新批次的数据

---

## 🎯 测试场景

### 场景 1: 正常增量更新

**初始状态**: 2 条计算数据
**更新后**: 1 条计算数据
**结果**: ✅ 旧 2 条被删除，新 1 条被插入

### 场景 2: 数据来源隔离

**初始状态**:
- 1 条计算数据 (source=1)
- 1 条手动数据 (source=3)

**更新后**:
- 1 条计算数据 (source=1) ← 新数据
- 1 条手动数据 (source=3) ← 保留

**结果**: ✅ 手动数据未被删除

### 场景 3: 批次ID唯一性

**验证点**:
- 第1次推送: BATCH-001
- 第2次推送: BATCH-002
- 第3次推送: BATCH-003

**结果**: ✅ 每次推送生成唯一批次ID

---

## 📊 测试结果示例

### 成功的测试输出

```
[INFO] =========================================
[INFO] 步骤 1: 环境检查
[INFO] =========================================
[SUCCESS] 数据库文件存在
[SUCCESS] source 字段存在
[SUCCESS] sourceBatchId 字段存在
[SUCCESS] source 索引存在
[SUCCESS] sourceBatchId 索引存在

[INFO] =========================================
[INFO] 步骤 2: 获取认证 Token
[INFO] =========================================
[SUCCESS] 登录成功，Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

[INFO] =========================================
[INFO] 步骤 4: 第1次计算（初始推送）
[INFO] =========================================
[SUCCESS] 计算完成
[INFO] CalcResult 记录数: 1
[INFO] WorkHourResult 记录数: 1
[SUCCESS] 第1次推送批次ID: BATCH-1713862400000-a1b2c3d4
[SUCCESS] 数据来源标记正确: source=1 (计算推送)

[INFO] =========================================
[INFO] 步骤 5: 插入手动录入数据（测试数据隔离）
[INFO] =========================================
[SUCCESS] 手动数据插入完成
[INFO] 手动数据数量: 1
[INFO] 总数据数量: 2 (计算数据: 1, 手动数据: 1)

[INFO] =========================================
[INFO] 步骤 6: 第2次计算（测试增量更新）
[INFO] =========================================
[SUCCESS] 第2次计算完成
[INFO] WorkHourResult 记录数: 2
[SUCCESS] 第2次推送批次ID: BATCH-1713862500000-b2c3d4e5
[SUCCESS] 批次ID已更新，说明生成了新的推送批次

[INFO] =========================================
[INFO] 步骤 7: 验证数据隔离
[INFO] =========================================
[INFO] 手动数据数量: 1
[SUCCESS] 数据隔离验证成功：手动数据 (source=3) 在增量更新时被保留
[INFO] 数据来源分布：
1|计算推送|1
3|手动录入|1

[INFO] =========================================
[INFO] 步骤 8: 验证增量更新效果
[INFO] =========================================
[SUCCESS] 增量更新验证成功：旧批次数据已被删除
[INFO] 新批次数据数量: 1

[INFO] =========================================
[INFO] 步骤 9: 最终总结
[INFO] =========================================
[SUCCESS] =========================================
[SUCCESS] 测试完成！
[SUCCESS] =========================================
[INFO] 测试结果摘要：
[INFO] 1. ✅ 数据来源标记 (source 字段) 正常工作
[INFO] 2. ✅ 批次ID (sourceBatchId 字段) 正常生成
[INFO] 3. ✅ 增量更新逻辑正常：旧数据被删除，新数据被插入
[INFO] 4. ✅ 数据隔离正常：手动数据 (source=3) 被保留
```

---

## ⚠️ 常见问题

### 问题 1: 数据库字段不存在

**错误信息**:
```
[ERROR] source 字段不存在
[ERROR] sourceBatchId 字段不存在
```

**解决方案**:
```bash
# 运行数据库迁移
npx prisma db push
```

### 问题 2: 批次ID相同

**错误信息**:
```
[WARNING] 批次ID相同，可能没有生成新批次
```

**原因**: 两次计算之间没有变化，CalcResult 没有更新

**解决方案**: 这是正常情况，说明数据没有变化

### 问题 3: 手动数据被删除

**错误信息**:
```
[ERROR] 数据隔离验证失败：手动数据被意外删除
```

**原因**: work-hour-push.service.ts 中的删除条件缺少 `source: 1`

**解决方案**: 检查删除条件是否包含 `source: 1`

---

## 🧹 清理测试数据

测试完成后，可以清理测试数据：

```bash
sqlite3 prisma/dev.db "DELETE FROM WorkHourResult WHERE employeeNo='202604003' AND calcDate='2026-04-15';"
sqlite3 prisma/dev.db "DELETE FROM CalcResult WHERE employeeNo='202604003' AND calcDate='2026-04-15';"
```

---

## 📚 相关文档

- **增量更新实施文档**: `/backend/docs/workhour-incremental-update-implementation.md`
- **自动同步实施文档**: `/backend/docs/calculation-auto-sync-implementation-complete.md`
- **数据库 Schema**: `/backend/prisma/schema.prisma`
- **推送服务**: `/backend/src/modules/calculate/work-hour-push.service.ts`

---

## ✅ 验收标准

测试通过的标准：

1. ✅ **环境检查**: 所有字段和索引存在
2. ✅ **初始推送**: 第1次计算成功推送数据到 WorkHourResult
3. ✅ **数据来源**: source 字段正确标记为 1
4. ✅ **批次ID**: sourceBatchId 格式正确且唯一
5. ✅ **数据隔离**: 手动数据 (source=3) 在增量更新时被保留
6. ✅ **增量更新**: 旧批次数据被删除，新批次数据被插入
7. ✅ **数据完整性**: 总数据量符合预期（计算数据 + 手动数据）

---

**测试脚本**: `/backend/test-incremental-update.sh`
**文档版本**: 1.0
**最后更新**: 2026-04-23
