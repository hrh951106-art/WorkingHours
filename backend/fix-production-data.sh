#!/bin/bash

# 生产环境数据修复脚本
# 用于修复生产环境缺失基础数据的问题

set -e  # 遇到错误立即退出

echo "=========================================="
echo "生产环境数据修复脚本"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 检查是否在后端目录
if [ ! -f "package.json" ] || [ ! -d "prisma" ]; then
    echo -e "${RED}错误: 请在后端目录下执行此脚本${NC}"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}警告: 未找到 .env 文件${NC}"
    echo "正在创建 .env 文件..."
    cat > .env << EOF
# 数据库配置
DATABASE_URL="file:./prod.db"

# JWT 配置（请修改为强密钥）
JWT_SECRET="jy-super-secret-jwt-key-2024-production"
JWT_EXPIRES_IN="7d"

# 服务器配置
PORT=3001
NODE_ENV="production"
EOF
    echo -e "${GREEN}✓ .env 文件已创建${NC}"
    echo -e "${YELLOW}请编辑 .env 文件，修改 JWT_SECRET 等配置${NC}"
fi

# 检查数据库文件
DB_FILE=$(grep DATABASE_URL .env | sed 's/DATABASE_URL="file:\/\/\(.*\)"/\1/' | sed 's/"$//')

if [ -z "$DB_FILE" ]; then
    echo -e "${RED}错误: 无法从 .env 获取数据库文件路径${NC}"
    exit 1
fi

echo "数据库文件: $DB_FILE"
echo ""

# 询问用户操作类型
echo "请选择操作类型:"
echo "1) 快速修复 - 仅初始化缺失的数据源（适用于已有数据但缺少组织类型等）"
echo "2) 完全初始化 - 初始化所有种子数据（包括用户、组织等）"
echo "3) 重置数据库 - 删除所有数据并重新初始化（⚠️ 会删除现有数据）"
echo ""
read -p "请输入选项 (1/2/3): " choice

case $choice in
    1)
        echo ""
        echo "=========================================="
        echo "执行快速修复..."
        echo "=========================================="
        echo ""

        # 备份数据库
        if [ -f "$DB_FILE" ]; then
            backup_file="${DB_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            echo "备份数据库到: $backup_file"
            cp "$DB_FILE" "$backup_file"
            echo -e "${GREEN}✓ 备份完成${NC}"
        fi

        # 检查并安装依赖
        if ! npm list ts-node > /dev/null 2>&1; then
            echo ""
            echo "安装 ts-node..."
            npm install --save-dev ts-node
            echo -e "${GREEN}✓ ts-node 安装完成${NC}"
        fi

        # 初始化数据源
        echo ""
        echo "初始化数据源..."
        npm run prisma:seed:datasources
        echo -e "${GREEN}✓ 数据源初始化完成${NC}"

        echo ""
        echo "=========================================="
        echo -e "${GREEN}✓ 快速修复完成！${NC}"
        echo "=========================================="
        echo ""
        echo "请重启应用:"
        echo "  npm run start:prod"
        echo ""
        ;;

    2)
        echo ""
        echo "=========================================="
        echo "执行完全初始化..."
        echo "=========================================="
        echo ""

        # 备份数据库
        if [ -f "$DB_FILE" ]; then
            backup_file="${DB_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            echo "备份数据库到: $backup_file"
            cp "$DB_FILE" "$backup_file"
            echo -e "${GREEN}✓ 备份完成${NC}"
        fi

        # 检查并安装依赖
        if ! npm list ts-node > /dev/null 2>&1; then
            echo ""
            echo "安装 ts-node..."
            npm install --save-dev ts-node
            echo -e "${GREEN}✓ ts-node 安装完成${NC}"
        fi

        # 生成 Prisma Client
        echo ""
        echo "生成 Prisma Client..."
        npm run prisma:generate
        echo -e "${GREEN}✓ Prisma Client 生成完成${NC}"

        # 推送数据库结构
        echo ""
        echo "推送数据库结构..."
        npm run prisma:push
        echo -e "${GREEN}✓ 数据库结构推送完成${NC}"

        # 初始化所有种子数据
        echo ""
        echo "初始化所有种子数据..."
        npm run prisma:seed:all
        echo -e "${GREEN}✓ 种子数据初始化完成${NC}"

        echo ""
        echo "=========================================="
        echo -e "${GREEN}✓ 完全初始化完成！${NC}"
        echo "=========================================="
        echo ""
        echo "默认账户:"
        echo "  管理员   - admin / admin123"
        echo "  HR管理员 - hr_admin / hr123"
        echo ""
        echo "请重启应用:"
        echo "  npm run start:prod"
        echo ""
        ;;

    3)
        echo ""
        echo -e "${YELLOW}⚠️  警告: 此操作将删除所有现有数据！${NC}"
        read -p "确定要继续吗? (yes/no): " confirm

        if [ "$confirm" != "yes" ]; then
            echo "操作已取消"
            exit 0
        fi

        echo ""
        echo "=========================================="
        echo "执行数据库重置..."
        echo "=========================================="
        echo ""

        # 备份数据库
        if [ -f "$DB_FILE" ]; then
            backup_file="${DB_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
            echo "备份数据库到: $backup_file"
            cp "$DB_FILE" "$backup_file"
            echo -e "${GREEN}✓ 备份完成${NC}"
        fi

        # 删除旧数据库
        echo ""
        echo "删除旧数据库..."
        rm -f "$DB_FILE"
        echo -e "${GREEN}✓ 旧数据库已删除${NC}"

        # 检查并安装依赖
        if ! npm list ts-node > /dev/null 2>&1; then
            echo ""
            echo "安装 ts-node..."
            npm install --save-dev ts-node
            echo -e "${GREEN}✓ ts-node 安装完成${NC}"
        fi

        # 生成 Prisma Client
        echo ""
        echo "生成 Prisma Client..."
        npm run prisma:generate
        echo -e "${GREEN}✓ Prisma Client 生成完成${NC}"

        # 创建新数据库
        echo ""
        echo "创建新数据库..."
        npm run prisma:push
        echo -e "${GREEN}✓ 数据库创建完成${NC}"

        # 初始化所有种子数据
        echo ""
        echo "初始化种子数据..."
        npm run prisma:seed:all
        echo -e "${GREEN}✓ 种子数据初始化完成${NC}"

        echo ""
        echo "=========================================="
        echo -e "${GREEN}✓ 数据库重置完成！${NC}"
        echo "=========================================="
        echo ""
        echo "默认账户:"
        echo "  管理员   - admin / admin123"
        echo "  HR管理员 - hr_admin / hr123"
        echo ""
        echo "请重启应用:"
        echo "  npm run start:prod"
        echo ""
        ;;

    *)
        echo -e "${RED}无效的选项${NC}"
        exit 1
        ;;
esac

echo "完成！"
