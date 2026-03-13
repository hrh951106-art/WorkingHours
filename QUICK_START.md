# 快速部署指南

本文档提供了精益工时管理系统的快速部署步骤，适合快速测试和小规模部署。

## 前置条件

- 已安装 Node.js 18+ 和 npm
- 已安装 PostgreSQL 13+ 或 MySQL 8+
- 服务器访问权限 (Linux/macOS/Windows)

## 一键部署脚本

### Linux/macOS

```bash
#!/bin/bash

echo "=== 精益工时管理系统 - 快速部署 ==="

# 1. 检查Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未安装Node.js，请先安装 Node.js 18+"
    exit 1
fi

# 2. 后端部署
echo "=== 部署后端 ==="
cd backend
npm install
cp .env.production .env
# 编辑 .env 文件配置数据库连接
nano .env
npm run build
npm run prisma:generate
npm run prisma:push

# 使用PM2启动
npm install -g pm2
pm2 start dist/src/main.js --name jy-backend
pm2 save
pm2 startup

# 3. 前端部署
echo "=== 部署前端 ==="
cd ../frontend
npm install
# 编辑 .env.production 配置API地址
echo "请配置 .env.production 中的 VITE_API_BASE_URL"
nano .env.production
npm run build

# 4. Nginx配置 (可选)
echo "=== 前端已构建到 dist/ 目录 ==="
echo "请将 dist/ 目录内容部署到Web服务器"
echo "或使用以下命令快速测试:"
echo "  cd dist && python3 -m http.server 8080"

echo "=== 部署完成! ==="
echo "后端: http://localhost:3001"
echo "前端: http://localhost:8080 (使用Python测试)"
```

## 详细步骤

### 后端部署 (5分钟)

```bash
# 1. 进入后端目录
cd backend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/jy_db"
JWT_SECRET="your-secret-key-min-32-chars"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="http://localhost:5173"
EOF

# 4. 初始化数据库
npm run prisma:generate
npm run prisma:push
npm run prisma:seed  # 可选

# 5. 构建
npm run build

# 6. 启动
# 开发环境
npm run start:dev

# 生产环境
npm run start:prod

# 或使用PM2
pm2 start dist/src/main.js --name jy-backend
pm2 save
```

### 前端部署 (3分钟)

```bash
# 1. 进入前端目录
cd frontend

# 2. 安装依赖
npm install

# 3. 配置环境变量
cat > .env.production << 'EOF'
VITE_API_BASE_URL=http://localhost:3001/api
EOF

# 4. 构建
npm run build

# 5. 部署到Web服务器
# 方法1: 使用简单HTTP服务器 (测试)
npm run preview

# 方法2: 部署到Nginx
sudo cp -r dist/* /var/www/jy/

# 方法3: 使用Vite预览服务器
cd dist
python3 -m http.server 8080
```

### 数据库配置 (2分钟)

#### PostgreSQL

```bash
# 创建数据库
sudo -u postgres psql << 'EOF'
CREATE USER jy_user WITH PASSWORD 'your_password';
CREATE DATABASE jy_db OWNER jy_user;
GRANT ALL PRIVILEGES ON DATABASE jy_db TO jy_user;
EOF

# 连接测试
psql -U jy_user -d jy_db -c "SELECT 1;"
```

#### SQLite (开发测试)

```bash
# 使用SQLite无需额外配置
# 修改 backend/.env
DATABASE_URL="file:./dev.db"
```

### Nginx配置 (可选)

```bash
# 安装Nginx
sudo apt-get install -y nginx

# 配置文件
sudo tee /etc/nginx/sites-available/jy << 'EOF'
server {
    listen 80;
    server_name localhost;

    # 前端静态文件
    root /var/www/jy;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # API代理
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

# 部署前端
sudo mkdir -p /var/www/jy
sudo cp -r frontend/dist/* /var/www/jy/
```

## Docker部署 (推荐)

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: jy-postgres
    environment:
      POSTGRES_USER: jy_user
      POSTGRES_PASSWORD: jy_password
      POSTGRES_DB: jy_db
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    networks:
      - jy-network

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: jy-backend
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: "postgresql://jy_user:jy_password@postgres:5432/jy_db?schema=public"
      JWT_SECRET: "your-secret-key-change-in-production"
      JWT_EXPIRES_IN: "7d"
      FRONTEND_URL: "http://localhost"
    ports:
      - "3001:3001"
    depends_on:
      - postgres
    networks:
      - jy-network
    command: sh -c "npx prisma generate && npx prisma db push && node dist/src/main.js"

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      container_name: jy-frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - jy-network

volumes:
  postgres-data:

networks:
  jy-network:
    driver: bridge
```

### 后端 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
RUN npx prisma generate

COPY . .
RUN npm run build

FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

EXPOSE 3001

CMD ["node", "dist/src/main.js"]
```

### 前端 Dockerfile

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
ARG VITE_API_BASE_URL=http://localhost:3001/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart
```

## 验证部署

```bash
# 1. 检查后端健康
curl http://localhost:3001/api/system/dashboard/stats

# 2. 访问前端
# 浏览器打开: http://localhost

# 3. 检查服务状态
pm2 status  # 如果使用PM2
docker ps  # 如果使用Docker

# 4. 查看日志
pm2 logs jy-backend
docker-compose logs backend
```

## 默认账号

- 用户名: `admin`
- 密码: `admin123`

**重要**: 首次登录后请立即修改默认密码！

## 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
sudo lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或修改端口
# 在 .env 文件中修改 PORT=3002
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

### 3. 前端空白页面

```bash
# 检查构建
ls -la frontend/dist/

# 检查API地址
cat frontend/.env.production

# 查看浏览器控制台错误
# F12 -> Console
```

### 4. PM2服务无法启动

```bash
# 清空PM2列表
pm2 delete all

# 重新启动
pm2 start dist/src/main.js --name jy-backend

# 查看详细错误
pm2 logs jy-backend --err
```

## 下一步

1. 修改默认管理员密码
2. 配置组织架构和员工信息
3. 设置排班规则和考勤规则
4. 配置数据备份策略
5. 启用HTTPS (使用Let's Encrypt)
6. 配置防火墙规则
7. 设置监控告警

## 获取帮助

- 查看完整文档: `DEPLOYMENT.md`
- GitHub Issues: https://github.com/your-repo/issues
- 技术支持: support@example.com

---

**祝部署顺利！** 🚀
