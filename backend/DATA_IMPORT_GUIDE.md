# 数据库导入说明文档

## 📋 概述

已将SQLite数据库转换为PostgreSQL格式，并修复了时间戳格式问题。

**生成时间**: 2026-06-01 18:24

## 📦 文件说明

### 1. 01-schema.sql (表结构文件)
- **大小**: 83.5 KB
- **内容**: 87个表的完整CREATE TABLE语句
- **包含**: 表结构、字段类型、主键��索引

### 2. 02-data.sql (数据文件)
- **大小**: 775.9 KB
- **内容**: 所有表的完整数据
- **已修复**: 时间戳格式问题

## 🔧 重要修复

### 时间戳格式转换

**问题**: SQLite中的时间戳存储为Unix时间戳（毫秒数），如：`1780215797323`

**解决方案**: 已自动转换为PostgreSQL TIMESTAMP格式：`'2026-06-01 18:09:12'`

**影响的字段**:
- `createdAt` - 创建时间
- `updatedAt` - 更新时间
- `startTime` - 开始时间
- `endTime` - 结束时间
- `reportDate` - 汇报日期
- `productionDate` - 生产日期
- `workDate` - 工作日期
- `effectiveDate` - 生效日期
- `expiryDate` - 失效日期
- `calcDate` - 计算日期

## 🚀 快速导入

### 方法1: 使用postgres用户（推荐）

```bash
# 1. 切换到postgres��户
sudo -u postgres psql

# 2. 创建数据库和用户
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q

# 3. 导入表结构
sudo -u postgres psql -d jy_production -f postgres-export/01-schema.sql

# 4. 导入数据
sudo -u postgres psql -d jy_production -f postgres-export/02-data.sql

# 5. 验证导入
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
# 应该显示: 87
```

### 方法2: 使用普通用户

```bash
# 1. 连接到PostgreSQL
psql -h localhost -U postgres

# 2. 创建数据库和用户（在psql中）
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q

# 3. 设置.pgpass文件（避免密码输入）
echo "localhost:5432:jy_production:jy_user:your_password" > ~/.pgpass
chmod 600 ~/.pgpass

# 4. 导入表结构
psql -h localhost -U jy_user -d jy_production -f postgres-export/01-schema.sql

# 5. 导入数据
psql -h localhost -U jy_user -d jy_production -f postgres-export/02-data.sql

# 6. 验证
psql -h localhost -U jy_user -d jy_production
```

## ✅ 验证清单

导入完成后，执行以下SQL验证：

### 1. 表数量验证

```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 预期结果: 87
```

### 2. 数据统计验证

```sql
SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Employee', COUNT(*) FROM Employee
UNION ALL
SELECT 'LaborAccount', COUNT(*) FROM LaborAccount
UNION ALL
SELECT 'WorkHourResult', COUNT(*) FROM WorkHourResult
UNION ALL
SELECT 'Organization', COUNT(*) FROM Organization
UNION ALL
SELECT 'UserRole', COUNT(*) FROM "UserRole";

-- 预期结果:
-- User: 22
-- Employee: 20
-- LaborAccount: 235
-- WorkHourResult: 113
-- Organization: 12
-- UserRole: 22
```

### 3. 时间戳格式验证

```sql
-- 检查createdAt字段格式
SELECT username, createdAt, updatedAt
FROM "User"
WHERE username = 'admin'
LIMIT 1;

-- 预期格式: 2026-05-21 11:11:54 (不是数字)
```

### 4. 管理员账户验证

```sql
SELECT id, username, name, status
FROM "User"
WHERE username = 'admin';

-- 预期结果:
-- id: 1
-- username: admin
-- name: 系统管理员
-- status: ACTIVE
```

## 🔍 故障排查

### 问题1: 时间戳格式错误

**错误信息**: `ERROR: invalid input syntax for type timestamp`

**原因**: 导入了旧版本的数据文件

**解决**: 使用新生成的数据文件（2026-06-01 18:24）

### 问题2: 表已存在

**错误信息**: `ERROR: relation "xxx" already exists`

**原因**: 重复导入

**解决**:
```bash
sudo -u postgres psql -d jy_production -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

### 问题3: 权限不足

**错误信息**: `ERROR: permission denied for table xxx`

**解决**:
```bash
sudo -u postgres psql
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
GRANT ALL ON SCHEMA public TO jy_user;
```

### 问题4: 序列不同步

**现象**: 插入数据时ID冲突

**解决**: 数据文件已包含序列重置脚本，会自动处理

### 问题5: 字符编码错误

**错误信息**: `ERROR: invalid byte sequence for encoding`

**解决**:
```bash
export PGCLIENTENCODING=UTF8
psql -h localhost -U jy_user -d jy_production -f postgres-export/02-data.sql
```

## 📝 实际导入示例

### Ubuntu/Debian系统

```bash
# 1. 安装PostgreSQL（如果未安装）
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
sudo systemctl start postgresql

# 2. 创建数据库
sudo -u postgres psql << 'EOSQL'
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
EOSQL

# 3. 导入数据（从backend目录）
cd /path/to/JY/backend
sudo -u postgres psql -d jy_production -f postgres-export/01-schema.sql
sudo -u postgres psql -d jy_production -f postgres-export/02-data.sql

# 4. 验证
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### macOS系统

```bash
# 1. 使用Homebrew安装PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# 2. 创建数据库
psql -U postgres << 'EOSQL'
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
EOSQL

# 3. 导入数据
psql -U postgres -d jy_production -f postgres-export/01-schema.sql
psql -U postgres -d jy_production -f postgres-export/02-data.sql
```

## 🔄 重新生成数据文件

如果需要从最新的SQLite数据库重新生成PostgreSQL文件：

```bash
cd /path/to/JY/backend

# 重新生成
python3 convert-db.py

# 验证文件大小
ls -lh postgres-export/

# 预期大小:
# 01-schema.sql: 约83-85 KB
# 02-data.sql: 约775-780 KB
```

## ⚠️ 注意事项

1. **数据覆盖**: schema.sql包含DROP TABLE语句，会删除现有数据
2. **数据清空**: data.sql包含TRUNCATE TABLE语句，会清空表后再插入
3. **备份优先**: 导入前务必备份现有数据
4. **字符编码**: 确保使用UTF-8编码
5. **版本检查**: 确保使用最新生成的文件

## 📊 数据统计

| 表名 | 记录数 | 说明 |
|------|--------|------|
| User | 22 | 用户表 |
| Employee | 20 | 员工表 |
| LaborAccount | 235 | 劳动力账户 |
| WorkHourResult | 113 | 工时结果（已清理） |
| Organization | 12 | 组织架构 |
| UserRole | 22 | 用户角色关系 |
| DataSource | 17 | 数据源定义 |
| DataSourceOption | 88 | 数据源选项 |
| AccountHierarchyConfig | 7 | 账户层级配置 |
| AccountHierarchyLevelDetail | 42 | 账户层级明细 |
| **总计** | **87个表** | **所有业务数据** |

## 🎯 下一步

数据导入完成后：

1. ✅ 更新后端 `.env` 配置
2. ✅ 重新生成Prisma客户端
3. ✅ 构建并启动后端服务
4. ✅ 使用admin/admin123登录测试

详见: `PRODUCTION_DEPLOYMENT_GUIDE.md`

---

**文档版本**: 1.0
**生成时间**: 2026-06-01 18:24
**状态**: ✅ 时间戳格式已修复
