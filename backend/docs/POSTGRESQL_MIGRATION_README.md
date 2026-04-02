# PostgreSQL 数据库迁移指南

**版本：** 20260402
**数据库：** PostgreSQL 12+
**更新日期：** 2026-04-02

---

## 📋 迁移脚本说明

本次更新提供了三个 PostgreSQL 迁移脚本：

### 1. 完整版迁移脚本
**文件：** `backend/scripts/update-employee-fields-20260402.postgres.sql`

**特点：**
- ✅ 包含详细的注释和日志
- ✅ 自动检查并删除现有约束
- ✅ 执行数据完整性验证
- ✅ 提供统计数据报告
- ✅ 包含回滚脚本（注释形式）

**适用场景：** 生产环境部署

### 2. 快速版迁移脚本
**文件：** `backend/scripts/quick-update-postgres.sql`

**特点：**
- ✅ 简洁明了，易于审查
- ✅ 执行速度快
- ✅ 适合熟练的 DBA

**适用场景：** 测试环境或快速部署

### 3. 自动化迁移脚本
**文件：** `backend/scripts/migrate-postgres.sh`

**特点：**
- ✅ Shell 脚本，自动化执行
- ✅ 自动备份数据库
- ✅ 自动验证迁移结果
- ✅ 支持自定义配置
- ✅ 彩色日志输出
- ✅ 错误处理

**适用场景：** 生产环境自动化部署

---

## 🚀 快速开始

### 方式 1：使用 Shell 脚本（推荐）

```bash
# 进入后端目录
cd backend

# 设置数据库配置（可选，使用默认值）
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=jy_production
export DB_USER=postgres

# 执行迁移（自动备份 + 迁移 + 验证）
./scripts/migrate-postgres.sh
```

### 方式 2：手动执行 SQL 脚本

```bash
# 1. 备份数据库
pg_dump -h localhost -U postgres -d jy_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. 执行迁移脚本
psql -h localhost -U postgres -d jy_production -f scripts/update-employee-fields-20260402.postgres.sql

# 3. 验证结果
psql -h localhost -U postgres -d jy_production -c "SELECT \"fieldCode\", \"fieldName\", \"dataSourceId\" FROM \"EmployeeInfoTabField\" WHERE \"fieldCode\" IN ('emergencyRelation', 'jobLevel', 'status');"
```

### 方式 3：使用 Docker（如果数据库在 Docker 中）

```bash
# 1. 备份
docker exec jy-postgres pg_dump -U postgres jy_production > backup.sql

# 2. 执行迁移
docker exec -i jy-postgres psql -U postgres -d jy_production < scripts/update-employee-fields-20260402.postgres.sql

# 3. 验证
docker exec -i jy-postgres psql -U postgres -d jy_production -c "SELECT \"fieldCode\", \"fieldName\", \"dataSourceId\" FROM \"EmployeeInfoTabField\" WHERE \"fieldCode\" IN ('emergencyRelation', 'jobLevel', 'status');"
```

---

## 🔧 Shell 脚本使用说明

### 基本用法

```bash
# 查看帮助
./scripts/migrate-postgres.sh --help

# 标准流程（备份 + 迁移 + 验证）
./scripts/migrate-postgres.sh

# 仅备份数据库
./scripts/migrate-postgres.sh --backup-only

# 仅执行迁移（不备份）
./scripts/migrate-postgres.sh --migrate-only

# 仅验证迁移结果
./scripts/migrate-postgres.sh --verify-only

# 自动确认所有提示
./scripts/migrate-postgres.sh --yes
```

### 环境变量配置

```bash
# 数据库连接配置
export DB_HOST=192.168.1.100        # 数据库主机
export DB_PORT=5432                  # 数据库端口
export DB_NAME=jy_production         # 数据库名称
export DB_USER=postgres              # 数据库用户

# 如果使用密码认证，可以设置 .pgpass 文件
echo "localhost:5432:jy_production:postgres:your_password" > ~/.pgpass
chmod 600 ~/.pgpass
```

### 使用示例

```bash
# 示例 1: 连接到远程数据库
DB_HOST=192.168.1.100 DB_NAME=mydb ./scripts/migrate-postgres.sh

# 示例 2: 在生产环境执行（自动确认）
export DB_HOST=prod-db.example.com
export DB_NAME=jy_production
export DB_USER=admin
./scripts/migrate-postgres.sh --yes

# 示例 3: 先备份，稍后迁移
./scripts/migrate-postgres.sh --backup-only
# ... 检查备份文件 ...
./scripts/migrate-postgres.sh --migrate-only
```

---

## 📊 迁移验证

### 手动验证 SQL

```sql
-- 1. 检查 Employee 表结构
\d "Employee"

-- 详细查询
SELECT
    column_name,
    is_nullable,
    data_type,
    character_maximum_length
FROM information_schema.columns
WHERE table_name = 'Employee'
  AND column_name IN ('name', 'gender')
ORDER BY ordinal_position;

-- 2. 检查数据源更新
SELECT
    f."fieldCode",
    f."fieldName",
    f."dataSourceId",
    ds.code as "dataSourceCode",
    ds.name as "dataSourceName"
FROM "EmployeeInfoTabField" f
LEFT JOIN "DataSource" ds ON f."dataSourceId" = ds.id
WHERE f."fieldCode" IN ('emergencyRelation', 'jobLevel', 'status', 'nation')
ORDER BY f."fieldCode";

-- 3. 统计当前数据
SELECT
    COUNT(*) as total_employees,
    COUNT(CASE WHEN "name" IS NULL THEN 1 END) as null_name_count,
    COUNT(CASE WHEN "gender" IS NULL THEN 1 END) as null_gender_count,
    COUNT(CASE WHEN "name" IS NOT NULL THEN 1 END) as has_name_count,
    COUNT(CASE WHEN "gender" IS NOT NULL THEN 1 END) as has_gender_count
FROM "Employee";

-- 4. 查看示例数据
SELECT
    id,
    "employeeNo",
    "name",
    gender,
    "entryDate"
FROM "Employee"
ORDER BY id
LIMIT 5;
```

---

## 🔄 回滚方案

### 检查回滚条件

```sql
-- 检查是否有空值记录
SELECT COUNT(*) FROM "Employee" WHERE "name" IS NULL OR "gender" IS NULL;

-- 如果有空值，需要先更新
-- UPDATE "Employee" SET "name" = '未命名' WHERE "name" IS NULL;
-- UPDATE "Employee" SET "gender" = 'UNKNOWN' WHERE "gender" IS NULL;
```

### 执行回滚

```bash
# 方式 1: 使用备份恢复（推荐）
psql -h localhost -U postgres -d jy_production < backup_YYYYMMDD_HHMMSS.sql

# 方式 2: 手动执行回滚 SQL
psql -h localhost -U postgres -d jy_production
```

```sql
-- 回滚 SQL
BEGIN;

-- 恢复 NOT NULL 约束（确保没有空值）
ALTER TABLE "Employee" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "gender" SET NOT NULL;

-- 恢复数据源关联
UPDATE "EmployeeInfoTabField"
SET "dataSourceId" = NULL,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "fieldCode" IN ('emergencyRelation', 'jobLevel', 'status');

COMMIT;
```

---

## ⚠️ 注意事项

### 1. 权限要求

执行迁移需要以下权限：
- `ALTER TABLE` - 修改表结构
- `UPDATE` - 更新数据
- `SELECT` - 查询数据
- `TRIGGER` - 创建/删除约束（如果需要）

### 2. 性能影响

- **迁移时间**：约 1-5 秒（取决于数据量）
- **锁表时间**：ALTER TABLE 会锁定表，建议在低峰期执行
- **磁盘空间**：备份文件约 10-100 MB（取决于数据量）

### 3. 并发控制

```sql
-- 查看当前活动连接
SELECT
    pid,
    usename,
    application_name,
    state,
    query_start,
    state_change,
    query
FROM pg_stat_activity
WHERE datname = 'jy_production'
ORDER BY query_start;

-- 如需要，可以终止长时间运行的查询
-- SELECT pg_terminate_backend(pid);
```

### 4. 数据库配置

```ini
# postgresql.conf 建议配置
# 临时增加超时时间
lock_timeout = '10s'
statement_timeout = '60s'

# 如果数据量大，可以临时调整
work_mem = '256MB'
maintenance_work_mem = '512MB'
```

---

## 🔍 问题排查

### 问题 1: 连接失败

```bash
# 检查 PostgreSQL 服务状态
sudo systemctl status postgresql

# 检查端口是否开放
netstat -an | grep 5432

# 测试连接
psql -h localhost -U postgres -d jy_production -c "SELECT 1;"
```

### 问题 2: 权限不足

```sql
-- 检查用户权限
SELECT * FROM pg_user WHERE usename = 'postgres';

-- 授予必要权限
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
```

### 问题 3: 约束冲突

```sql
-- 查看表约束
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'Employee'::regclass
ORDER BY conname;

-- 手动删除约束（如果需要）
-- ALTER TABLE "Employee" DROP CONSTRAINT constraint_name;
```

### 问题 4: 迁移失败

```bash
# 查看详细错误信息
psql -h localhost -U postgres -d jy_production -f scripts/update-employee-fields-20260402.postgres.sql 2>&1 | tee migration.log

# 查看日志
tail -f migration.log
```

---

## 📞 支持联系

如有问题，请联系：

- **技术支持：** ______________________
- **DBA 团队：** ______________________
- **紧急联系：** ______________________

---

## 📝 变更历史

| 版本 | 日期 | 变更说明 |
|-----|------|---------|
| 20260402 | 2026-04-02 | 初始版本：Employee.name/gender 改为可选，更新数据源关联 |

---

**文档版本：** 1.0
**最后更新：** 2026-04-02
**维护者：** Claude AI Assistant
