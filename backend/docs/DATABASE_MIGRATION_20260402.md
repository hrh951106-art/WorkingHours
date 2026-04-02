# 数据库迁移指南 - 员工字段配置更新

**版本：** 20260402
**数据库类型：** SQLite / PostgreSQL
**迁移类型：** 表结构变更 + 数据更新

---

## 📋 变更概述

本次数据库迁移主要包含以下变更：

1. **Employee 表结构变更**：name 和 gender 字段改为可选
2. **EmployeeInfoTabField 数据更新**：更新关键字段的数据源关联

---

## 🔧 变更详情

### 1. Employee 表结构变更

#### 变更前
```sql
CREATE TABLE Employee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeNo TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,              -- ❌ 必填
    gender TEXT NOT NULL,            -- ❌ 必填
    idCard TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    orgId INTEGER NOT NULL,
    entryDate DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    -- ... 其他字段
);
```

#### 变更后
```sql
CREATE TABLE Employee (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeNo TEXT NOT NULL UNIQUE,
    name TEXT,                       -- ✅ 可选
    gender TEXT,                     -- ✅ 可选
    idCard TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    orgId INTEGER NOT NULL,
    entryDate DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    -- ... 其他字段
);
```

### 2. EmployeeInfoTabField 数据源更新

| 字段代码 | 字段名称 | 数据源ID | 数据源代码 |
|---------|---------|---------|-----------|
| emergencyRelation | 紧急联系人关系 | 19 | family_relation |
| jobLevel | 职级 | 13 | job_level |
| status | 在职状态 | 15 | employment_status |

---

## 🚀 迁移步骤

### SQLite 数据库

#### 步骤 1：备份数据库

```bash
cd backend
cp prisma/dev.db prisma/dev.db.backup.$(date +%Y%m%d_%H%M%S)
```

#### 步骤 2：执行迁移脚本

```bash
# 方式 1: 使用 sqlite3 命令行
sqlite3 prisma/dev.db < scripts/update-employee-fields-20260402.sql

# 方式 2: 使用 Prisma migrate
npx prisma migrate dev --name employee_fields_optional
npx prisma migrate deploy
```

#### 步骤 3：验证迁移结果

```bash
# 检查表结构
sqlite3 prisma/dev.db "PRAGMA table_info(Employee);"

# 检查数据源更新
sqlite3 prisma/dev.db "
SELECT
    f.fieldCode,
    f.fieldName,
    f.dataSourceId,
    ds.code as dataSourceCode,
    ds.name as dataSourceName
FROM EmployeeInfoTabField f
LEFT JOIN DataSource ds ON f.dataSourceId = ds.id
WHERE f.fieldCode IN ('emergencyRelation', 'jobLevel', 'status', 'nation')
ORDER BY f.fieldCode;
"
```

**预期输出：**
```
emergencyRelation|紧急联系人关系|19|family_relation|家庭关系
jobLevel|职级|13|job_level|职级
nation|民族|10|nation|民族
status|在职状态|15|employment_status|在职状态
```

### PostgreSQL 数据库

#### 步骤 1：备份数据库

```bash
# 使用 pg_dump 备份
pg_dump -h localhost -U postgres -d jy_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 或使用 pgAdmin 图形界面备份
```

#### 步骤 2：执行迁移脚本

```sql
-- ====================================================================
-- PostgreSQL 迁移脚本
-- ====================================================================

BEGIN;

-- 1. 修改 Employee 表字段为可选
ALTER TABLE Employee ALTER COLUMN name DROP NOT NULL;
ALTER TABLE Employee ALTER COLUMN gender DROP NOT NULL;

-- 2. 更新数据源关联
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 19
WHERE "fieldCode" = 'emergencyRelation'
  AND "dataSourceId" IS NULL;

UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 13
WHERE "fieldCode" = 'jobLevel'
  AND "dataSourceId" IS NULL;

UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = 15
WHERE "fieldCode" = 'status'
  AND "dataSourceId" IS NULL;

-- 3. 验证数据完整性
SELECT
    "fieldCode",
    "fieldName",
    "dataSourceId"
FROM "EmployeeInfoTabField"
WHERE "fieldCode" IN ('emergencyRelation', 'jobLevel', 'status');

COMMIT;
```

#### 步骤 3：验证迁移结果

```bash
# 使用 psql 连接数据库
psql -h localhost -U postgres -d jy_production

# 检查表结构
\d Employee

# 检查数据源更新
SELECT
    f."fieldCode",
    f."fieldName",
    f."dataSourceId",
    ds.code as "dataSourceCode"
FROM "EmployeeInfoTabField" f
LEFT JOIN "DataSource" ds ON f."dataSourceId" = ds.id
WHERE f."fieldCode" IN ('emergencyRelation', 'jobLevel', 'status')
ORDER BY f."fieldCode";
```

---

## 🔄 回滚方案

### SQLite 回滚

```bash
# 方式 1: 恢复备份
cd backend
cp prisma/dev.db.backup.YYYYMMDD_HHMMSS prisma/dev.db

# 方式 2: 执行回滚 SQL
sqlite3 prisma/dev.db < scripts/rollback-employee-fields-20260402.sql
```

### PostgreSQL 回滚

```sql
BEGIN;

-- 恢复字段为必填（如果没有空值）
ALTER TABLE Employee ALTER COLUMN name SET NOT NULL;
ALTER TABLE Employee ALTER COLUMN gender SET NOT NULL;

-- 恢复数据源关联
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = NULL
WHERE "fieldCode" IN ('emergencyRelation', 'jobLevel', 'status');

COMMIT;
```

**注意：** 如果表中已有 name 或 gender 为空的记录，无法直接恢复 NOT NULL 约束。需要先清理数据：

```sql
-- 查找空值记录
SELECT id, employeeNo, name, gender
FROM Employee
WHERE name IS NULL OR gender IS NULL;

-- 更新空值为默认值
UPDATE Employee
SET name = '未命名'
WHERE name IS NULL;

UPDATE Employee
SET gender = 'UNKNOWN'
WHERE gender IS NULL;

-- 然后再执行 ALTER COLUMN SET NOT NULL
```

---

## ⚠️ 注意事项

### 数据一致性

1. **现有数据不受影响**：迁移不会修改现有的员工数据
2. **向后兼容**：API 和前端已更新，支持新字段规则
3. **验证数据**：迁移后建议检查现有数据的完整性

### 性能影响

1. **迁移时间**：约 1-2 秒（取决于数据量）
2. **停机要求**：需要短暂停机（建议在低峰期执行）
3. **锁表影响**：迁移期间 Employee 表被锁定

### 生产环境建议

1. **备份优先**：执行前务必备份数据库
2. **分步执行**：先在测试环境验证，再在生产环境执行
3. **监控日志**：迁移后监控应用日志，确认无异常
4. **准备回滚**：保留备份文件，准备回滚方案

---

## 📊 迁移验证清单

- [ ] 数据库备份已完成
- [ ] 迁移脚本在测试环境执行成功
- [ ] 表结构变更已生效
- [ ] 数据源关联已更新
- [ ] 应用服务重启无报错
- [ ] 功能测试全部通过
- [ ] 性能指标正常

---

## 🔗 相关文档

- [完整部署指南](../DEPLOYMENT_GUIDE_20260402.md)
- [变更摘要](../CHANGELOG_20260402.md)
- [迁移脚本](../scripts/update-employee-fields-20260402.sql)

---

**执行人：** ______________________
**执行日期：** ______________________
**验证人：** ______________________
**完成时间：** ______________________
