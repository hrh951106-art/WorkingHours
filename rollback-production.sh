#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "========================================="
    echo "  系统回滚工具"
    echo "========================================="
    echo ""
    echo "用法: ./rollback-production.sh <备份目录>"
    echo ""
    echo "可用备份:"
    ls -lt backups/ 2>/dev/null | grep "^d" | awk '{print $NF}' | head -5 || echo "  没有找到备份目录"
    echo ""
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
    echo "✓ 后端代码已恢复到版本: $(cat $BACKUP_DIR/backend-git-rev.txt)"
fi

if [ -f "$BACKUP_DIR/frontend-git-rev.txt" ]; then
    cd frontend
    git checkout $(cat ../$BACKUP_DIR/frontend-git-rev.txt)
    npm ci
    npm run build
    cd ..
    echo "✓ 前端代码已恢复到版本: $(cat $BACKUP_DIR/frontend-git-rev.txt)"
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
echo ""
echo "验证服务..."
if curl -s http://localhost:3001/api/auth/health > /dev/null; then
    echo "✓ 后端服务正常"
else
    echo "⚠ 后端服务异常，请检查日志: tail -f logs/backend-prod.log"
fi

if curl -s http://localhost:5174 > /dev/null; then
    echo "✓ 前端服务正常"
else
    echo "⚠ 前端服务异常，请检查日志: tail -f logs/frontend-prod.log"
fi

echo ""
