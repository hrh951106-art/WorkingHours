#!/bin/bash
# 精益工时管理系统 - 后端快速部署脚本
# 使用方法: sudo ./deploy-backend.sh

set -e

echo "========================================"
echo "精益工时管理系统 - 后端部署脚本"
echo "========================================"

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 配置变量
APP_DIR="/var/www/jy-backend"
SERVICE_NAME="jy-backend"
BACKUP_DIR="/var/backups/jy-backend"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}【步骤 1/7】检查系统环境...${NC}"

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "错误: Node.js 未安装"
  exit 1
fi
echo -e "${GREEN}✓ Node.js 版本: $(node --version)${NC}"

# 检查 npm
if ! command -v npm &> /dev/null; then
  echo "错误: npm 未安装"
  exit 1
fi
echo -e "${GREEN}✓ npm 版本: $(npm --version)${NC}"

# 检查 PostgreSQL
if ! command -v psql &> /dev/null; then
  echo "错误: PostgreSQL 客户端未安装"
  exit 1
fi
echo -e "${GREEN}✓ PostgreSQL 已安装${NC}"

echo -e "${YELLOW}【步骤 2/7】备份当前版本...${NC}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份当前版本（如果存在）
if [ -d "$APP_DIR" ]; then
  BACKUP_FILE="$BACKUP_DIR/jy-backend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$BACKUP_FILE" -C "$APP_DIR" . 2>/dev/null || true
  echo -e "${GREEN}✓ 备份完成: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}首次部署，无需备份${NC}"
fi

echo -e "${YELLOW}【步骤 3/7】安装依赖...${NC}"

cd "$APP_DIR"

# 安装生产依赖
npm install --production --no-optional

# 生成 Prisma Client
echo -e "${YELLOW}生成 Prisma Client...${NC}"
npm run prisma:generate

echo -e "${GREEN}✓ 依赖安装完成${NC}"

echo -e "${YELLOW}【步骤 4/7】构建项目...${NC}"

# 构建项目
npm run build

echo -e "${GREEN}✓ 项目构建完成${NC}"

echo -e "${YELLOW}【步骤 5/7】检查配置文件...${NC}"

# 检查环境配置文件
if [ ! -f "$APP_DIR/.env.production" ]; then
  echo "错误: .env.production 文件不存在"
  echo "请创建 .env.production 文件并配置生产环境变量"
  exit 1
fi

echo -e "${GREEN}✓ 配置文件存在${NC}"

echo -e "${YELLOW}【步骤 6/7】启动服务...${NC}"

# 检查 PM2
if ! command -v pm2 &> /dev/null; then
  echo "PM2 未安装，正在安装..."
  npm install -g pm2
fi

# 检查服务是否已运行
if pm2 list | grep -q "$SERVICE_NAME.*online"; then
  echo "服务已在运行，执行热重载..."
  pm2 reload "$SERVICE_NAME" --env production
else
  echo "启动新服务..."
  pm2 start ecosystem.config.js --env production
fi

# 保存 PM2 配置
pm2 save

echo -e "${GREEN}✓ 服务启动完成${NC}"

echo -e "${YELLOW}【步骤 7/7】验证部署...${NC}"

# 等待服务启动
sleep 5

# 检查服务状态
if pm2 list | grep -q "$SERVICE_NAME.*online"; then
  echo -e "${GREEN}✓ 服务运行正常${NC}"
else
  echo -e "错误: 服务启动失败"
  pm2 logs "$SERVICE_NAME" --lines 50 --err
  exit 1
fi

# 测试 API 端点
if curl -s http://localhost:3001/api > /dev/null; then
  echo -e "${GREEN}✓ API 响应正常${NC}"
else
  echo -e "${YELLOW}警告: API 端点无响应，请检查配置${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}✓ 后端部署完成！${NC}"
echo "========================================"
echo ""
echo "服务管理命令:"
echo "  查看状态: pm2 status"
echo "  查看日志: pm2 logs $SERVICE_NAME"
echo "  重启服务: pm2 restart $SERVICE_NAME"
echo "  停止服务: pm2 stop $SERVICE_NAME"
echo ""
