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

### ⚠️ 重要前置检查

在部署前，请确认：
- [ ] 已完成数据库备份
- [ ] 已完成代码备份
- [ ] 已检查当前服务运行状态
- [ ] 已准备回滚方案

```bash
# 快速检查脚本
#!/bin/bash
echo "=== 部署前检查 ==="
echo "1. 检查进程状态:"
pm2 status || echo "PM2未运行"
echo "2. 检查端口占用:"
lsof -i :3000 || echo "端口3000未被占用"
echo "3. 检查磁盘空间:"
df -h | grep -E '(Filesystem|/$)'
echo "4. 检查数据库文件:"
ls -lh prisma/prod.db 2>/dev/null || echo "生产数据库不存在"
```

---

### 方式A：使用Prisma Migrate部署（推荐）✨

**适用场景**: 生产环境部署、需要数据库版本控制

#### 步骤1: 备份现有数据

```bash
cd /path/to/JY/backend

# 备份数据库
cp prisma/prod.db prisma/prod.db.backup.$(date +%Y%m%d_%H%M%S)

# 备份代码（在上级目录）
cd ..
tar -czf jy-backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz backend/
cd backend
```

#### 步骤2: 拉取最新代码

```bash
# 查看当前分支
git branch

# 拉取最新代码
git fetch origin
git pull origin main

# 验证提交历史（应包含 2402f58）
git log --oneline -5
```

#### 步骤3: 安装依赖

```bash
# 安装所有依赖（包括开发依赖，用于运行种子脚本）
npm ci

# 验证Prisma CLI
npx prisma --version
```

#### 步骤4: 生成Prisma客户端

```bash
# 生成Prisma Client
npx prisma generate

# 验证生成成功
ls -la node_modules/@prisma/client/
```

#### 步骤5: 应用数据库迁移

```bash
# 检查迁移状态
npx prisma migrate status

# 应用所有待应用的迁移
npx prisma migrate deploy

# 预期输出:
# ✔ Migration 20250331_init applied successfully
# Database schema is up to date!
```

#### 步骤6: 初始化种子数据

```bash
# 仅初始化数据源（如果已有业务数据）
npm run prisma:seed:datasources

# 或完全重新初始化（全新部署）
npm run prisma:seed:all
```

#### 步骤7: 构建应用

```bash
# 设置生产环境
export NODE_ENV=production

# 构建TypeScript代码
npm run build

# 验证构建输出
ls -la dist/main.js
```

#### 步骤8: 重启服务

```bash
# 使用PM2重启
pm2 restart jy-backend

# 或如果第一次部署
pm2 start dist/main.js --name jy-backend

# 查看启动日志
pm2 logs jy-backend --lines 50
```

#### 步骤9: 验证部署

```bash
# 等待服务启动
sleep 10

# 测试健康检查
curl http://localhost:3000/health

# 测试登录接口
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# 测试HR模块（验证重名方法修复）
TOKEN="返回的jwt_token"
curl -X PUT http://localhost:3000/api/hr/work-info-history/1 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"position":"工程师"}'
```

---

### 方式B：全新部署（传统方法）

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

## 回滚指南

### 快速回滚步骤

如果部署后发现问题，立即执行以下步骤：

#### 步骤1: 停止服务

```bash
pm2 stop jy-backend
```

#### 步骤2: 选择回滚方案

**方案A: 仅回滚代码（保留数据）**

```bash
# 查看提交历史
git log --oneline -10

# 回滚到上一个稳定版本
git reset --hard <上一个commit_hash>

# 重新构建
npm run build

# 重启服务
pm2 start dist/main.js --name jy-backend
```

**方案B: 回滚代码和数据库**

```bash
# 1. 回滚代码
git reset --hard <上一个commit_hash>

# 2. 回滚数据库
LATEST_BACKUP=$(ls -t prisma/prod.db.backup.* | head -1)
cp $LATEST_BACKUP prisma/prod.db

# 3. 重新构建和启动
npm run build
pm2 start dist/main.js --name jy-backend
```

**方案C: 完全恢复（从备份）**

```bash
# 1. 解压代码备份
cd /path/to/JY
BACKUP_FILE=$(ls -t jy-backend-backup-*.tar.gz | head -1)
tar -xzf $BACKUP_FILE

# 2. 恢复数据库
cd backend
LATEST_DB=$(ls -t prisma/prod.db.backup.* | head -1)
cp $LATEST_DB prisma/prod.db

# 3. 重启服务
pm2 start dist/main.js --name jy-backend
```

---

## 故障排查清单

### 问题1: Prisma迁移失败

**症状**:
```
Error: P3006
Migration `20250331_init` failed to apply cleanly
```

**诊断步骤**:
```bash
# 1. 检查数据库状态
npx prisma migrate status

# 2. 检查数据库连接
echo $DATABASE_URL

# 3. 查看数据库表
sqlite3 prisma/prod.db ".tables"
```

**解决方案**:
```bash
# 方案A: 如果表已存在，标记迁移为已应用
npx prisma migrate resolve --applied 20250331_init

# 方案B: 强制重新应用迁移（⚠️ 会删除数据）
npx prisma migrate reset --force

# 方案B后重新初始化数据
npm run prisma:seed:all
```

### 问题2: 重名方法错误仍然存在

**症状**: 启动时报错 `Duplicate function implementation`

**诊断**:
```bash
# 检查代码是否已更新
git log --oneline -1

# 验证文件内容
grep -n "updateWorkInfoHistory" src/modules/hr/hr.controller.ts
```

**解决方案**:
```bash
# 确认代码已拉取
git pull origin main

# 重新构建
npm run build

# 清除PM2缓存
pm2 flush
pm2 restart jy-backend --update-env
```

### 问题3: 数据库表不匹配

**症状**:
```
Error: Column 'xxx' does not exist in the database
```

**诊断**:
```bash
# 比较schema和数据库
npx prisma db pull

# 检查是否有未提交的schema更改
git diff prisma/schema.prisma
```

**解决方案**:
```bash
# 方案A: 应用迁移
npx prisma migrate deploy

# 方案B: 如果schema已更改，创建新迁移
npx prisma migrate dev --name fix_schema

# 方案C: 如果是开发环境，直接推送schema（⚠️ 生产环境不推荐）
npx prisma db push
```

### 问题4: 服务启动失败

**症状**: `Error: Cannot find module` 或 `EADDRINUSE`

**诊断步骤**:
```bash
# 1. 检查端口占用
lsof -i :3000

# 2. 检查依赖安装
npm list --depth=0

# 3. 查看详细错误日志
pm2 logs jy-backend --err --lines 100
```

**解决方案**:
```bash
# 端口占用 - 停止占用进程
kill -9 <pid>

# 依赖缺失 - 重新安装
rm -rf node_modules package-lock.json
npm ci

# 权限问题 - 修复文件权限
chmod +x dist/main.js
```

### 问题5: HR模块接口异常

**症状**: API返回500错误或数据不正确

**诊断**:
```bash
# 测试具体的API端点
curl -X GET http://localhost:3000/api/hr/employees \
  -H "Authorization: Bearer $TOKEN" \
  -v

# 查看服务器日志
pm2 logs jy-backend --lines 100
```

**解决方案**:
```bash
# 1. 验证Prisma客户端已生成
npx prisma generate

# 2. 检查数据库中是否存在相关表
sqlite3 prisma/prod.db ".tables | grep -i employee"

# 3. 检查数据完整性
sqlite3 prisma/prod.db "PRAGMA integrity_check;"

# 4. 重启服务
pm2 restart jy-backend
```

---

## 监控和维护

### 日常监控命令

```bash
# 查看服务状态
pm2 status

# 查看资源使用
pm2 monit

# 查看实时日志
pm2 logs jy-backend

# 检查数据库大小
du -h prisma/prod.db

# 检查磁盘空间
df -h
```

### 定期维护任务

#### 每日
- [ ] 检查服务运行状态
- [ ] 查看错误日志
- [ ] 验证关键接口响应时间

#### 每周
- [ ] 备份数据库
- [ ] 清理旧日志文件
- [ ] 检查磁盘使用情况

#### 每月
- [ ] 更新依赖包（`npm update`）
- [ ] 检查安全漏洞（`npm audit`）
- [ ] 审查访问日志

### 日志管理

```bash
# 配置PM2日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true

# 手动清理旧日志
pm2 flush

# 查看日志配置
pm2 show jy-backend
```

### 数据库维护

```bash
# 定期备份数据库（建议每日）
0 2 * * * cp /path/to/JY/backend/prisma/prod.db /backups/prod.db.$(date +\%Y\%m\%d)

# 数据库优化（每月）
sqlite3 prisma/prod.db "VACUUM;"

# 检查数据库完整性
sqlite3 prisma/prod.db "PRAGMA integrity_check;"
```

---

## 自动化部署脚本

### 完整部署脚本

创建文件 `scripts/deploy-production.sh`:

```bash
#!/bin/bash
set -e  # 遇到错误立即退出

# 配置
PROJECT_DIR="/path/to/JY/backend"
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)
LOG_FILE="$PROJECT_DIR/logs/deploy_$DATE.log"

# 日志函数
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

# 错误处理
error_exit() {
    log "错误: $1"
    exit 1
}

log "========================================"
log "开始部署生产环境"
log "========================================"

# 1. 备份
log "步骤1: 备份当前系统..."
cd $PROJECT_DIR
cp prisma/prod.db prisma/prod.db.backup.$DATE || error_exit "数据库备份失败"
cd ..
tar -czf $BACKUP_DIR/jy-backend-backup-$DATE.tar.gz backend/ || error_exit "代码备份失败"
log "备份完成: jy-backend-backup-$DATE.tar.gz"

# 2. 拉取代码
log "步骤2: 拉取最新代码..."
cd $PROJECT_DIR
git fetch origin || error_exit "Git fetch失败"
git pull origin main || error_exit "Git pull失败"
log "代码更新完成"

# 3. 安装依赖
log "步骤3: 安装依赖..."
npm ci || error_exit "依赖安装失败"
log "依赖安装完成"

# 4. 生成Prisma客户端
log "步骤4: 生成Prisma客户端..."
npx prisma generate || error_exit "Prisma生成失败"
log "Prisma客户端生成完成"

# 5. 应用迁移
log "步骤5: 应用数据库迁移..."
npx prisma migrate deploy || error_exit "数据库迁移失败"
log "数据库迁移完成"

# 6. 构建应用
log "步骤6: 构建应用..."
npm run build || error_exit "应用构建失败"
log "应用构建完成"

# 7. 重启服务
log "步骤7: 重启服务..."
pm2 restart jy-backend || error_exit "服务重启失败"
log "服务重启完成"

# 8. 验证
log "步骤8: 验证服务..."
sleep 10
curl -f http://localhost:3000/health || error_exit "健康检查失败"
log "健康检查通过"

log "========================================"
log "部署成功完成！"
log "========================================"
```

使用方法:
```bash
chmod +x scripts/deploy-production.sh
./scripts/deploy-production.sh
```

### 快速回滚脚本

创建文件 `scripts/rollback.sh`:

```bash
#!/bin/bash
set -e

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: ./rollback.sh <备份文件路径>"
    echo "示例: ./rollback.sh /path/to/backups/jy-backend-backup-20250331_120000.tar.gz"
    exit 1
fi

echo "开始回滚到 $BACKUP_FILE ..."

# 停止服务
pm2 stop jy-backend

# 解压备份
cd /path/to/JY
tar -xzf $BACKUP_FILE

# 恢复数据库
cd backend
LATEST_DB=$(ls -t prisma/prod.db.backup.* | head -1)
cp $LATEST_DB prisma/prod.db

# 重新构建
npm run build

# 启动服务
pm2 start dist/main.js --name jy-backend

echo "回滚完成！"
```

---

## 部署检查清单

### 部署前检查 ✅

- [ ] 创建系统备份（代码+数据库）
- [ ] 验证备份文件完整性
- [ ] 检查可用磁盘空间（至少2GB）
- [ ] 确认当前服务运行状态
- [ ] 通知相关人员维护窗口
- [ ] 准备回滚方案

### 部署步骤检查 ✅

- [ ] 拉取最新代码
- [ ] 验证提交历史（应包含 2402f58）
- [ ] 安装/更新依赖包
- [ ] 生成Prisma客户端
- [ ] 应用数据库迁移
- [ ] 初始化种子数据（如需要）
- [ ] 构建应用
- [ ] 停止旧服务
- [ ] 启动新服务
- [ ] 验证服务启动成功

### 部署后验证 ✅

- [ ] 健康检查接口正常
- [ ] 登录接口正常
- [ ] HR模块接口正常（验证重名方法修复）
- [ ] 数据库查询正常
- [ ] 日志无严重错误
- [ ] 资源使用正常（CPU < 50%, 内存 < 512MB）
- [ ] 响应时间正常（< 500ms）

### 功能测试清单 ✅

- [ ] 用户登录/登出
- [ ] 员工列表查询
- [ ] 组织管理
- [ ] 工作信息更新（两个接口都测试）
- [ ] 考勤记录查询
- [ ] 数据源配置

---

**文档版本**: 2.0.0
**更新日期**: 2025-03-31

---

## 最新更新 (v2.0.0)

### 🔧 本次修复内容 (2025-03-31)

#### 1. HR控制器重名方法修复 ✅
**问题描述**: `hr.controller.ts` 中存在两个同名方法 `updateWorkInfoHistory`
**修复方案**: 将方法重命名为 `updateWorkInfoHistoryById`
**影响文件**: `backend/src/modules/hr/hr.controller.ts:376`

#### 2. Prisma迁移系统初始化 ✅
**问题描述**: 数据库使用 `prisma db push` 创建，无迁移历史追踪
**修复方案**: 初始化完整的Prisma迁移系统
**新增文件**:
- `backend/prisma/migrations/20250331_init/migration.sql`
- `backend/prisma/migrations/20250331_init/migration_lock.toml`

#### 3. Git版本控制优化 ✅
**修复内容**: 更新 `.gitignore` 以允许migrations目录进行版本控制
**影响文件**: `backend/.gitignore`
