# 生产环境数据修复快速指南

## 问题现象

生产环境部署后出现以下问题：
- ❌ 组织类型字段为空，无法创建组织
- ❌ 学历选项缺失
- ❌ 工作状态选项缺失
- ❌ 其他基础数据源不可用

## 快速诊断

### 方法一：使用自动化检查脚本（推荐）

```bash
# 进入后端目录
cd backend

# 运行检查脚本
./check-production-data.sh
```

脚本会自动检查：
- ✓ 数据库表结构是否完整
- ✓ 数据源是否初始化（组织类型、学历、工作状态）
- ✓ 业务数据是否初始化（用户、组织、员工等）
- ✓ 给出详细的诊断报告和修复建议

### 方法二：手动检查

```bash
# 检查数据源数量
sqlite3 prod.db "SELECT COUNT(*) FROM DataSource;"
# 应该返回 3（组织类型、学历、工作状态）

# 检查数据源选项数量
sqlite3 prod.db "SELECT COUNT(*) FROM DataSourceOption;"
# 应该返回 14（组织类型5个 + 学历5个 + 工作状态4个）

# 检查组织数据
sqlite3 prod.db "SELECT code, name, type FROM Organization;"
# 应该至少有3个组织
```

## 快速修复方案

### 方案一：使用自动化修复脚本（推荐⭐）

```bash
# 进入后端目录
cd backend

# 运行修复脚本
./fix-production-data.sh
```

脚本提供三个选项：

**选项 1: 快速修复**
- 仅初始化缺失的数据源
- 适用于：已有数据但缺少组织类型等基础数据
- 安全：不会影响现有业务数据

**选项 2: 完全初始化**
- 初始化所有种子数据（用户、组织、员工、班次等）
- 适用于：全新部署或数据严重缺失
- 安全：使用 upsert，已存在数据不会被覆盖

**选项 3: 重置数据库**
- 删除所有数据并重新初始化
- 适用于：数据混乱需要完全重置
- ⚠️ 警告：会删除所有现有数据！

### 方案二：手动修复

#### 情况A：仅缺少数据源

```bash
cd backend

# 1. 备份数据库
cp prod.db prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 确保安装了 ts-node
npm install --save-dev ts-node

# 3. 初始化数据源
npm run prisma:seed:datasources

# 4. 验证修复
sqlite3 prod.db "SELECT code, name FROM DataSource;"

# 5. 重启应用
npm run start:prod
```

#### 情况B：完全缺少基础数据

```bash
cd backend

# 1. 备份数据库
cp prod.db prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 确保安装了 ts-node
npm install --save-dev ts-node

# 3. 初始化所有种子数据
npm run prisma:seed:all

# 4. 验证修复
sqlite3 prod.db "SELECT COUNT(*) FROM DataSource;"
sqlite3 prod.db "SELECT COUNT(*) FROM Organization;"
sqlite3 prod.db "SELECT username, name FROM User;"

# 5. 重启应用
npm run start:prod
```

#### 情况C：数据库需要重置

```bash
cd backend

# 1. 备份数据库
cp prod.db prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 2. 删除旧数据库
rm prod.db

# 3. 创建新数据库
npm run prisma:push

# 4. 初始化所有数据
npm run prisma:seed:all

# 5. 启动应用
npm run start:prod
```

## 验证修复结果

### 1. 使用检查脚本验证

```bash
./check-production-data.sh
```

应该看到：
```
✓ 所有检查通过！数据完整性良好
```

### 2. 测试 API 接口

```bash
# 测试登录
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 保存返回的 token，然后测试获取数据源
curl -X GET http://localhost:3001/api/data-sources/ORG_TYPE/options \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# 应该返回组织类型选项列表
```

### 3. 登录系统验证

打开浏览器访问系统：
- 使用默认账号登录：admin / admin123
- 检查是否能看到组织类型选项
- 尝试创建新组织，验证是否正常

## 默认账户信息

| 用户名 | 密码 | 角色 | 说明 |
|--------|------|------|------|
| admin | admin123 | 系统管理员 | 拥有所有权限 |
| hr_admin | hr123 | HR管理员 | 人事管理权限 |

⚠️ **生产环境部署后请立即修改这些密码！**

## 预防措施

### 1. 部署前检查清单

在新环境部署前，确保：

- [ ] 已配置 .env 文件
- [ ] 已安装所有依赖（包括 ts-node）
- [ ] 已执行 `npm run prisma:generate`
- [ ] 已执行 `npm run prisma:push`
- [ ] **已执行 `npm run prisma:seed:all`**
- [ ] 已验证基础数据存在
- [ ] 已修改默认密码

### 2. 部署脚本示例

创建 `deploy.sh`：

```bash
#!/bin/bash

echo "开始部署..."

# 安装依赖
npm install

# 生成 Prisma Client
npm run prisma:generate

# 推送数据库结构
npm run prisma:push

# ⚠️ 重要：初始化所有种子数据
npm run prisma:seed:all

# 构建生产版本
npm run build

# 启动服务
npm run start:prod
```

### 3. Docker 部署注意事项

如果使用 Docker 部署，确保在启动容器前执行种子数据初始化：

```dockerfile
# 在 Dockerfile 中添加
RUN npm run prisma:generate && \
    npm run prisma:push && \
    npm run prisma:seed:all
```

或在 docker-compose.yml 中添加启动命令：

```yaml
command: sh -c "npx prisma:generate && npx prisma:push && npx prisma:seed:all && npm run start:prod"
```

## 常见问题

### Q1: 执行 seed 时报错 "ts-node not found"

**解决方案**：
```bash
npm install --save-dev ts-node
```

### Q2: 执行 seed 时报错 "Unique constraint failed"

**原因**：这是正常的，seed 使用 upsert 机制，已存在的数据不会重复插入

**解决方案**：忽略这个错误，继续使用即可

### Q3: 数据库文件在哪里？

**位置**：
- 开发环境：`backend/dev.db`
- 生产环境：`backend/prod.db`（或在 .env 中配置的路径）

### Q4: 如何查看数据库内容？

**方式一：使用 sqlite3 命令**
```bash
sqlite3 prod.db
> .tables
> SELECT * FROM DataSource;
> .quit
```

**方式二：使用 Prisma Studio**
```bash
npm run prisma:studio
```

### Q5: 修复后数据仍然不正确？

**排查步骤**：
1. 检查 .env 文件中的 DATABASE_URL 是否正确
2. 检查是否有多个数据库文件
3. 查看应用日志，确认应用连接的是哪个数据库
4. 重启应用确保使用最新数据

## 技术支持

如果以上方法都无法解决问题，请检查：

1. Node.js 版本（推荐 >= 18.0.0）
2. 数据库文件权限
3. 环境变量配置
4. 应用日志输出

## 附录：种子数据说明

### 数据源数据（seed-datasources.ts）
- **组织类型**：GROUP、COMPANY、DEPARTMENT、TEAM、POSITION
- **学历**：HIGH_SCHOOL、COLLEGE、BACHELOR、MASTER、DOCTOR
- **工作状态**：ACTIVE、PROBATION、LEAVE、RESIGNED

### 业务数据（seed.ts）
- **角色**：系统管理员（ADMIN）、HR管理员（HR_ADMIN）
- **用户**：admin、hr_admin
- **组织**：集团总部（ROOT）、技术部（TECH）、人力资源部（HR）
- **员工**：张三、李四
- **班次**：正常班（8:00-17:30）
- **设备**：前台考勤机

---

**文档版本**: 1.0.0
**更新日期**: 2026-03-16
**相关文档**: [PRODUCTION_DEPLOYMENT_GUIDE.md](../PRODUCTION_DEPLOYMENT_GUIDE.md)
