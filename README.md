# 精益工时管理系统

基于 React + NestJS + PostgreSQL 构建的现代化工时管理系统。

## 📋 目录

- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [生产部署](#生产部署)
- [项目结构](#项目结构)
- [开发指南](#开发指南)
- [常见问题](#常见问题)

## 🚀 技术栈

### 前端
- **框架**: React 18 + TypeScript
- **UI库**: Ant Design 5
- **路由**: React Router 6
- **状态管理**: Zustand
- **数据请求**: React Query
- **构建工具**: Vite
- **样式**: Tailwind CSS

### 后端
- **框架**: NestJS 10
- **ORM**: Prisma
- **数据库**: PostgreSQL 15
- **认证**: JWT + Passport
- **文档**: Swagger
- **日志**: Winston

## ⚡ 快速开始

### 前置要求
- Node.js >= 18
- npm >= 9 或 pnpm >= 8
- PostgreSQL 13+ 或 Docker

### 1. 克隆项目

```bash
git clone <repository-url>
cd jy-system
```

### 2. 使用Docker快速启动

```bash
# 启动所有服务 (PostgreSQL + 后端 + 前端)
docker-compose up -d

# 查看日志
docker-compose logs -f

# 访问应用
# 前端: http://localhost
# 后端: http://localhost:3001
# API文档: http://localhost:3001/api-docs
```

### 3. 手动安装

```bash
# 安装后端依赖
cd backend
npm install
npm run prisma:generate
npm run prisma:push
npm run start:dev

# 新开终端，安装前端依赖
cd frontend
npm install
npm run dev
```

### 4. 访问应用

- 前端: http://localhost:5173
- 后端: http://localhost:3001
- API文档: http://localhost:3001/api-docs

**默认账号**:
- 用户名: `admin`
- 密码: `admin123`

⚠️ **重要**: 首次登录后请立即修改默认密码！

## 🚢 生产部署

本项目已配置好生产环境，支持多种部署方式：

### 快速部署

查看部署文档：

- **📖 [完整部署指南](./DEPLOYMENT.md)** - 详细的生产环境部署文档
- **⚡ [快速开始](./QUICK_START.md)** - 5分钟快速部署指南
- **✅ [部署检查清单](./CHECKLIST.md)** - 上线前检查清单

### 部署方式

#### 1. Docker Compose (推荐)

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 2. PM2 + Nginx

```bash
# 后端
cd backend
npm install
npm run build
pm2 start dist/src/main.js --name jy-backend

# 前端
cd frontend
npm install
npm run build
# 部署dist目录到Nginx
```

详细步骤请参考 [DEPLOYMENT.md](./DEPLOYMENT.md)

### 生产环境配置

#### 后端配置

创建 `backend/.env`:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL="postgresql://user:password@localhost:5432/jy_db"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
JWT_EXPIRES_IN="7d"
FRONTEND_URL="https://your-domain.com"
```

#### 前端配置

创建 `frontend/.env.production`:

```env
VITE_API_BASE_URL=https://your-backend-domain.com/api
```

### 性能优化

- ✅ 前端代码分割
- ✅ 静态资源压缩
- ✅ Gzip压缩
- ✅ 浏览器缓存
- ✅ PM2集群模式
- ✅ Nginx反向代理
- ✅ 数据库连接池

## 📁 项目结构

```
jy-system/
├── backend/                 # 后端项目
│   ├── src/
│   │   ├── modules/        # 业务模块
│   │   ├── common/         # 公共模块
│   │   ├── config/         # 配置文件
│   │   └── main.ts         # 入口文件
│   ├── prisma/             # 数据库schema
│   ├── Dockerfile          # Docker配置
│   └── package.json
├── frontend/                # 前端项目
│   ├── src/
│   │   ├── components/     # 组件
│   │   ├── pages/          # 页面
│   │   ├── router/         # 路由
│   │   └── utils/          # 工具函数
│   ├── Dockerfile          # Docker配置
│   └── package.json
├── docker-compose.yml       # Docker Compose配置
├── DEPLOYMENT.md            # 部署文档
├── QUICK_START.md           # 快速开始
└── CHECKLIST.md             # 部署检查清单
```

## 🔧 开发指南

### 代码规范

- **前端**: ESLint + Prettier
- **后端**: ESLint + Prettier
- **提交**: Conventional Commits

### 分支策略

- `main` - 生产环境分支
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 修复分支

### 测试

```bash
# 后端测试
cd backend
npm run test

# 前端测试
cd frontend
npm run test
```

## 📚 文档

- [API文档](http://localhost:3001/api-docs) - Swagger自动生成
- [部署文档](./DEPLOYMENT.md) - 生产环境部署指南
- [快速开始](./QUICK_START.md) - 5分钟快速部署
- [检查清单](./CHECKLIST.md) - 上线前检查清单

## ❓ 常见问题

### 1. 端口被占用

```bash
# 查看端口占用
lsof -i :3001
lsof -i :5173

# 修改端口
# backend/.env: PORT=3002
# frontend/vite.config.ts: server.port=5174
```

### 2. 数据库连接失败

```bash
# 检查PostgreSQL状态
sudo systemctl status postgresql

# 测试连接
psql -U jy_user -d jy_db

# 检查防火墙
sudo ufw allow 5432
```

### 3. Docker构建失败

```bash
# 清理Docker缓存
docker system prune -a

# 重新构建
docker-compose build --no-cache
```

### 4. 前端空白页

- 检查API地址配置 (`.env.production`)
- 查看浏览器控制台错误 (F12)
- 确认后端服务正常

### 5. PM2服务无法启动

```bash
# 查看日志
pm2 logs jy-backend --err

# 重新安装依赖
cd backend
rm -rf node_modules
npm install

# 重新构建
npm run build
pm2 restart jy-backend
```

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: add some amazing feature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 完成核心功能开发
- ✅ 组织管理
- ✅ 员工管理
- ✅ 排班管理
- ✅ 打卡管理
- ✅ 工时计算
- ✅ 权限管理
- ✅ 生产环境配置
- ✅ Docker部署支持

## 📄 许可证

[MIT License](LICENSE)

## 📞 联系方式

- 技术支持: support@example.com
- 问题反馈: https://github.com/your-repo/issues
- 文档: https://docs.example.com

---

** Made with ❤️ by DevOps Team **

# 生成 Prisma Client
npx prisma generate

# 推送数据库结构
npx prisma db push

# （可选）填充种子数据
npx prisma db seed
```

### 4. 启动开发服务器

```bash
# 启动后端 (http://localhost:3001)
cd backend && pnpm run start:dev

# 启动前端 (http://localhost:5173)
cd frontend && pnpm run dev
```

### 5. 使用 Docker 一键启动

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止所有服务
docker-compose down
```

## 默认账号

- 管理员: admin / admin123
- HR管理员: hr_admin / hr123
- 考勤专员: attendance_admin / att123

## 项目结构

```
.
├── frontend/           # 前端项目 (React + Vite)
│   ├── src/
│   │   ├── components/    # 通用组件
│   │   ├── pages/         # 页面组件
│   │   ├── services/      # API 服务
│   │   ├── stores/        # 状态管理
│   │   └── utils/         # 工具函数
│   └── package.json
│
├── backend/            # 后端项目 (NestJS)
│   ├── src/
│   │   ├── modules/      # 业务模块
│   │   ├── common/       # 通用模块
│   │   ├── config/       # 配置文件
│   │   └── main.ts
│   ├── prisma/
│   │   └── schema.prisma # 数据库模型
│   └── package.json
│
└── docker-compose.yml  # Docker 编排文件
```

## API 文档

启动后端服务后，访问 Swagger 文档：
- http://localhost:3001/api-docs

## 开发规范

### 代码规范
- 遵循 ESLint + Prettier 配置
- 使用 TypeScript 类型注解
- Git 提交信息遵循 Conventional Commits

### 分支管理
- `main`: 生产环境
- `develop`: 开发环境
- `feature/*`: 功能分支
- `bugfix/*`: 修复分支

## 许可证

MIT License
