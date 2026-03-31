# Prisma Schema 数据库迁移指南

## 一、当前状态

### 开发环境
- **数据库**: SQLite
- **Schema 文件**: `schema.prisma`
- **数据库文件**: `prisma/dev.db`

### 生产环境
- **数据库**: PostgreSQL
- **Schema 文件**: `schema.prisma`
- **需要**: 创建 PostgreSQL 适配的 schema

---

## 二、迁移方案

### 方案 A: 使用单一 Schema 文件（推荐）

**优点**：简单，只需要维护一个 schema 文件

**步骤**：

1. **备份当前 schema**
   ```bash
   cp prisma/schema.prisma prisma/schema.prisma.sqlite-backup
   ```

2. **修改 datasource 配置**

   编辑 `prisma/schema.prisma`，将 datasource 部分修改为：

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **调整字段类型**（SQLite 和 PostgreSQL 的差异）

   需要注意的类型差异：
   - `DateTime` 类型在两者中兼容
   - `String` 类型在两者中兼容
   - `Int` 类型在两者中兼容
   - `Boolean` 类型在两者中兼容
   - `Json` / `String` 类型：PostgreSQL 使用 `Json` 类型

4. **重新生成 Prisma Client**
   ```bash
   npm run prisma:generate
   ```

5. **推送 schema 到数据库**
   ```bash
   # 开发环境（SQLite）
   DATABASE_URL="file:./prisma/dev.db" npm run prisma:push

   # 生产环境（PostgreSQL）
   DATABASE_URL="postgresql://user:pass@localhost:5432/jy_production" npm run prisma:push
   ```

### 方案 B: 使用多个 Schema 文件

**优点**：可以同时维护开发和生产环境的不同配置

**步骤**：

1. **创建 PostgreSQL 专用 schema**

   ```bash
   cp prisma/schema.prisma prisma/schema.postgresql.prisma
   ```

2. **修改 PostgreSQL schema 的 datasource**

   编辑 `prisma/schema.postgresql.prisma`：

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **更新 package.json 脚本**

   ```json
   {
     "scripts": {
       "prisma:generate": "prisma generate",
       "prisma:generate:pg": "prisma generate --schema=prisma/schema.postgresql.prisma",
       "prisma:push": "prisma db push --schema=prisma/schema.prisma",
       "prisma:push:pg": "prisma db push --schema=prisma/schema.postgresql.prisma"
     }
   }
   ```

---

## 三、类型差异处理

### SQLite ↔ PostgreSQL 类型映射

| Prisma Type | SQLite | PostgreSQL | 说明 |
|-------------|---------|------------|------|
| `String` | TEXT | VARCHAR(255) | 兼容 |
| `Int` | INTEGER | INTEGER | 兼容 |
| `DateTime` | TEXT | TIMESTAMP | 兼容 |
| `Boolean` | INTEGER | BOOLEAN | 兼容 |
| `Float` | REAL | DOUBLE PRECISION | 兼容 |
| `Json` | TEXT | JSON/JSONB | 需要转换 |
| `Bytes` | BLOB | BYTEA | 兼容 |

### 需要修改的字段

检查以下字段类型是否使用了 JSON：

```prisma
model Employee {
  // ...
  customFields String   @default("{}")  // SQLite 使用 String
  // customFields Json?    // PostgreSQL 应该使用 Json?
}
```

**建议**：
- 开发环境保持 `String @default("{}")`
- 生产环境也使用 `String @default("{}")`（应用层序列化/反序列化）
- 这样可以保持兼容性，不需要修改 schema

---

## 四、完整迁移步骤（推荐方案）

### 步骤 1: 备份当前 schema

```bash
cd backend
cp prisma/schema.prisma prisma/schema.prisma.backup
```

### 步骤 2: 修改 datasource

```bash
# 编辑 prisma/schema.prisma
vim prisma/schema.prisma
```

修改第 4-7 行：

```prisma
# 修改前
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

# 修改后
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 步骤 3: 更新环境变量

```bash
# 开发环境（SQLite）
# .env
DATABASE_URL="file:./prisma/dev.db"

# 生产环境（PostgreSQL）
# .env.production
DATABASE_URL="postgresql://jy_user:your-password@localhost:5432/jy_production?schema=public"
```

### 步骤 4: 重新生成 Prisma Client

```bash
# 开发环境
npm run prisma:generate

# 生产环境构建前
DATABASE_URL="postgresql://..." npm run prisma:generate
npm run build
```

### 步骤 5: 推送 schema

```bash
# 开发环境（SQLite - 如果还需要）
DATABASE_URL="file:./prisma/dev.db" npm run prisma:push

# 生产环境（PostgreSQL）
DATABASE_URL="postgresql://jy_user:password@localhost:5432/jy_production" \
  npm run prisma:push
```

### 步骤 6: 验证

```bash
# 检查生成的 Prisma Client
ls -la node_modules/.prisma/client/

# 检查数据库连接
npm run start:dev
# 检查是否有数据库连接错误
```

---

## 五、常见问题处理

### Q1: 切换后应用无法启动

**错误**: `Error: Unknown database`

**解决方案**:
```bash
# 确保数据库已创建
createdb jy_production

# 或使用 PostgreSQL
psql -U postgres -c "CREATE DATABASE jy_production;"
```

### Q2: 字段类型不兼容

**错误**: `column "xxx" cannot be cast automatically to type Integer`

**解决方案**:
```bash
# 使用 Prisma Migrate 代替 db push
npm install prisma@latest

# 创建迁移
npx prisma migrate dev --name init_postgresql
```

### Q3: JSON 字段问题

**错误**: JSON 查询不工作

**解决方案**:
```bash
# 确保使用正确的 JSON 类型
# 在 schema 中定义
model Employee {
  customFields String @default("{}")  // 应用层处理 JSON
}

# 在代码中使用
const employee = await prisma.employee.findUnique({...});
const customFields = JSON.parse(employee.customFields);
```

---

## 六、自动迁移脚本

创建迁移脚本 `scripts/migrate-to-postgresql.sh`:

```bash
#!/bin/bash
set -e

echo "========================================="
echo "Prisma Schema 迁移: SQLite -> PostgreSQL"
echo "========================================="
echo ""

# 检查环境
if [ ! -f "prisma/schema.prisma" ]; then
    echo "错误: 未找到 schema.prisma 文件"
    exit 1
fi

# 备份当前 schema
echo "1. 备份当前 schema..."
cp prisma/schema.prisma prisma/schema.prisma.backup.$(date +%Y%m%d_%H%M%S)
echo "   ✓ 备份完成"
echo ""

# 检查当前数据库类型
CURRENT_DB=$(grep "provider =" prisma/schema.prisma | head -1 | grep -o 'sqlite\|postgresql')

echo "2. 当前数据库类型: $CURRENT_DB"
echo ""

if [ "$CURRENT_DB" = "postgresql" ]; then
    echo "   已经是 PostgreSQL，无需迁移"
    exit 0
fi

# 切换到 PostgreSQL
echo "3. 切换 datasource 到 PostgreSQL..."

# 临时文件
TEMP_SCHEMA=$(mktemp)

# 读取并修改 schema
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > "$TEMP_SCHEMA"

# 确认替换成功
if grep -q 'provider = "postgresql"' "$TEMP_SCHEMA"; then
    mv "$TEMP_SCHEMA" prisma/schema.prisma
    echo "   ✓ Schema 已更新为 PostgreSQL"
else
    echo "   ✗ 更新失败"
    rm -f "$TEMP_SCHEMA"
    exit 1
fi

echo ""
echo "4. 下一步操作："
echo "   1. 配置 .env 或 .env.production 中的 DATABASE_URL"
echo "   2. 运行: npm run prisma:generate"
echo "   3. 运行: npm run prisma:push"
echo ""
echo "========================================="
echo "迁移准备完成！"
echo "========================================="
```

**使用方法**：

```bash
chmod +x scripts/migrate-to-postgresql.sh
./scripts/migrate-to-postgresql.sh
```

---

## 七、验证清单

迁移后请确认：

- [ ] schema.prisma 中 datasource 使用 "postgresql"
- [ ] .env.production 中 DATABASE_URL 指向 PostgreSQL
- [ ] 运行 `npm run prisma:generate` 成功
- [ ] 运行 `npm run prisma:push` 成功
- [ ] 应用可以正常连接数据库
- [ ] 员工列表查询正常
- [ ] 员工详情查询正常

---

## 八、回滚方案

如果需要回滚到 SQLite：

```bash
# 恢复备份的 schema
cp prisma/schema.prisma.backup.* prisma/schema.prisma

# 或者手动编辑
# 将 provider = "postgresql" 改回 provider = "sqlite"

# 重新生成
npm run prisma:generate

# 推送 schema
npm run prisma:push
```

---

## 九、数据库连接字符串格式

### SQLite
```
file:./prisma/dev.db
```

### PostgreSQL
```
postgresql://[user[:password]@][host][:port][/database][?key=value]
```

**示例**：
```
# 本地 PostgreSQL
postgresql://jy_user:password@localhost:5432/jy_production

# 远程 PostgreSQL
postgresql://jy_user:password@db.example.com:5432/jy_production?schema=public

# 使用 Unix Socket
postgresql://jy_user:password@/jy_production?host=/var/run/postgresql
```

---

**文档版本**: v1.0.0
**最后更新**: 2026-03-31
**维护人**: 开发团队
