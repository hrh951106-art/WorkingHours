# 数据库迁移说明

## 概述

本文档详细说明从开发环境 SQLite 数据库到生产环境 PostgreSQL 的���移过程。

---

## 数据库格式说明

### 开发环境（SQLite）

- **文件位置**: `backend/prisma/dev.db`
- **数据库类型**: SQLite 3.x
- **文件大小**: 约 1.6MB
- **用途**: 开发和测试环境

### 生产环境（PostgreSQL）

- **数据库类型**: PostgreSQL 14.x / 15.x
- **备份文件**: `jy_production_backup_YYYYMMDD_HHMMSS.sql`
- **文件大小**: 约 62KB（文本格式）
- **用途**: 生产环境部署

---

## 转换过程

### 转换工具

项目使用 `generate-full-migration.sh` 脚本进行自动转换：

```bash
bash backend/scripts/generate-full-migration.sh
```

### 转换步骤

1. **读取 PostgreSQL 表结构**
   - 源文件: `prisma/migrations_postgres/20250331_init/migration.sql`
   - 包含所有表的 PostgreSQL DDL 定义

2. **从 SQLite 导出数据**
   - 使用 Prisma Client ��接 SQLite 数据库
   - 读取所有表的数据
   - 转换为 PostgreSQL INSERT 语句

3. **处理数据类型差异**

   SQLite → PostgreSQL 类型映射：

   | SQLite | PostgreSQL | 说明 |
   |--------|------------|------|
   | INTEGER | SERIAL | 自增主键 |
   | TEXT | TEXT / VARCHAR | 文本类型 |
   | INTEGER | INTEGER | 整数类型 |
   | REAL | NUMERIC | 浮点类型 |
   | BLOB | BYTEA | 二进制数据 |

4. **生成序列重置命令**
   - 自动读取每个表的最大 ID
   - 生成 `SELECT setval()` 命令
   - 确保新记录不会出现主键冲突

5. **生成完整 SQL 文件**
   - 合并表结构、数据、序列命令
   - 输出: `jy_production_backup_YYYYMMDD_HHMMSS.sql`

---

## 使用说明

### 生产环境部署

**直接导入即可**，无需其他操作：

```bash
# 1. 创建空的 PostgreSQL 数据库
sudo -u postgres psql -c "CREATE DATABASE jy_production;"

# 2. 创建用户并授权
sudo -u postgres psql -c "CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;"

# 3. 导入备份文件（一键完成）
PGPASSWORD="your_password" psql -U jy_user -d jy_production -f jy_production_backup_20260529_012310.sql

# 4. 验证导入
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM \"User\";"
```

### ⚠️ 重要注意事项

1. **不要混用数据库格式**
   - ❌ 不能在 PostgreSQL 中直接使用 `dev.db` 文件
   - ❌ 不能在 SQLite 中使用 `.sql` 文件
   - ✅ 必须使用格式匹配的数据库

2. **无需执行额外命令**
   - ❌ 不需要 `prisma migrate deploy`
   - ❌ 不需要 `prisma db push`
   - ❌ 不需要运行 seed 脚本
   - ✅ SQL 文件已包含所有内容

3. **数据库必须为空**
   - 导入前确保数据库是新建的空数据库
   - 如果已有数据，请先删除并重建

4. **字符编码**
   - SQL 文件使用 UTF-8 编码
   - PostgreSQL 数据库建议使用 UTF-8 编码创建

---

## 验证导入结果

导入完成后，执行以下验证：

```bash
# 1. 检查表数量（应该在 40-60 张表之间）
sudo -u postgres psql -d jy_production -c "
  SELECT COUNT(*) as table_count
  FROM information_schema.tables
  WHERE table_schema='public';
"

# 2. 检查关键表数据
sudo -u postgres psql -d jy_production -c "
  SELECT
    (SELECT COUNT(*) FROM \"User\") as users,
    (SELECT COUNT(*) FROM \"Role\") as roles,
    (SELECT COUNT(*) FROM \"Employee\") as employees,
    (SELECT COUNT(*) FROM \"Organization\") as orgs;
"

# 3. 检查序列设置
sudo -u postgres psql -d jy_production -c "
  SELECT
    schemaname,
    tablename,
    attname,
    seq_scan
  FROM pg_stat_user_tables
  WHERE seq_scan > 0
  ORDER BY tablename;
"

# 4. 查看数据库大小
sudo -u postgres psql -d jy_production -c "
  SELECT pg_size_pretty(pg_database_size('jy_production')) as db_size;
"
```

---

## 常见问题

### Q1: 导入时提示 "relation already exists"

**原因**: 数据库不为空，已有表结构

**解决方案**:
```bash
# 删除并重建数据库
sudo -u postgres psql -c "DROP DATABASE jy_production;"
sudo -u postgres psql -c "CREATE DATABASE jy_production;"
# 然后重新导入
```

### Q2: 导入后查询数据为空

**原因**: 可能是导入过程中出现错误

**解决方案**:
```bash
# 查看导入日志
PGPASSWORD="your_password" psql -U jy_user -d jy_production -f backup.sql 2>&1 | tee import.log

# 检查错误信息
grep -i error import.log
```

### Q3: 序列设置不正确导致主键冲突

**原因**: 序列未正确重置

**解决方案**:
```bash
# 手动重置所有序列
sudo -u postgres psql -d jy_production << 'EOF'
SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"), true);
SELECT setval('"Role_id_seq"', (SELECT MAX(id) FROM "Role"), true);
-- 为每个表执行相同操作
EOF
```

### Q4: 字符编码问题

**原因**: 数据库或 SQL 文件编码不匹配

**解决方案**:
```bash
# 确保数据库使用 UTF-8
sudo -u postgres psql -c "CREATE DATABASE jy_production ENCODING 'UTF8';"

# 导入时指定编码
PGPASSWORD="your_password" psql -U jy_user -d jy_production --set=client_encoding=utf8 -f backup.sql
```

---

## 手动重新生成备份

如果需要从最新的 SQLite 数据库重新生成 PostgreSQL 备份：

```bash
# 1. 确保开发数据库是最新的
cd backend

# 2. 生成新的备份文件
bash scripts/generate-full-migration.sh

# 3. 新文件位于
ls -lh prisma/migrations_postgres/20250331_init/migration_full.sql

# 4. 复制到 deployment 目录
cp prisma/migrations_postgres/20250331_init/migration_full.sql \
   deployment/jy_production_backup_$(date +%Y%m%d_%H%M%S).sql
```

---

## 技术细节

### SQLite vs PostgreSQL 差异

| 特性 | SQLite | PostgreSQL |
|------|--------|------------|
| 自增主键 | `INTEGER PRIMARY KEY AUTOINCREMENT` | `SERIAL` |
| 时间戳 | `datetime('now')` | `NOW()` |
| 布尔值 | `0/1` | `true/false` |
| 外键 | 支持，默认关闭 | 支持，默认开启 |
| 序列 | 不支持 | 支持 (`SEQUENCE`) |

### 转换脚本工作原理

1. **使用 Prisma Client 读取数据**
   ```javascript
   const prisma = new PrismaClient();
   const users = await prisma.user.findMany();
   ```

2. **生成 PostgreSQL INSERT 语句**
   ```javascript
   sql.push(`INSERT INTO "User" VALUES (${u.id}, '${u.username}', ...);`);
   ```

3. **处理特殊字符**
   - 单引号转义: `'` → `''`
   - NULL 值处理
   - 时间格式转换: ISO 8601

4. **生成序列命令**
   ```javascript
   sql.push(`SELECT setval('"User_id_seq"', (SELECT MAX(id) FROM "User"), true);`);
   ```

---

## 附加说明

- 本项目的数据库迁移是单向的：SQLite → PostgreSQL
- 如需从 PostgreSQL 同步回 SQLite，需要手动编写逆向脚本
- 建议在正式部署前在测试环境验证迁移过程

---

**文档维护**: 系统开发团队
**最后更新**: 2025-05-29
