# 精益工时管理系统 - 生产环境部署文档

## 目录
1. [系统要求](#系统要求)
2. [部署架构](#部署架构)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [数据库配置](#数据库配置)
6. [Nginx配置](#nginx配置)
7. [SSL证书配置](#ssl证书配置)
8. [系统监控与日志](#系统监控与日志)
9. [备份策略](#备份策略)
10. [故障排查](#故障排查)

---

## 系统要求

### 最低配置
- **CPU**: 2核心
- **内存**: 4GB RAM
- **磁盘**: 20GB 可用空间
- **操作系统**:
  - Linux: Ubuntu 20.04+, CentOS 7+, Debian 10+
  - Windows Server 2016+
  - macOS 10.15+

### 推荐配置（生产环境）
- **CPU**: 4核心+
- **内存**: 8GB+ RAM
- **磁盘**: 50GB+ SSD
- **数据库**: PostgreSQL 13+ 或 MySQL 8.0+

### 软件依赖
- **Node.js**: 18.x 或 20.x
- **npm**: 9.x 或 10.x
- **数据库**: PostgreSQL 13+ / MySQL 8.0+ / SQLite 3+ (仅开发环境)
- **Web服务器**: Nginx 1.18+ 或 Apache 2.4+
- **进程管理器**: PM2 (推荐) 或 systemd

---

## 部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (反向代理)  │
                    └──────┬──────┘
                           │
              ┌────────────┴────────────┐
              │                         │
      ┌───────▼────────┐        ┌───────▼────────┐
      │  前端 (静态文件) │        │  后端 API      │
      │  /var/www/jy/  │        │  :3001         │
      └────────────────┘        └───────┬────────┘
                                         │
                                  ┌──────▼────────┐
                                  │  PostgreSQL    │
                                  │  :5432         │
                                  └───────────────┘
```

---

## 后端部署

### 1. 准备工作

```bash
# 克隆代码到服务器
cd /opt
git clone <your-repository-url> jy-backend
cd jy-backend

# 或上传代码包
scp -r ./jy-backend user@server:/opt/
```

### 2. 安装依赖

```bash
# 安装Node.js (使用NodeSource仓库)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 或使用nvm安装
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# 安装依赖
cd /opt/jy-backend
npm install --production
```

### 3. 配置环境变量

```bash
# 复制生产环境配置模板
cp .env.production .env

# 编辑环境变量
nano .env
```

**生产环境配置示例**:

```env
NODE_ENV=production
PORT=3001

# PostgreSQL数据库配置
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"

# JWT密钥 (必须修改为随机字符串，至少32位)
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"

# 前端URL (用于CORS)
FRONTEND_URL="https://your-frontend-domain.com"

# 日志级别
LOG_LEVEL="info"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

### 4. 初始化数据库

```bash
# 生成Prisma客户端
npm run prisma:generate

# 推送数据库schema
npm run prisma:push

# (可选) 运行种子数据
npm run prisma:seed
```

### 5. 构建生产版本

```bash
# 构建TypeScript代码
npm run build

# 验证构建输出
ls -la dist/
```

### 6. 使用PM2管理进程

```bash
# 安装PM2
sudo npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: './dist/src/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    autorestart: true,
    watch: false
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 常用PM2命令
pm2 list                    # 查看所有进程
pm2 logs jy-backend          # 查看日志
pm2 restart jy-backend       # 重启服务
pm2 stop jy-backend          # 停止服务
pm2 monit                    # 监控面板
```

### 7. 验证后端服务

```bash
# 检查服务状态
pm2 status

# 测试API端点
curl http://localhost:3001/api/system/dashboard/stats

# 查看日志
pm2 logs jy-backend --lines 100
```

---

## 前端部署

### 1. 准备工作

```bash
# 克隆代码
cd /opt
git clone <your-repository-url> jy-frontend
cd jy-frontend

# 或上传代码包
scp -r ./jy-frontend user@server:/opt/
```

### 2. 安装依赖

```bash
# 安装依赖
cd /opt/jy-frontend
npm install
```

### 3. 配置环境变量

```bash
# 创建生产环境配置
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://your-backend-domain.com/api
EOF

# 或使用特定端口
# VITE_API_BASE_URL=https://your-backend-domain.com:3001/api
```

### 4. 构建生产版本

```bash
# 构建前端
npm run build

# 验证构建输出
ls -la dist/
```

### 5. 部署静态文件

```bash
# 创建Web目录
sudo mkdir -p /var/www/jy

# 复制构建文件
sudo cp -r dist/* /var/www/jy/

# 设置权限
sudo chown -R www-data:www-data /var/www/jy
sudo chmod -R 755 /var/www/jy
```

---

## 数据库配置

### PostgreSQL部署 (推荐)

#### 1. 安装PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install -y postgresql-server postgresql-contrib
sudo postgresql-setup initdb
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

#### 2. 创建数据库和用户

```bash
# 切换到postgres用户
sudo -u postgres psql

# 执行以下SQL命令
CREATE USER jy_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE jy_production OWNER jy_user;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
```

#### 3. 配置远程访问

```bash
# 编辑postgresql.conf
sudo nano /etc/postgresql/13/main/postgresql.conf

# 添加或修改以下行
listen_addresses = 'localhost'

# 编辑pg_hba.conf
sudo nano /etc/postgresql/13/main/pg_hba.conf

# 添加以下行
local   all             postgres                                trust
local   all             all                                     peer
host    all             all             127.0.0.1/32            scram-sha-256
host    all             all             ::1/128                 scram-sha-256

# 重启PostgreSQL
sudo systemctl restart postgresql
```

### MySQL部署

#### 1. 安装MySQL

```bash
# Ubuntu/Debian
sudo apt-get install -y mysql-server

# CentOS/RHEL
sudo yum install -y mysql-server
sudo systemctl start mysqld
sudo systemctl enable mysqld
```

#### 2. 创建数据库和用户

```bash
# 登录MySQL
sudo mysql

# 执行以下SQL命令
CREATE USER 'jy_user'@'localhost' IDENTIFIED BY 'your_secure_password';
CREATE DATABASE jy_production CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON jy_production.* TO 'jy_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Nginx配置

### 1. 安装Nginx

```bash
# Ubuntu/Debian
sudo apt-get install -y nginx

# CentOS/RHEL
sudo yum install -y nginx

# 启动并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2. 配置前后端

#### 创建前端配置文件

```bash
sudo nano /etc/nginx/sites-available/jy-frontend
```

```nginx
server {
    listen 80;
    server_name your-frontend-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-frontend-domain.com;

    # SSL证书配置 (见下一节)
    ssl_certificate /etc/letsencrypt/live/your-frontend-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-frontend-domain.com/privkey.pem;

    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 前端静态文件
    root /var/www/jy;
    index index.html;

    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript
               application/x-javascript application/xml+rss
               application/javascript application/json;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA路由配置
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 日志
    access_log /var/log/nginx/jy-frontend-access.log;
    error_log /var/log/nginx/jy-frontend-error.log;
}
```

#### 创建后端配置文件 (可选，如需独立域名)

```bash
sudo nano /etc/nginx/sites-available/jy-backend
```

```nginx
server {
    listen 80;
    server_name your-backend-domain.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-backend-domain.com;

    # SSL证书配置
    ssl_certificate /etc/letsencrypt/live/your-backend-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-backend-domain.com/privkey.pem;

    # SSL优化
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # 限制请求大小
    client_max_body_size 10M;

    # API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 日志
    access_log /var/log/nginx/jy-backend-access.log;
    error_log /var/log/nginx/jy-backend-error.log;
}
```

#### 启用配置

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/jy-frontend /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

---

## SSL证书配置

### 使用Let's Encrypt免费证书

```bash
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书 (自动配置Nginx)
sudo certbot --nginx -d your-frontend-domain.com

# 或手动获取证书
sudo certbot certonly --nginx -d your-frontend-domain.com

# 设置自动续期
sudo certbot renew --dry-run
sudo crontab -e

# 添加以下行 (每天凌晨2点检查续期)
0 2 * * * certbot renew --quiet --post-hook "systemctl reload nginx"
```

### 使用自有证书

```bash
# 复制证书文件
sudo cp your-cert.crt /etc/ssl/certs/jy-frontend.crt
sudo cp your-cert.key /etc/ssl/private/jy-frontend.key

# 设置权限
sudo chmod 644 /etc/ssl/certs/jy-frontend.crt
sudo chmod 600 /etc/ssl/private/jy-frontend.key

# 更新Nginx配置
# ssl_certificate /etc/ssl/certs/jy-frontend.crt;
# ssl_certificate_key /etc/ssl/private/jy-frontend.key;
```

---

## 系统监控与日志

### 1. PM2监控

```bash
# 安装PM2 Plus (可选)
pm2 plus

# 实时监控
pm2 monit

# 查看日志
pm2 logs

# 导出日志
pm2 install pm2-logrotate
```

### 2. 系统资源监控

```bash
# 安装htop
sudo apt-get install -y htop

# 查看资源使用
htop

# 查看磁盘使用
df -h

# 查看内存使用
free -m

# 查看端口监听
sudo netstat -tlnp
```

### 3. 日志管理

#### 后端日志

```bash
# PM2日志目录
~/.pm2/logs/

# 应用日志
/opt/jy-backend/logs/

# 日志轮转配置
cat > /etc/logrotate.d/jy-backend << 'EOF'
/opt/jy-backend/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload jy-backend
    endscript
}
EOF
```

#### Nginx日志

```bash
# 日志目录
/var/log/nginx/

# 日志轮转 (已默认配置)
cat /etc/logrotate.d/nginx
```

---

## 备份策略

### 1. 数据库备份

#### 自动备份脚本

```bash
# 创建备份脚本
cat > /opt/scripts/backup-db.sh << 'EOF'
#!/bin/bash

# 配置
BACKUP_DIR="/opt/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="jy_production"
DB_USER="jy_user"
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# PostgreSQL备份
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/jy_backup_$DATE.sql.gz

# 删除旧备份
find $BACKUP_DIR -name "jy_backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed: jy_backup_$DATE.sql.gz"
EOF

# 设置权限
chmod +x /opt/scripts/backup-db.sh

# 添加到crontab (每天凌晨3点备份)
crontab -e
# 添加: 0 3 * * * /opt/scripts/backup-db.sh >> /var/log/db-backup.log 2>&1
```

### 2. 文件备份

```bash
# 创建备份脚本
cat > /opt/scripts/backup-files.sh << 'EOF'
#!/bin/bash

BACKUP_DIR="/opt/backups/files"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /opt/jy-backend/uploads/

# 删除旧备份
find $BACKUP_DIR -name "uploads_*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "File backup completed: uploads_$DATE.tar.gz"
EOF

chmod +x /opt/scripts/backup-files.sh
```

### 3. 恢复数据

```bash
# 恢复PostgreSQL数据库
gunzip < /opt/backups/database/jy_backup_20240301_030000.sql.gz | psql -U jy_user jy_production

# 恢复文件
tar -xzf /opt/backups/files/uploads_20240301_030000.tar.gz -C /
```

---

## 故障排查

### 1. 后端无法启动

```bash
# 检查PM2状态
pm2 status

# 查看错误日志
pm2 logs jy-backend --err

# 检查端口占用
sudo netstat -tlnp | grep 3001

# 检查数据库连接
psql -U jy_user -d jy_production -c "SELECT 1;"

# 重新构建
cd /opt/jy-backend
npm run build
pm2 restart jy-backend
```

### 2. 前端页面无法访问

```bash
# 检查Nginx状态
sudo systemctl status nginx

# 检查配置
sudo nginx -t

# 查看Nginx日志
sudo tail -f /var/log/nginx/jy-frontend-error.log

# 检查文件权限
ls -la /var/www/jy

# 重新部署前端
cd /opt/jy-frontend
npm run build
sudo cp -r dist/* /var/www/jy/
```

### 3. 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查连接
psql -U jy_user -d jy_production

# 检查配置
cat /opt/jy-backend/.env | grep DATABASE_URL

# 重启数据库
sudo systemctl restart postgresql
```

### 4. API请求失败

```bash
# 测试后端API
curl http://localhost:3001/api/system/dashboard/stats

# 检查CORS配置
cat /opt/jy-backend/.env | grep FRONTEND_URL

# 查看后端日志
pm2 logs jy-backend --lines 100

# 检查Nginx代理配置
cat /etc/nginx/sites-available/jy-frontend
```

---

## 性能优化

### 1. 后端优化

```bash
# 启用集群模式
pm2 start ecosystem.config.js

# 调整实例数量 (根据CPU核心数)
# 在ecosystem.config.js中设置: instances: 'max' 或具体数字

# 配置数据库连接池
# 在prisma/schema.prisma中配置
datasource db {
  url      = env("DATABASE_URL")
  provider = "postgresql"
  pool_timeout = 60
  connection_limit = 10
}
```

### 2. 前端优化

```bash
# 已在vite.config.ts中配置代码分割
# 启用CDN (可选)
# 配置浏览器缓存策略
```

### 3. Nginx优化

```nginx
# 在nginx配置中添加
# 在http块中
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
types_hash_max_size 2048;

# 启用缓存
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=1g inactive=60m;
```

---

## 安全加固

### 1. 防火墙配置

```bash
# 安装UFW
sudo apt-get install -y ufw

# 允许SSH
sudo ufw allow 22/tcp

# 允许HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

### 2. 限制数据库访问

```bash
# PostgreSQL仅监听本地
# 编辑postgresql.conf
listen_addresses = 'localhost'

# 限制远程连接
# 编辑pg_hba.conf
# 注释掉所有host行，只保留本地
```

### 3. 定期更新

```bash
# 更新系统
sudo apt-get update
sudo apt-get upgrade -y

# 自动安全更新
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 联系与支持

- 技术支持: support@example.com
- 文档: https://docs.example.com
- GitHub Issues: https://github.com/your-repo/issues

---

**文档版本**: 1.0
**更新日期**: 2026-03-13
**维护人员**: DevOps Team
