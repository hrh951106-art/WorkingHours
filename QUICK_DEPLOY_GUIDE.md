# 精益工时管理系统 - 部署指南

## 🎯 项目简介

这是一个企业级工时管理系统，用于管理员工考勤、排班、工时计算等业务。

**适用场景**：制造业、服务业等需要精细化工时管理的企业

**核心功能**：
- 组织架构与员工管理
- 智能排班与考勤
- 自动化工时计算
- 权限管理与数据控制

---

## 📦 部署前准备

### 系统要求
- **操作系统**: Linux/macOS/Windows
- **内存**: 至少 4GB RAM（推荐 8GB+）
- **磁盘**: 至少 20GB 可用空间
- **Node.js**: 18.x 或 20.x
- **Docker**: 20.10+ (可选，推荐使用)

---

## 方式一：Docker 一键部署（推荐⭐）

### 1. 使用Docker Compose（最简单）

```bash
# 进入项目目录
cd /path/to/jy-system

# 启动所有服务（数据库+后端+前端）
docker-compose up -d

# 查看启动日志
docker-compose logs -f

# 检查服务状态
docker-compose ps
```

**访问地址**：
- 前端: http://localhost
- 后端API: http://localhost:3001
- API文档: http://localhost:3001/api-docs

**默认账号**：
- 用户名: `admin`
- 密码: `admin123`

### 2. 配置环境变量（可选）

如需自定义配置，编辑 `docker-compose.yml`：

```yaml
environment:
  # 修改JWT密钥（必须修改）
  JWT_SECRET: "your-super-secret-jwt-key-min-32-chars"

  # 修改数据库密码
  POSTGRES_PASSWORD: "your-db-password"

  # 修改前端API地址
  VITE_API_BASE_URL: "https://your-backend-domain.com/api"
```

### 3. 常用Docker命令

```bash
# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 停止并删除数据
docker-compose down -v

# 更新并重新构建
docker-compose up -d --build
```

---

## 方式二：手动部署（传统方式）

### 第一步：启动数据库

#### 使用Docker启动PostgreSQL（推荐）

```bash
docker run -d \
  --name jy-postgres \
  -e POSTGRES_USER=jy_user \
  -e POSTGRES_PASSWORD=jy_password \
  -e POSTGRES_DB=jy_db \
  -p 5432:5432 \
  postgres:15-alpine
```

#### 或安装本地PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# 创建数据库
sudo -u postgres psql
CREATE USER jy_user WITH PASSWORD 'jy_password';
CREATE DATABASE jy_db OWNER jy_user;
\q
```

### 第二步：部署后端

```bash
# 进入后端目录
cd backend

# 安装依赖
npm install

# 配置环境变量
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://jy_user:jy_password@localhost:5432/jy_db?schema=public"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost"
EOF

# 初始化数据库
npm run prisma:generate
npm run prisma:push
npm run prisma:seed  # 可选，导入初始数据

# 构建生产版本
npm run build

# 启动后端（开发模式）
npm run start:dev

# 或启动生产版本
npm run start:prod

# 或使用PM2管理进程
npm install -g pm2
pm2 start dist/src/main.js --name jy-backend
pm2 save
pm2 startup
```

**验证后端**：
```bash
curl http://localhost:3001/api/auth/health
# 应该返回: {"status":"ok","timestamp":"..."}
```

### 第三步：部署前端

#### 选项A：使用Vite预览服务器（测试）

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量
cat > .env << 'EOF'
VITE_API_BASE_URL=http://localhost:3001/api
EOF

# 构建生产版本
npm run build

# 启动预览服务器
npm run preview

# 访问: http://localhost:4173
```

#### 选项B：使用Nginx（生产环境推荐）

```bash
# 进入前端目录
cd frontend

# 安装依赖
npm install

# 配置环境变量
cat > .env.production << 'EOF'
VITE_API_BASE_URL=https://your-backend-domain.com/api
EOF

# 构建生产版本
npm run build

# 安装Nginx（如果未安装）
sudo apt-get install -y nginx

# 部署到Nginx
sudo cp -r dist/* /var/www/jy/
sudo chown -R www-data:www-data /var/www/jy

# 配置Nginx
sudo tee /etc/nginx/sites-available/jy << 'EOF'
server {
    listen 80;
    server_name localhost;
    root /var/www/jy;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
EOF

# 启用配置
sudo ln -s /etc/nginx/sites-available/jy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 访问: http://localhost
```

---

## 方式三：开发模式启动

### 启动开发环境（用于开发调试）

```bash
# 终端1：启动后端
cd backend
npm install
npm run start:dev

# 终端2：启动前端
cd frontend
npm install
npm run dev

# 访问: http://localhost:5173
```

---

## 🔧 配置说明

### 后端环境变量 (.env)

```bash
# 运行环境
NODE_ENV=production

# 服务端口
PORT=3001

# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/jy_db"

# JWT配置（必须修改为随机字符串）
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"

# 前端URL（用于CORS）
FRONTEND_URL="http://localhost"

# 日志级别
LOG_LEVEL="info"
```

### 前端环境变量 (.env)

```bash
# API基础URL
VITE_API_BASE_URL=http://localhost:3001/api
```

---

## ✅ 验证部署

### 1. 检查后端健康状态

```bash
curl http://localhost:3001/api/auth/health
```

预期输出：
```json
{"status":"ok","timestamp":"2026-03-13T..."}
```

### 2. 测试登录

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

预期输出：
```json
{
  "access_token": "...",
  "user": {
    "id": 1,
    "username": "admin",
    "name": "系统管理员"
  }
}
```

### 3. 访问前端

打开浏览器访问：http://localhost（或对应的端口）

使用默认账号登录：
- 用户名: `admin`
- 密码: `admin123`

---

## 🔐 安全加固（生产环境必须）

### 1. 修改默认密码

⚠️ **非常重要！部署后必须立即修改**

#### 修改数据库密码

```bash
# 编辑 backend/.env
DATABASE_URL="postgresql://jy_user:NEW_STRONG_PASSWORD@localhost:5432/jy_db"
```

#### 修改JWT密钥

```bash
# 生成随机密钥
openssl rand -base64 32

# 编辑 backend/.env
JWT_SECRET="<生成的随机密钥>"
```

#### 修改admin密码

登录系统后：
1. 进入"系统配置" → "用户管理"
2. 找到admin用户
3. 点击"编辑"，修改密码

### 2. 配置HTTPS（推荐）

```bash
# 安装Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取SSL证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 3. 配置防火墙

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
```

---

## 📊 监控与维护

### 查看日志

```bash
# Docker方式
docker-compose logs -f backend

# PM2方式
pm2 logs jy-backend

# 系统日志
tail -f /var/log/nginx/jy-error.log
```

### 重启服务

```bash
# Docker方式
docker-compose restart

# PM2方式
pm2 restart jy-backend

# Nginx
sudo systemctl reload nginx
```

### 数据备份

```bash
# 备份数据库
pg_dump -U jy_user jy_db > backup_$(date +%Y%m%d).sql

# 恢复数据库
psql -U jy_user jy_db < backup_20260313.sql
```

---

## 🐛 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3001
lsof -i :5173

# 杀死进程
kill -9 <PID>
```

### 2. 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 测试连接
psql -U jy_user -d jy_db -h localhost

# 检查防火墙
sudo ufw allow 5432
```

### 3. 前端空白页

- 检查API地址配置 (.env)
- 打开浏览器控制台查看错误 (F12)
- 确认后端服务正常运行

### 4. 登录失败

- 确认用户名和密码正确
- 检查后端日志
- 确认数据库已正确初始化

---

## 📚 更多文档

- **完整部署文档**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **快速开始指南**: [QUICK_START.md](./QUICK_START.md)
- **部署检查清单**: [CHECKLIST.md](./CHECKLIST.md)
- **生产检查报告**: [PRODUCTION_CHECK.md](./PRODUCTION_CHECK.md)

---

## 🆘 获取帮助

- 查看日志文件
- 检查配置文件
- 参考文档

---

**版本**: 1.0
**更新日期**: 2026-03-13
**维护团队**: DevOps Team
