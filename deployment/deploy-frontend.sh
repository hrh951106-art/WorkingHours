#!/bin/bash
# 精益工时管理系统 - 前端快速部署脚本
# 使用方法: sudo ./deploy-frontend.sh

set -e

echo "========================================"
echo "精益工时管理系统 - 前端部署脚本"
echo "========================================"

# 检查是否以 root 权限运行
if [ "$EUID" -ne 0 ]; then
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 配置变量
FRONTEND_DIR="/var/www/jy-frontend"
BACKUP_DIR="/var/backups/jy-frontend"
SOURCE_DIR="$1"

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ -z "$SOURCE_DIR" ]; then
  echo "使用方法: sudo ./deploy-frontend.sh <前端-dist-目录>"
  echo "示例: sudo ./deploy-frontend.sh /tmp/jy-frontend-dist"
  exit 1
fi

echo -e "${YELLOW}【步骤 1/5】备份当前版本...${NC}"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

# 备份当前版本（如果存在）
if [ -d "$FRONTEND_DIR" ]; then
  BACKUP_FILE="$BACKUP_DIR/jy-frontend-backup-$(date +%Y%m%d_%H%M%S).tar.gz"
  tar -czf "$BACKUP_FILE" -C "$FRONTEND_DIR" . 2>/dev/null || true
  echo -e "${GREEN}✓ 备份完成: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}首次部署，无需备份${NC}"
fi

echo -e "${YELLOW}【步骤 2/5】清理旧文件...${NC}"

# 创建或清空目标目录
if [ -d "$FRONTEND_DIR" ]; then
  rm -rf "$FRONTEND_DIR"/*
else
  mkdir -p "$FRONTEND_DIR"
fi

echo -e "${GREEN}✓ 目录清理完成${NC}"

echo -e "${YELLOW}【步骤 3/5】复制新文件...${NC}"

# 复制文件
cp -r "$SOURCE_DIR"/* "$FRONTEND_DIR"/

echo -e "${GREEN}✓ 文件复制完成${NC}"

echo -e "${YELLOW}【步骤 4/5】设置文件权限...${NC}"

# 设置正确的权限
chown -R www-data:www-data "$FRONTEND_DIR"
chmod -R 755 "$FRONTEND_DIR"

echo -e "${GREEN}✓ 权限设置完成${NC}"

echo -e "${YELLOW}【步骤 5/5】验证部署...${NC}"

# 检查关键文件
if [ ! -f "$FRONTEND_DIR/index.html" ]; then
  echo "错误: index.html 不存在"
  exit 1
fi

echo -e "${GREEN}✓ 前端部署完成！${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}✓ 前端部署完成！${NC}"
echo "========================================"
echo ""
echo "前端文件位置: $FRONTEND_DIR"
echo "请确保 Nginx 配置正确指向此目录"
echo ""
