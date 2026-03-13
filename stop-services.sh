#!/bin/bash

echo "🛑 正在停止精益工时管理系统..."

# 停止后端服务
if [ -f logs/backend.pid ]; then
    echo "停止后端服务..."
    kill $(cat logs/backend.pid) 2>/dev/null
    rm logs/backend.pid
    echo "✅ 后端服务已停止"
fi

# 停止前端服务
if [ -f logs/frontend.pid ]; then
    echo "停止前端服务..."
    kill $(cat logs/frontend.pid) 2>/dev/null
    rm logs/frontend.pid
    echo "✅ 前端服务已停止"
fi

# 强制清理残留进程
pkill -f "nest start" 2>/dev/null
pkill -f "vite" 2>/dev/null

echo ""
echo "✅ 所有服务已停止！"
