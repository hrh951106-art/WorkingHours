# 精益工时管理系统 - 生产环境部署指南

## 目录

1. [系统概述](#系统概述)
2. [环境要求](#环境要求)
3. [部署准备](#部署准备)
4. [数据库配置](#数据库配置)
5. [应用部署](#应用部署)
6. [数据迁移](#数据迁移)
7. [验证测试](#验证测试)
8. [常见问题](#常见问题)
9. [附录](#附录)

---

## 系统概述

### 系统架构

```
┌─────────────────┐
│   前端 (React)  │
│   Port: 3000    │
└────────┬────────┘
         │ HTTP/HTTPS
         │
┌────────▼────────┐
│  后端 (NestJS)  │
│   Port: 3001    │
└────────┬────────┘
         │
         │
┌────────▼────────┐
│ PostgreSQL DB   │
│   Port: 5432    │
└─────────────────┘
```

### 主要功能模块

- **人事管理**：员工信息、工作履历、学历管理
- **考勤管理**：打卡记录、考勤统计
- **工时管理**：工时计算、工时分摊
- **劳动力账户**：账户管理、账户生成
- **排班管理**：班次管理、排班计划

---

## 环境要求

### 硬件要求

**最低配置**：
- CPU: 2核
- 内存: 4GB
- 磁盘: 20GB

**推荐配置**：
- CPU: 4核+
- 内存: 8GB+
- 磁盘: 50GB+ SSD

### 软件要求

| 软件 | 版本 | 说明 |
|------|------|------|
| Node.js | 18.x 或 20.x | 运行时环境 |
| PostgreSQL | 14.x 或更高 | 数据库 |
| npm 或 pnpm | 最新版 | 包管理器 |
| Git | 2.x+ | 版本控制 |
| Nginx (可选) | 1.x+ | 反向代理 |

### 操作系统

- Linux (推荐: Ubuntu 20.04+, CentOS 8+)
- macOS 10.15+
- Windows 10+ (需要 WSL2)

---

## 部署准备

### 1. 代码准备

```bash
# 克隆代码仓库（如果还没有）
git clone <repository-url>
cd JY

# 检查分支
git branch
# 应该在 main 分支
```

### 2. 创建生产环境配置文件

```bash
# 复制环境配置模板
cp backend/.env.production backend/.env.production.local

# 编辑配置文件
vim backend/.env.production.local
```

**配置内容**：

```env
# 生产环境配置
NODE_ENV=production
PORT=3001

# 数据库配置（重要：请修改为实际值）
DATABASE_URL="postgresql://username:password@localhost:5432/jy_production?schema=public"

# JWT配置（重要：请修改为强密码）
JWT_SECRET="your-super-secret-jwt-key-change-in-production-min-32-chars"
JWT_EXPIRES_IN="7d"

# 前端URL（用于CORS配置）
FRONTEND_URL="https://your-frontend-domain.com"

# 日志级别
LOG_LEVEL="info"

# 文件上传配置
MAX_FILE_SIZE=10485760
UPLOAD_DIR="./uploads"
```

### 3. 安装依赖

```bash
cd backend
npm ci --production
```

---

## 数据库配置

### 1. 安装 PostgreSQL

**Ubuntu/Debian**:

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS**:

```bash
brew install postgresql
brew services start postgresql
```

### 2. 创建数据库和用户

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 执行以下 SQL
CREATE USER jy_user WITH PASSWORD 'your-strong-password';
CREATE DATABASE jy_production OWNER jy_user;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
```

### 3. 配置 PostgreSQL 远程连接（可选）

如果数据库和应用服务器分离：

```bash
# 编辑 postgresql.conf
sudo vim /etc/postgresql/14/main/postgresql.conf
# 修改: listen_addresses = '*'

# 编辑 pg_hba.conf
sudo vim /etc/postgresql/14/main/pg_hba.conf
# 添加: host    all    all    0.0.0.0/0    md5

# 重启服务
sudo systemctl restart postgresql
```

### 4. 执行数据库迁移脚本

迁移脚本位于：`backend/scripts/postgres-migrations/`

**执行顺序**：

```bash
cd backend

# 1. 初始化数据源（必须最先执行）
psql -U jy_user -d jy_production -f scripts/postgres-migrations/003-init-datasources.sql

# 2. 修复字段类型
psql -U jy_user -d jy_production -f scripts/postgres-migrations/004-fix-employee-field-types.sql

# 3. 验证数据源配置
psql -U jy_user -d jy_production -f scripts/postgres-migrations/005-verify-datasources.sql
```

### 5. 初始化数据库结构

```bash
# 生成 Prisma Client
npm run prisma:generate

# 推送数据库结构
DATABASE_URL="postgresql://jy_user:your-strong-password@localhost:5432/jy_production?schema=public" \
  npm run prisma:push

# （可选）执行种子数据
npm run prisma:seed:all
```

---

## 应用部署

### 1. 构建生产版本

```bash
cd backend

# 构建 TypeScript 代码
npm run build

# 验证构建结果
ls -la dist/
# 应该看到 main.js 和其他编译后的文件
```

### 2. 配置进程管理器（使用 PM2）

**安装 PM2**:

```bash
npm install -g pm2
```

**创建 PM2 配置文件**:

```bash
# 创建 ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: './dist/main.js',
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
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
EOF
```

**启动应用**:

```bash
# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
# 按照提示执行输出的命令
```

### 3. 配置 Nginx 反向代理（可选但推荐）

**安装 Nginx**:

```bash
sudo apt install nginx
```

**创建站点配置**:

```bash
sudo vim /etc/nginx/sites-available/jy-api
```

**配置内容**:

```nginx
upstream jy_backend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    # SSL 证书配置（使用 Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # 日志
    access_log /var/log/nginx/jy-api.access.log;
    error_log /var/log/nginx/jy-api.error.log;

    # 代理配置
    location / {
        proxy_pass http://jy_backend;
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

    # 文件上传大小限制
    client_max_body_size 10M;
}
```

**启用站点**:

```bash
sudo ln -s /etc/nginx/sites-available/jy-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 4. 配置防火墙

```bash
# 允许 HTTP
sudo ufw allow 80/tcp

# 允许 HTTPS
sudo ufw allow 443/tcp

# 允许 SSH
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable
```

---

## 数据迁移

### 从 SQLite 迁移到 PostgreSQL

如果现有系统使用 SQLite，需要迁移数据：

**1. 导出 SQLite 数据**:

```bash
# 从开发环境导出
cd backend
npm run prisma:seed:export-sqlite
```

**2. 转换并导入到 PostgreSQL**:

```bash
# 使用数据迁移脚本
npm run migrate:sqlite-to-postgres
```

**3. 验证数据**:

```bash
# 检查记录数量
psql -U jy_user -d jy_production -c "
SELECT
    'Employee' AS table_name, COUNT(*) AS count
FROM \"Employee\"
UNION ALL
SELECT
    'Organization', COUNT(*)
FROM \"Organization\"
UNION ALL
SELECT
    'WorkInfoHistory', COUNT(*)
FROM \"WorkInfoHistory\";
"
```

---

## 验证测试

### 1. 健康检查

```bash
# 检查应用是否启动
curl http://localhost:3001/health

# 预期输出
# {"status":"ok","timestamp":"2026-03-31T12:00:00.000Z"}
```

### 2. API 测试

```bash
# 测试登录接口
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试获取组织树
curl http://localhost:3001/api/hr/organizations/tree \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 3. 数据库连接测试

```bash
psql -U jy_user -d jy_production -c "SELECT NOW();"

# 检查表结构
psql -U jy_user -d jy_production -c "\dt"
```

### 4. 前端连接测试

修改前端环境变量文件 `.env.production`:

```env
REACT_APP_API_URL=https://api.yourdomain.com
```

构建并部署前端：

```bash
cd ../frontend
npm run build
# 部署 dist/ 目录到 Web 服务器
```

### 5. 功能测试清单

- [ ] 用户登录/登出
- [ ] 员工列表查看
- [ ] 员工详情页面（基本信息显示正确）
- [ ] 员工详情页面（工作信息显示正确）
- [ ] 下拉字段显示标签而不是值
- [ ] 编辑/保存员工信息
- [ ] 组织树显示
- [ ] 考勤记录查询
- [ ] 工时记录查询

---

## 常见问题

### Q1: 应用启动失败

**错误信息**: `Error: Cannot find module '@prisma/client'`

**解决方案**:
```bash
npm run prisma:generate
npm run build
```

### Q2: 数据库连接失败

**错误信息**: `Can't reach database server at localhost`

**解决方案**:
```bash
# 检查 PostgreSQL 是否运行
sudo systemctl status postgresql

# 检查数据库是否存在
psql -U postgres -c "\l"

# 检查连接字符串
echo $DATABASE_URL
```

### Q3: 字段显示为空

**错误信息**: 员工详情页面字段显示为空

**解决方案**:
```bash
# 执行字段类型修复脚本
psql -U jy_user -d jy_production \
  -f scripts/postgres-migrations/004-fix-employee-field-types.sql

# 重启应用
pm2 restart jy-backend
```

### Q4: 数据源未找到

**错误信息**: `DataSource not found for field: nation`

**解决方案**:
```bash
# 执行数据源初始化脚本
psql -U jy_user -d jy_production \
  -f scripts/postgres-migrations/003-init-datasources.sql

# 验证数据源
psql -U jy_user -d jy_production \
  -f scripts/postgres-migrations/005-verify-datasources.sql
```

### Q5: PM2 进程频繁重启

**错误信息**: PM2 显示应用反复重启

**解决方案**:
```bash
# 查看日志
pm2 logs jy-backend --lines 50

# 检查端口占用
sudo lsof -i :3001

# 检查环境变量
pm2 env 0
```

---

## 附录

### A. 完整的迁移脚本清单

```
backend/scripts/postgres-migrations/
├── 003-init-datasources.sql          # 数据源初始化
├── 004-fix-employee-field-types.sql  # 字段类型修复
└── 005-verify-datasources.sql        # 数据源验证
```

### B. 系统维护命令

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs jy-backend

# 重启应用
pm2 restart jy-backend

# 停止应用
pm2 stop jy-backend

# 更新应用
git pull
npm ci --production
npm run build
pm2 restart jy-backend

# 数据库备份
pg_dump -U jy_user -d jy_production > backup_$(date +%Y%m%d).sql

# 数据库恢复
psql -U jy_user -d jy_production < backup_20260331.sql
```

### C. 性能优化建议

1. **数据库优化**:
   - 为常用查询字段添加索引
   - 定期运行 VACUUM ANALYZE
   - 配置连接池

2. **应用优化**:
   - 使用 Redis 缓存热点数据
   - 启用 Gzip 压缩
   - 配置 CDN 加速静态资源

3. **监控告警**:
   - 配置 PM2 监控
   - 设置日志轮转
   - 配置错误告警

### D. 备份策略

**日常备份**:

```bash
# 创建备份脚本
cat > /home/jy/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/jy/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份数据库
pg_dump -U jy_user -d jy_production > $BACKUP_DIR/db_$DATE.sql

# 备份上传文件
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz uploads/

# 删除7天前的备份
find $BACKUP_DIR -mtime +7 -delete
EOF

chmod +x /home/jy/backup.sh

# 添加到 crontab（每天凌晨2点执行）
crontab -e
# 添加: 0 2 * * * /home/jy/backup.sh
```

### E. 联系方式

- 技术支持: support@example.com
- 文档地址: https://docs.example.com
- 问题反馈: https://github.com/example/jy/issues

---

**文档版本**: v1.0.0
**最后更新**: 2026-03-31
**维护人**: 开发团队
