# 技术栈与构建命令

## 后端（backend/）

- 框架：NestJS 10 + TypeScript
- ORM：Prisma 5.8（开发用 SQLite，生产用 PostgreSQL 15）
- 认证：JWT + Passport
- 验证：class-validator + class-transformer
- API 文档：Swagger（访问 /api-docs）
- 日志：Winston
- 密码：bcrypt
- 日期处理：date-fns
- 全局路由前缀：`/api`
- 默认端口：3001

### 后端常用命令

```bash
cd backend
npm run start:dev        # 开发模式（热重载）
npm run build            # 编译 TypeScript
npm run start:prod       # 生产模式启动
npm run lint             # ESLint 检查并修复
npm run format           # Prettier 格式化
npm run test             # 运行测试
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:push      # 同步数据库 Schema
npm run prisma:seed      # 填充种子数据
npm run prisma:studio    # 打开 Prisma Studio
```

## 前端（frontend/）

- 框架：React 18 + TypeScript
- 构建工具：Vite
- UI 组件库：Ant Design 5（中文 locale）
- 路由：React Router 6
- 状态管理：Zustand（persist middleware）
- 服务端状态：React Query（@tanstack/react-query）
- 样式：Tailwind CSS 3.4
- 图表：Recharts
- HTTP 客户端：Axios
- 日期处理：dayjs
- 拖拽：@dnd-kit
- Excel 导出：xlsx
- 默认端口：5173

### 前端常用命令

```bash
cd frontend
npm run dev       # 开发服务器
npm run build     # 生产构建
npm run preview   # 预览生产构建
npm run lint      # ESLint 检查
```

## Docker 部署

```bash
docker-compose up -d     # 启动所有服务（PostgreSQL + 后端 + 前端）
docker-compose logs -f   # 查看日志
docker-compose down      # 停止服务
```

## 代码规范

- 后端：ESLint + Prettier（100 字符行宽）
- 前端：ESLint（TypeScript + React Hooks 插件）
- TypeScript 严格模式
