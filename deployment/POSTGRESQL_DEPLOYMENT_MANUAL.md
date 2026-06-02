# PostgreSQL 生产环境部署操作手册

## 📋 文档信息

| 项目 | 说明 |
|------|------|
| **文档版本** | v1.0.0 |
| **适用环境** | PostgreSQL 12+, Prisma 5.x |
| **部署目标** | 生产环境首次部署 |
| **预计时间** | 30-60分钟 |
| **难度等级** | 中等 |

## 📖 目录

1. [部署前准备](#1-部署前准备)
2. [环境配置](#2-环境配置)
3. [数据库部署](#3-数据库部署)
4. [应用部署](#4-应用部署)
5. [数据验证](#5-数据验证)
6. [安全加固](#6-安全加固)
7. [故障排除](#7-故障排除)
8. [附录](#8-附录)

---

## 1. 部署前准备

### 1.1 系统要求

#### 硬件要求
- **CPU**: 2核心及以上
- **内存**: 4GB及以上
- **磁盘**: 20GB及以上可用空间
- **网络**: 稳定的网络连接

#### 软件要求
- **操作系统**: Linux/macOS/Windows
- **Node.js**: v16.x 或更高版本
- **PostgreSQL**: 12.x 或更高版本
- **Git**: 用于代码管理

### 1.2 检查清单

在开始部署前，请确认：

- [ ] 已安装PostgreSQL数据库
- [ ] 已安装Node.js和npm
- [ ] 有数据库管理员权限
- [ ] 已准备好数据库密码
- [ ] 已准备好JWT密钥
- [ ] 有足够的磁盘空间
- [ ] 网络连接正常

### 1.3 快速环境检查

```bash
# 检查PostgreSQL版本
psql --version
# 预期输出: psql (PostgreSQL) 12.x 或更高

# 检查Node.js版本
node --version
# 预期输出: v16.x 或更高

# 检查npm版本
npm --version
# 预期输出: 8.x 或更高

# 检查磁盘空间
df -h
# 确保有足够空间
```

---

## 2. 环境配置

### 2.1 获取代码

```bash
# 进入工作目录
cd /path/to/your/workspace

# 如果代码还未克隆，执行克隆
git clone <your-repository-url> JY-backend
cd JY-backend

# 如果已有代码，拉取最新版本
cd JY-backend
git pull origin main
```

### 2.2 验证项目结构

```bash
# 查看项目结构
ls -la

# 确认以下目录存在：
# - backend/          (后端代码)
# - backend/prisma/   (Prisma配置)
# - deployment/       (部署脚本)
```

### 2.3 安装依赖

```bash
# 进入后端目录
cd backend

# 安装Node.js依赖
npm install

# 验证安装
npm list --depth=0
```

### 2.4 验证Prisma配置

```bash
cd prisma

# 检查schema.prisma文件
head -10 schema.prisma

# 确认provider为postgresql
# datasource db {
#   provider = "postgresql"
#   url      = env("DATABASE_URL")
# }
```

⚠️ **如果provider仍为"sqlite"，执行：**
```bash
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' schema.prisma
```

---

## 3. 数据库部署

### 3.1 创建PostgreSQL数据库

#### 步骤3.1.1: 连接到PostgreSQL

```bash
# 方法1: 使用psql命令行
psql -U postgres

# 方法2: 使用指定主机和端口
psql -h localhost -p 5432 -U postgres
```

#### 步骤3.1.2: 创建数据库

在PostgreSQL命令行中执行：

```sql
-- 1. 创建数据库
CREATE DATABASE jy_production
  ENCODING 'UTF8'
  LC_COLLATE='en_US.UTF-8'
  LC_CTYPE='en_US.UTF-8'
  TEMPLATE template0;

-- 2. 创建专用用户（推荐）
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_secure_password';

-- 3. 授予所有权限
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;

-- 4. 退出
\q
```

**⚠️ 密码安全提示：**
- 使用强密码（至少12位，包含大小写字母、数字、特殊字符）
- 不要使用默认密码
- 记录密码并妥善保管

#### 步骤3.1.3: 验证数据库创建

```bash
# 列出所有数据库
psql -U postgres -l

# 应该能看到 jy_production 数据库
```

### 3.2 配置环境变量

#### 步骤3.2.1: 创建.env.production文件

```bash
cd backend

cat > .env.production << 'EOF'
# =============================================
# PostgreSQL 生产环境配置
# =============================================

# 数据库连接字符串
# 格式: postgresql://用户名:密码@主机:端口/数据库名?schema=public
DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production?schema=public"

# =============================================
# 应用配置
# =============================================

# 运行环境
NODE_ENV="production"

# 服务端口
PORT="3000"

# JWT密钥（请修改为随机字符串）
JWT_SECRET="your_jwt_secret_please_change_this_in_production_minimum_32_characters"

# =============================================
# 可选配置
# =============================================

# 日志级别 (DEBUG, INFO, WARN, ERROR)
LOG_LEVEL="INFO"

# CORS配置
CORS_ORIGIN="https://your-frontend-domain.com"

# 文件上传限制（MB）
MAX_FILE_SIZE=10
EOF
```

#### 步骤3.2.2: 生成JWT密钥

```bash
# 方法1: 使用随机字符串
openssl rand -base64 32

# 方法2: 使用Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# 将生成的密钥替换到 .env.production 中的 JWT_SECRET
```

#### 步骤3.2.3: 设置文件权限

```bash
# 设置.env.production权限为只有所有者可读写
chmod 600 .env.production

# 验证权限
ls -la .env.production
# 应该显示: -rw------- (600)
```

### 3.3 生成Prisma客户端

```bash
cd backend

# 清理旧的客户端
rm -rf node_modules/.prisma

# 生成新的客户端
npx prisma generate

# 验证生成
ls -la node_modules/.prisma/client
```

**预期输出：**
```
✔ Generated Prisma Client (5.x.x) to ./node_modules/.prisma/client
```

### 3.4 创建数据库迁移

#### 方法A: 使用migrate dev（推荐）

```bash
cd backend

# 设置环境变量
export DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production"

# 创建迁移
npx prisma migrate dev --name init_postgresql

# 预期输出:
# ✔ Generating Prisma Client...
# ✓ Migration created successfully
```

#### 方法B: 使用migrate deploy（生产环境）

```bash
cd backend

# 设置环境变量
export DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production"

# 应用所有迁移
npx prisma migrate deploy

# 预期输出:
# ✔ Generated Prisma Client...
# ✓ 1 migration found and applied
```

#### 方法C: 使用db push（快速但无版本控制）

```bash
cd backend

# 设置环境变量
export DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production"

# 直接推送schema
npx prisma db push

# 预期输出:
# ✔ Generated Prisma Client...
# ✓ The database is now in sync with the schema
```

**⚠️ 注意：**
- `migrate dev`: 创建迁移文件，适合开发环境
- `migrate deploy`: 应用已有迁移，适合生产环境
- `db push`: 直接同步schema，无版本控制，适合快速部署

### 3.5 验证数据库表结构

```bash
# 连接到数据库
psql -U jy_user -d jy_production

# 检查表数量
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 预期结果: 87

# 检查关键表是否存在
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('User', 'Employee', 'Organization', 'DataSource', 'WorkflowInstance')
ORDER BY table_name;
-- 应该显示所有5个表

# 退出
\q
```

---

## 4. 应用部署

### 4.1 导入种子数据

#### 步骤4.1.1: 使用部署脚本（推荐）

```bash
cd deployment

# 执行种子数据部署脚本
./seed-data-deploy.sh production

# 或者指定数据库连接参数
export DB_USER=jy_user
export DB_PASSWORD=your_secure_password
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=jy_production
./seed-data-deploy.sh production
```

#### 步骤4.1.2: 手动导入种子数据

```bash
cd deployment

# 直接使用psql导入
psql -U jy_user -d jy_production \
  -f postgresql-seed-data.sql

# 或者从管道导入
cat postgresql-seed-data.sql | \
  psql -U jy_user -d jy_production
```

**预期输出：**
```
BEGIN
INSERT 0 1
...
COMMIT
```

### 4.2 验证种子数据导入

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 1. 验证数据源（应该是19个）
SELECT COUNT(*) as data_source_count FROM "DataSource";
-- 预期: 19

-- 2. 验证用户（应该是2个）
SELECT username, name, status FROM "User";
-- 预期:
--  username  |     name     | status
-- -----------+--------------+--------
--  admin     | 系统管理员   | ACTIVE
--  hr_admin  | HR管理员     | ACTIVE

-- 3. 验证角色（应该是2个）
SELECT code, name FROM "Role";
-- 预期:
--  code      |     name
-- -----------+--------------
--  ADMIN     | 系统管理员
--  HR_ADMIN  | HR管理员

-- 4. 验证组织（应该是3个）
SELECT code, name, type FROM "Organization" ORDER BY sort;
-- 预期:
--  code |     name      |   type
-- -------+---------------+----------
--  ROOT  | 集团总部      | GROUP
--  TECH  | 技术部        | DEPARTMENT
--  HR    | 人力资源部    | DEPARTMENT

-- 5. 验证人事页签（应该是5个）
SELECT code, name FROM "EmployeeInfoTab" ORDER BY sort;
-- 预期:
--  code         |     name
-- --------------+---------------
--  basic_info   | 基本信息
--  work_info    | 工作信息
--  education_info | 学历信息
--  work_experience | 工作经历
--  family_info  | 家庭信息

-- 6. 退出
\q
```

### 4.3 启动应用

#### 步骤4.3.1: 开发模式启动（测试）

```bash
cd backend

# 加载生产环境变量
export $(cat .env.production | xargs)

# 启动应用
npm run dev

# 或使用nodemon
npm run start:dev
```

**预期输出：**
```
✅ Server is running on port 3000
✅ Connected to PostgreSQL database: jy_production
✅ Environment: production
```

#### 步骤4.3.2: 生产模式启动

```bash
cd backend

# 构建应用
npm run build

# 使用PM2启动（推荐）
npm install -g pm2
pm2 start npm --name "jy-backend" -- start production

# 或直接启动
NODE_ENV=production npm start
```

#### 步骤4.3.3: 使用PM2管理进程

```bash
# 安装PM2
npm install -g pm2

# 创建ecosystem配置
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: './dist/main.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs jy-backend

# 查看详细信息
pm2 show jy-backend
```

### 4.4 配置反向代理（可选）

#### 使用Nginx

```bash
# 创建Nginx配置
cat > /etc/nginx/sites-available/jy-backend << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/jy-backend /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启Nginx
sudo systemctl restart nginx
```

---

## 5. 数据验证

### 5.1 完整性检查

#### 步骤5.1.1: 数据库结构验证

```bash
psql -U jy_user -d jy_production

-- 1. 表数量验证
SELECT
    'Total Tables' as metric,
    COUNT(*) as value
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT
    'Total Columns',
    COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'public'
UNION ALL
SELECT
    'Total Indexes',
    COUNT(*)
FROM pg_indexes
WHERE schemaname = 'public'
UNION ALL
SELECT
    'Total Foreign Keys',
    COUNT(*)
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';

-- 预期结果:
--   metric              | value
--  ---------------------+-------
--   Total Tables         |    87
--   Total Columns        |   500+
--   Total Indexes        |   150+
--   Total Foreign Keys   |   100+
```

#### 步骤5.1.2: 关键表数据验证

```sql
-- 验证所有核心数据
SELECT
    'DataSource' as table_name,
    COUNT(*) as row_count
FROM "DataSource"
UNION ALL
SELECT 'DataSourceOption', COUNT(*) FROM "DataSourceOption"
UNION ALL
SELECT 'User', COUNT(*) FROM "User"
UNION ALL
SELECT 'Role', COUNT(*) FROM "Role"
UNION ALL
SELECT 'UserRole', COUNT(*) FROM "UserRole"
UNION ALL
SELECT 'Organization', COUNT(*) FROM "Organization"
UNION ALL
SELECT 'Employee', COUNT(*) FROM "Employee"
UNION ALL
SELECT 'EmployeeInfoTab', COUNT(*) FROM "EmployeeInfoTab"
UNION ALL
SELECT 'EmployeeInfoTabGroup', COUNT(*) FROM "EmployeeInfoTabGroup"
UNION ALL
SELECT 'EmployeeInfoTabField', COUNT(*) FROM "EmployeeInfoTabField"
UNION ALL
SELECT 'Shift', COUNT(*) FROM "Shift"
UNION ALL
SELECT 'ShiftSegment', COUNT(*) FROM "ShiftSegment"
UNION ALL
SELECT 'PunchDevice', COUNT(*) FROM "PunchDevice";

-- 预期结果:
--  table_name                | row_count
-- ---------------------------+-----------
--  DataSource                 |         19
--  DataSourceOption           |        100+
--  User                       |          2
--  Role                       |          2
--  UserRole                   |          2
--  Organization               |          3
--  Employee                   |          2
--  EmployeeInfoTab            |          5
--  EmployeeInfoTabGroup       |          6
--  EmployeeInfoTabField       |         33
--  Shift                      |          1
--  ShiftSegment               |          3
--  PunchDevice                |          1
```

### 5.2 功能验证

#### 步骤5.2.1: API测试

```bash
# 测试健康检查端点
curl http://localhost:3000/health

# 预期响应:
# {"status":"ok","timestamp":"2026-06-02T...","database":"connected"}

# 测试登录API
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'

# 预期响应: 包含token的JSON对象
```

#### 步骤5.2.2: 数据查询测试

```bash
# 获取数据源列表
curl -X GET http://localhost:3000/api/datasources \
  -H "Authorization: Bearer YOUR_TOKEN"

# 预期: 返回19个数据源的列表

# 获取组织结构
curl -X GET http://localhost:3000/api/organizations \
  -H "Authorization: Bearer YOUR_TOKEN"

# 预期: 返回组织树结构
```

### 5.3 性能验证

#### 步骤5.3.1: 数据库性能测试

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 1. 测试查询性能
EXPLAIN ANALYZE
SELECT u.*, r.*
FROM "User" u
LEFT JOIN "UserRole" ur ON ur."userId" = u.id
LEFT JOIN "Role" r ON r.id = ur."roleId"
WHERE u.status = 'ACTIVE';

-- 2. 检查慢查询
SELECT
    query,
    calls,
    total_time,
    mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- 3. 检查表大小
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;
```

#### 步骤5.3.2: 应用性能测试

```bash
# 使用Apache Bench进行压力测试
ab -n 1000 -c 10 http://localhost:3000/api/health

# 预期结果:
# - Requests per second: 100+
# - Time per request: 100ms以下

# 使用wrk进行测试
wrk -t4 -c100 -d30s --latency http://localhost:3000/api/health
```

---

## 6. 安全加固

### 6.1 修改默认密码

#### 步骤6.1.1: 生成新密码哈希

```bash
cd backend

# 使用Node.js生成bcrypt哈希
node -e "
const bcrypt = require('bcrypt');
const password = 'your_new_secure_password';
const hash = bcrypt.hashSync(password, 10);
console.log('Password Hash:', hash);
"

# 复制输出的哈希值
```

#### 步骤6.1.2: 更新数据库

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 更新admin密码
UPDATE "User"
SET password = '$2b$10$...' -- 使用上面生成的哈希值
WHERE username = 'admin';

-- 更新hr_admin密码
UPDATE "User"
SET password = '$2b$10$...' -- 使用上面生成的哈希值
WHERE username = 'hr_admin';

-- 验证更新
SELECT username, name FROM "User";
```

### 6.2 删除示例数据

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 软删除示例员工（如果有）
UPDATE "Employee"
SET status = 'DELETED',
"updatedAt" = NOW()
WHERE "employeeNo" IN ('EMP001', 'EMP002');

-- 验证
SELECT "employeeNo", name, status FROM "Employee";
```

### 6.3 配置防火墙

```bash
# 使用ufw（Ubuntu/Debian）
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp # 应用端口（如果直接暴露）
sudo ufw enable

# 使用firewalld（CentOS/RHEL）
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 6.4 配置SSL/TLS

#### 使用Let's Encrypt

```bash
# 安装certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

#### 配置PostgreSQL SSL

```sql
-- 修改PostgreSQL配置
-- 编辑 postgresql.conf
ssl = on
ssl_cert_file = '/etc/ssl/certs/ssl-cert-snakeoil.pem'
ssl_key_file = '/etc/ssl/private/ssl-cert-snakeoil.key'

-- 重启PostgreSQL
sudo systemctl restart postgresql
```

### 6.5 配置数据库备份

```bash
# 创建备份脚本
cat > /usr/local/bin/backup-jy-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/jy"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jy_production_$DATE.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
pg_dump -U jy_user -h localhost -d jy_production > $BACKUP_FILE

# 压缩备份
gzip $BACKUP_FILE

# 删除7天前的备份
find $BACKUP_DIR -name "*.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE.gz"
EOF

chmod +x /usr/local/bin/backup-jy-db.sh

# 添加到crontab（每天凌晨2点备份）
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-jy-db.sh") | crontab -
```

---

## 7. 故障排除

### 7.1 常见问题

#### 问题1: 数据库连接失败

**错误信息:**
```
Connection refused at localhost:5432
```

**解决方案:**
```bash
# 1. 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 2. 启动PostgreSQL
sudo systemctl start postgresql

# 3. 检查端口监听
sudo netstat -tlnp | grep 5432

# 4. 检查pg_hba.conf配置
sudo cat /etc/postgresql/*/main/pg_hba.conf

# 5. 重启PostgreSQL
sudo systemctl restart postgresql
```

#### 问题2: Prisma迁移失败

**错误信息:**
```
Error: P3006: Migration failed
```

**解决方案:**
```bash
# 1. 重置迁移（会删除所有数据）
cd backend
npx prisma migrate reset

# 2. 或手动删除所有表
psql -U jy_user -d jy_production -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# 3. 重新应用迁移
npx prisma migrate dev --name init_postgresql
```

#### 问题3: 种子数据导入失败

**错误信息:**
```
ERROR: relation "DataSource" does not exist
```

**解决方案:**
```bash
# 1. 验证表已创建
psql -U jy_user -d jy_production -c "\dt"

# 2. 如果表不存在，先执行迁移
cd backend
npx prisma db push

# 3. ���新导入种子数据
cd deployment
psql -U jy_user -d jy_production -f postgresql-seed-data.sql
```

#### 问题4: 应用启动失败

**错误信息:**
```
Error: Cannot connect to database
```

**解决方案:**
```bash
# 1. 检查环境变量
cd backend
cat .env.production

# 2. 验证数据库连接
psql "$DATABASE_URL" -c "SELECT 1"

# 3. 检查网络连接
ping localhost
telnet localhost 5432

# 4. 重新生成Prisma客户端
npx prisma generate

# 5. 重启应用
npm run dev
```

### 7.2 日志查看

#### 应用日志

```bash
# PM2日志
pm2 logs jy-backend

# 查看错误日志
pm2 logs jy-backend --err

# 实时日志
pm2 logs jy-backend --lines 100
```

#### 数据库日志

```bash
# PostgreSQL日志位置
sudo tail -f /var/log/postgresql/postgresql-*.log

# 查看最近错误
sudo grep "ERROR" /var/log/postgresql/postgresql-*.log | tail -20
```

### 7.3 性能优化

#### 数据库优化

```sql
-- 连接到数据库
psql -U jy_user -d jy_production

-- 1. 更新统计信息
ANALYZE;

-- 2. 重建索引
REINDEX DATABASE jy_production;

-- 3. 清理死元组
VACUUM FULL;

-- 4. 检查查询性能
SELECT * FROM pg_stat_user_tables ORDER BY seq_scan DESC;

-- 5. 创建缺失的索引（根据实际需求）
-- CREATE INDEX INDEX_NAME ON TABLE_NAME(column_name);
```

#### 应用优化

```bash
# 1. 启用压缩
npm install compression

# 2. 配置集群模式
pm2 start ecosystem.config.js -i max

# 3. 配置缓存
# 在应用中配置Redis等缓存层
```

---

## 8. 附录

### 8.1 文件清单

```
JY-backend/
├── backend/                           # 后端代码
│   ├── prisma/
│   │   ├── schema.prisma             # Prisma Schema定义
│   │   ├── schema.prisma.bak         # Schema备份（SQLite版）
│   │   └── migrations/               # 迁移文件
│   ├── .env.production               # 生产环境配置
│   └── node_modules/                 # Node.js依赖
│
├── deployment/                        # 部署文件
│   ├── postgresql-seed-data.sql      # 种子数据SQL (33KB)
│   ├── deploy-postgresql.sh          # 一键部署脚本
│   ├── seed-data-deploy.sh          # 种子数据部署脚本
│   ├── POSTGRESQL_DEPLOYMENT_MANUAL.md  # 本操作手册
│   ├── POSTGRESQL_MIGRATION_GUIDE.md # 迁移指南
│   └── POSTGRESQL_DEPLOYMENT_CHECKLIST.md  # 检查清单
│
└── README.md                          # 项目说明
```

### 8.2 端口和协议

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| PostgreSQL | 5432 | TCP | 数据库 |
| 应用API | 3000 | HTTP/HTTPS | 后端服务 |
| SSH | 22 | TCP | 远程登录 |

### 8.3 默认账户

| 用户名 | 默认密码 | 角色 | 说明 |
|--------|----------|------|------|
| admin | admin123 | 系统管理员 | 拥有所有权限 |
| hr_admin | hr123 | HR管理员 | 人事管理权限 |

⚠️ **重要：** 部署后立即修改默认密码！

### 8.4 数据源清单

| 序号 | 代码 | 名称 | 类型 | 选项数量 |
|------|------|------|------|----------|
| 1 | gender | 性别 | BUILTIN | 2 |
| 2 | nation | 民族 | BUILTIN | 7 |
| 3 | marital_status | 婚姻状况 | BUILTIN | 4 |
| 4 | political_status | 政治面貌 | BUILTIN | 5 |
| 5 | JOB_LEVEL | 职级 | BUILTIN | 8 |
| 6 | POSITION | 职位 | BUILTIN | 12 |
| 7 | EMPLOYEE_TYPE | 员工类型 | BUILTIN | 5 |
| 8 | education_level | 学历层次 | BUILTIN | 8 |
| 9 | education_type | 学历类型 | BUILTIN | 8 |
| 10 | employment_status | 在职状态 | BUILTIN | 5 |
| 11 | emergency_relation | 紧急联系人关系 | BUILTIN | 6 |
| 12 | family_relation | 家庭成员关系 | BUILTIN | 6 |
| 13 | change_type | 异动类型 | BUILTIN | 8 |
| 14 | ORG_TYPE | 组织类型 | BUILTIN | 5 |
| 15 | WORK_LOCATION | 工作地点 | BUILTIN | 6 |
| 16 | PRODUCT | 产品 | BUILTIN | - |
| 17 | PROCESS | 工序 | BUILTIN | - |
| 18 | EDUCATION | 学历 | CUSTOM | 5 |
| 19 | WORK_STATUS | 工作状态 | CUSTOM | 4 |

**总计：19个数据源，100+选项**

### 8.5 组织架构

```
集团总部 (ROOT)
├── 技术部 (TECH)
│   └── [可添加子部门]
└── 人力资源部 (HR)
    └── [可添加子部门]
```

### 8.6 快速命令参考

```bash
# === 数据库操作 ===
# 连接数据库
psql -U jy_user -d jy_production

# 备份数据库
pg_dump -U jy_user jy_production > backup.sql

# 恢复数据库
psql -U jy_user jy_production < backup.sql

# === Prisma操作 ===
# 生成客户端
npx prisma generate

# 查看schema
npx prisma studio

# 应用迁移
npx prisma migrate deploy

# === 应用操作 ===
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# PM2管理
pm2 list
pm2 restart jy-backend
pm2 stop jy-backend
pm2 delete jy-backend
```

### 8.7 技术支持

- **Prisma文档**: https://www.prisma.io/docs
- **PostgreSQL文档**: https://www.postgresql.org/docs/
- **Node.js文档**: https://nodejs.org/docs/

### 8.8 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2026-06-02 | 初始版本，PostgreSQL生产环境部署 |

---

## ✅ 部署完成检查清单

部署完成后，请逐项确认：

- [ ] PostgreSQL数据库已创建
- [ ] 数据库编码为UTF-8
- [ ] Prisma provider已设置为postgresql
- [ ] .env.production已配置
- [ ] 数据库迁移已成功执行
- [ ] 创建了87个表
- [ ] 种子数据已成功导入
- [ ] 数据源数量为19个
- [ ] 用户数量为2个（admin, hr_admin）
- [ ] 组织数量为3个
- [ ] 应用可以成功启动
- [ ] API健康检查通过
- [ ] 默认密码已修改
- [ ] 示例数据已删除或更新
- [ ] 防火墙已配置
- [ ] 数据库备份已配置
- [ ] SSL/TLS已配置（如需要）

---

## 📞 获取帮助

如遇到问题：

1. 查看本文档的"故障排除"章节
2. 查看应用日志和数据库日志
3. 检查PostgreSQL和Prisma官方文档
4. 联系技术支持团队

---

**文档结束**

*最后更新: 2026-06-02*
*维护者: 系统架构组*
