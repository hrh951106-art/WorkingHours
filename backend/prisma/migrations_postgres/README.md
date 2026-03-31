# PostgreSQL 迁移文件说明

## 📂 目录说明

本目录包含 PostgreSQL 数据库的迁移文件，用于生产环境部署。

## 🔧 与 SQLite 迁移的区别

### 主要差异

1. **主键自增**:
   - SQLite: `INTEGER PRIMARY KEY AUTOINCREMENT`
   - PostgreSQL: `SERIAL PRIMARY KEY`

2. **时间类型**:
   - SQLite: `DATETIME`
   - PostgreSQL: `TIMESTAMP`

3. **默认值函数**:
   - SQLite: `CURRENT_TIMESTAMP`
   - PostgreSQL: `NOW()`

4. **外键约束**: 两者语法基本相同

## 📋 文件结构

```
migrations_postgres/
└── 20250331_init/
    ├── migration.sql        # PostgreSQL 迁移 SQL（1080行）
    └── README.md            # 本说明文件
```

## 🚀 使用方法

### 生产环境部署

1. **配置数据库连接**:

编辑 `.env.production` 文件：
```bash
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

2. **应用迁移**:

```bash
# 方式1: 使用 Prisma Migrate（推荐）
npx prisma migrate deploy

# 方式2: 手动执行 SQL
psql -U username -d database -f prisma/migrations_postgres/20250331_init/migration.sql
```

3. **初始化种子数据**:

```bash
npm run prisma:seed:all
```

### 开发环境

如果需要使用 PostgreSQL 进行开发：

1. **启动 PostgreSQL 数据库**（Docker 方式）:
```bash
docker run --name jy-postgres \
  -e POSTGRES_USER=jy_user \
  -e POSTGRES_PASSWORD=jy_password \
  -e POSTGRES_DB=jy_dev \
  -p 5432:5432 \
  -d postgres:15
```

2. **配置环境变量**:
```bash
DATABASE_URL="postgresql://jy_user:jy_password@localhost:5432/jy_dev?schema=public"
```

3. **应用迁移**:
```bash
npx prisma migrate dev --name init
```

## 📊 迁移统计

- **表数量**: 49 个
- **唯一约束**: 30 个
- **索引**: 41 个
- **外键约束**: 完整关联关系

## ⚠️ 注意事项

1. **字符编码**: PostgreSQL 默认使用 UTF-8 编码
2. **大小写敏感**: 标识符默认折叠为小写
3. **连接池**: 生产环境建议使用 PgBouncer
4. **备份策略**: 定期使用 `pg_dump` 备份数据

## 🔍 验证迁移

迁移完成后，执行以下验证：

```sql
-- 检查表数量
SELECT count(*) FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
-- 预期: 49

-- 检查用户表
SELECT * FROM "User" LIMIT 1;

-- 检查组织表
SELECT * FROM "Organization" LIMIT 1;

-- 检查数据库大小
SELECT pg_size_pretty(pg_database_size('jy_production'));
```

## 📚 相关文档

- [Prisma PostgreSQL 文档](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL 官方文档](https://www.postgresql.org/docs/)

## 🆘 故障排查

### 常见问题

**问题1: 连接被拒绝**
```
Error: Connection terminated unexpectedly
```
解决方案: 检查 PostgreSQL 服务状态和防火墙设置

**问题2: 权限不足**
```
Error: permission denied for table xxx
```
解决方案: 确保数据库用户有足够的权限

**问题3: 架构不存在**
```
Error: schema "public" does not exist
```
解决方案: 创建架构或修改 DATABASE_URL 中的 schema 参数

---

**更新日期**: 2025-03-31
**版本**: 1.0.0
