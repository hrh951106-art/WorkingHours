# PostgreSQL 生产环境部署指南

**文档版本**: 1.0.0
**创建日期**: 2025-03-31
**数据库**: PostgreSQL 12+
**适用环境**: 生产环境

---

## 📋 目录

1. [系统要求](#系统要求)
2. [PostgreSQL 安装](#postgresql-安装)
3. [数据库配置](#数据库配置)
4. [应用迁移](#应用迁移)
5. [性能优化](#性能优化)
6. [备份与恢复](#备份与恢复)
7. [监控与维护](#监控与维护)
8. [安全配置](#安全配置)

---

## 系统要求

### 最低配置

- **CPU**: 2 核
- **内存**: 4GB
- **磁盘**: 20GB 可用空间（SSD 推荐）
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 7+, RHEL 7+)

### 推荐配置（生产环境）

- **CPU**: 4 核以上
- **内存**: 8GB 以上
- **磁盘**: 100GB 以上 SSD
- **操作系统**: Ubuntu 22.04 LTS

---

## PostgreSQL 安装

### Ubuntu/Debian

```bash
# 1. 安装 PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib -y

# 2. 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 3. 验证安装
sudo -u postgres psql --version
```

### CentOS/RHEL

```bash
# 1. 安装 PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y

# 2. 初始化数据库
sudo postgresql-setup initdb

# 3. 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Docker 部署（推荐）

```bash
# 拉取 PostgreSQL 镜像
docker pull postgres:15-alpine

# 运行容器
docker run --name jy-postgres \
  -e POSTGRES_USER=jy_user \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=jy_production \
  -p 5432:5432 \
  -v jy-postgres-data:/var/lib/postgresql/data \
  --restart unless-stopped \
  -d postgres:15-alpine

# 验证运行状态
docker ps | grep jy-postgres
```

---

## 数据库配置

### 1. 创建数据库和用户

```bash
# 连接到 PostgreSQL
sudo -u postgres psql

# 执行以下 SQL 命令
CREATE USER jy_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE jy_production OWNER jy_user;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
```

### 2. 配置环境变量

创建 `.env.production` 文件：

```bash
cd /path/to/JY/backend
cp .env.production.example .env.production
vi .env.production
```

修改数据库连接字符串：

```env
DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production?schema=public&connection_limit=10"
```

### 3. 测试连接

```bash
# 使用 psql 测试
psql -U jy_user -d jy_production -h localhost

# 或使用 Prisma
npx prisma db push --print
```

---

## 应用迁移

### 步骤1: 拉取代码

```bash
cd /path/to/JY/backend
git pull origin main
```

### 步骤2: 安装依赖

```bash
npm ci
```

### 步骤3: 安装 PostgreSQL 客户端库

```bash
# Ubuntu/Debian
sudo apt install libpq-dev -y

# CentOS/RHEL
sudo yum install postgresql-devel -y

# macOS
brew install postgresql
```

### 步骤4: 生成 Prisma 客户端

```bash
export DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production?schema=public"
npx prisma generate
```

### 步骤5: 应用数据库迁移

```bash
# 方式1: 使用 Prisma Migrate（推荐）
npx prisma migrate deploy

# 预期输出:
# Environment variables loaded from .env
# Prisma schema loaded from prisma/schema.prisma
# Datasource "db": PostgreSQL database "jy_production" at "localhost:5432"
#
# 1 migration found in prisma/migrations
#
# The following migration(s) have been applied:
#
# migrations_postgres/20250331_init/migration.sql
```

### 步骤6: 初始化种子数据

```bash
npm run prisma:seed:all
```

### 步骤7: 验证迁移

```bash
# 检查表数量
psql -U jy_user -d jy_production -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';"
# 预期输出: 49

# 检查用户数据
psql -U jy_user -d jy_production -c "SELECT username, name, status FROM \"User\";"

# 检查数据库大小
psql -U jy_user -d jy_production -c "SELECT pg_size_pretty(pg_database_size('jy_production'));"
```

### 步骤8: 构建并启动应用

```bash
# 构建应用
npm run build

# 启动服务
pm2 start dist/main.js --name jy-backend

# 查看日志
pm2 logs jy-backend
```

---

## 性能优化

### 1. PostgreSQL 配置优化

编辑 `/etc/postgresql/15/main/postgresql.conf`:

```conf
# 内存配置
shared_buffers = 256MB              # 总内存的 25%
effective_cache_size = 1GB          # 总内存的 50-75%
work_mem = 16MB                     # 单个操作内存
maintenance_work_mem = 128MB

# 连接配置
max_connections = 100
superuser_reserved_connections = 3

# 查询优化
random_page_cost = 1.1              # SSD 使用 1.1
effective_io_concurrency = 200      # SSD 并发 I/O

# WAL 配置
wal_buffers = 16MB
min_wal_size = 1GB
max_wal_size = 4GB
checkpoint_completion_target = 0.9

# 日志配置
log_min_duration_statement = 1000   # 记录慢查询（>1s）
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_duration = off
```

重载配置：
```bash
sudo systemctl reload postgresql
```

### 2. 索引优化

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 创建常用查询索引
CREATE INDEX CONCURRENTLY idx_employee_org ON "Employee"("orgId");
CREATE INDEX CONCURRENTLY idx_employee_status ON "Employee"("status");
CREATE INDEX CONCURRENTLY idx_calc_result_date ON "CalcResult"("calcDate");
CREATE INDEX CONCURRENTLY idx_punch_record_time ON "PunchRecord"("punchTime");
```

### 3. 连接池配置（PgBouncer）

```bash
# 安装 PgBouncer
sudo apt install pgbouncer -y

# 配置 PgBouncer
sudo vi /etc/pgbouncer/pgbouncer.ini
```

添加配置：
```ini
[databases]
jy_production = host=localhost port=5432 dbname=jy_production

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 50
reserve_pool_size = 10
reserve_pool_timeout = 3
server_lifetime = 3600
server_idle_timeout = 600
```

修改 `.env.production`:
```env
DATABASE_URL="postgresql://jy_user:password@localhost:6432/jy_production?schema=public&pgbouncer=true"
```

---

## 备份与恢复

### 1. 备份策略

#### 每日自动备份（Cron）

创建备份脚本 `/usr/local/bin/backup-jy-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/jy-postgres"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="jy_production"
DB_USER="jy_user"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U $DB_USER -d $DB_NAME -F c -b -v -f $BACKUP_DIR/jy_db_$DATE.dump

# 压缩备份
gzip $BACKUP_DIR/jy_db_$DATE.dump

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +30 -delete

echo "Backup completed: jy_db_$DATE.dump.gz"
```

设置定时任务：
```bash
# 编辑 crontab
crontab -e

# 添加每日凌晨 2 点执行
0 2 * * * /usr/local/bin/backup-jy-db.sh >> /var/log/jy-backup.log 2>&1
```

### 2. 恢复数据库

```bash
# 从备份恢复
pg_restore -U jy_user -d jy_production -v /path/to/backup/jy_db_YYYYMMDD_HHMMSS.dump.gz

# 或创建新数据库恢复
createdb -U jy_user jy_restore
pg_restore -U jy_user -d jy_restore -v /path/to/backup/jy_db_YYYYMMDD_HHMMSS.dump.gz
```

### 3. 在线备份（WAL 归档）

配置 WAL 归档：
```conf
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'cp %p /wal_archive/%f'
max_wal_senders = 3
```

---

## 监控与维护

### 1. 安装监控工具

```bash
# 安装 pg_stat_statements
sudo apt install postgresql-15-pg-stat-statements

# 启用扩展
psql -U postgres -d jy_production -c "CREATE EXTENSION pg_stat_statements;"
```

### 2. 性能监控查询

```sql
-- 查看慢查询
SELECT calls, total_exec_time, mean_exec_time, query
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 查看表大小
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 查看索引使用情况
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

-- 查看数据库连接
SELECT
  datname,
  numbackends,
  xact_commit,
  xact_rollback
FROM pg_stat_database
WHERE datname = 'jy_production';
```

### 3. 定期维护任务

```bash
# 每周执行 VACUUM ANALYZE
0 3 * * 0 psql -U jy_user -d jy_production -c "VACUUM ANALYZE;"

# 每月重建索引
0 4 1 * * psql -U jy_user -d jy_production -c "REINDEX DATABASE jy_production;"
```

### 4. 监控指标

关键指标监控：
- 数据库连接数
- 查询响应时间
- 慢查询数量
- 缓存命中率
- 磁盘 I/O
- 锁等待情况

---

## 安全配置

### 1. 网络安全

编辑 `/etc/postgresql/15/main/pg_hba.conf`:

```conf
# TYPE  DATABASE        USER            ADDRESS                 METHOD

# 本地连接
local   all             postgres                                peer
local   all             jy_user                                 md5

# IPv4 本地连接
host    jy_production   jy_user         127.0.0.1/32            md5
host    jy_production   jy_user         10.0.0.0/8              md5

# 拒绝其他连接
host    all             all             0.0.0.0/0               reject
```

重载配置：
```bash
sudo systemctl reload postgresql
```

### 2. 用户权限

```sql
-- 创建只读用户（用于报表查询）
CREATE USER jy_readonly WITH PASSWORD 'readonly_password';
GRANT CONNECT ON DATABASE jy_production TO jy_readonly;
GRANT USAGE ON SCHEMA public TO jy_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jy_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO jy_readonly;

-- 创建备份用户
CREATE USER jy_backup WITH PASSWORD 'backup_password';
GRANT CONNECT ON DATABASE jy_production TO jy_backup;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO jy_backup;
```

### 3. SSL/TLS 加密

生成 SSL 证书：
```bash
sudo openssl req -new -x509 -days 365 -nodes \
  -out /var/lib/postgresql/15/main/server.crt \
  -keyout /var/lib/postgresql/15/main/server.key
```

配置 SSL：
```conf
# postgresql.conf
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
ssl_prefer_server_ciphers = on
ssl_ciphers = 'HIGH:MEDIUM:+3:!aNULL'
```

修改连接字符串：
```env
DATABASE_URL="postgresql://jy_user:password@localhost:5432/jy_production?schema=public&sslmode=require"
```

---

## 故障排查

### 常见问题

**问题1: 连接被拒绝**
```bash
# 检查服务状态
sudo systemctl status postgresql

# 检查端口监听
sudo netstat -tlnp | grep 5432

# 查看错误日志
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

**问题2: 性能问题**
```sql
-- 查看当前运行的查询
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state = 'active'
ORDER BY duration DESC;

-- 终止长时间运行的查询
SELECT pg_cancel_backend(<pid>);
-- 或强制终止
SELECT pg_terminate_backend(<pid>);
```

**问题3: 磁盘空间不足**
```bash
# 检查数据库大小
psql -U postgres -c "SELECT pg_database.datname, pg_size_pretty(pg_database_size(pg_database.datname)) FROM pg_database;"

# 清理 WAL 文件
sudo -u postgres psql -c "CHECKPOINT;"
```

---

## 附录

### A. 快速部署脚本

```bash
#!/bin/bash
# quick-deploy-postgres.sh

set -e

echo "=== PostgreSQL 生产环境快速部署 ==="

# 配置变量
DB_NAME="jy_production"
DB_USER="jy_user"
DB_PASSWORD=$(openssl rand -base64 32)

# 1. 安装 PostgreSQL
echo "安装 PostgreSQL..."
sudo apt update && sudo apt install -y postgresql postgresql-contrib libpq-dev

# 2. 创建数据库和用户
echo "创建数据库和用户..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# 3. 配置环境变量
echo "配置环境变量..."
cat >> .env.production << EOF
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME?schema=public&connection_limit=10"
EOF

# 4. 应用迁移
echo "应用数据库迁移..."
npx prisma migrate deploy

# 5. 初始化数据
echo "初始化种子数据..."
npm run prisma:seed:all

echo "=== 部署完成 ==="
echo "数据库密码: $DB_PASSWORD"
echo "请妥善保存密码！"
```

### B. 性能基准测试

```bash
# 使用 pgbench 进行性能测试
sudo apt install postgresql-contrib -y

# 初始化测试数据
pgbench -i -s 50 -U jy_user jy_production

# 运行基准测试
pgbench -c 10 -j 2 -t 1000 -U jy_user jy_production
```

### C. 有用的资源

- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)
- [Prisma PostgreSQL 文档](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PgBouncer 文档](https://www.pgbouncer.org/usage.html)
- [PostgreSQL 监控最佳实践](https://wiki.postgresql.org/wiki/Performance_Optimization)

---

**文档版本**: 1.0.0
**更新日期**: 2025-03-31
**维护者**: 系统管理团队
