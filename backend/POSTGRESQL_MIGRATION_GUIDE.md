# 精益工时管理系统 - SQLite 到 PostgreSQL 数据库迁移指南

## 📋 迁移概述

本文档详细说明了如何将开发环境的 SQLite 数据库完整迁移到生产环境的 PostgreSQL 数据库。

### 迁移信息

| 项目 | 内容 |
|------|------|
| **源数据库** | SQLite 3 |
| **源文件** | `backend/prisma/dev.db` (1.6MB) |
| **目标数据库** | PostgreSQL 12+ |
| **表数量** | 87 张表 |
| **数据行数** | 880+ 条记录 |
| **迁移文件** | `jy_production_complete_20260529_125652.sql` (534KB) |

## 📦 文件说明

### 1. 迁移脚本
- **文件**: `migrate_sqlite_to_postgres.py`
- **功能**: 从 SQLite 数据库导出完整数据并转换为 PostgreSQL 格式
- **特点**:
  - ✅ 完整导出 87 张表结构
  - ✅ 完整导出所有数据
  - ✅ 自动处理数据类型转换
  - ✅ 处理主键、外键约束
  - ✅ 处理特殊字符转义
  - ✅ 生成 PostgreSQL 兼容的 SQL

### 2. 迁移输出文件
- **文件**: `jy_production_complete_20260529_125652.sql`
- **位置**: `backend/` 和 `deployment/` 目录
- **内容**:
  - 87 个 CREATE TABLE 语句
  - 880 条 INSERT 语句
  - 完整的表结构和数据

## 🚀 迁移步骤

### 步骤 1: 准备 PostgreSQL 环境

#### 1.1 安装 PostgreSQL（如未安装）

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 1.2 验证 PostgreSQL 运行

```bash
sudo systemctl status postgresql
psql --version
```

### 步骤 2: 创建数据库和用户

```bash
# 以 postgres 用户登录
sudo -u postgres psql

# 执行以下 SQL 命令
-- 创建数据库
CREATE DATABASE jy_production;

-- 创建用户
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';

-- 授权
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
GRANT ALL ON SCHEMA public TO jy_user;
ALTER DATABASE jy_production OWNER TO jy_user;

-- 退出
\q
```

或者使用部署脚本（推荐）：

```bash
cd ../deployment
sudo ./setup-database.sh -f jy_production_complete_20260529_125652.sql
```

### 步骤 3: 上传迁移文件到服务器

```bash
# 将 SQL 文件上传到服务器
scp jy_production_complete_20260529_125652.sql user@server:/path/to/deployment/
```

### 步骤 4: 执行数据库导入

#### 方法 1: 使用 psql 命令行

```bash
# 设置环境变量（避免每次输入密码）
export PGPASSWORD='your_strong_password_here'

# 导入数据
psql -U jy_user -d jy_production -h localhost -f jy_production_complete_20260529_125652.sql

# 或者在一行中完成
PGPASSWORD='your_strong_password_here' psql -U jy_user -d jy_production -h localhost -f jy_production_complete_20260529_125652.sql
```

#### 方法 2: 使用管道

```bash
PGPASSWORD='your_strong_password_here' psql -U jy_user -d jy_production -h localhost < jy_production_complete_20260529_125652.sql
```

#### 方法 3: 交互式导入

```bash
psql -U jy_user -d jy_production -h localhost
\i jy_production_complete_20260529_125652.sql
\q
```

### 步骤 5: 验证导入结果

#### 5.1 检查表数量

```bash
PGPASSWORD='your_password' psql -U jy_user -d jy_production -h localhost -tAc "
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';
"
```

**预期结果**: 87

#### 5.2 检查数据行数

```bash
PGPASSWORD='your_password' psql -U jy_user -d jy_production -h localhost << EOF
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns,
    pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF
```

#### 5.3 检查关键表数据

```bash
PGPASSWORD='your_password' psql -U jy_user -d jy_production -h localhost << EOF
-- 检查用户表
SELECT COUNT(*) as "User表行数" FROM "User";

-- 检查角色表
SELECT COUNT(*) as "Role表行数" FROM "Role";

-- 检查组织表
SELECT COUNT(*) as "Organization表行数" FROM "Organization";

-- 检查员工表
SELECT COUNT(*) as "Employee表行数" FROM "Employee";

-- 检查考勤记录表
SELECT COUNT(*) as "PunchRecord表行数" FROM "PunchRecord";
EOF
```

#### 5.4 使用验证脚本

```bash
./verify-migration.sh
```

## 🔍 数据类型转换说明

迁移脚本已自动处理以下数据类型转换：

| SQLite 类型 | PostgreSQL 类型 | 说明 |
|-------------|-----------------|------|
| INTEGER PRIMARY KEY | SERIAL | 自增主键 |
| INTEGER | INTEGER | 整数 |
| TEXT | TEXT | 文本 |
| REAL | DOUBLE PRECISION | 浮点数 |
| BLOB | BYTEA | 二进制数据 |
| DATETIME | TIMESTAMP | 日期时间 |
| BOOLEAN | BOOLEAN | 布尔值 |
| NUMERIC | NUMERIC | 精确数值 |
| VARCHAR | TEXT | 变长字符串 |

## ⚠️ 注意事项

### 1. 字符编码
- 确保 PostgreSQL 数据库使用 UTF-8 编码
- 迁移文件已设置 `SET client_encoding = 'UTF8'`

### 2. 主键序列
- PostgreSQL 使用 SERIAL 类型自动创建序列
- 迁移后无需手动调整序列值

### 3. 外键约束
- 如果有外键约束，确保按正确顺序导入表
- 迁移文件使用事务保证数据一致性

### 4. 索引
- 需要手动创建索引以提升性能
- 建议在导入完成后再创建索引

### 5. 权限
- 确保数据库用户有足够的权限
- 需要 CREATE, INSERT, SELECT, UPDATE, DELETE 权限

## 🛠️ 常见问题处理

### 问题 1: 连接数据库失败

```bash
# 错误: connection refused
# 解决: 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 错误: password authentication failed
# 解决: 检查 pg_hba.conf 配置
sudo nano /etc/postgresql/*/main/pg_hba.conf
# 确保: host    all    all    127.0.0.1/32    md5
sudo systemctl restart postgresql
```

### 问题 2: 导入时表已存在

```bash
# 删除现有数据库并重新创建
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS jy_production;
CREATE DATABASE jy_production;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
EOF
```

### 问题 3: 权限不足

```bash
# 授予完整权限
sudo -u postgres psql << EOF
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
GRANT ALL ON SCHEMA public TO jy_user;
ALTER DATABASE jy_production OWNER TO jy_user;
\c jy_production
GRANT ALL ON ALL TABLES IN SCHEMA public TO jy_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO jy_user;
EOF
```

### 问题 4: 内存不足

```bash
# 调整 PostgreSQL 内存配置
sudo nano /etc/postgresql/*/main/postgresql.conf

# 设置以下参数
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 128MB
work_mem = 16MB

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

## 🔄 回滚方案

如果迁移出现问题，可以按以下步骤回滚：

### 1. 删除数据库

```bash
sudo -u postgres psql << EOF
DROP DATABASE IF EXISTS jy_production;
EOF
```

### 2. 重新创建

```bash
sudo -u postgres psql << EOF
CREATE DATABASE jy_production;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
EOF
```

### 3. 重新导入

```bash
PGPASSWORD='your_password' psql -U jy_user -d jy_production -h localhost -f jy_production_complete_20260529_125652.sql
```

## 📊 迁移验证清单

- [ ] PostgreSQL 服务正常运行
- [ ] 数据库和用户创建成功
- [ ] SQL 文件上传到服务器
- [ ] 数据导入成功（无错误信息）
- [ ] 表数量为 87 张
- [ ] 关键表数据完整
- [ ] 应用程序连接数据库成功
- [ ] 基本功能测试通过

## 🎯 下一步

### 1. 配置应用程序

更新 `.env.production` 文件：

```env
# 数据库连接
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"
```

### 2. 生成 Prisma Client

```bash
cd backend
npm run prisma:generate
```

### 3. 启动应用程序

```bash
npm run build
npm run start:prod
```

### 4. 功能测试

- 用户登录测试
- 员工管理测试
- 考勤记录测试
- 工时报表测试

## 📞 技术支持

如遇到问题，请检查：

1. **PostgreSQL 日志**: `/var/log/postgresql/`
2. **应用程序日志**: 查看应用输出
3. **数据库状态**: `sudo -u postgres psql -c "SELECT version();"`

---

**迁移完成时间**: 2026-05-29 12:56:52
**文档版本**: 1.0
**维护人员**: 系统管理员
