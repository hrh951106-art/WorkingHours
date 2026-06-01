# PostgreSQL导入错误修复指南

## 问题描述

导入数据时遇到Organization表��时间戳列类型错误：
```
ALTER TABLE "Organization" ALTER COLUMN "createdAt" TYPE timestamp USING NULL;
ALTER TABLE "Organization" ALTER COLUMN "updatedAt" TYPE timestamp USING NULL
```

## 原因分析

数据库中已存在旧版本的Organization表，其中`createdAt`和`updatedAt`列被定义为INTEGER类型，而不是TIMESTAMP类型。

## 解决方案

### 方案1: 完全清理后重新导入（推荐）

```bash
cd /Users/aaron.he/Desktop/AI/JY/backend

# 方法1: 使用自动化脚本
chmod +x import-postgres-clean.sh
sudo ./import-postgres-clean.sh

# 方法2: 手动执行
# 1. 删除并重建数据库
sudo -u postgres psql -c "DROP DATABASE IF EXISTS jy_production;"
sudo -u postgres psql -c "CREATE DATABASE jy_production;"

# 2. 导入表结构（包含DROP SCHEMA清理）
sudo -u postgres psql -d jy_production -f postgres-export/01-schema.sql

# 3. 验证表结构
sudo -u postgres psql -d jy_production -c "
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Organization'
  AND column_name IN ('createdAt', 'updatedAt');"
# 应该显示: data_type = timestamp without time zone

# 4. 导入数据
sudo -u postgres psql -d jy_production -f postgres-export/02-data.sql

# 5. 验证数据
sudo -u postgres psql -d jy_production -c "
SELECT code, createdAt, updatedAt
FROM Organization
LIMIT 3;"
```

### 方案2: 修复已存在的表

如果不想删除数据库，可以修复现有表的列类型：

```bash
cd /Users/aaron.he/Desktop/AI/JY/backend

chmod +x fix-timestamp-columns.sh
sudo ./fix-timestamp-columns.sh
```

或手动执行SQL：

```sql
-- 连接到数据库
sudo -u postgres psql -d jy_production

-- 修复Organization表
ALTER TABLE "Organization"
ALTER COLUMN "createdAt" TYPE timestamp USING NULL;

ALTER TABLE "Organization"
ALTER COLUMN "updatedAt" TYPE timestamp USING NULL;

-- 修复后导入数据
\i postgres-export/02-data.sql
```

### 方案3: 修复所有可能的表（如果方案2不够）

检查并修复所有可能的时间戳列：

```sql
-- 连接到数据库
sudo -u postgres psql -d jy_production

-- 检查所有INTEGER类型但应该是TIMESTAMP的列
SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('createdAt', 'updatedAt', 'effectiveDate', 'expiryDate',
                      'startTime', 'endTime', 'scheduleDate', 'workDate',
                      'reportDate', 'productionDate', 'punchTime', 'calcDate',
                      'adjustedStart', 'adjustedEnd', 'operationTime',
                      'graduationDate', 'entryDate', 'birthDate')
  AND data_type = 'integer';

-- 如果发现有INTEGER类型的时间戳列，批量修复
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('createdAt', 'updatedAt', 'effectiveDate', 'expiryDate',
                              'startTime', 'endTime', 'scheduleDate', 'workDate',
                              'reportDate', 'productionDate', 'punchTime', 'calcDate',
                              'adjustedStart', 'adjustedEnd', 'operationTime',
                              'graduationDate', 'entryDate', 'birthDate')
          AND data_type = 'integer'
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN %I TYPE timestamp USING NULL',
            rec.table_name,
            rec.column_name
        );
        RAISE NOTICE '已修复 %.% 为timestamp类型', rec.table_name, rec.column_name;
    END LOOP;
END $$;
```

## 验证修复结果

### 1. 检查表结构

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'Organization'
  AND column_name IN ('createdAt', 'updatedAt', 'effectiveDate', 'expiryDate');
```

**预期结果**:
```
column_name   | data_type
--------------+------------------------
createdAt     | timestamp without time zone
updatedAt      | timestamp without time zone
effectiveDate  | timestamp without time zone
expiryDate     | timestamp without time zone
```

### 2. 检查数据内容

```sql
SELECT code, createdAt, updatedAt, effectiveDate
FROM Organization
LIMIT 3;
```

**预期结果** (时间戳格式):
```
code | createdAt          | updatedAt          | effectiveDate
-----+--------------------+--------------------+---------------------
ROOT | 2026-05-21 19:11:54 | 2026-05-21 19:11:54 | 2026-05-21 19:11:54
DH   | 2026-05-22 10:17:23 | 2026-05-26 20:23:29 | 2026-05-22 18:17:04
```

### 3. 检查数据完整性

```sql
SELECT
    COUNT(*) as total_orgs,
    COUNT(createdAt) as with_created_at,
    COUNT(updatedAt) as with_updated_at,
    COUNT(effectiveDate) as with_effective_date
FROM Organization;
```

**预期结果**: all counts should be equal

## 数据文件验证

确认您使用的是最新生成的文件（2026-06-01 19:03）：

```bash
ls -lh /Users/aaron.he/Desktop/AI/JY/backend/postgres-export/
```

**预期输出**:
```
-rw-r--r--  1 user  staff   83K  Jun  1 19:03 01-schema.sql
-rw-r--r--  1 user  staff  698K  Jun  1 19:03 02-data.sql
```

## 常见错误处理

### 错误1: "column already exists"

**原因**: 表结构已部分导入

**解决**:
```bash
sudo -u postgres psql -c "DROP DATABASE jy_production;"
sudo -u postgres psql -c "CREATE DATABASE jy_production;"
```

### 错误2: "permission denied"

**原因**: 权限不足

**解决**:
```bash
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jy_production TO YOUR_USER;"
```

### 错误3: "relation does not exist"

**原因**: 数据导入但表结构未创建

**解决**:
```bash
# 先导入schema
sudo -u postgres psql -d jy_production -f postgres-export/01-schema.sql
# 再导入data
sudo -u postgres psql -d jy_production -f postgres-export/02-data.sql
```

## 完整导入流程（推荐）

```bash
# 1. 进入后端目录
cd /Users/aaron.he/Desktop/AI/JY/backend

# 2. 运行完整导入脚本
chmod +x import-postgres-clean.sh
sudo ./import-postgres-clean.sh

# 3. 验证成功
sudo -u postgres psql -d jy_production -c "
SELECT COUNT(*) FROM Organization;
SELECT COUNT(*) FROM \"User\";
SELECT COUNT(*) FROM Employee;
"
```

## 总结

**推荐使用方案1**（完全清理后重新导入），因为：
1. ✅ 确保使用最新的schema定义
2. ✅ 避免类型不匹配问题
3. ✅ 干净的导入环境
4. ✅ 自动验证步骤

---

**文档生成时间**: 2026-06-01
**数据文件版本**: 2026-06-01 19:03
