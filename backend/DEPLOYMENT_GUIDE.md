# 生产环境部署指南

## 目录

1. [环境准备](#环境准备)
2. [数据库部署](#数据库部署)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [系统配置](#系统配置)
6. [常见问题](#常见问题)

## 环境准备

### 系统要求

- **Node.js**: >= 18.x
- **PostgreSQL**: >= 14.x
- **npm** 或 **yarn**
- **PM2** (进程管理器，推荐)
- **Nginx** (可选，用于反向代理)

### 安装依赖

```bash
# 安装Node.js (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
apt-get install -y nodejs

# 安装PM2
npm install -g pm2

# 安装PostgreSQL (Ubuntu/Debian)
sudo apt-get update
sudo apt-get install postgresql postgresql-contrib
```

## 数据库部署

### 1. 创建PostgreSQL数据库

```bash
# 切换到postgres用户
sudo -u postgres psql

# 创建数据库和用户
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
```

### 2. 导入数据

项目已生成PostgreSQL兼容的SQL文件：

```bash
cd /path/to/JY/backend

# 导入表结构
psql -h localhost -U jy_user -d jy_production -f postgres-export/schema.sql

# 导入数据
psql -h localhost -U jy_user -d jy_production -f postgres-export/data.sql
```

### 3. 更新Prisma Schema

编辑 `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 4. 验证数据库

```bash
psql -h localhost -U jy_user -d jy_production
\dt  # 列出所有表
SELECT COUNT(*) FROM "User";  # 验证数据
\q
```

## 后端部署

### 1. 配置环境变量

创建生产环境配置文件 `.env.production`:

```bash
# 数据库配置
DATABASE_URL="postgresql://jy_user:your_secure_password@localhost:5432/jy_production?schema=public"

# JWT配置
JWT_SECRET="your-production-jwt-secret-change-this"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
NODE_ENV="production"

# 前端URL (用于CORS)
FRONTEND_URL="https://your-domain.com"
```

### 2. 构建项目

```bash
cd /path/to/JY/backend

# 安装依赖
npm ci --only=production

# 生成Prisma客户端
npm run prisma:generate

# 构建项目
npm run build
```

### 3. 使用PM2启动

创建 `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
  }]
};
```

启动服务:

```bash
# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs jy-backend

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 测试API

```bash
# 测试健康检查
curl http://localhost:3001/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## 前端部署

### 1. 构建前端项目

```bash
cd /path/to/JY/frontend

# 安装依赖
npm ci --only=production

# 构建生产版本
npm run build
```

### 2. 部署到Nginx

创建Nginx配置 `/etc/nginx/sites-available/jy-frontend`:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /path/to/JY/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
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
    }

    # 日志
    access_log /var/log/nginx/jy_access.log;
    error_log /var/log/nginx/jy_error.log;
}
```

启用配置:

```bash
# 创建符号链接
sudo ln -s /etc/nginx/sites-available/jy-frontend /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重载Nginx
sudo systemctl reload nginx
```

### 3. HTTPS配置 (使用Let's Encrypt)

```bash
# 安装Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

## 系统配置

### 1. 防火墙配置

```bash
# UFW防火墙
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable
```

### 2. 系统优化

编辑 `/etc/sysctl.conf`:

```conf
# 提高文件描述符限制
fs.file-max = 2097152

# TCP优化
net.ipv4.tcp_fin_timeout = 30
net.ipv4.tcp_keepalive_time = 600
net.ipv4.tcp_max_syn_backlog = 4096
```

应用配置:

```bash
sudo sysctl -p
```

### 3. 日志轮转

创建 `/etc/logrotate.d/jy-app`:

```
/path/to/JY/backend/logs/*.log {
    daily
    missingok
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
```

## 监控和维护

### 1. PM2监控

```bash
# 安装监控模块
pm2 install pm2-logrotate

# 查看监控面板
pm2 monit
```

### 2. 数据库备份

创建备份脚本 `backup-db.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/jy"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jy_backup_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -h localhost -U jy_user jy_production | gzip > $BACKUP_FILE

# 保留最近7天的备份
find $BACKUP_DIR -name "jy_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

设置定时任务:

```bash
# 编辑crontab
crontab -e

# 每天凌晨2点执行备份
0 2 * * * /path/to/backup-db.sh
```

### 3. 日志监控

```bash
# 查看错误日志
pm2 logs jy-backend --err

# 实时监控
tail -f /path/to/JY/backend/logs/error.log
```

## 常见问题

### 1. 数据库连接失败

**问题**: `PrismaClientInitializationError: Unable to open database file`

**解决方案**:
- 检查 `DATABASE_URL` 是否正确
- 确认PostgreSQL服务运行状态: `sudo systemctl status postgresql`
- 验证数据库权限: `psql -h localhost -U jy_user -d jy_production`

### 2. 端口被占用

**问题**: `Error: listen EADDRINUSE: address already in use`

**解决方案**:
```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或修改PORT环境变量
```

### 3. 内存不足

**问题**: `JavaScript heap out of memory`

**解决方案**:
```bash
# 在ecosystem.config.js中添加
node_args: '--max-old-space-size=1024'
```

### 4. Prisma客户端过时

**问题**: `You may need to run prisma generate`

**解决方案**:
```bash
npm run prisma:generate
npm run build
pm2 restart jy-backend
```

### 5. CORS错误

**问题**: 前端无法访问后端API

**解决方案**:
- 检查 `.env` 中的 `FRONTEND_URL`
- 确保Nginx代理配置正确
- 验证防火墙规则

## 更新部署

### 1. 后端更新

```bash
cd /path/to/JY/backend

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci --only=production

# 重新生成Prisma客户端（如有schema变更）
npm run prisma:generate

# 构建项目
npm run build

# 重启服务
pm2 restart jy-backend
```

### 2. 前端更新

```bash
cd /path/to/JY/frontend

# 拉取最新代码
git pull origin main

# 安装依赖
npm ci --only=production

# 构建项目
npm run build

# 无需重启，Nginx会自动服务新文件
```

### 3. 数据库迁移

```bash
# 执行数据库迁移
npx prisma migrate deploy

# 或使用push（开发环境）
npx prisma db push
```

## 安全建议

1. **修改默认密码**: 首次部署后立即修改admin账户密码
2. **环境变量保护**: 确保 `.env` 文件权限为 `600`
3. **定期更新**: 保持系统和依赖包更新
4. **备份验证**: 定期测试备份恢复流程
5. **监控告警**: 设置日志监控和错误告警
6. **HTTPS**: 生产环境必须使用HTTPS
7. **防火墙**: 只开放必要的端口
8. **日志审计**: 定期审查访问日志

## 性能优化

### 1. 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_employee_employee_no ON Employee(employeeNo);
CREATE INDEX idx_work_hour_result_employee_date ON WorkHourResult(employeeId, workDate);
```

### 2. 缓存策略

- 使用Redis缓存热点数据
- 启用Nginx静态文件缓存
- 配置CDN加速静态资源

### 3. 负载均衡

```bash
# PM2集群模式
pm2 start ecosystem.config.js --instances max
```

## 联系支持

如遇到部署问题，请提供以下信息：
- 操作系统版本
- Node.js版本
- PostgreSQL版本
- 错误日志
- 复现步骤

---

**文档版本**: 1.0
**更新日期**: 2026-06-01
**维护者**: 开发团队
