# 精益工时管理系统 - 生产环境部署操作手册

> 文档版本: 1.0
> 更新日期: 2025-05-29
> 部署环境: Linux (推荐 Ubuntu 20.04+ / CentOS 8+)

---

## 目录

1. [系统要求](#系统要求)
2. [环境准备](#环境准备)
3. [数据库配置](#数据库配置)
4. [后端部署](#后端部署)
5. [前端部署](#前端部署)
6. [Nginx配置](#nginx配置)
7. [进程管理](#进程管理)
8. [监控与日志](#监控与日志)
9. [备份与恢复](#备份与恢复)
10. [常见问题处理](#常见问题处理)

---

## 1. 系统要求

### 硬件要求
- **CPU**: 2核心以上
- **内存**: 4GB 以上 (推荐 8GB)
- **磁盘**: 50GB 以上可用空间
- **网络**: 独立公网IP或内网可访问

### 软件要求
- **操作系统**: Linux (Ubuntu 20.04+, CentOS 8+, Debian 10+)
- **Node.js**: v18.17.0 或 v20.x (LTS)
- **PostgreSQL**: 14.x 或 15.x
- **Nginx**: 1.18+ (用于反向代理和静态文件服务)
- **PM2**: 最新版本 (进程管理)

---

## 2. 环境准备

### 2.1 安装 Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# 验证安装
node --version  # 应显示 v20.x.x
npm --version
```

### 2.2 安装 PostgreSQL

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS
sudo yum install postgresql-server postgresql-contrib
sudo postgresql-setup initdb

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 验证
sudo -u postgres psql --version
```

### 2.3 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx

# CentOS
sudo yum install nginx

# 启动服务
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.4 安装 PM2

```bash
sudo npm install -g pm2

# 验证
pm2 --version
```

---

## 3. 数据库配置

### 3.1 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 命令行中执行
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q

# 配置 PostgreSQL 认证 (可选，如果需要远程连接)
sudo nano /etc/postgresql/14/main/pg_hba.conf
# 添加以下行：
# host    jy_production    jy_user    0.0.0.0/0    md5

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

### 3.2 导入生产数据库

> **重要说明**：本项目使用 SQLite 进行开发，部署时已自动转换为 PostgreSQL 格式。备份文件包含完整的表结构、数据和序列配置，无需额外处理。

#### 3.2.1 备份文件说明

部署包中的 `jy_production_backup_YYYYMMDD_HHMMSS.sql` 文件是一个**完整的 PostgreSQL 备份文件**，包含：

- ✅ **完整的表结构**：所有数据库表的定义（CREATE TABLE）
- ✅ **所有业务数据**：用户、角色、员工、组织等全部数据
- ✅ **配置数据**：考勤规则、数据源、自定义字段等配置
- ✅ **种子数据**：系统初始化所需的基础数据
- ✅ **序列重置**：自动设置自增ID的起始值，避免主键冲突

**文件来源**：
- 原始开发数据库：SQLite 格式 (`dev.db`)
- 转换脚本：`generate-full-migration.sh`
- 转换过程：从 SQLite 读取数据 → 转换为 PostgreSQL 语法 → 生成完整 SQL 文件

#### 3.2.2 导入步骤

**方式1：使用 psql 命令（推荐）**

```bash
# 上传文件到服务器后，执行导入
psql -U jy_user -d jy_production -f jy_production_backup_20260529_012310.sql

# 如果文件在其他位置，使用完整路径
psql -U jy_user -d jy_production -f /path/to/jy_production_backup_20260529_012310.sql

# 或者使用环境变量传递密码
PGPASSWORD="your_password" psql -U jy_user -d jy_production -f jy_production_backup_20260529_012310.sql
```

**方式2：使用管道传输**

```bash
cat jy_production_backup_20260529_012310.sql | psql -U jy_user -d jy_production -h localhost
```

**方式3：使用自动化脚本（最简单）**

```bash
sudo ./setup-database.sh \
  -f jy_production_backup_20260529_012310.sql \
  -p your_database_password
```

#### 3.2.3 导入注意事项

⚠️ **重要注意事项**：

1. **数据库必须为空**
   - 导入前确保 `jy_production` 是新建的空数据库
   - 如果数据库已有表结构，请先删除并重新创建

2. **无需执行其他 SQL**
   - ✅ 不需要执行 `prisma migrate deploy`
   - ✅ 不需要执行 `prisma db push`
   - ✅ 不需要运行任何 seed 脚本
   - ✅ 不需要手动创建表结构
   - **原因**：备份文件已包含所有必需的表结构和数据

3. **无需 SQLite 数据库**
   - 不要尝试在 PostgreSQL 中直接使用 `.db` 文件
   - SQLite 和 PostgreSQL 不兼容，必须使用转换后的 SQL 文件

4. **字符编码**
   - SQL 文件使用 UTF-8 编码
   - 确保导入时使用正确的编码：`psql -U jy_user -d jy_production --file=jy_production_backup_20260529_012310.sql --set=client_encoding=utf8`

5. **导入时间**
   - 根据数据量，导入过程可能需要几秒到几分钟
   - 请等待导入完成后再继续后续步骤

### 3.3 验证数据导入

导入完成后，执行以下命令验证数据是否正确：

```bash
# 查看所有表（应该能看到所有业务表）
sudo -u postgres psql -d jy_production -c "\dt"

# 检查表数量（通常应该在40-60张表之间）
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# 检查关键表的数据量
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) AS user_count FROM \"User\";"
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) AS role_count FROM \"Role\";"
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) AS employee_count FROM \"Employee\";"
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) AS org_count FROM \"Organization\";"

# 检查序列是否正确设置
sudo -u postgres psql -d jy_production -c "SELECT schemaname, tablename, attname, seq_scan FROM pg_stat_user_tables WHERE seq_scan > 0;"

# 查看数据库大小
sudo -u postgres psql -d jy_production -c "SELECT pg_size_pretty(pg_database_size('jy_production'));"
```

**预期结果示例**：
```
 user_count | role_count | employee_count | org_count
------------+------------+----------------+-----------
          3 |          5 |             12 |         8
```

### 3.4 生产环境数据库连接字符串

在后端 `.env.production` 文件中配置以下连接字符串：

```bash
# 本地 PostgreSQL
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"

# 远程 PostgreSQL
DATABASE_URL="postgresql://jy_user:your_password@your-db-host:5432/jy_production?schema=public"

# 使用连接池（推荐生产环境）
DATABASE_URL="postgresql://jy_user:your_password@host:port/jy_production?schema=public&connection_limit=10&pool_timeout=20"
```

### 3.5 Prisma 配置

虽然备份文件已包含完整数据，但仍需生成 Prisma Client：

```bash
cd /var/www/jy-backend

# 使用生产数据库 URL 生成 Prisma Client
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public" npm run prisma:generate

# 验证 Prisma 连接
npx prisma db execute --stdin < echo "SELECT 1"
```

---

## 4. 后端部署

### 4.1 上传代码到服务器

```bash
# 在本地打包后端代码（排除不必要的文件）
cd backend
tar -czf jy-backend.tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  --exclude=dev.db \
  --exclude=dev.db-journal \
  --exclude='*.log' \
  .

# 上传到服务器
scp jy-backend.tar.gz user@your-server:/var/www/
scp ../deployment/jy_production_backup_*.sql user@your-server:/var/www/
```

### 4.2 在服务器上解压和安装

```bash
# SSH 登录到服务器
ssh user@your-server

# 创建目录
sudo mkdir -p /var/www/jy-backend
cd /var/www

# 解压文件
sudo tar -xzf jy-backend.tar.gz -C jy-backend
cd jy-backend

# 安装依赖
sudo npm install --production

# 生成 Prisma Client
npm run prisma:generate

# 验证数据库连接
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public" npm run prisma:generate
```

### 4.3 配置生产环境变量

```bash
# 创建生产环境配置文件
sudo nano .env.production
```

填入以下内容：

```bash
# 生产环境配置
NODE_ENV=production
PORT=3001

# 数据库配置
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"

# JWT配置（请修改为强密码）
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"

# 前端URL（用于CORS配置）
FRONTEND_URL="https://your-domain.com"

# 日志级别
LOG_LEVEL="info"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

### 4.4 构建后端

```bash
# 构建项目
sudo npm run build

# 验证构建结果
ls -la dist/src/main.js  # 应该存在
```

### 4.5 使用 PM2 启动后端服务

```bash
# 创建 PM2 配置文件
sudo nano ecosystem.config.js
```

填入以下内容：

```javascript
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: './dist/src/main.js',
    instances: 2,  // 根据CPU核心数调整
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M'
  }]
};
```

启动服务：

```bash
# 创建日志目录
sudo mkdir -p logs

# 启动服务
sudo pm2 start ecosystem.config.js --env production

# 保存 PM2 配置
sudo pm2 save

# 设置 PM2 开机自启
sudo pm2 startup
# 按照提示执行显示的命令

# 查看服务状态
sudo pm2 status
sudo pm2 logs jy-backend
```

### 4.6 验证后端服务

```bash
# 检查服务是否运行
curl http://localhost:3001/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"your_password"}'

# 或者查看健康检查端点（如果有的话）
curl http://localhost:3001/health
```

---

## 5. 前端部署

### 5.1 配置生产环境变量

在本地（开发环境）修改前端配置：

```bash
# 在前端项目根目录创建生产环境配置
cd frontend
nano .env.production
```

填入以下内容：

```bash
# 生产环境 API 地址
VITE_API_BASE_URL=https://your-domain.com/api
```

### 5.2 构建前端生产版本

```bash
# 在本地构建
npm run build

# 构建完成后，dist 目录包含所有静态文件
ls -la dist/
```

### 5.3 上传前端文件到服务器

```bash
# 打包 dist 目录
tar -czf jy-frontend-dist.tar.gz -C dist .

# 上传到服务器
scp jy-frontend-dist.tar.gz user@your-server:/var/www/
```

### 5.4 在服务器上部署前端

```bash
# SSH 登录到服务器
ssh user@your-server

# 创建前端目录
sudo mkdir -p /var/www/jy-frontend

# 解压文件
sudo tar -xzf /var/www/jy-frontend-dist.tar.gz -C /var/www/jy-frontend

# 设置正确的权限
sudo chown -R www-data:www-data /var/www/jy-frontend
sudo chmod -R 755 /var/www/jy-frontend

# 验证文件
ls -la /var/www/jy-frontend/
```

---

## 6. Nginx配置

### 6.1 创建 Nginx 配置文件

```bash
sudo nano /etc/nginx/sites-available/jy-system
```

填入以下配置：

```nginx
# 后端 API 服务
upstream jy_backend {
    server localhost:3001;
}

# HTTP 重定向到 HTTPS (可选)
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;

    # Let's Encrypt 验证路径
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    # 其他请求重定向到 HTTPS
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS 主服务配置
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 证书配置
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志配置
    access_log /var/log/nginx/jy-access.log;
    error_log /var/log/nginx/jy-error.log;

    # API 反向代理
    location /api/ {
        proxy_pass http://jy_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 前端静态文件
    location / {
        root /var/www/jy-frontend;
        try_files $uri $uri/ /index.html;

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # 文件上传大小限制
    client_max_body_size 10M;
}
```

### 6.2 启用配置和重启 Nginx

```bash
# 创建符号链接启用配置
sudo ln -s /etc/nginx/sites-available/jy-system /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 如果测试通过，重启 Nginx
sudo systemctl restart nginx

# 查看 Nginx 状态
sudo systemctl status nginx
```

### 6.3 配置 SSL 证书 (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx  # Ubuntu/Debian
sudo yum install certbot python3-certbot-nginx  # CentOS

# 获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加以下行：
0 0 * * * /usr/bin/certbot renew --quiet
```

---

## 7. 进程管理

### 7.1 PM2 常用命令

```bash
# 查看所有进程
sudo pm2 list

# 查看日志
sudo pm2 logs jy-backend

# 查看实时日志
sudo pm2 logs jy-backend --lines 100

# 重启服务
sudo pm2 restart jy-backend

# 停止服务
sudo pm2 stop jy-backend

# 删除服务
sudo pm2 delete jy-backend

# 重新加载（0秒停机）
sudo pm2 reload jy-backend

# 监控
sudo pm2 monit
```

### 7.2 更新应用

```bash
# 1. 上传新代码
# 2. 在服务器上进入项目目录
cd /var/www/jy-backend

# 3. 安装依赖
sudo npm install --production

# 4. 构建项目
sudo npm run build

# 5. 重新生成 Prisma Client
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public" npm run prisma:generate

# 6. 重启服务（0秒停机）
sudo pm2 reload jy-backend

# 7. 查看状态
sudo pm2 status
```

---

## 8. 监控与日志

### 8.1 日志管理

```bash
# 后端应用日志位置
/var/www/jy-backend/logs/
  - err.log      # 错误日志
  - out.log      # 输出日志
  - combined.log # 合并日志

# Nginx 日志位置
/var/log/nginx/
  - jy-access.log  # 访问日志
  - jy-error.log   # 错误日志

# 查看实时日志
tail -f /var/www/jy-backend/logs/combined.log
tail -f /var/log/nginx/jy-error.log
```

### 8.2 日志轮换配置

创建日志轮换配置：

```bash
sudo nano /etc/logrotate.d/jy-system
```

填入以下内容：

```
/var/www/jy-backend/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        sudo pm2 reload jy-backend
    endscript
}

/var/log/nginx/jy-*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        sudo systemctl reload nginx
    endscript
}
```

### 8.3 系统监控

推荐安装监控工具：

```bash
# 安装 htop
sudo apt install htop

# 安装 iotop (磁盘监控)
sudo apt install iotop

# 安装 netstat (网络监控)
sudo apt install net-tools

# 使用 PM2 监控
sudo pm2 install pm2-logrotate
sudo pm2 set pm2-logrotate:max_size 10M
sudo pm2 set pm2-logrotate:rotateInterval '0 0 * * *'
```

---

## 9. 备份与恢复

### 9.1 数据库备份

创建自动备份脚本：

```bash
sudo nano /usr/local/bin/backup-jy-db.sh
```

填入以下内容：

```bash
#!/bin/bash
# 数据库备份脚本

BACKUP_DIR="/var/backups/jy-database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jy_production_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 执行备份
PGPASSWORD="your_password" pg_dump -U jy_user -h localhost jy_production > "$BACKUP_FILE"

# 压缩备份
gzip "$BACKUP_FILE"

# 删除30天前的备份
find "$BACKUP_DIR" -name "jy_production_*.sql.gz" -mtime +30 -delete

echo "数据库备份完成: ${BACKUP_FILE}.gz"
```

设置定时备份：

```bash
# 添加执行权限
sudo chmod +x /usr/local/bin/backup-jy-db.sh

# 设置每天凌晨2点自动备份
sudo crontab -e
# 添加以下行：
0 2 * * * /usr/local/bin/backup-jy-db.sh >> /var/log/jy-backup.log 2>&1
```

### 9.2 手动备份数据库

```bash
# 备份
PGPASSWORD="your_password" pg_dump -U jy_user -h localhost jy_production > backup.sql

# 压缩
gzip backup.sql
```

### 9.3 恢复数据库

```bash
# 解压备份文件
gunzip backup.sql.gz

# 恢复数据库
PGPASSWORD="your_password" psql -U jy_user -h localhost jy_production < backup.sql

# 或者从一行命令恢复
gunzip -c backup.sql.gz | PGPASSWORD="your_password" psql -U jy_user -h localhost jy_production
```

### 9.4 文件系统备份

```bash
# 备份前端文件
sudo tar -czf /var/backups/jy-frontend-$(date +%Y%m%d).tar.gz /var/www/jy-frontend

# 备份后端代码
sudo tar -czf /var/backups/jy-backend-$(date +%Y%m%d).tar.gz /var/www/jy-backend

# 备份配置文件
sudo tar -czf /var/backups/jy-config-$(date +%Y%m%d).tar.gz /etc/nginx/sites-available/jy-system /var/www/jy-backend/.env.production
```

---

## 10. 常见问题处理

### 10.1 后端服务无法启动

**问题**: PM2 启动失败

```bash
# 查看详细错误日志
sudo pm2 logs jy-backend --err

# 检查端口占用
sudo netstat -tlnp | grep 3001

# 检查环境变量
cat /var/www/jy-backend/.env.production

# 手动运行测试
cd /var/www/jy-backend
NODE_ENV=production PORT=3001 node dist/src/main.js
```

### 10.2 数据库连接失败

**问题**: 无法连接到 PostgreSQL

```bash
# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 测试数据库连接
psql -U jy_user -d jy_production -h localhost

# 检查防火墙
sudo ufw status
sudo firewall-cmd --list-all  # CentOS

# 检查 PostgreSQL 配置
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### 10.3 前端页面空白

**问题**: 前端无法加载资源

```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/jy-error.log

# 检查文件权限
ls -la /var/www/jy-frontend/
sudo chown -R www-data:www-data /var/www/jy-frontend

# 检查 API 连接
curl https://your-domain.com/api/health
```

### 10.4 内存不足

**问题**: 服务器内存使用过高

```bash
# 查看内存使用
free -h

# 查看 PM2 进程内存
sudo pm2 monit

# 调整 PM2 实例数量
sudo nano /var/www/jy-backend/ecosystem.config.js
# 修改 instances: 1

# 重启服务
sudo pm2 reload jy-backend
```

### 10.5 SSL 证书问题

**问题**: SSL 证书过期或无效

```bash
# 手动续期
sudo certbot renew

# 强制续期
sudo certbot renew --force-renewal

# 查看证书有效期
sudo certbot certificates

# 重新获取证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com --force-renewal
```

### 10.6 性能优化建议

```bash
# 1. 启用 Nginx Gzip 压缩
sudo nano /etc/nginx/nginx.conf
# 确保包含以下配置：
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

# 2. 启用 PostgreSQL 连接池
# 修改 .env.production
DATABASE_URL="postgresql://jy_user:password@localhost:5432/jy_production?schema=public&connection_limit=10"

# 3. 配置 Nginx 缓存（可选）
# 在 nginx 配置中添加：
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=jy_cache:10m max_size=1g inactive=60m;

# 4. 优化 PostgreSQL
sudo nano /etc/postgresql/14/main/postgresql.conf
# 建议配置：
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 2621kB
min_wal_size = 1GB
max_wal_size = 4GB

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

---

## 附录

### A. 部署检查清单

- [ ] Node.js v18+ 已安装
- [ ] PostgreSQL 14+ 已安装并运行
- [ ] Nginx 已安装并配置
- [ ] PM2 已安装并配置开机自启
- [ ] 数据库已创建并导入数据
- [ ] 后端代码已上传并构建
- [ ] 后端服务已通过 PM2 启动
- [ ] 前端已构建并部署
- [ ] SSL 证书已配置
- [ ] 防火墙规则已配置
- [ ] 数据库自动备份已设置
- [ ] 日志轮换已配置
- [ ] 系统监控已配置

### B. 端口清单

| 服务 | 端口 | 协议 | 说明 |
|------|------|------|------|
| 前端 | 80 | HTTP | 自动重定向到 HTTPS |
| 前端 | 443 | HTTPS | Nginx 提供的前端服务 |
| 后端 | 3001 | HTTP | PM2 运行的后端 API (仅内网) |
| PostgreSQL | 5432 | TCP | 数据库服务 (仅内网) |

### C. 文件位置清单

| 类型 | 位置 |
|------|------|
| 前端静态文件 | `/var/www/jy-frontend/` |
| 后端代码 | `/var/www/jy-backend/` |
| 后端日志 | `/var/www/jy-backend/logs/` |
| Nginx 配置 | `/etc/nginx/sites-available/jy-system` |
| 数据库备份 | `/var/backups/jy-database/` |
| SSL 证书 | `/etc/letsencrypt/live/your-domain.com/` |

### D. 联系与支持

- 技术支持邮箱: support@your-domain.com
- 系统文档: https://docs.your-domain.com
- 问题反馈: https://github.com/your-repo/issues

---

**文档结束**

> 最后更新: 2025-05-29
> 维护者: 系统管理团队
