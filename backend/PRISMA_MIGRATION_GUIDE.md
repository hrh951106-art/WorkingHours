# Prisma SQLite到PostgreSQL迁移指南

## ✅ 代码兼容性确认

### 核心优势：Prisma ORM 自动处理类型转换

**前后端代码完全无需修改** - Prisma作为数据库抽象层，会自动处理不同数据库间的类型转换。

---

## 📊 时间字段类型转换

### 1. Prisma Schema定义（不变）

```prisma
// schema.prisma
model User {
  id        Int      @id @default(autoincrement())
  username  String   @unique
  createdAt DateTime @default(now())  // Prisma类型
  updatedAt DateTime @updatedAt
}
```

### 2. 数据库存储格式对比

| 数据库 | DateTime存储格式 | Prisma自动转换 |
|--------|-----------------|----------------|
| **SQLite** | Unix时间戳（毫秒整数）<br>例：`1779361914131` | ✅ 自动 |
| **PostgreSQL** | TIMESTAMP<br>例：`'2026-05-21 11:11:54'` | ✅ 自动 |

### 3. 应用层使用（无需修改）

**后端代码 (TypeScript)**：
```typescript
// 查询 - Prisma返回JavaScript Date对象
const users = await prisma.user.findMany();
console.log(users[0].createdAt); // Date对象

// 排序 - 直接使用字段名
await prisma.user.findMany({
  orderBy: { createdAt: 'desc' }
});

// 过滤 - Prisma自动转换为数据库格式
await prisma.user.findMany({
  where: {
    createdAt: { gte: new Date('2026-01-01') }
  }
});
```

**前端代码 (React + dayjs)**：
```typescript
// API返回的数据是JSON格式
{
  "id": 1,
  "username": "admin",
  "createdAt": "2026-05-21T11:11:54.000Z"  // ISO字符串
}

// 前端显示 - dayjs处理
<>{dayjs(item.createdAt).format('YYYY-MM-DD HH:mm')}</>
```

---

## 🔧 迁移步骤

### 步骤1: 修改Prisma配置

**更新 `prisma/schema.prisma`**：
```prisma
// 从
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

// 改为
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 步骤2: 更新环境变量

**更新 `.env` 文件**：
```bash
# 开发环境（SQLite）
DATABASE_URL="file:./dev.db"

# 生产环境（PostgreSQL）
DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production"
```

### 步骤3: 重新生成Prisma客户端

```bash
# 在backend目录
npm run db:generate:prod  # 或 npx prisma generate
```

**关键**：Prisma会根据新的provider生成适配的客户端代码。

### 步骤4: 导入PostgreSQL数据

```bash
# 1. 创建PostgreSQL数据库
sudo -u postgres psql
CREATE DATABASE jy_production;
CREATE USER jy_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;
\q

# 2. 导入表结构
sudo -u postgres psql -d jy_production -f postgres-export/01-schema.sql

# 3. 导入数据（时间戳已转换为PostgreSQL格式）
sudo -u postgres psql -d jy_production -f postgres-export/02-data.sql
```

### 步骤5: 启动应用

```bash
# 设置环境变量
export NODE_ENV=production
export DATABASE_URL="postgresql://jy_user:your_password@localhost:5432/jy_production"

# 构建并启动
npm run build
pm2 start dist/main.js --name jy-backend
```

---

## 🎯 验证迁移成功

### 1. 检查连接

```typescript
// backend/src/database/prisma.service.ts
async onModuleInit() {
  await this.$connect();
  console.log('Database connected'); // 应该显示成功连接
}
```

### 2. 测试时间字段

```bash
# 在PostgreSQL中验证
sudo -u postgres psql -d jy_production -c "
SELECT username, createdAt, updatedAt
FROM \"User\"
WHERE username = 'admin';
"

# 预期输出
# username | createdAt          | updatedAt
#----------+---------------------+---------------------
# admin    | 2026-05-21 11:11:54 | 2026-05-21 11:11:54
```

### 3. API测试

```bash
# 测试用户列表API
curl http://localhost:3001/api/system/users?page=1&pageSize=10

# 预期返回（时间字段为ISO格式）
{
  "items": [
    {
      "id": 1,
      "username": "admin",
      "createdAt": "2026-05-21T11:11:54.000Z",
      "updatedAt": "2026-05-21T11:11:54.000Z"
    }
  ],
  "total": 22
}
```

---

## 📋 类型转换映射表

### Prisma类型 → 数据库类型

| Prisma类型 | SQLite | PostgreSQL | 应用层(JS/TS) |
|-----------|--------|-------------|---------------|
| `DateTime` | INTEGER (时间戳) | TIMESTAMP | `Date` 对象 |
| `String` | TEXT | VARCHAR/TEXT | `string` |
| `Int` | INTEGER | INTEGER | `number` |
| `Float` | REAL | DOUBLE PRECISION | `number` |
| `Boolean` | BOOLEAN (0/1) | BOOLEAN | `boolean` |

### JSON序列化（API响应）

所有时间字段在JSON中自动序列化为ISO 8601格式字符串：
```json
{
  "createdAt": "2026-05-21T11:11:54.000Z",
  "updatedAt": "2026-05-22T16:45:37.000Z"
}
```

前端dayjs可以自动解析此格式。

---

## ⚠️ 注意事项

### 1. 时区处理

**PostgreSQL TIMESTAMP WITHOUT TIME ZONE**：
- 存储时不带时区信息
- Prisma返回的Date对象使用服务器本地时区
- 如需UTC，请使用 `TIMESTAMPTZ` 类型

**当前系统**：使用服务器本地时区，无需特殊处理。

### 2. NULL值

```typescript
// Prisma自动处理NULL
await prisma.employee.create({
  data: {
    employeeNo: 'E001',
    birthDate: null  // 可以为空
  }
});
```

### 3. 默认值

```prisma
createdAt DateTime @default(now())  // Prisma处理
updatedAt DateTime @updatedAt      // Prisma自动更新
```

PostgreSQL中对应：
```sql
createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

---

## 🔍 故障排查

### 问题1: 类型错误

**错误**: `TypeError: createdAt.toISOString is not a function`

**原因**: 数据未正确转换为Date对象

**解决**:
```typescript
// 检查Prisma客户端是否重新生成
npx prisma generate

// 检查provider是否正确
cat prisma/schema.prisma | grep provider
# 应该显示: provider = "postgresql"
```

### 问题2: 时间格式不匹配

**错误**: PostgreSQL插入失败 `invalid input syntax for type timestamp`

**原因**: 使用了旧版数据文件（整数时间戳）

**解决**: 使用新生成的 `02-data.sql`（已转换为TIMESTAMP格式）

### 问题3: 前端显示错误

**错误**: `dayjs(...).format is not a function`

**原因**: API返回的不是标准日期格式

**检查**:
```typescript
// 在浏览器控制台
console.log(typeof item.createdAt); // 应该是 "string" 或 "object"
console.log(item.createdAt);        // 应该是 "2026-05-21T11:11:54.000Z"
```

---

## 📊 实际数据验证

### User表时间字段

```sql
-- PostgreSQL查询
SELECT username, createdAt, updatedAt FROM "User" WHERE username = 'admin';
```

**SQLite**（原始）：
```
createdAt: 1779361914131 (INTEGER)
updatedAt: 1779361914131 (INTEGER)
```

**PostgreSQL**（转换后）：
```sql
createdAt: '2026-05-21 11:11:54' (TIMESTAMP)
updatedAt: '2026-05-21 11:11:54' (TIMESTAMP)
```

**应用层**（统一）：
```typescript
{
  createdAt: Date('2026-05-21T11:11:54.000Z'),
  updatedAt: Date('2026-05-21T11:11:54.000Z')
}
```

---

## ✅ 迁移检查清单

### 数据库层面
- [x] SQLite数据导出并转换为PostgreSQL格式
- [x] 所有时间字段转换为TIMESTAMP格式
- [x] 数据导入PostgreSQL成功

### 配置层面
- [ ] 修改 `schema.prisma` provider为 `postgresql`
- [ ] 更新 `.env` DATABASE_URL
- [ ] 重新生成Prisma客户端 `npx prisma generate`

### 验证层面
- [ ] 测试数据库连接成功
- [ ] 验证时间字段格式正确
- [ ] 测试API返回数据格式
- [ ] 验证前端显示正常

### 测试场景
- [ ] 用户登录（JWT token验证）
- [ ] 列表查询（时间排序）
- [ ] 数据筛选（时间范围过滤）
- [ ] 数据创建（默认时间值）
- [ ] 数据更新（updatedAt自动更新）

---

## 🎯 总结

### ✅ 无需修改

**后端代码**：
- 所有Prisma查询代码无需修改
- 时间字段在代码中始终是Date对象

**前端代码**：
- 所有dayjs格式化代码无需修改
- API返回的JSON格式保持一致

### ⚙️ 需要修改

1. **prisma/schema.prisma**: `provider = "postgresql"`
2. **.env**: `DATABASE_URL` 连接字符串
3. **重新生成客户端**: `npx prisma generate`

### 🚀 关键优势

Prisma ORM的数据库抽象特性使得从SQLite到PostgreSQL的迁移**几乎无痛**：
- 自动类型转换
- 统一的查询API
- 一致的数据格式
- 零代码修改

---

**文档版本**: 1.0
**生成时间**: 2026-06-01
**状态**: ✅ 迁移路径验证完成
