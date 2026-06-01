# 生产环境完整部署指南

## 目录

1. [系统要求](#系统要求)
2. [PostgreSQL安装与配置](#postgresql安装与配置)
3. [数据库创建与导入](#数据库创建与导入)
4. [后端部署](#后端部署)
5. [前端部署](#前端部署)
6. [Nginx配置](#nginx配置)
7. [SSL证书配置](#ssl证书配置)
8. [验证部署](#验证部署)
9. [常见问题](#常见问题)

---

## 系统要求

- **操作系统**: Ubuntu 20.04+ / CentOS 7+ / macOS 12+
- **Node.js**: >= 18.x
- **PostgreSQL**: >= 14.x
- **内存**: >= 2GB
- **磁盘**: >= 20GB

---

## PostgreSQL安装与配置

### Ubuntu/Debian

```bash
# 1. 更新包管理器
sudo apt-get update

# 2. 安装PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# 3. 启动PostgreSQL服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 4. 验证安装
sudo -u postgres psql --version
```

### 配置PostgreSQL

```bash
# 1. 切换到postgres用户
sudo -u postgres psql

# 2. 设置postgres用户密码
ALTER USER postgres WITH PASSWORD 'your_postgres_password';
\q
```

---

## 数据库创建与导入

### 步骤1: 创建数据库和用户

```bash
# 连接到PostgreSQL
sudo -u postgres psql

# 在psql中执行以下命令：
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q
```

### 步骤2: 验证数据库连接

```bash
# 测试连接
psql -h localhost -U jy_user -d jy_production
# 输入密码后应该能成功连接
\q
```

### 步骤3: 导入表结构（87个表）

```bash
cd /path/to/JY/backend

# 导入表结构文件
psql -h localhost -U jy_user -d jy_production -f postgres-export/01-schema.sql
```

**预期输出**:
```
SET
DROP SCHEMA
CREATE SCHEMA
GRANT
...
```

### 步骤4: 导入数据

```bash
# 导入完整数据
psql -h localhost -U jy_user -d jy_production -f postgres-export/02-data.sql
```

**预期输出**:
```
BEGIN
TRUNCATE TABLE
INSERT 0 7
INSERT 0 42
...
COMMIT

NOTICE:  已导入 87 个表
NOTICE:  表 AccountHierarchyConfig: 7 行
NOTICE:  表 AccountHierarchyLevelDetail: 42 行
...
```

### 步骤5: 验证导入

```bash
# 连接到数据库
psql -h localhost -U jy_user -d jy_production
```

在psql中执行验证查询：

```sql
-- 1. 验证表数量
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 预期结果: 87

-- 2. 验证关键表数据统计
SELECT 'User' as table_name, COUNT(*) as row_count FROM "User"
UNION ALL
SELECT 'Employee', COUNT(*) FROM Employee
UNION ALL
SELECT 'LaborAccount', COUNT(*) FROM LaborAccount
UNION ALL
SELECT 'WorkHourResult', COUNT(*) FROM WorkHourResult;
/*
预期结果:
table_name    | row_count
--------------+----------
User          |        22
Employee      |        20
LaborAccount  |       235
WorkHourResult|       113
*/

-- 3. 验证管理员账户
SELECT id, username, name, status FROM "User" WHERE username = 'admin';
/* 预期结果:
id | username |   name    | status
----+----------+-----------+--------
  1 | admin    | 系统管理员 | ACTIVE
*/

-- 4. 验证外键关系
SELECT COUNT(*) FROM "UserRole";
-- 预期: 22

\q
```

### 步骤6: 验证序列（SERIAL自增）

```sql
-- 检查序列是否正确设置
SELECT
    table_name,
    column_name,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND column_default LIKE 'nextval%'
ORDER BY table_name;
-- 应该显示所有自增字段的序列配置
```

---

## 后端部署

### 步骤1: 安装Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

node --version
npm --version
```

### 步骤2: 上传项目文件

```bash
sudo mkdir -p /var/www/jy-backend
cd /var/www/jy-backend

# 从本地上传
scp -r /path/to/JY/backend/* user@server:/var/www/jy-backend/
```

### 步骤3: 安装依赖

```bash
cd /var/www/jy-backend
npm ci --only=production
```

### 步骤4: 配置环境变量

```bash
cat > .env << 'EOF'
# 数据库配置
DATABASE_URL="postgresql://jy_user:your_strong_password_here@localhost:5432/jy_production?schema=public"

# JWT配置
JWT_SECRET="your-production-jwt-secret-min-32-characters-long"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
NODE_ENV="production"

# 前端URL
FRONTEND_URL="https://your-domain.com"
EOF

chmod 600 .env
```

### 步骤5: 更新Prisma配置

```bash
# 确认prisma/schema.prisma中是PostgreSQL
grep -A 2 'datasource db' prisma/schema.prisma
# 应该显示: provider = "postgresql"

# 生成Prisma客户端
npm run prisma:generate
```

### 步骤6: 构建项目

```bash
npm run build
ls -la dist/
```

### 步骤7: 使用PM2启动

```bash
# 安装PM2
sudo npm install -g pm2

# 创建配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'jy-backend',
    script: 'dist/main.js',
    instances: 1,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    autorestart: true,
  }]
};
EOF

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 前端部署

### 步骤1: 构建前端

```bash
# 在本地执行
cd /path/to/JY/frontend
npm run build
```

### 步骤2: 上传到服务器

```bash
sudo mkdir -p /var/www/jy-frontend
scp -r /path/to/JY/frontend/dist/* user@server:/var/www/jy-frontend/
sudo chown -R www-data:www-data /var/www/jy-frontend
sudo chmod -R 755 /var/www/jy-frontend
```

---

## Nginx配置

### 安装Nginx

```bash
sudo apt-get install nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 创建配置文件

```bash
sudo nano /etc/nginx/sites-available/jy-app
```

粘贴以下内容：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/jy-frontend;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/jy-app /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## SSL证书配置

### 使用Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## 验证部署

### 完整测试

```bash
# 1. 测试前端
curl -I https://your-domain.com

# 2. 测试API
curl https://your-domain.com/api/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 3. 检查服务状态
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

---

## 常见问题

### 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 检查连接
psql -h localhost -U jy_user -d jy_production
```

### 导入失败

```bash
# 查看详细错误
psql -h localhost -U jy_user -d jy_production -f postgres-export/01-schema.sql 2>&1 | tee import.log
cat import.log
```

### 后端启动失败

```bash
pm2 logs jy-backend --lines 50
```

---

## 附录

### 数据文件说明

- **01-schema.sql** (83 KB): 87个表的完整结构定义
- **02-data.sql** (664 KB): 所有表的完整数据

### 独立使用场景

1. **只更新结构**:
   ```bash
   psql -h localhost -U jy_user -d jy_production -f postgres-export/01-schema.sql
   ```

2. **只同步数据**:
   ```bash
   psql -h localhost -U jy_user -d jy_production -f postgres-export/02-data.sql
   ```

---

**文档版本**: 1.0
**最后更新**: 2026-06-01
**维护者**: 开发团队
