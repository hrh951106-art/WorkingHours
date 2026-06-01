#!/bin/bash

echo "=== PostgreSQL导出文件一致性验证 ==="
echo ""

SCHEMA_FILE="postgres-export/01-schema.sql"
DATA_FILE="postgres-export/02-data.sql"

# 检查文件存在
if [ ! -f "$SCHEMA_FILE" ] || [ ! -f "$DATA_FILE" ]; then
    echo "❌ 导出文件不存在"
    exit 1
fi

echo "✓ 文件已生成"
echo ""

# 验证schema文件中的DateTime字段定义
echo "1. 验证schema中的DateTime字段类型..."
TIMESTAMP_COUNT=$(grep -c "\"createdAt\|\"updatedAt" "$SCHEMA_FILE" | head -1)
if [ $TIMESTAMP_COUNT -gt 0 ]; then
    # 检查是否都是TIMESTAMP类型
    CREATED_AT_TYPE=$(grep -A2 "createdAt" "$SCHEMA_FILE" | grep "TIMESTAMP" | wc -l)
    UPDATED_AT_TYPE=$(grep -A2 "updatedAt" "$SCHEMA_FILE" | grep "TIMESTAMP" | wc -l)

    echo "  - createdAt字段定义为TIMESTAMP: $CREATED_AT_TYPE 处"
    echo "  - updatedAt字段定义为TIMESTAMP: $UPDATED_AT_TYPE 处"

    if [ $CREATED_AT_TYPE -gt 0 ] && [ $UPDATED_AT_TYPE -gt 0 ]; then
        echo "  ✓ schema文件中DateTime字段类型正确"
    else
        echo "  ❌ schema文件中可能存在INTEGER类型的DateTime字段"
    fi
fi
echo ""

# 验证data文件中的数据格式
echo "2. 验证data文件中的数据格式..."

# 检查User表
USER_INSERT=$(grep "INSERT INTO \"User\"" "$DATA_FILE" | head -1)
if echo "$USER_INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}'"; then
    echo "  ✓ User表: 时间字段为字符串格式"
else
    echo "  ❌ User表: 时间字段格式不正确"
    echo "  示例: $USER_INSERT"
fi

# 检查Organization表
ORG_INSERT=$(grep "INSERT INTO \"Organization\"" "$DATA_FILE" | head -1)
if echo "$ORG_INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}'"; then
    echo "  ✓ Organization表: 时间字段为字符串格式"
else
    echo "  ❌ Organization表: 时间字段格式不正确"
    echo "  示例: $ORG_INSERT"
fi

# 检查Employee表
EMP_INSERT=$(grep "INSERT INTO \"Employee\"" "$DATA_FILE" | head -1)
if echo "$EMP_INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}'"; then
    echo "  ✓ Employee表: 时间字段为字符串格式（包括birthDate等旧日期）"
else
    echo "  ❌ Employee表: 时间字段格式不正确"
    echo "  示例: $EMP_INSERT"
fi

echo ""

# 检查是否有残留的整数时间戳
echo "3. 检查是否有未转换的整数时间戳..."
LARGE_INTEGER=$(grep -E "VALUES \([0-9]+, '[a-z]+',.*[0-9]{10,13}\)" "$DATA_FILE" | head -1)
if [ -z "$LARGE_INTEGER" ]; then
    echo "  ✓ 未发现残留的整数时间戳"
else
    echo "  ⚠ 可能存在未转换的时间戳:"
    echo "    $LARGE_INTEGER"
fi

echo ""

# 统计表数量
echo "4. 统计信息..."
TABLE_COUNT=$(grep "CREATE TABLE" "$SCHEMA_FILE" | wc -l | tr -d ' ')
echo "  - 表数量: $TABLE_COUNT"

# 检查关键表的INSERT语句
USER_INSERT_COUNT=$(grep -c "INSERT INTO \"User\"" "$DATA_FILE" || echo 0)
ORG_INSERT_COUNT=$(grep -c "INSERT INTO \"Organization\"" "$DATA_FILE" || echo 0)
EMP_INSERT_COUNT=$(grep -c "INSERT INTO \"Employee\"" "$DATA_FILE" || echo 0)

echo "  - User表记录: $(grep "INSERT INTO \"User\"" "$DATA_FILE" | wc -l | tr -d ' ') 条"
echo "  - Organization表记录: $(grep "INSERT INTO \"Organization\"" "$DATA_FILE" | wc -l | tr -d ' ') 条"
echo "  - Employee表记录: $(grep "INSERT INTO \"Employee\"" "$DATA_FILE" | wc -l | tr -d ' ') 条"

echo ""
echo "=== 验证完成 ==="
echo ""
echo "文件信息:"
ls -lh "$SCHEMA_FILE" "$DATA_FILE"
