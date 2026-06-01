#!/bin/bash

# 数据库导入快速测试脚本

echo "=== 数据库导入测试 ==="
echo ""

DB_NAME="test_jy_import"
DB_USER="postgres"

# 1. 创建测试数据库
echo "1. 创建测试数据库..."
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;"
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
echo "✅ 测试数据库创建成功"
echo ""

# 2. 导入表结构
echo "2. 导入表结构..."
sudo -u postgres psql -d $DB_NAME -f postgres-export/01-schema.sql > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 表结构导入成功"
else
    echo "❌ 表结构导入失败"
    sudo -u postgres psql -d $DB_NAME -f postgres-export/01-schema.sql
    exit 1
fi
echo ""

# 3. 导入数据
echo "3. 导入数据..."
sudo -u postgres psql -d $DB_NAME -f postgres-export/02-data.sql > /tmp/import-test.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ 数据导入成功"
else
    echo "❌ 数据导入失败"
    echo "错误日志:"
    cat /tmp/import-test.log
    exit 1
fi
echo ""

# 4. 验证数据
echo "4. 验证导入结果..."
TABLE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
echo "   表数量: $TABLE_COUNT (预期: 87)"

USER_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM \"User\";")
echo "   用户数量: $USER_COUNT (预期: 22)"

EMPLOYEE_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM Employee;")
echo "   员工数量: $EMPLOYEE_COUNT (预期: 20)"

ACCOUNT_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM LaborAccount;")
echo "   账户数量: $ACCOUNT_COUNT (预期: 235)"

WORKHOUR_COUNT=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT COUNT(*) FROM WorkHourResult;")
echo "   工时结果数量: $WORKHOUR_COUNT (预期: 113)"

echo ""
echo "5. 验证时间戳格式..."
TIMESTAMP_TEST=$(sudo -u postgres psql -d $DB_NAME -t -c "SELECT createdAt FROM \"User\" WHERE username = 'admin' LIMIT 1;")
echo "   管理员创建时间: $TIMESTAMP_TEST"
echo ""

echo "=== 测试完成 ==="
echo ""
echo "清理测试数据库..."
sudo -u postgres psql -c "DROP DATABASE $DB_NAME;"
echo "✅ 清理完成"
