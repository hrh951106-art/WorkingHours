# PostgreSQL 种子数据部署修复说明

## ⚠️ SQL文件存在的问题

你报告的错误已确认：
1. **列数不匹配** - VALUES子句定义了7列，但AS v只定义了5列
2. **重复的WHERE语句** - 第590行有重复的WHERE NOT EXISTS
3. **外键约束** - Employee引用orgId，但Organization还未创建
4. **字段缺失** - 部分INSERT语句缺少字段

## ✅ 推荐解决方案：使用Prisma Seed

**为什么推荐？**
- Prisma自动处理外键依赖
- 自动处理字段类型转换
- 自动处理事务和回滚
- 更容易维护和更新

### 部署步骤

```bash
# 1. 确保数据库已创建和迁移完成
cd backend
npx prisma migrate deploy

# 2. 设置环境变量
export DATABASE_URL="postgresql://jy_user:password@localhost:5432/jy_production"

# 3. 执行seed脚本
npx tsx prisma/seed-all.ts

# 或使用package.json中的命令
npm run prisma:seed:all
```

### 验证

```sql
-- 连接数据库验证
psql -U jy_user -d jy_production

SELECT
    'DataSource' as table_name, COUNT(*) FROM "DataSource" UNION ALL
    SELECT 'User', COUNT(*) FROM "User" UNION ALL
    SELECT 'Role', COUNT(*) FROM "Role" UNION ALL
    SELECT 'Organization', COUNT(*) FROM "Organization" UNION ALL
    SELECT 'Employee', COUNT(*) FROM "Employee";
```

## 🔧 方案2：修复SQL文件（如果必须使用SQL）

如果必须使用纯SQL文件，我建议使用分段导入：

```bash
# 1. 先导入数据源
psql -U jy_user -d jy_production -f backend/scripts/postgres-migrations/003-init-datasources.sql

# 2. 导入人事页签配置（如果有）
# psql -U jy_user -d jy_production -f backend/scripts/postgres-migrations/004-init-employee-tabs.sql

# 3. 导入其他数据
# 使用Prisma seed导入其余数据
cd backend
npx tsx prisma/seed.ts
```

## 🚀 最简单的部署方式

```bash
# 一键部署脚本会自动处理所有问题
cd deployment
./deploy-postgresql.sh
```

这个脚本会：
1. 创建数据库
2. 应用Prisma迁移（自动创建所有87个表）
3. 使用Prisma seed导入数据（自动处理外键和依赖）
4. 验证结果

## ❓ 为什么原SQL文件有错误？

原SQL文件是手动拼接生成的，有以下问题：

1. **列别名问题**：PostgreSQL的VALUES子句中列名需要正确匹配
2. **依赖顺序**：没有正确处理外键依赖（Organization → Employee）
3. **语法错误**：某些INSERT语句使用了不兼容的语法

Prisma seed会自动处理这些复杂性。

## 📞 建议

**对于生产环境，强烈建议：**
1. 使用`npx prisma migrate deploy`创建表结构
2. 使用`npx tsx prisma/seed-all.ts`导入种子数据
3. 避免手动编写大型SQL文件

这样可以确保：
- ✅ 正确的数据类型
- ✅ 正确的外键依赖
- ✅ 事务安全
- ✅ 易于维护

## 下一步

请运行：
```bash
cd deployment
./deploy-postgresql.sh
```

或手动执行：
```bash
cd backend
export DATABASE_URL="postgresql://jy_user:password@localhost:5432/jy_production"
npx prisma migrate deploy
npx tsx prisma/seed-all.ts
```

有问题随时告诉我！
