# 生产环境部署指南

## 目录
- [数据库初始化](#数据库初始化)
- [环境变量配置](#环境变量配置)
- [部署步骤](#部署步骤)
- [验证部署](#验证部署)
- [常见问题](#常见问题)

---

## 数据库初始化

### ⚠️ 重要说明

**生产环境必须执行完整的数据库初始化流程**，否则会出现基础数据缺失的问题：
- ❌ 组织类型为空，无法创建组织
- ❌ 学历选项缺失
- ❌ 工作状态选项缺失
- ❌ 其他基础数据源不可用

### 种子数据说明

项目包含两类种子数据：

#### 1. 数据源数据（seed-datasources.ts）
- **组织类型**：GROUP、COMPANY、DEPARTMENT、TEAM、POSITION
- **学历**：高中、大专、本科、硕士、博士
- **工作状态**：在职、试用期、请假、离职

#### 2. 业务数据（seed.ts）
- **角色**：系统管理员（ADMIN）、HR管理员（HR_ADMIN）
- **用户**：admin、hr_admin
- **组织**：集团总部（ROOT）、技术部（TECH）、人力资源部（HR）
- **员工**：张三、李四
- **班次**：正常班
- **设备**：前台考勤机

---

## 环境变量配置

### 生产环境配置文件

在生产环境服务器上创建 `.env` 文件：

```bash
cd /path/to/JY/backend
cp .env.example .env  # 如果有示例文件
# 或直接创建
vi .env
```

### 必需配置项

```env
# 数据库配置
DATABASE_URL="file:./prod.db"

# JWT 配置（生产环境必须更换为强密钥）
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
NODE_ENV="production"

# API 配置（如果前后端分离）
API_BASE_URL="https://your-domain.com/api"
FRONTEND_URL="https://your-domain.com"
```

### 安全建议

1. **JWT_SECRET 必须使用强随机密钥**
   ```bash
   # 生成随机密钥
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **修改默认密码**
   - 部署后立即修改 admin 和 hr_admin 的密码
   - 或在代码中修改 seed.ts 的默认密码

3. **数据库文件权限**
   ```bash
   chmod 600 prod.db  # 仅所有者可读写
   ```

---

## 部署步骤

### 方式一：全新部署（推荐）

适用于第一次部署生产环境：

```bash
# 1. 进入后端目录
cd /path/to/JY/backend

# 2. 安装依赖
npm ci --production=false  # 需要 ts-node 来执行种子脚本

# 3. 配置环境变量
vi .env
# 按上述说明配置

# 4. 生成 Prisma Client
npm run prisma:generate

# 5. 创建数据库表结构
npm run prisma:push

# 6. 初始化所有种子数据（重要！）
npm run prisma:seed:all

# 7. 验证数据初始化
sqlite3 prod.db "SELECT COUNT(*) FROM DataSource;"  # 应该返回 3
sqlite3 prod.db "SELECT COUNT(*) FROM DataSourceOption;"  # 应该返回 14
sqlite3 prod.db "SELECT COUNT(*) FROM Organization;"  # 应该返回 3

# 8. 构建生产版本
npm run build

# 9. 仅安装生产依赖
npm ci --production

# 10. 启动服务
npm run start:prod
```

### 方式二：修复已有部署

如果生产环境已经部署但数据缺失：

```bash
# 1. 进入后端目录
cd /path/to/JY/backend

# 2. 确认问题：检查数据源是否为空
sqlite3 prod.db "SELECT * FROM DataSource;"
# 如果结果为空，说明数据源未初始化

# 3. 备份数据库（安全起见）
cp prod.db prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 4. 安装 ts-node（如果未安装）
npm install --save-dev ts-node

# 5. 初始化数据源
npm run prisma:seed:datasources

# 6. 验证修复
sqlite3 prod.db "SELECT code, name FROM DataSource;"
# 应该看到：
# ORG_TYPE    | 组织类型
# EDUCATION   | 学历
# WORK_STATUS | 工作状态

# 7. 重启服务
npm run start:prod
```

### 方式三：完全重新初始化

如果数据混乱需要重置：

```bash
# 1. 备份现有数据库
cp prod.db prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 删除旧数据库
rm prod.db

# 3. 重新创建并初始化
npm run prisma:push
npm run prisma:seed:all

# 4. 验证并启动
npm run start:prod
```

---

## 验证部署

### 1. 检查数据库数据

```bash
# 检查数据源
sqlite3 prod.db "SELECT code, name, type FROM DataSource;"

# 检查组织类型选项
sqlite3 prod.db "SELECT label, value FROM DataSourceOption WHERE dataSourceId = 1;"

# 检查组织
sqlite3 prod.db "SELECT code, name, type FROM Organization;"

# 检查用户
sqlite3 prod.db "SELECT username, name, status FROM User;"
```

### 2. 测试 API 接口

```bash
# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试获取组织类型
curl -X GET http://localhost:3001/api/data-sources/ORG_TYPE/options \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 测试创建组织
curl -X POST http://localhost:3001/api/organizations \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "SALES",
    "name": "销售部",
    "type": "DEPARTMENT",
    "parentId": 1,
    "level": 2
  }'
```

### 3. 检查日志

```bash
# 查看应用日志
tail -f logs/application.log  # 如果配置了日志

# 或直接查看控制台输出
# 确认没有错误信息
```

---

## 常见问题

### Q1: 组织创建时报错"组织类型不存在"

**原因**：数据源未初始化

**解决方案**：
```bash
npm run prisma:seed:datasources
```

### Q2: 登录后看不到任何基础数据

**原因**：种子数据未完全执行

**解决方案**：
```bash
npm run prisma:seed:all
```

### Q3: 执行 seed 时报错 "Unique constraint failed"

**原因**：数据已存在

**解决方案**：
- 这是正常的，seed 使用 upsert 机制
- 如果想重新初始化，先备份数据库，然后删除重建

### Q4: 生产环境如何重置管理员密码？

**方式一：通过 API**
```bash
# 使用现有管理员账号登录
# 然后调用修改密码接口
```

**方式二：直接修改数据库**
```bash
# 生成新密码的哈希
node -e "const bcrypt = require('bcrypt'); bcrypt.hash('newpassword', 10).then(console.log);"

# 更新数据库
sqlite3 prod.db "UPDATE User SET password = '新生成的哈希' WHERE username = 'admin';"
```

### Q5: 数据库文件应该放在哪里？

**推荐位置**：
- 开发环境：`backend/dev.db`
- 生产环境：`/var/lib/jy/prod.db` 或使用 Docker 卷
- 确保：数据库文件所在目录有适当的备份策略

### Q6: 如何使用 PostgreSQL 或 MySQL？

**修改 .env**：
```env
# PostgreSQL
DATABASE_URL="postgresql://user:password@localhost:5432/jydb?schema=public"

# MySQL
DATABASE_URL="mysql://user:password@localhost:3306/jydb"
```

**修改 prisma/schema.prisma**：
```prisma
datasource db {
  provider = "postgresql"  # 或 "mysql"
  url      = env("DATABASE_URL")
}
```

然后执行：
```bash
npm run prisma:generate
npm run prisma:push
npm run prisma:seed:all
```

---

## 附录

### 可用的 NPM 脚本

```bash
# 数据库相关
npm run prisma:generate      # 生成 Prisma Client
npm run prisma:push          # 推送 schema 到数据库
npm run prisma:studio        # 打开 Prisma Studio（可视化工具）
npm run prisma:seed          # 仅初始化业务数据
npm run prisma:seed:datasources  # 仅初始化数据源
npm run prisma:seed:all      # 初始化所有数据（推荐生产环境）

# 应用相关
npm run build                # 构建生产版本
npm run start:prod           # 启动生产服务
npm run start:dev            # 启动开发服务
```

### 默认账户信息

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 系统管理员 | 拥有所有权限 |
| hr_admin | hr123 | HR管理员 | 人事管理权限 |

⚠️ **生产环境部署后请立即修改这些密码！**

### 数据结构关系

```
DataSource (数据源)
  └── DataSourceOption (数据选项)
        ↓ 被引用
Organization (组织) ← 使用 ORG_TYPE
Employee (员工) ← 使用 EDUCATION, WORK_STATUS
```

### 技术支持

如遇到其他问题，请检查：
1. Node.js 版本（推荐 >= 18.0.0）
2. 数据库文件权限
3. 环境变量配置
4. 日志输出信息

---

**文档版本**: 1.0.0
**更新日期**: 2024-03-13
