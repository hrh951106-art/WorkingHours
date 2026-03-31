#!/bin/bash

# ========================================
# 系统内置字段数据源快速修复 - 一键部署脚本
# ========================================
# 用途: 自动执行所有修复步骤
# 时间: 预计5分钟完成
# ========================================

set -e  # 遇到错误立即退出

echo ""
echo "========================================="
echo "系统内置字段数据源快速修复"
echo "========================================="
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否在backend目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在backend目录下执行此脚本${NC}"
    exit 1
fi

# ========================================
# 步骤1: 执行SQL脚本
# ========================================
echo -e "${YELLOW}【步骤 1/5】执行SQL修复脚本...${NC}"
echo "----------------------------------------"

# 检查数据库连接
if ! command -v psql &> /dev/null; then
    echo -e "${RED}错误: 未找到psql命令，请先安装PostgreSQL客户端${NC}"
    exit 1
fi

# 提示输入数据库连接信息
echo "请输入PostgreSQL连接信息："
read -p "用户名 (默认: jy_admin): " DB_USER
read -p "数据库 (默认: jy_production): " DB_NAME
read -p "主机 (默认: localhost): " DB_HOST
read -p "端口 (默认: 5432): " DB_PORT

# 设置默认值
DB_USER=${DB_USER:-jy_admin}
DB_NAME=${DB_NAME:-jy_production}
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}

# 测试连接
echo "测试数据库连接..."
if ! PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &> /dev/null; then
    echo -e "${RED}错误: 无法连接到数据库，请检查连接信息${NC}"
    exit 1
fi

echo -e "${GREEN}✓ 数据库连接成功${NC}"

# 执行SQL脚本
echo "执行SQL修复脚本..."
PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f scripts/quick-fix-datasource-view.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ SQL脚本执行成功${NC}"
else
    echo -e "${RED}✗ SQL脚本执行失败${NC}"
    exit 1
fi

echo ""

# ========================================
# 步骤2: 验证SQL函数创建
# ========================================
echo -e "${YELLOW}【步骤 2/5】验证SQL函数...${NC}"
echo "----------------------------------------"

RESULT=$(PGPASSWORD="" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c \
    "SELECT COUNT(*) FROM get_employee_info_tabs_with_datasource();")

if [ ! -z "$RESULT" ] && [ "$RESULT" -gt 0 ]; then
    echo -e "${GREEN}✓ SQL函数验证成功，找到 $RESULT 条记录${NC}"
else
    echo -e "${RED}✗ SQL函数验证失败，未找到记录${NC}"
    exit 1
fi

echo ""

# ========================================
# 步骤3: 检查新文件是否存在
# ========================================
echo -e "${YELLOW}【步骤 3/5】检查新文件...${NC}"
echo "----------------------------------------"

FILES=(
    "src/modules/hr/employee-info-tab-quickfix.service.ts"
    "src/modules/hr/employee-info-tab-quickfix.controller.ts"
)

ALL_FILES_EXIST=true
for FILE in "${FILES[@]}"; do
    if [ -f "$FILE" ]; then
        echo -e "${GREEN}✓ $FILE${NC}"
    else
        echo -e "${RED}✗ $FILE 不存在${NC}"
        ALL_FILES_EXIST=false
    fi
done

if [ "$ALL_FILES_EXIST" = false ]; then
    echo -e "${RED}错误: 缺少必要的文件${NC}"
    exit 1
fi

echo ""

# ========================================
# 步骤4: 检查是否已在hr.module.ts中注册
# ========================================
echo -e "${YELLOW}【步骤 4/5】检查模块注册...${NC}"
echo "----------------------------------------"

if grep -q "EmployeeInfoTabQuickFixService" src/modules/hr/hr.module.ts; then
    echo -e "${GREEN}✓ EmployeeInfoTabQuickFixService 已注册${NC}"
else
    echo -e "${YELLOW}⚠ EmployeeInfoTabQuickFixService 未注册${NC}"
    echo "请手动在 src/modules/hr/hr.module.ts 中添加："
    echo ""
    echo "import { EmployeeInfoTabQuickFixService } from './employee-info-tab-quickfix.service';"
    echo "import { EmployeeInfoTabQuickFixController } from './employee-info-tab-quickfix.controller';"
    echo ""
    echo "在 providers 中添加: EmployeeInfoTabQuickFixService,"
    echo "在 controllers 中添加: EmployeeInfoTabQuickFixController,"
    echo ""
    read -p "按Enter继续手动注册，或Ctrl+C退出..."
fi

echo ""

# ========================================
# 步骤5: 构建项目
# ========================================
echo -e "${YELLOW}【步骤 5/5】构建项目...${NC}"
echo "----------------------------------------"

# 检查node_modules
if [ ! -d "node_modules" ]; then
    echo "未找到node_modules，正在安装依赖..."
    npm install
fi

# 构建项目
echo "正在构建..."
npm run build

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ 项目构建成功${NC}"
else
    echo -e "${RED}✗ 项目构建失败${NC}"
    exit 1
fi

echo ""

# ========================================
# 完成
# ========================================
echo "========================================="
echo -e "${GREEN}✓ 修复完成！${NC}"
echo "========================================="
echo ""
echo "下一步操作："
echo ""
echo "1. 重启应用："
echo "   pm2 restart jy-backend"
echo ""
echo "2. 测试新API："
echo "   curl -X GET http://your-domain/api/hr/employee-info-tabs-quickfix/display"
echo ""
echo "3. 验证数据源："
echo "   curl -X GET http://your-domain/api/hr/employee-info-tabs-quickfix/validate/datasource"
echo ""
echo "4. 测试前端："
echo "   打开员工信息编辑页面，检查性别、民族等下拉框是否有选项"
echo ""
echo "========================================="
echo "详细文档: docs/数据源快速修复部署指南.md"
echo "========================================="
echo ""
