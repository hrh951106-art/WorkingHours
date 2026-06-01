#!/bin/bash

echo "=== 检查数据文��与schema文件的一致性 ==="
echo ""

SCHEMA_FILE="/Users/aaron.he/Desktop/AI/JY/backend/postgres-export/01-schema.sql"
DATA_FILE="/Users/aaron.he/Desktop/AI/JY/backend/postgres-export/02-data.sql"

# 提取所有表名
TABLES=$(grep "CREATE TABLE" "$SCHEMA_FILE" | sed 's/CREATE TABLE "//' | sed 's/" (//')

echo "检查所有表的DateTime字段..."
echo ""

for TABLE in $TABLES; do
    # 检查该表是否有TIMESTAMP字段
    TIMESTAMPS=$(grep -A20 "CREATE TABLE \"$TABLE" "$SCHEMA_FILE" | grep "TIMESTAMP" | wc -l)

    if [ $TIMESTAMPS -gt 0 ]; then
        echo "表 $TABLE 有 $TIMESTAMPS 个TIMESTAMP字段"

        # 获取该表的INSERT语句
        INSERT=$(grep "INSERT INTO \"$TABLE\"" "$DATA_FILE" | head -1)

        if [ ! -z "$INSERT" ]; then
            echo "  ✓ 有数据"
        else
            echo "  ⚠ 没有数据"
        fi
        echo ""
    fi
done

echo "=== 检查完成 ==="
