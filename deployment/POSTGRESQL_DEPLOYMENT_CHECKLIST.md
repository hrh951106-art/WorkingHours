# PostgreSQL 生产环境部署前检查清单

## ⚠️ 必须完成的配置项

### 1. 修改 Prisma Schema 数据库提供商

**当前配置：**
```prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}
```

**需要修改为：**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

**位置：** `backend/prisma/schema.prisma` 第5-8行

**修改方法：**
```bash
# 方法1：使用编辑器
vi /Users/aaron.he/Desktop/AI/JY/backend/prisma/schema.prisma
# 将 provider = "sqlite" 改为 provider = "postgresql"

# 方法2：使用sed命令
cd backend/prisma
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' schema.prisma

# 方法3：使用Edit工具（如果在Claude Code中）
```

### 2. 配置数据库连接字符串

创建或更新 `.env.production` 文件：

```env
# PostgreSQL 连接字符串格式
DATABASE_URL="postgresql://用户名:密码@主机:端口/数据库名?schema=public"

# 示例：
DATABASE_URL="postgresql://postgres:secure_password@localhost:5432/jy_production?schema=public"
```

**位置：** `backend/.env.production` 或根目录的 `.env.production`

### 3. 确认数据库已创建

在PostgreSQL中创建数据库：

```bash
# 使用psql
psql -U postgres
CREATE DATABASE jy_production;
\q

# 或使用createdb
createdb -U postgres jy_production
```

### 4. 生成并运行迁移

修改provider后，需要重新生成迁移：

```bash
cd backend

# 生成Prisma客户端
npx prisma generate

# 如果已有迁移，直接应用
npx prisma migrate deploy

# 如果需要创建新迁移
npx prisma migrate dev --name init_postgresql

# 或者重置数据库（开发环境）
npx prisma migrate reset
```

### 5. 导入种子数据

使用生成的SQL文件导入种子数据：

```bash
# 方法1：使用部署脚本
cd deployment
./seed-data-deploy.sh production

# 方法2：手动执行
psql -U postgres -d jy_production \
  -f deployment/postgresql-seed-data.sql

# 方法3：使用Prisma seed
cd backend
npm run prisma:seed:all
```

## ✅ 验证部署

### 1. 验证数据库连接

```bash
cd backend
npx prisma db push
```

### 2. 验证数据导入

```sql
-- 连接数据库
psql -U postgres -d jy_production

-- 检查表数量
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- 预期：50+ 表

-- 检查数据源
SELECT COUNT(*) FROM "DataSource";
-- 预期：19

-- 检查用户
SELECT username, name, status FROM "User";
-- 预期：2个用户（admin, hr_admin）

-- 检查组织
SELECT code, name, type FROM "Organization";
-- 预期：3个组织
```

### 3. 验证应用启动

```bash
cd backend
npm run dev

# 检查日志，确保数据库连接成功
```

## 📋 SQLite → PostgreSQL 迁移注意事项

### 数据类型映射

Prisma会自动处理SQLite到PostgreSQL的类型映射：

| SQLite | PostgreSQL |
|--------|------------|
| INTEGER | INTEGER / SERIAL |
| TEXT | TEXT / VARCHAR |
| REAL | REAL / DOUBLE PRECISION |
| BLOB | BYTEA |
| DATETIME | TIMESTAMP |

### 索引和约束

- ✅ Prisma自动处理索引
- ✅ 外键约束自动创建
- ✅ 唯一约束自动应用

### 特殊字段

- `@default(autoincrement())` → SERIAL/BIGSERIAL
- `@default(now())` → CURRENT_TIMESTAMP
- `@updatedAt` → 自动触发器更新

## 🔧 常见问题

### Q1: 修改provider后报错 "Invalid datasource provider"

**原因：** Prisma客户端缓存了旧配置

**解决：**
```bash
cd backend
rm -rf node_modules/.prisma
npx prisma generate
```

### Q2: 迁移失败 "Database already exists"

**原因：** 数据库已存在，但表结构不匹配

**解决：**
```bash
# 警告：这会删除所有数据
psql -U postgres -d jy_production -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
npx prisma migrate deploy
```

### Q3: 种子数据导入失败 "relation does not exist"

**原因：** 迁移未完成或表未创建

**解决：**
```bash
cd backend
npx prisma migrate deploy --skip-generate
```

### Q4: 字符编码问题

**原因：** PostgreSQL数据库未使用UTF-8编码

**解决：**
```sql
-- 创建数据库时指定编码
CREATE DATABASE jy_production ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8';
```

## 📝 部署命令参考

### 完整部署流程

```bash
# 1. 修改Prisma provider
cd backend/prisma
sed -i '' 's/provider = "sqlite"/provider = "postgresql"/' schema.prisma

# 2. 配置环境变量
cd ../..
cat > .env.production << EOF
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/jy_production?schema=public"
NODE_ENV="production"
PORT="3000"
EOF

# 3. 安装依赖
cd backend
npm install

# 4. 生成Prisma客户端
npx prisma generate

# 5. 应用数据库迁移
npx prisma migrate deploy

# 6. 导入种子数据
cd ../deployment
./seed-data-deploy.sh production

# 7. 验证
cd ../backend
npm run dev
```

## 🔐 生产环境安全建议

### 1. 数据库安全
- [ ] 使用强密码
- [ ] 限制数据库用户权限
- [ ] 启用SSL连接（如果支持）
- [ ] 配置防火墙规则

### 2. 应用安全
- [ ] 修改默认用户密码
- [ ] 删除示例员工数据
- [ ] 更新组织信息为实际名称
- [ ] 检查权限配置

### 3. 备份策略
- [ ] 配置定期数据库备份
- [ ] 测试恢复流程
- [ ] 保留备份至少30天

## 📞 支持

如有问题，请参考：
- Prisma文档: https://www.prisma.io/docs
- PostgreSQL文档: https://www.postgresql.org/docs/

---

**检查清单版本：** 1.0.0
**最后更新：** 2026-06-02
**适用环境：** PostgreSQL 12+, Prisma 5.x
