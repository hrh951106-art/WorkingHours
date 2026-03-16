#!/bin/bash

# 生产环境数据完整性检查脚本
# 用于快速诊断生产环境基础数据缺失问题

set -e

echo "=========================================="
echo "生产环境数据完整性检查"
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

# 获取数据库文件路径
DB_FILE=$(grep DATABASE_URL .env 2>/dev/null | sed 's/DATABASE_URL="file:\/\/\(.*\)"/\1/' | sed 's/"$//' || true)

if [ -z "$DB_FILE" ]; then
    # 尝试其他可能的格式
    DB_FILE=$(grep DATABASE_URL .env 2>/dev/null | sed 's/DATABASE_URL="file:\.\/\(.*\)"/\1/' | sed 's/"$//' || true)
fi

if [ -z "$DB_FILE" ]; then
    DB_FILE="prod.db"  # 默认值
fi

echo "数据库文件: $DB_FILE"
echo ""

# 检查数据库文件是否存在
if [ ! -f "$DB_FILE" ]; then
    echo -e "${RED}✗ 数据库文件不存在！${NC}"
    echo ""
    echo "可能的原因:"
    echo "  1. 数据库尚未创建"
    echo "  2. .env 文件中的 DATABASE_URL 配置错误"
    echo ""
    echo "建议操作:"
    echo "  1. 检查 .env 文件配置"
    echo "  2. 运行: npm run prisma:push"
    echo "  3. 运行: npm run prisma:seed:all"
    echo ""
    exit 1
fi

echo -e "${GREEN}✓ 数据库文件存在${NC}"
echo ""

# 定义检查函数
check_table_count() {
    local table_name=$1
    local min_count=$2
    local description=$3

    count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM $table_name;" 2>/dev/null || echo "0")

    if [ "$count" -ge "$min_count" ]; then
        echo -e "${GREEN}✓${NC} $description: $count 条"
        return 0
    else
        echo -e "${RED}✗${NC} $description: $count 条 (期望至少 $min_count 条)"
        return 1
    fi
}

check_table_exists() {
    local table_name=$1
    local description=$2

    result=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name='$table_name';" 2>/dev/null || echo "")

    if [ -n "$result" ]; then
        echo -e "${GREEN}✓${NC} $description 表存在"
        return 0
    else
        echo -e "${RED}✗${NC} $description 表不存在"
        return 1
    fi
}

# 检查表结构
echo "----------------------------------------"
echo "检查数据库表结构"
echo "----------------------------------------"

all_tables_exist=true

check_table_exists "DataSource" "数据源" || all_tables_exist=false
check_table_exists "DataSourceOption" "数据源选项" || all_tables_exist=false
check_table_exists "User" "用户" || all_tables_exist=false
check_table_exists "Role" "角色" || all_tables_exist=false
check_table_exists "UserRole" "用户角色关联" || all_tables_exist=false
check_table_exists "Organization" "组织" || all_tables_exist=false
check_table_exists "Employee" "员工" || all_tables_exist=false
check_table_exists "Shift" "班次" || all_tables_exist=false
check_table_exists "PunchDevice" "打卡设备" || all_tables_exist=false

echo ""

if [ "$all_tables_exist" = false ]; then
    echo -e "${RED}数据库表结构不完整！${NC}"
    echo ""
    echo "建议操作:"
    echo "  运行: npm run prisma:push"
    echo ""
    exit 1
fi

# 检查基础数据
echo "----------------------------------------"
echo "检查基础数据"
echo "----------------------------------------"

all_data_ok=true

# 检查数据源
check_table_count "DataSource" 3 "数据源（组织类型、学历、工作状态）" || all_data_ok=false

# 检查数据源选项
check_table_count "DataSourceOption" 5 "数据源选项" || all_data_ok=false

# 详细检查每个数据源
echo ""
echo "详细数据源检查:"

# 组织类型
org_type_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSource WHERE code='ORG_TYPE';" 2>/dev/null || echo "0")
if [ "$org_type_count" -ge 1 ]; then
    org_type_options=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSourceOption WHERE dataSourceId = (SELECT id FROM DataSource WHERE code='ORG_TYPE');" 2>/dev/null || echo "0")
    if [ "$org_type_options" -ge 5 ]; then
        echo -e "${GREEN}✓${NC} 组织类型选项: $org_type_options 个"
    else
        echo -e "${RED}✗${NC} 组织类型选项: $org_type_options 个 (期望至少 5 个)"
        all_data_ok=false
    fi
else
    echo -e "${RED}✗${NC} 组织类型数据源不存在"
    all_data_ok=false
fi

# 学历
edu_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSource WHERE code='EDUCATION';" 2>/dev/null || echo "0")
if [ "$edu_count" -ge 1 ]; then
    edu_options=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSourceOption WHERE dataSourceId = (SELECT id FROM DataSource WHERE code='EDUCATION');" 2>/dev/null || echo "0")
    if [ "$edu_options" -ge 5 ]; then
        echo -e "${GREEN}✓${NC} 学历选项: $edu_options 个"
    else
        echo -e "${RED}✗${NC} 学历选项: $edu_options 个 (期望至少 5 个)"
        all_data_ok=false
    fi
else
    echo -e "${RED}✗${NC} 学历数据源不存在"
    all_data_ok=false
fi

# 工作状态
work_status_count=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSource WHERE code='WORK_STATUS';" 2>/dev/null || echo "0")
if [ "$work_status_count" -ge 1 ]; then
    work_status_options=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM DataSourceOption WHERE dataSourceId = (SELECT id FROM DataSource WHERE code='WORK_STATUS');" 2>/dev/null || echo "0")
    if [ "$work_status_options" -ge 4 ]; then
        echo -e "${GREEN}✓${NC} 工作状态选项: $work_status_options 个"
    else
        echo -e "${RED}✗${NC} 工作状态选项: $work_status_options 个 (期望至少 4 个)"
        all_data_ok=false
    fi
else
    echo -e "${RED}✗${NC} 工作状态数据源不存在"
    all_data_ok=false
fi

echo ""
echo "----------------------------------------"
echo "检查业务数据"
echo "----------------------------------------"

# 检查用户和角色
check_table_count "User" 1 "用户" || all_data_ok=false
check_table_count "Role" 1 "角色" || all_data_ok=false
check_table_count "UserRole" 1 "用户角色关联" || all_data_ok=false

# 检查组织
check_table_count "Organization" 1 "组织" || all_data_ok=false

# 检查员工
check_table_count "Employee" 1 "员工" || all_data_ok=false

# 检查班次
check_table_count "Shift" 1 "班次" || all_data_ok=false

# 检查设备
check_table_count "PunchDevice" 1 "打卡设备" || all_data_ok=false

echo ""
echo "=========================================="

if [ "$all_data_ok" = true ]; then
    echo -e "${GREEN}✓ 所有检查通过！数据完整性良好${NC}"
    echo "=========================================="
    echo ""
    echo "系统已准备就绪，可以正常使用。"
    echo ""
    exit 0
else
    echo -e "${RED}✗ 检查未通过！发现数据缺失${NC}"
    echo "=========================================="
    echo ""
    echo "建议操作:"
    echo ""
    echo "1. 如果只是缺少数据源（组织类型等）:"
    echo "   运行: npm run prisma:seed:datasources"
    echo ""
    echo "2. 如果缺少多个基础数据:"
    echo "   运行: npm run prisma:seed:all"
    echo ""
    echo "3. 或者使用自动化修复脚本:"
    echo "   运行: ./fix-production-data.sh"
    echo ""
    echo "4. 重启应用:"
    echo "   运行: npm run start:prod"
    echo ""
    exit 1
fi
