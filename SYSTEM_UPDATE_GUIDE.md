# 系统更新操作手册

## 目录
- [更新前准备](#更新前准备)
- [代码更新](#代码更新)
- [数据库更新](#数据库更新)
- [重新构建](#重新构建)
- [服务重启](#服务重启)
- [验证更新](#验证更新)
- [回滚方案](#回滚方案)
- [常见问题](#常见问题)

---

## 更新前准备

### 1. 检查当前服务状态

```bash
# 检查后端服务
ps aux | grep "node dist/main" | grep -v grep

# 检查前端服务
ps aux | grep "vite preview" | grep -v grep

# 查看服务进程ID
cat backend/backend-prod.pid
cat frontend/frontend-prod.pid
```

### 2. 备份数据

```bash
# 创建备份目录
mkdir -p backups/$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"

# 备份数据库
cp backend/prod.db $BACKUP_DIR/prod.db

# 备份配置文件
cp backend/.env $BACKUP_DIR/.env.backup

# 备份当前运行的代码版本
cd backend
git rev-parse HEAD > $BACKUP_DIR/backend-git-rev.txt
cd ../frontend
git rev-parse HEAD > $BACKUP_DIR/frontend-git-rev.txt
cd ..

echo "备份完成，备份目录: $BACKUP_DIR"
```

### 3. 记录当前版本信息

```bash
# 查看当前Git分支和版本
cd backend
echo "=== 后端当前版本 ==="
git branch
git log -1 --oneline
git rev-parse HEAD

cd ../frontend
echo "=== 前端当前版本 ==="
git branch
git log -1 --oneline
git rev-parse HEAD
cd ..
```

### 4. 检查数据库状态

```bash
# 验证数据库完整性
sqlite3 backend/prod.db "PRAGMA integrity_check;"

# 检查关键数据表
sqlite3 backend/prod.db "SELECT COUNT(*) FROM User;"
sqlite3 backend/prod.db "SELECT COUNT(*) FROM Organization;"
sqlite3 backend/prod.db "SELECT COUNT(*) FROM Employee;"
```

---

## 代码更新

### 方式一：Git拉取更新（推荐）

```bash
# 1. 更新后端代码
cd backend
git fetch origin
git status
git pull origin main

# 查看更新内容
git log HEAD@{1}..HEAD@{0} --oneline

# 2. 更新前端代码
cd ../frontend
git fetch origin
git status
git pull origin main

# 查看更新内容
git log HEAD@{1}..HEAD@{0} --oneline

cd ..
```

### 方式二：手动更新

如果有代码压缩包：

```bash
# 1. 备份当前代码
cp -r backend backend.backup.$(date +%Y%m%d)
cp -r frontend frontend.backup.$(date +%Y%m%d)

# 2. 解压新代码到临时目录
mkdir -p /tmp/jy-update
# 将压缩包解压到 /tmp/jy-update

# 3. 复制新代码（保留配置文件）
cp -r /tmp/jy-update/backend/* backend/
cp -r /tmp/jy-update/frontend/* frontend/

# 4. 恢复配置文件
cp backend.backup.$(date +%Y%m%d)/.env backend/
```

---

## 数据库更新

### 1. 检查数据库迁移文件

```bash
cd backend

# 查看Prisma迁移历史
npx prisma migrate status

# 如果有新的迁移，执行迁移
npx prisma migrate deploy
```

### 2. 如果数据库Schema有变化

```bash
cd backend

# 方式一：使用 Prisma Push（简单场景）
export DATABASE_URL="file:./prod.db"
npx prisma db push

# 方式二：使用迁移（生产环境推荐）
npx prisma migrate deploy

# 验证数据库Schema
npx prisma migrate status
```

### 3. 如果需要重新生成种子数据

```bash
cd backend

# 仅当数据源有更新时
export DATABASE_URL="file:./prod.db"
npm run prisma:seed:datasources
```

---

## 重新构建

### 1. 后端构建

```bash
cd backend

# 清理旧的构建（可选）
rm -rf dist

# 安装/更新依赖
npm ci

# 构建生产版本
npm run build

# 验证构建产物
ls -la dist/
ls -la dist/main.js
```

### 2. 前端构建

```bash
cd frontend

# 清理旧的构建
rm -rf dist

# 安装/更新依赖
npm ci

# 构建生产版本
npm run build

# 验证构建产物
ls -la dist/
ls -la dist/index.html
```

---

## 服务重启

### 方式一：更新脚本（推荐）

创建更新脚本：

```bash
cat > update-production.sh << 'SCRIPT'
#!/bin/bash

set -e  # 遇到错误立即退出

echo "========================================="
echo "  系统更新开始 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="

# 1. 备份数据
echo ""
echo "【步骤 1/7】备份数据..."
BACKUP_DIR="backups/update_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp backend/prod.db $BACKUP_DIR/
cp backend/.env $BACKUP_DIR/
echo "✓ 数据已备份到: $BACKUP_DIR"

# 2. 停止服务
echo ""
echo "【步骤 2/7】停止服务..."
if [ -f backend/backend-prod.pid ]; then
    kill $(cat backend/backend-prod.pid) 2>/dev/null || true
    rm backend/backend-prod.pid
    echo "✓ 后端服务已停止"
fi

if [ -f frontend/frontend-prod.pid ]; then
    kill $(cat frontend/frontend-prod.pid) 2>/dev/null || true
    rm frontend/frontend-prod.pid
    echo "✓ 前端服务已停止"
fi

sleep 3

# 3. 更新代码
echo ""
echo "【步骤 3/7】更新代码..."
cd backend
git pull origin main
cd ../frontend
git pull origin main
cd ..
echo "✓ 代码已更新"

# 4. 更新依赖
echo ""
echo "【步骤 4/7】更新依赖..."
cd backend
npm ci
cd ../frontend
npm ci
cd ..
echo "✓ 依赖已更新"

# 5. 重新构建
echo ""
echo "【步骤 5/7】重新构建..."
cd backend
npm run build
cd ../frontend
npm run build
cd ..
echo "✓ 构建完成"

# 6. 数据库更新（如果需要）
echo ""
echo "【步骤 6/7】检查数据库更新..."
cd backend
export DATABASE_URL="file:./prod.db"
npx prisma db push --skip-generate
echo "✓ 数据库检查完成"
cd ..

# 7. 启动服务
echo ""
echo "【步骤 7/7】启动服务..."
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid
echo "✓ 后端服务已启动 (PID: $(cat backend-prod.pid))"
cd ..

cd frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid
echo "✓ 前端服务已启动 (PID: $(cat frontend/frontend-prod.pid))"
cd ..

# 等待服务启动
echo ""
echo "等待服务启动..."
sleep 10

# 8. 验证服务
echo ""
echo "验证服务状态..."
if curl -s http://localhost:3001/api/auth/health > /dev/null; then
    echo "✓ 后端API正常"
else
    echo "✗ 后端API异常，请检查日志"
    exit 1
fi

if curl -s http://localhost:5174 > /dev/null; then
    echo "✓ 前端服务正常"
else
    echo "✗ 前端服务异常，请检查日志"
    exit 1
fi

echo ""
echo "========================================="
echo "  系统更新完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
echo ""
echo "访问地址:"
echo "  前端: http://localhost:5174"
echo "  后端: http://localhost:3001"
echo "  API文档: http://localhost:3001/api-docs"
echo ""
echo "日志文件:"
echo "  后端: logs/backend-prod.log"
echo "  前端: logs/frontend-prod.log"
echo ""
SCRIPT

chmod +x update-production.sh
```

### 方式二：手动更新步骤

```bash
# 1. 停止服务
echo "停止服务..."
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)

sleep 3

# 2. 后端更新
echo "更新后端..."
cd backend
git pull origin main
npm ci
npm run build

# 3. 前端更新
echo "更新前端..."
cd ../frontend
git pull origin main
npm ci
npm run build

cd ..

# 4. 启动后端
echo "启动后端..."
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid

# 5. 启动前端
echo "启动前端..."
cd ../frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid

echo "更新完成！"
```

### 方式三：零停机更新（高级）

需要准备两套环境：

```bash
# 1. 在新端口启动新版本
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
export PORT=3011
nohup node dist/main > ../logs/backend-prod-new.log 2>&1 &
NEW_BACKEND_PID=$!
echo $NEW_BACKEND_PID > backend-prod-new.pid

# 2. 在新端口启动新前端
cd frontend
npx vite preview --host 0.0.0.0 --port 5175 > ../logs/frontend-prod-new.log 2>&1 &
NEW_FRONTEND_PID=$!
echo $NEW_FRONTEND_PID > frontend-prod-new.pid

# 3. 验证新版本
# 测试新版本服务...
# 如果测试通过，继续；否则回滚

# 4. 切换Nginx配置（如果使用）
# 更新Nginx配置，将流量切换到新端口
# sudo nginx -s reload

# 5. 停止旧版本
kill $(cat backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)

# 6. 更新PID文件
mv backend-prod-new.pid backend-prod.pid
mv frontend-prod-new.pid frontend-prod.pid
```

---

## 验证更新

### 1. 基本服务检查

```bash
# 检查进程
ps aux | grep -E "node dist/main|vite preview" | grep -v grep

# 检查端口
lsof -i :3001
lsof -i :5174

# 检查日志
tail -20 logs/backend-prod.log
tail -20 logs/frontend-prod.log
```

### 2. API功能测试

```bash
# 测试登录
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

echo "Token: $TOKEN"

# 测试组织接口
curl -s -X GET http://localhost:3001/api/hr/organizations \
  -H "Authorization: Bearer $TOKEN" | head -100

# 测试数据源接口
curl -s -X GET http://localhost:3001/api/hr/data-sources \
  -H "Authorization: Bearer $TOKEN" | head -100
```

### 3. 前端功能测试

访问以下页面验证功能：
- http://localhost:5174 - 登录页面
- 登录后访问工作台
- 测试关键功能：人员管理、排班管理、工时管理等

### 4. 性能检查

```bash
# 检查内存使用
ps aux | grep "node dist/main" | awk '{print "内存使用:", $6/1024 "MB"}'

# 检查响应时间
time curl -s http://localhost:3001/api/auth/health

# 检查数据库查询（如果有慢查询）
tail -100 logs/backend-prod.log | grep -i "slow\|timeout"
```

---

## 回滚方案

### 快速回滚脚本

```bash
cat > rollback-production.sh << 'SCRIPT'
#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "用法: ./rollback-production.sh <备份目录>"
    echo ""
    echo "可用备份:"
    ls -lt backups/ | grep "^d" | head -5
    exit 1
fi

BACKUP_DIR=$1

if [ ! -d "$BACKUP_DIR" ]; then
    echo "错误: 备份目录不存在: $BACKUP_DIR"
    exit 1
fi

echo "========================================="
echo "  系统回滚 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "  备份目录: $BACKUP_DIR"
echo "========================================="

# 1. 停止服务
echo ""
echo "【步骤 1/4】停止服务..."
kill $(cat backend/backend-prod.pid) 2>/dev/null || true
kill $(cat frontend/frontend-prod.pid) 2>/dev/null || true
sleep 3
echo "✓ 服务已停止"

# 2. 恢复数据库
echo ""
echo "【步骤 2/4】恢复数据库..."
cp backend/prod.db backend/prod.db.before-rollback.$(date +%Y%m%d_%H%M%S)
cp $BACKUP_DIR/prod.db backend/prod.db
echo "✓ 数据库已恢复"

# 3. 恢复代码（如果需要）
echo ""
echo "【步骤 3/4】恢复代码版本..."
if [ -f "$BACKUP_DIR/backend-git-rev.txt" ]; then
    cd backend
    git checkout $(cat ../$BACKUP_DIR/backend-git-rev.txt)
    npm ci
    npm run build
    cd ..
    echo "✓ 后端代码已恢复"
fi

if [ -f "$BACKUP_DIR/frontend-git-rev.txt" ]; then
    cd frontend
    git checkout $(cat ../$BACKUP_DIR/frontend-git-rev.txt)
    npm ci
    npm run build
    cd ..
    echo "✓ 前端代码已恢复"
fi

# 4. 启动服务
echo ""
echo "【步骤 4/4】启动服务..."
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid
echo "✓ 后端服务已启动"
cd ..

cd frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid
echo "✓ 前端服务已启动"
cd ..

sleep 10

echo ""
echo "========================================="
echo "  系统回滚完成 - $(date '+%Y-%m-%d %H:%M:%S')"
echo "========================================="
SCRIPT

chmod +x rollback-production.sh
```

### 手动回滚步骤

```bash
# 1. 停止服务
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)

# 2. 恢复数据库
cp backend/prod.db backend/prod.db.failed
cp backups/update_20260318_173600/prod.db backend/prod.db

# 3. 恢复代码版本
cd backend
git checkout <previous-commit-hash>
npm ci
npm run build

cd ../frontend
git checkout <previous-commit-hash>
npm ci
npm run build

# 4. 重启服务
cd ../backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid

cd ../frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid
```

### Git版本回滚

```bash
# 查看提交历史
cd backend
git log --oneline -10

# 回滚到指定版本
git checkout abc1234  # 提交的hash

# 或者回滚到上一个版本
git checkout HEAD~1

# 重新构建
npm ci
npm run build
```

---

## 常见问题

### Q1: 更新后服务无法启动

**排查步骤**:

```bash
# 1. 检查错误日志
tail -50 logs/backend-prod.log
tail -50 logs/frontend-prod.log

# 2. 检查端口占用
lsof -i :3001
lsof -i :5174

# 3. 检查环境变量
cat backend/.env

# 4. 检查构建产物
ls -la backend/dist/
ls -la frontend/dist/

# 5. 尝试手动启动查看详细错误
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
node dist/main
```

**常见原因**:
- 端口被占用：`kill -9 $(lsof -ti :3001)`
- 环境变量未设置：确保 DATABASE_URL 正确
- 依赖未安装：运行 `npm ci`
- 构建失败：重新运行 `npm run build`

### Q2: 数据库迁移失败

**处理步骤**:

```bash
# 1. 备份数据库
cp backend/prod.db backend/prod.db.before-migration

# 2. 检查迁移状态
cd backend
npx prisma migrate status

# 3. 如果迁移失败，回滚
npx prisma migrate resolve --rolled-back [migration-name]

# 4. 重新执行迁移
npx prisma migrate deploy

# 5. 验证数据完整性
sqlite3 prod.db "PRAGMA integrity_check;"
```

### Q3: 前端页面空白或报错

**排查步骤**:

```bash
# 1. 清除浏览器缓存
# 在浏览器中按 Ctrl+Shift+R (Windows) 或 Cmd+Shift+R (Mac)

# 2. 检查前端构建
cd frontend
ls -la dist/index.html

# 3. 检查控制台错误
# 打开浏览器开发者工具，查看Console和Network

# 4. 验证API连接
curl http://localhost:3001/api/auth/health

# 5. 检查CORS配置
# 查看 backend/.env 中的 FRONTEND_URL
```

### Q4: 更新后数据丢失

**立即恢复**:

```bash
# 1. 立即停止所有服务
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)

# 2. 恢复最近的数据库备份
ls -lt backups/ | head -5
cp backups/<最新的备份>/prod.db backend/prod.db

# 3. 重启服务
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid

# 4. 验证数据
sqlite3 backend/prod.db "SELECT COUNT(*) FROM User;"
```

### Q5: Git pull 冲突

**解决步骤**:

```bash
# 1. 查看冲突文件
cd backend
git status

# 2. 备份本地修改
git stash

# 3. 拉取最新代码
git pull origin main

# 4. 如果有本地修改需要保留
git stash pop
# 手动解决冲突

# 5. 如果不需要本地修改
git stash drop

# 6. 更新前端
cd ../frontend
git stash
git pull origin main
git stash drop
```

---

## 定期维护建议

### 每日维护
- 检查服务运行状态
- 查看错误日志
- 监控资源使用

### 每周维护
- 数据库备份
- 检查磁盘空间
- 审查安全日志

### 每月维护
- 依赖包更新
- 安全漏洞扫描
- 性能分析

---

## 快速参考

### 一键更新（使用脚本）

```bash
./update-production.sh
```

### 一键回滚

```bash
# 查看可用备份
ls -lt backups/

# 回滚到指定备份
./rollback-production.sh backups/update_20260318_173600
```

### 常用命令

```bash
# 查看服务状态
ps aux | grep -E "node dist/main|vite preview" | grep -v grep

# 查看日志
tail -f logs/backend-prod.log
tail -f logs/frontend-prod.log

# 重启服务
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)
# 然后执行启动命令

# 查看版本信息
cd backend && git log -1 --oneline && cd ..
cd frontend && git log -1 --oneline && cd ..
```

---

## 联系支持

如遇到无法解决的问题，请联系技术支持团队，并提供：
1. 错误日志
2. 执行的命令
3. 当前系统版本
4. 错误复现步骤

---

**文档版本**: 1.0.0  
**创建日期**: 2026-03-18  
**最后更新**: 2026-03-18
