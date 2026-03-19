# 系统更新快速参考

## 🚀 一键更新

```bash
./update-production.sh
```

## 🔄 一键回滚

```bash
# 查看可用备份
ls -lt backups/

# 回滚到指定备份
./rollback-production.sh backups/update_20260318_173600
```

## 📋 手动更新步骤

### 1️⃣ 备份数据
```bash
BACKUP_DIR="backups/manual_$(date +%Y%m%d_%H%M%S)"
mkdir -p $BACKUP_DIR
cp backend/prod.db $BACKUP_DIR/
cp backend/.env $BACKUP_DIR/
```

### 2️⃣ 停止服务
```bash
kill $(cat backend/backend-prod.pid)
kill $(cat frontend/frontend-prod.pid)
sleep 3
```

### 3️⃣ 更新代码
```bash
# 后端
cd backend
git pull origin main

# 前端
cd ../frontend
git pull origin main
cd ..
```

### 4️⃣ 更新依赖
```bash
cd backend && npm ci && cd ..
cd frontend && npm ci && cd ..
```

### 5️⃣ 重新构建
```bash
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..
```

### 6️⃣ 数据库更新（如需要）
```bash
cd backend
export DATABASE_URL="file:./prod.db"
npx prisma db push --skip-generate
cd ..
```

### 7️⃣ 启动服务
```bash
# 后端
cd backend
export DATABASE_URL="file:./prod.db"
export NODE_ENV=production
nohup node dist/main > ../logs/backend-prod.log 2>&1 &
echo $! > backend-prod.pid

# 前端
cd frontend
npx vite preview --host 0.0.0.0 --port 5174 > ../logs/frontend-prod.log 2>&1 &
echo $! > frontend-prod.pid
cd ..
```

## 🔍 验证服务

### 检查进程
```bash
ps aux | grep -E "node dist/main|vite preview" | grep -v grep
```

### 检查日志
```bash
tail -f logs/backend-prod.log
tail -f logs/frontend-prod.log
```

### 测试API
```bash
# 健康检查
curl http://localhost:3001/api/auth/health

# 登录测试
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

### 检查数据
```bash
# 数据完整性
sqlite3 backend/prod.db "PRAGMA integrity_check;"

# 关键表记录数
sqlite3 backend/prod.db "SELECT COUNT(*) FROM User;"
sqlite3 backend/prod.db "SELECT COUNT(*) FROM Organization;"
```

## ⚠️ 故障排查

### 服务无法启动
```bash
# 1. 查看错误日志
tail -50 logs/backend-prod.log

# 2. 检查端口占用
lsof -i :3001
lsof -i :5174

# 3. 强制释放端口
kill -9 $(lsof -ti :3001)
kill -9 $(lsof -ti :5174)
```

### 数据库迁移失败
```bash
# 备份数据库
cp backend/prod.db backend/prod.db.backup

# 重试迁移
cd backend
export DATABASE_URL="file:./prod.db"
npx prisma migrate deploy
```

### Git冲突
```bash
cd backend
git stash
git pull origin main
git stash pop  # 如需要保留本地修改
```

## 📁 重要路径

| 项目 | 路径 |
|------|------|
| 后端代码 | `backend/` |
| 前端代码 | `frontend/` |
| 数据库 | `backend/prod.db` |
| 后端日志 | `logs/backend-prod.log` |
| 前端日志 | `logs/frontend-prod.log` |
| 备份目录 | `backups/` |
| 后端PID | `backend/backend-prod.pid` |
| 前端PID | `frontend/frontend-prod.pid` |

## 🌐 访问地址

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:5174 |
| 后端API | http://localhost:3001 |
| API文档 | http://localhost:3001/api-docs |

## 📞 获取帮助

详细文档请查看：
- 系统更新手册: `SYSTEM_UPDATE_GUIDE.md`
- 生产部署信息: `PRODUCTION_INFO.md`
- 部署指南: `PRODUCTION_DEPLOYMENT_GUIDE.md`

---
**提示**: 更新前务必备份数据！
