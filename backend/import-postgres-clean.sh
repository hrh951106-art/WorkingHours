#!/bin/bash

echo "=== PostgreSQL 数据库完整导入脚本 ==="
echo ""

DB_NAME="jy_production"
DB_USER="postgres"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查postgres是否可用
if ! command -v psql &> /dev/null; then
    echo "❌ 错误: 未找到psql命令，请先安装PostgreSQL"
    exit 1
fi

echo "1. 清理现有数据库（如果存在）..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || {
    echo "⚠ 警告: 无法删除数据库，可能需要手动清理"
}
echo ""

echo "2. 创建新数据库..."
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" || {
    echo "❌ 错误: 无法创建数据库"
    exit 1
}
echo "✅ 数据库创建成功"
echo ""

echo "3. 导入表结构 (01-schema.sql)..."
sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/postgres-export/01-schema.sql" || {
    echo "❌ 错误: 表结构导入失败"
    exit 1
}
echo "✅ 表结构导入成功"
echo ""

echo "4. 验证Organization表结构..."
sudo -u postgres psql -d $DB_NAME -c "
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Organization'
  AND column_name IN ('createdAt', 'updatedAt')
ORDER BY ordinal_position;
"

echo ""
echo "预期结果应该是:"
echo "  column_name | data_type |"
echo "  ------------+-----------"
echo "  createdAt  | timestamp |"
echo "  updatedAt   | timestamp |"
echo ""

echo "5. 导入数据 (02-data.sql)..."
sudo -u postgres psql -d $DB_NAME -f "$SCRIPT_DIR/postgres-export/02-data.sql" || {
    echo "❌ 错误: 数据导入失败"
    echo "请检查上方错误信息"
    exit 1
}
echo "✅ 数据导入成功"
echo ""

echo "6. 验证数据完整性..."
sudo -u postgres psql -d $DB_NAME -c "
SELECT
    'Organization' as table_name,
    COUNT(*) as row_count,
    COUNT(CASE WHEN createdAt IS NOT NULL THEN 1 END) as with_created_at
FROM Organization
UNION ALL
SELECT 'User', COUNT(*), COUNT(CASE WHEN createdAt IS NOT NULL THEN 1 END) FROM \"User\"
UNION ALL
SELECT 'Employee', COUNT(*), COUNT(CASE WHEN createdAt IS NOT NULL THEN 1 END) FROM Employee;
"

echo ""
echo "=== 导入完成 ==="
echo ""
echo "数据库: $DB_NAME"
echo "连接命令: psql -d $DB_NAME -U $DB_USER"
