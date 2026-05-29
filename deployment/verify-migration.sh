#!/bin/bash
# PostgreSQL 数据库迁移验证脚本
# 验证迁移后的数据库是否完整

set -e

# 颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "========================================"
echo "PostgreSQL 数据库迁移验证"
echo "========================================"
echo ""

# 默认配置
DB_NAME="jy_production"
DB_USER="jy_user"
DB_HOST="localhost"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--database)
            DB_NAME="$2"
            shift 2
            ;;
        -u|--user)
            DB_USER="$2"
            shift 2
            ;;
        -h|--host)
            DB_HOST="$2"
            shift 2
            ;;
        -p|--password)
            PGPASSWORD="$2"
            shift 2
            ;;
        *)
            echo "未知选项: $1"
            exit 1
            ;;
    esac
done

# 如果没有提供密码，提示输入
if [ -z "$PGPASSWORD" ]; then
    read -sp "请输入数据库用户 '$DB_USER' 的密码: " PGPASSWORD
    echo
fi

export PGPASSWORD

echo -e "${YELLOW}数据库配置:${NC}"
echo "  主机: $DB_HOST"
echo "  数据库: $DB_NAME"
echo "  用户: $DB_USER"
echo ""

# 测试连接
echo -e "${YELLOW}【测试 1/7】数据库连接测试${NC}"
if psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -c "SELECT 1;" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ 数据库连接成功${NC}"
else
    echo -e "${RED}✗ 数据库连接失败${NC}"
    echo "请检查数据库配置和密码"
    exit 1
fi

# 检查表数量
echo -e "\n${YELLOW}【测试 2/7】表数量验证${NC}"
TABLE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")

if [ "$TABLE_COUNT" -eq 87 ]; then
    echo -e "${GREEN}✓ 表数量正确: $TABLE_COUNT 张表${NC}"
else
    echo -e "${YELLOW}⚠ 表数量异常: $TABLE_COUNT (预期: 87)${NC}"
fi

# 检查表是否存在
echo -e "\n${YELLOW}【测试 3/7】关键表存在性检查${NC}"
REQUIRED_TABLES=("User" "Role" "Employee" "Organization" "PunchRecord" "WorkHourResult")

ALL_EXIST=true
for table in "${REQUIRED_TABLES[@]}"; do
    EXISTS=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='$table';")
    if [ "$EXISTS" = "1" ]; then
        echo -e "${GREEN}✓${NC} 表 $table 存在"
    else
        echo -e "${RED}✗${NC} 表 $table 不存在"
        ALL_EXIST=false
    fi
done

if [ "$ALL_EXIST" = true ]; then
    echo -e "${GREEN}✓ 所有关键表存在${NC}"
else
    echo -e "${RED}✗ 部分关键表缺失${NC}"
fi

# 检查数据行数
echo -e "\n${YELLOW}【测试 4/7】数据行数验证${NC}"

# 查询各表的行数
TABLES_TO_CHECK=(
    "User:13"
    "Role:2"
    "Organization:12"
    "Employee:11"
    "PunchRecord:25"
    "WorkHourResult:102"
)

DATA_OK=true
for item in "${TABLES_TO_CHECK[@]}"; do
    table="${item%%:*}"
    expected="${item##*:}"

    actual=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -tAc "SELECT COUNT(*) FROM \"$table\";" 2>/dev/null || echo "0")

    if [ "$actual" = "$expected" ]; then
        echo -e "${GREEN}✓${NC} $table: $actual 行"
    else
        echo -e "${YELLOW}⚠${NC} $table: $actual 行 (预期: $expected)"
        DATA_OK=false
    fi
done

if [ "$DATA_OK" = true ]; then
    echo -e "${GREEN}✓ 数据行数验证通过${NC}"
else
    echo -e "${YELLOW}⚠ 部分表数据行数与预期不符${NC}"
fi

# 检查表结构
echo -e "\n${YELLOW}【测试 5/7】表结构验证${NC}"

psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" << EOF | tail -n +2 > /tmp/table_columns.txt
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
EOF

echo "主要表的字段统计:"
head -10 /tmp/table_columns.txt | column -t

# 检查数据库大小
echo -e "\n${YELLOW}【测试 6/7】数据库大小检查${NC}"

DB_SIZE=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -tAc "SELECT pg_size_pretty(pg_database_size('$DB_NAME'));")
echo "数据库大小: $DB_SIZE"

# 检查序列状态
echo -e "\n${YELLOW}【测试 7/7】序列状态检查${NC}"

SEQUENCE_COUNT=$(psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" -tAc "SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema='public';")
echo "序列数量: $SEQUENCE_COUNT"

if [ "$SEQUENCE_COUNT" -gt 0 ]; then
    echo -e "${GREEN}✓ 序列创建正常${NC}"
else
    echo -e "${YELLOW}⚠ 未找到序列${NC}"
fi

# 总结
echo -e "\n========================================"
echo -e "${GREEN}✓ 验证完成！${NC}"
echo "========================================"
echo ""
echo "验证结果摘要:"
echo "  数据库连接: ✓"
echo "  表数量: $TABLE_COUNT (预期: 87)"
echo "  关键表: $([ "$ALL_EXIST" = true ] && echo "✓ 全部存在" || echo "✗ 部分缺失")"
echo "  数据完整性: $([ "$DATA_OK" = true ] && echo "✓ 通过" || echo "⚠ 需要检查")"
echo "  数据库大小: $DB_SIZE"
echo "  序列数量: $SEQUENCE_COUNT"
echo ""

# 生成详细报告
echo "生成详细报告: /tmp/migration_verification_$(date +%Y%m%d_%H%M%S).txt"

psql -U "$DB_USER" -d "$DB_NAME" -h "$DB_HOST" > "/tmp/migration_verification_$(date +%Y%m%d_%H%M%S).txt" << EOF
\echo '========================================'
\echo '数据库迁移详细报告'
\echo '========================================'
\echo ''
\timing
\echo '数据库版本:'
SELECT version();
\echo ''
\echo '所有表列表:'
SELECT
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as columns
FROM information_schema.tables t
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
\echo ''
\echo '各表数据行数:'
SELECT
    schemaname,
    tablename,
    n_live_tup AS row_count
FROM pg_stat_user_tables
ORDER BY tablename;
EOF

echo ""
echo "下一步:"
echo "1. 启动应用程序: cd backend && npm run start:prod"
echo "2. 测试基本功能: 用户登录、员工管理、考勤记录"
echo "3. 检查应用日志确认无数据库错误"
echo ""
