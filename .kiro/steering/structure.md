# 项目结构

单仓库，前后端分离架构。

```
├── backend/                    # NestJS 后端
│   ├── prisma/
│   │   ├── schema.prisma       # 数据模型定义（50+ 模型）
│   │   ├── seed.ts             # 种子数据
│   │   └── *.db                # SQLite 开发数据库
│   ├── src/
│   │   ├── main.ts             # 入口，CORS/Swagger/ValidationPipe 配置
│   │   ├── app.module.ts       # 根模块，注册所有功能模块
│   │   ├── config/             # 应用配置
│   │   ├── database/           # PrismaModule / PrismaService
│   │   ├── common/             # 共享代码
│   │   │   ├── decorators/     # @CurrentUser, @Roles, @Public, @Permissions
│   │   │   ├── guards/         # JwtAuthGuard, PermissionsGuard
│   │   │   ├── filters/        # 异常过滤器, 数据范围过滤
│   │   │   ├── interceptors/   # 响应转换拦截器
│   │   │   └── dto/            # 通用 DTO
│   │   └── modules/            # 业务模块（每个模块含 controller/service/module）
│   │       ├── auth/           # 认证（JWT 登录）
│   │       ├── hr/             # 人事（组织、员工）
│   │       ├── account/        # 劳动力账户
│   │       ├── punch/          # 打卡管理
│   │       ├── shift/          # 排班管理
│   │       ├── calculate/      # 工时计算引擎
│   │       ├── attendance/     # 考勤查看
│   │       ├── allocation/     # 工时分摊
│   │       └── system/         # 系统管理
│   └── Dockerfile              # 多阶段构建
│
├── frontend/                   # React 前端
│   ├── src/
│   │   ├── main.tsx            # 入口，ConfigProvider/QueryClient/Router
│   │   ├── router/index.tsx    # 路由定义（懒加载 + ProtectedRoute）
│   │   ├── pages/              # 页面组件，按功能模块分目录
│   │   │   ├── auth/           # 登录页
│   │   │   ├── hr/             # 人事页面
│   │   │   ├── account/        # 账户页面
│   │   │   ├── punch/          # 打卡页面
│   │   │   ├── shift/          # 排班页面
│   │   │   ├── calculate/      # 计算页面
│   │   │   ├── attendance/     # 考勤页面
│   │   │   ├── allocation/     # 分摊页面
│   │   │   ├── system/         # 系统页面
│   │   │   └── DashboardPage   # 仪表盘
│   │   ├── components/         # 可复用组件
│   │   │   ├── common/         # 通用组件
│   │   │   └── layout/         # 布局组件（MainLayout）
│   │   ├── services/           # API 服务层（Axios 封装）
│   │   ├── stores/             # Zustand 状态（authStore, tabsStore）
│   │   ├── hooks/              # 自定义 Hooks
│   │   ├── utils/              # 工具函数（request.ts 等）
│   │   ├── styles/             # 全局样式 / 主题
│   │   └── assets/             # 静态资源
│   └── vite.config.ts
│
└── docker-compose.yml          # 编排：PostgreSQL + 后端 + 前端
```

## 架构模式

### 后端

- NestJS 模块化：每个功能域一个 Module，包含 Controller → Service → Prisma
- 全局 ValidationPipe（whitelist + transform）
- 全局 `/api` 前缀
- JWT Guard 默认保护所有路由，`@Public()` 装饰器标记公开接口
- 数据范围过滤通过 DataScopeService 实现

### 前端

- 页面级懒加载（React.lazy + Suspense）
- ProtectedRoute 组件检查 localStorage token
- Zustand persist 中间件持久化认证状态
- React Query 管理服务端状态（staleTime: 5min）
- Ant Design ConfigProvider 统一主题（主色 #22B970）
- 路径别名 `@/` 映射到 `src/`
