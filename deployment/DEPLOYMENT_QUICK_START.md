# 精益工时管理系统 - 快速部署指南

## 前置条件

在开始部署前，请确保你已经准备好：

1. 一台运行 Linux 的服务器（推荐 Ubuntu 20.04+ 或 CentOS 8+）
2. 服务器 root 权限或 sudo 权限
3. 域名和 SSL 证书（或使用 HTTP 进行测试）
4. 数据库备份文件（位于 `deployment/` 目录）

---

## 快速部署步骤

### 1. 准备部署文件

在本地（开发环境）执行：

```bash
# 1. 创建部署包
cd backend
tar -czf jy-backend.tar.gz \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.git \
  --exclude=dev.db \
  --exclude='*.log' \
  .

cd ../frontend
npm run build
tar -czf jy-frontend-dist.tar.gz -C dist .

# 2. 将所有部署文件上传到服务器
scp jy-backend.tar.gz user@your-server:/var/www/
scp jy-frontend-dist.tar.gz user@your-server:/var/www/
scp deployment/jy_production_backup_*.sql user@your-server:/var/www/
scp deployment/*.sh user@your-server:/var/www/
```

### 2. 在服务器上安装依赖

SSH 登录到服务器后执行：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y  # Ubuntu/Debian
# sudo yum update -y  # CentOS

# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 安装 Nginx
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装 PM2
sudo npm install -g pm2

# 验证安装
node --version   # 应显示 v20.x.x
npm --version
psql --version
nginx -v
pm2 --version
```

### 3. 初始化数据库

> **重要说明**：
> - 备份文件已从 SQLite 转换为 PostgreSQL 格式
> - 包含完整的表结构、数据和序列配置
> - 无需执行其他 SQL 或迁移脚本
> - 数据库必须为空才能导入

```bash
cd /var/www

# 方式1：使用自动化脚本（推荐）
sudo chmod +x setup-database.sh
sudo ./setup-database.sh \
  -f jy_production_backup_20260529_012310.sql \
  -p your_secure_password_here

# 方式2：手动导入
# 先创建数据库（如果还没有）
sudo -u postgres psql -c "CREATE DATABASE jy_production;"
sudo -u postgres psql -c "CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;"

# 然后导入数据
PGPASSWORD="your_password" psql -U jy_user -d jy_production -f jy_production_backup_20260529_012310.sql
```

**验证导入结果**：

```bash
# 查看表数量
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';"

# 检查数据
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM \"User\";"
sudo -u postgres psql -d jy_production -c "SELECT COUNT(*) FROM \"Employee\";"
```

### 4. 部署后端

```bash
cd /var/www

# 解压后端代码
sudo mkdir -p /var/www/jy-backend
sudo tar -xzf jy-backend.tar.gz -C jy-backend

# 进入目录
cd jy-backend

# 创建环境配置文件
sudo nano .env.production
```

复制以下配置到 `.env.production`：

```bash
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production?schema=public"
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="https://your-domain.com"
LOG_LEVEL="info"
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

创建 PM2 配置文件 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: './dist/src/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    time: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
```

运行部署脚本：

```bash
sudo chmod +x /var/www/deploy-backend.sh
cd /var/www/jy-backend
sudo /var/www/deploy-backend.sh
```

### 5. 部署前端

```bash
cd /var/www

# 解压前端文件到临时目录
sudo mkdir -p /tmp/jy-frontend-dist
sudo tar -xzf jy-frontend-dist.tar.gz -C /tmp/jy-frontend-dist

# 运行前端部署脚本
sudo chmod +x deploy-frontend.sh
sudo ./deploy-frontend.sh /tmp/jy-frontend-dist
```

### 6. 配置 Nginx

```bash
# 创建 Nginx 配置
sudo nano /etc/nginx/sites-available/jy-system
```

复制以下配置：

```nginx
upstream jy_backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location /api/ {
        proxy_pass http://jy_backend/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        root /var/www/jy-frontend;
        try_files $uri $uri/ /index.html;
    }

    client_max_body_size 10M;
}
```

启用配置并重启 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/jy-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. 配置 SSL（可选但推荐）

```bash
# 安装 Certbot
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 设置自动续期
sudo crontab -e
# 添加：0 0 * * * /usr/bin/certbot renew --quiet
```

### 8. 配置自动备份

```bash
# 创建备份脚本
sudo nano /usr/local/bin/backup-jy-db.sh
```

填入以下内容：

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/jy-database"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
PGPASSWORD="your_password" pg_dump -U jy_user -h localhost jy_production > "$BACKUP_DIR/jy_production_$TIMESTAMP.sql"
gzip "$BACKUP_DIR/jy_production_$TIMESTAMP.sql"
find "$BACKUP_DIR" -name "jy_production_*.sql.gz" -mtime +30 -delete
echo "数据库备份完成: ${BACKUP_DIR}/jy_production_${TIMESTAMP}.sql.gz"
```

设置权限和定时任务：

```bash
sudo chmod +x /usr/local/bin/backup-jy-db.sh
sudo crontab -e
# 添加：0 2 * * * /usr/local/bin/backup-jy-db.sh >> /var/log/jy-backup.log 2>&1
```

### 9. 验证部署

```bash
# 检查后端服务
sudo pm2 status

# 检查 Nginx
sudo systemctl status nginx

# 测试 API
curl http://localhost:3001/api/health

# 在浏览器中访问
# https://your-domain.com
```

---

## 常用管理命令

### 后端服务管理

```bash
# 查看状态
sudo pm2 status

# 查看日志
sudo pm2 logs jy-backend

# 重启服务
sudo pm2 restart jy-backend

# 停止服务
sudo pm2 stop jy-backend

# 热重载（零停机）
sudo pm2 reload jy-backend
```

### 数据库管理

```bash
# 手动备份
PGPASSWORD="your_password" pg_dump -U jy_user -h localhost jy_production > backup.sql

# 恢复数据库
PGPASSWORD="your_password" psql -U jy_user -h localhost jy_production < backup.sql

# 连接数据库
psql -U jy_user -d jy_production
```

### 系统监控

```bash
# 查看 PM2 监控
sudo pm2 monit

# 查看系统资源
htop

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/jy-error.log

# 查看应用日志
sudo tail -f /var/www/jy-backend/logs/combined.log
```

---

## 故障排查

### 后端无法启动

```bash
# 查看详细日志
sudo pm2 logs jy-backend --err

# 手动运行测试
cd /var/www/jy-backend
NODE_ENV=production PORT=3001 node dist/src/main.js

# 检查端口占用
sudo netstat -tlnp | grep 3001
```

### 数据库连接失败

```bash
# 测试连接
psql -U jy_user -d jy_production -h localhost

# 检查 PostgreSQL 状态
sudo systemctl status postgresql

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

### 前端无法访问

```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/jy-error.log

# 检查文件权限
ls -la /var/www/jy-frontend
```

---

## 更新应用

### 更新后端

```bash
# 1. 上传新代码
scp jy-backend.tar.gz user@your-server:/var/www/

# 2. 在服务器上更新
cd /var/www/jy-backend
sudo /var/www/deploy-backend.sh

# 或者手动更新
sudo tar -xzf /var/www/jy-backend.tar.gz -C /var/www/jy-backend
sudo npm install --production
sudo npm run build
sudo pm2 reload jy-backend
```

### 更新前端

```bash
# 1. 在本地构建
cd frontend
npm run build
tar -czf jy-frontend-dist.tar.gz -C dist .

# 2. 上传并部署
scp jy-frontend-dist.tar.gz user@your-server:/var/www/
ssh user@your-server

# 3. 在服务器上部署
cd /var/www
sudo tar -xzf jy-frontend-dist.tar.gz -C /tmp/jy-frontend-dist
sudo ./deploy-frontend.sh /tmp/jy-frontend-dist
```

---

## 生产环境优化建议

### 1. 性能优化

- 启用 Nginx Gzip 压缩
- 配置静态资源缓存
- 启用 PostgreSQL 连接池
- 适当增加 PM2 实例数量（根据 CPU 核心数）

### 2. 安全加固

- 配置防火墙（ufw 或 firewalld）
- 限制数据库远程访问
- 定期更新系统补丁
- 使用强密码和 SSL 证书

### 3. 监控告警

- 配置 PM2 监控和自动重启
- 设置日志轮换
- 配置磁盘空间监控
- 设置数据库备份监控

### 4. 高可用

- 考虑使用负载均衡器
- 配置数据库主从复制
- 设置定期灾难恢复演练

---

## 联系支持

如遇到部署问题，请联系技术支持团队或查看详细文档：

- 完整部署文档: `PRODUCTION_DEPLOYMENT_GUIDE.md`
- 问题反馈: https://github.com/your-repo/issues
- 技术支持: support@your-domain.com

---

**祝你部署成功！** 🎉
