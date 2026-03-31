# JY系统生产部署文件清单

> **版本**: v1.0.0
> **更新日期**: 2025-03-31
> **用途**: 生产环境部署所需的完整文件清单

---

## 📦 部署包结构

```
jy-backend/
├── prisma/                           # Prisma数据库相关
│   ├── schema.prisma                 # 数据模型定义（必须）
│   ├── migrations_postgres/          # PostgreSQL迁移文件（必须）
│   │   └── 20250331_init/
│   │       ├── migration.sql         # 表结构迁移（必须）
│   │       ├── migration_full.sql    # 表结构+完整数据（推荐）
│   │       └── init_production.sql   # 生产环境初始化脚本（推荐）
│   ├── seed-all.ts                   # 完整种子数据脚本（可选）
│   ├── seed-datasources.ts           # 数据源种子数据（可选）
│   └── seed-employee-info-tabs.ts    # 人事页签种子数据（可选）
│
├── src/                              # 源代码（必须）
│   ├── main.ts                       # 应用入口
│   ├── modules/                      # 业务模块
│   │   ├── auth/                     # 认证模块
│   │   ├── user/                     # 用户模块
│   │   ├── hr/                       # 人事模块
│   │   │   ├── hr.controller.ts      # ⚠️ 已修复重复方法
│   │   │   └── ...
│   │   ├── organization/             # 组织架构模块
│   │   └── ...
│   ├── common/                       # 公共模块
│   └── config/                       # 配置文件
│
├── dist/                             # 编译后的代码（构建后生成）
│   └── src/
│
├── scripts/                          # 部署和工具脚本
│   ├── verify-deployment.sql         # 部署验证脚本（必须）
│   ├── generate-full-migration.sh    # 迁移生成脚本（开发用）
│   └── generate-full-migration.ts    # 迁移生成脚本（开发用）
│
├── package.json                      # 依赖配置（必须）
├── package-lock.json                 # 锁定依赖版本（必须）
├── tsconfig.json                     # TypeScript配置（必须）
├── nest-cli.json                     # NestJS配置（必须）
│
├── .env.production.example           # 生产环境配置模板（必须）
├── .env.production                   # 实际生产配置（需要创建）
│
├── .gitignore                        # Git忽略文件（必须）
│
├── DEPLOYMENT_PACKAGE.md             # 完整部署指南（必须）
├── DEPLOYMENT_CHECKLIST.md           # 部署检查清单（必须）
├── DEPLOYMENT_MANIFEST.md            # 本文件 - 部署文件清单（必须）
└── POSTGRESQL_PRODUCTION_GUIDE.md    # PostgreSQL部署指南（参考）
```

---

## ✅ 必须文件清单

### 1. 数据库相关（必须）

| 文件路径 | 说明 | 用途 | 检查 |
|---------|------|------|------|
| `prisma/schema.prisma` | Prisma数据模型 | 定义数据库结构 | ☐ |
| `prisma/migrations_postgres/20250331_init/migration.sql` | 表结构迁移 | 创建所有数据库表 | ☐ |
| `prisma/migrations_postgres/20250331_init/init_production.sql` | 生产初始化脚本 | 一次性初始化生产库 | ☐ |
| `scripts/verify-deployment.sql` | 部署验证脚本 | 验证部署是否成功 | ☐ |

**推荐使用**: `init_production.sql` 作为生产数据库初始化脚本，它包含：
- 完整的表结构
- 所有种子数据
- 重复数据清理
- 性能优化索引
- 序列重置
- 验证查询

### 2. 应用代码（必须）

| 文件/目录 | 说明 | 用途 | 检查 |
|----------|------|------|------|
| `src/` | 源代码目录 | 应用主要代码 | ☐ |
| `src/main.ts` | 应用入口 | 启动应用 | ☐ |
| `package.json` | 依赖配置 | 管理npm依赖 | ☐ |
| `package-lock.json` | 依赖锁定 | 确保依赖版本一致 | ☐ |
| `tsconfig.json` | TypeScript配置 | 编译配置 | ☐ |
| `nest-cli.json` | NestJS配置 | 框架配置 | ☐ |

### 3. 配置文件（必须）

| 文件 | 说明 | 用途 | 检查 |
|------|------|------|------|
| `.env.production.example` | 配置模板 | 提供配置示例 | ☐ |
| `.env.production` | 实际配置（需创建） | 生产环境变量 | ☐ |

**重要**: `.env.production` 文件不在代码仓库中，需要在服务器上创建。

### 4. 文档（必须）

| 文件 | 说明 | 用途 | 检查 |
|------|------|------|------|
| `DEPLOYMENT_PACKAGE.md` | 完整部署指南 | 详细的部署步骤 | ☐ |
| `DEPLOYMENT_CHECKLIST.md` | 部署检查清单 | 部署验证检查 | ☐ |
| `DEPLOYMENT_MANIFEST.md` | 文件清单 | 本文件 | ☐ |

### 5. 其他必须文件

| 文件 | 说明 | 用途 | 检查 |
|------|------|------|------|
| `.gitignore` | Git忽略配置 | 防止敏感文件提交 | ☐ |

---

## 📋 可选文件清单

### 1. 额外的数据库迁移

| 文件 | 说明 | 何时使用 |
|------|------|----------|
| `migration_full.sql` | 表结构+完整数据 | 如果需要额外的数据导出 |
| `seed-all.ts` | TypeScript种子脚本 | 如果需要通过Prisma插入数据 |
| `seed-datasources.ts` | 数据源种子脚本 | 单独初始化数据源 |
| `seed-employee-info-tabs.ts` | 人事页签种子脚本 | 单独初始化人事页签 |

### 2. 开发工具脚本

| 文件 | 说明 | 用途 |
|------|------|------|
| `scripts/generate-full-migration.sh` | 迁移生成脚本 | 从开发数据库生成迁移 |
| `scripts/generate-full-migration.ts` | 迁移生成脚本 | 从开发数据库生成迁移 |

### 3. 参考文档

| 文件 | 说明 | 用途 |
|------|------|------|
| `POSTGRESQL_PRODUCTION_GUIDE.md` | PostgreSQL指南 | 数据库配置参考 |

---

## 🔍 文件完整性检查

### 部署前检查清单

```bash
# 1. 检查必须文件是否存在
echo "检查必须文件..."

files=(
  "prisma/schema.prisma"
  "prisma/migrations_postgres/20250331_init/migration.sql"
  "prisma/migrations_postgres/20250331_init/init_production.sql"
  "scripts/verify-deployment.sql"
  "package.json"
  "package-lock.json"
  "tsconfig.json"
  "nest-cli.json"
  ".env.production.example"
  "DEPLOYMENT_PACKAGE.md"
  "DEPLOYMENT_CHECKLIST.md"
  "DEPLOYMENT_MANIFEST.md"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file"
  else
    echo "✗ $file (缺失)"
  fi
done

# 2. 检查源代码目录
echo ""
echo "检查源代码目录..."
if [ -d "src" ]; then
  echo "✓ src/ 目录存在"
else
  echo "✗ src/ 目录缺失"
fi

# 3. 检查迁移目录
echo ""
echo "检查迁移文件..."
if [ -d "prisma/migrations_postgres/20250331_init" ]; then
  echo "✓ 迁移目录存在"
  ls -lh prisma/migrations_postgres/20250331_init/
else
  echo "✗ 迁移目录缺失"
fi
```

---

## 📊 文件大小参考

### 关键文件预期大小

| 文件 | 预期大小 | 说明 |
|------|---------|------|
| `migration.sql` | ~50KB | 表结构定义 |
| `migration_full.sql` | ~80KB | 表结构+完整数据 |
| `init_production.sql` | ~90KB | 生产初始化脚本 |
| `verify-deployment.sql` | ~10KB | 验证脚本 |
| `schema.prisma` | ~20KB | 数据模型定义 |
| `package.json` | ~3KB | 依赖配置 |
| `package-lock.json` | ~300KB | 依赖锁定 |

### 检查文件大小

```bash
# 检查关键文件大小
echo "关键文件大小："
ls -lh prisma/schema.prisma \
        prisma/migrations_postgres/20250331_init/*.sql \
        scripts/verify-deployment.sql \
        package.json \
        package-lock.json
```

---

## 🚀 快速部署文件提取

### 最小化部署包

如果要创建最小化部署包，至少需要以下文件：

```bash
# 创建最小化部署包
mkdir -p jy-backend-minimal
cd jy-backend-minimal

# 复制必须文件
cp -r ../src .
cp ../prisma/schema.prisma ../prisma .
cp -r ../prisma/migrations_postgres .
cp ../package.json ../package-lock.json .
cp ../tsconfig.json ../nest-cli.json .
cp ../.env.production.example .env.production
cp ../DEPLOYMENT_PACKAGE.md .
cp ../DEPLOYMENT_CHECKLIST.md .
cp ../DEPLOYMENT_MANIFEST.md .

# 打包
cd ..
tar -czf jy-backend-minimal.tar.gz jy-backend-minimal/
```

### 完整部署包

完整部署包包含所有文件（包括文档和可选文件）：

```bash
# 打包所有文件
tar -czf jy-backend-full.tar.gz \
  src/ \
  prisma/ \
  scripts/ \
  package.json \
  package-lock.json \
  tsconfig.json \
  nest-cli.json \
  .env.production.example \
  .gitignore \
  DEPLOYMENT_PACKAGE.md \
  DEPLOYMENT_CHECKLIST.md \
  DEPLOYMENT_MANIFEST.md \
  POSTGRESQL_PRODUCTION_GUIDE.md
```

---

## 📝 部署包分发检查表

### 部署包创建

- [ ] 所有必须文件已复制
- [ ] 文件权限已正确设置
- [ ] 压缩包已创建
- [ ] 压缩包已测试解压
- [ ] 文件完整性已验证
- [ ] 部署包已签名（可选）
- [ ] 部署包已上传到服务器

### 服务器端检查

- [ ] 压缩包已下载
- [ ] 压缩包已解压
- [ ] 文件完整性已验证
- [ ] 所有文件权限已设置
- [ ] .env.production 已创建并配置
- [ ] 依赖已安装
- [ ] 数据库迁移已执行
- [ ] 应用已构建和启动

---

## 🔐 文件权限建议

### 生产环境文件权限

```bash
# 应用代码
chmod 755 src/
chmod 644 src/**/*.ts
chmod 755 dist/
chmod 644 dist/**/*.js

# 配置文件
chmod 600 .env.production
chmod 644 .env.production.example

# 脚本文件
chmod 755 scripts/*.sh
chmod 644 scripts/*.sql

# Prisma文件
chmod 644 prisma/schema.prisma
chmod 644 prisma/migrations_postgres/**/*.sql

# 其他
chmod 644 package.json tsconfig.json nest-cli.json
chmod 644 *.md
```

---

## 📞 支持

### 如果缺少文件

1. **检查Git历史**
   ```bash
   git log --all --full-history -- prisma/migrations_postgres/20250331_init/init_production.sql
   ```

2. **从备份恢复**
   - 检查是否有之前版本的备份
   - 联系版本控制系统管理员

3. **重新生成**
   - 使用 `scripts/generate-full-migration.sh` 重新生成迁移文件
   - 运行 `npm run prisma:seed:all` 重新生成种子数据

### 文件版本不匹配

如果发现文件版本不一致：

1. 确认当前Git分支
2. 检查最近的提交记录
3. 确保使用的是最新的main分支
4. 联系开发团队确认

---

**版本**: v1.0.0
**最后更新**: 2025-03-31
**维护者**: JY开发团队
