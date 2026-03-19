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

cd backend
git rev-parse HEAD > ../$BACKUP_DIR/backend-git-rev.txt
cd ../frontend
git rev-parse HEAD > ../$BACKUP_DIR/frontend-git-rev.txt
cd ..

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
echo "✓ 后端服务已启动 (PID: $(cat backend/backend-prod.pid))"
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
