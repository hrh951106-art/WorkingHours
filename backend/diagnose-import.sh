#!/bin/bash

echo "=== PostgreSQL导入文件诊断 ==="
echo ""

SCHEMA_FILE="/Users/aaron.he/Desktop/AI/JY/backend/postgres-export/01-schema.sql"
DATA_FILE="/Users/aaron.he/Desktop/AI/JY/backend/postgres-export/02-data.sql"

echo "1. 检查文件生成时间..."
echo "Schema文件:"
ls -l "$SCHEMA_FILE"
echo "Data文件:"
ls -l "$DATA_FILE"
echo ""

echo "2. 检查schema中INTEGER字段与data中的数据一致性..."
echo ""

# 提取所有表名
TABLES=$(grep "CREATE TABLE" "$SCHEMA_FILE" | sed 's/CREATE TABLE "//' | sed 's/" (//')

ISSUE_FOUND=0

for TABLE in $TABLES; do
    # 获取该表的第一个INSERT语句
    INSERT=$(grep "INSERT INTO \"$TABLE\"" "$DATA_FILE | head -1")

    if [ ! -z "$INSERT" ]; then
        # 提取字段定义顺序
        FIELDS=$(echo "$INSERT" | sed 's/.*("\([^"]*\)").*/\1/' | sed 's/", "/" /g')

        # 检查schema中的字段类型
        SCHEMA_BLOCK=$(grep -A50 "CREATE TABLE \"$TABLE\"" "$SCHEMA_FILE" | grep -B50 "PRIMARY KEY")

        for FIELD in $FIELDS; do
            # 检查该字段在schema中的类型
            FIELD_TYPE=$(echo "$SCHEMA_BLOCK" | grep "\"$FIELD\"" | grep -oE 'INTEGER|TIMESTAMP|TEXT|BOOLEAN' | head -1)

            # 检查数据中该字段的值格式
            FIELD_VALUE=$(echo "$INSERT" | sed 's/.*VALUES (\([^)]*\)).*/\1/' | awk -F',' '{print $1}')  # 简化处理

            # 暂时只报告潜在问题
            if [ "$FIELD_TYPE" = "INTEGER" ]; then
                # 检查数据中是否包含日期格式
                if echo "$INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}"; then
                    echo "⚠ 表 $TABLE 的 $FIELD 字段在schema中是INTEGER，但数据中可能包含日期格式"
                    ISSUE_FOUND=1
                fi
            fi
        done
    fi
done

if [ $ISSUE_FOUND -eq 0 ]; then
    echo "✓ 未发现明显的schema/data类型不匹配问题"
fi

echo ""
echo "3. 检查日期格式示例..."
echo ""
echo "User表:"
grep "INSERT INTO \"User\"" "$DATA_FILE" | head -1
echo ""
echo "Organization表:"
grep "INSERT INTO \"Organization\"" "$DATA_FILE" | head -1
echo ""
echo "WorkInfoHistory表:"
grep "INSERT INTO \"WorkInfoHistory\"" "$DATA_FILE" | head -1

echo ""
echo "=== 诊断完成 ==="
