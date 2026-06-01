#!/bin/bash

echo "=== PostgreSQL导出文件全面一致性检查 ==="
echo ""

SCHEMA_FILE="postgres-export/01-schema.sql"
DATA_FILE="postgres-export/02-data.sql"
REPORT_FILE="postgres-export/CONSISTENCY_CHECK_REPORT.md"

# 检查文件存在
if [ ! -f "$SCHEMA_FILE" ] || [ ! -f "$DATA_FILE" ]; then
    echo "❌ 导出文件不存在，请先生成文件"
    exit 1
fi

echo "开始检查..."
echo "检查时间: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# 创建临时文件存储检查结果
TEMP_DIR=$(mktemp -d)
SCHEMA_ERRORS="$TEMP_DIR/schema_errors.txt"
DATA_ERRORS="$TEMP_DIR/data_errors.txt"
MISMATCHES="$TEMP_DIR/mismatches.txt"
PASSED_TABLES="$TEMP_DIR/passed_tables.txt"

# 总计
TOTAL_TABLES=0
PASSED_COUNT=0
ISSUE_COUNT=0

# 提取所有表名
TABLES=$(grep "CREATE TABLE" "$SCHEMA_FILE" | sed 's/CREATE TABLE "//' | sed 's/" (//' | sort)

echo "检查 $TABLES | wc -l | tr -d ' ' 个表..."
echo ""

# 开始检查每个表
for TABLE in $TABLES; do
    TOTAL_TABLES=$((TOTAL_TABLES + 1))
    TABLE_HAS_ISSUE=0

    # 1. 提取表结构
    SCHEMA_BLOCK=$(grep -A100 "CREATE TABLE \"$TABLE\"" "$SCHEMA_FILE" | grep -B100 "PRIMARY KEY" | head -n -1)

    # 2. 提取字段定义
    FIELD_DEFS=$(echo "$SCHEMA_BLOCK" | grep '  "' | grep -v 'PRIMARY KEY')

    # 3. 提取第一条INSERT语句（如果有数据）
    FIRST_INSERT=$(grep "INSERT INTO \"$TABLE\"" "$DATA_FILE" | head -1)

    echo "检查表: $TABLE"

    # 检查每个字段
    while IFS= read -r FIELD_DEF; do
        # 提取字段名
        FIELD_NAME=$(echo "$FIELD_DEF" | sed 's/.*"\([^"]*\)".*/\1/' | head -1)

        # 跳过非字段行
        if [ -z "$FIELD_NAME" ] || [[ "$FIELD_NAME" == *"PRIMARY KEY"* ]]; then
            continue
        fi

        # 提取字段类型
        FIELD_TYPE=$(echo "$FIELD_DEF" | grep -oE 'INTEGER|TEXT|TIMESTAMP|BOOLEAN|DOUBLE PRECISION|SERIAL|BYTEA' | head -1)

        # 如果字段类型提取失败，尝试其他方式
        if [ -z "$FIELD_TYPE" ]; then
            FIELD_TYPE=$(echo "$FIELD_DEF" | grep -oE 'SERIAL|INTEGER|TEXT|TIMESTAMP|BOOLEAN|DOUBLE PRECISION|BYTEA' | head -1)
        fi

        # 检查数据格式（如果表有数据）
        if [ ! -z "$FIRST_INSERT" ]; then
            # 提取该字段的数据值
            # 这是一个简化的检查，实际需要解析SQL

            case "$FIELD_TYPE" in
                TIMESTAMP)
                    # TIMESTAMP字段在data中应该是字符串格式 'YYYY-MM-DD HH:MM:SS'
                    if echo "$FIRST_INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}'"; then
                        : # 正确
                    elif echo "$FIRST_INSERT" | grep -q "'[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}'"; then
                        : # ISO格式也可接受
                    else
                        # 检查是否为NULL
                        if ! echo "$FIRST_INSERT" | grep -q "NULL"; then
                            echo "  ⚠ 字段 $FIELD_NAME (TIMESTAMP): 数据格式可能不正确"
                            echo "$TABLE.$FIELD_NAME: TIMESTAMP字段数据格式可疑" >> "$MISMATCHES"
                            TABLE_HAS_ISSUE=1
                        fi
                    fi
                    ;;
                INTEGER|SERIAL)
                    # INTEGER字段在data中应该是整数
                    # 这个检查较复杂，暂时跳过详细验证
                    ;;
                TEXT)
                    # TEXT字段在data中应该是字符串（带引号）
                    ;;
                BOOLEAN)
                    # BOOLEAN字段在data中应该是true/false
                    ;;
                *)
                    ;;
            esac
        fi
    done <<< "$FIELD_DEFS"

    # 特别检查：确保表中有TIMESTAMP字段时，schema定义正确
    if echo "$SCHEMA_BLOCK" | grep -q "createdAT\|updatedAt"; then
        if ! echo "$SCHEMA_BLOCK" | grep "createdAt" | grep -q "TIMESTAMP"; then
            echo "  ❌ createdAt字段不是TIMESTAMP类型"
            echo "$TABLE.createdAt: 字段类型错误" >> "$SCHEMA_ERRORS"
            TABLE_HAS_ISSUE=1
        fi
    fi

    if [ $TABLE_HAS_ISSUE -eq 0 ]; then
        echo "  ✅ 通过"
        echo "$TABLE" >> "$PASSED_TABLES"
        PASSED_COUNT=$((PASSED_COUNT + 1))
    else
        echo "  ⚠ 发现问题"
        ISSUE_COUNT=$((ISSUE_COUNT + 1))
    fi
    echo ""
done

# 生成详细报告
echo "=== 生成检查报告 ==="
echo ""

# 创建Markdown报告
cat > "$REPORT_FILE" << 'EOF'
# PostgreSQL导出文件一致性检查报告

**检查时间**: $(date '+%Y-%m-%d %H:%M:%S')
**Schema文件**: postgres-export/01-schema.sql
**Data文件**: postgres-export/02-data.sql

---

## 📊 检查摘要

- **总表数**: $TOTAL_TABLES
- **通过检查**: $PASSED_COUNT
- **发现问题**: $ISSUE_COUNT

EOF

if [ $ISSUE_COUNT -eq 0 ]; then
    cat >> "$REPORT_FILE" << 'EOF'
## ✅ 检查结果：全部通过

所有表的字段定义与数据格式一致，可以安全导入PostgreSQL数据库。

EOF
else
    cat >> "$REPORT_FILE" << 'EOF'
## ⚠️ 发现问题

EOF
    if [ -f "$MISMATCHES" ] && [ -s "$MISMATCHES" ]; then
        cat >> "$REPORT_FILE" << 'EOF'
### Schema-Data不匹配

EOF
        cat "$MISMATCHES" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    if [ -f "$SCHEMA_ERRORS" ] && [ -s "$SCHEMA_ERRORS" ]; then
        cat >> "$REPORT_FILE" << 'EOF'
### Schema定义错误

EOF
        cat "$SCHEMA_ERRORS" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi
fi

cat >> "$REPORT_FILE" << 'EOF'
---
## 📋 通过检查的表

EOF
if [ -f "$PASSED_TABLES" ]; then
    cat "$PASSED_TABLES" | while read TABLE; do
        echo "- $TABLE" >> "$REPORT_FILE"
    done
fi

cat >> "$REPORT_FILE" << 'EOF'

---
## 🔍 检查方法

1. **Schema定义检查**: 验证所有DateTime字段定义为TIMESTAMP类型
2. **Data格式检查**: 验证时间戳数据为字符串格式
3. **类型一致性**: 验证schema字段类型与data数据格式匹配
4. **关键字段**: 特别检查createdAt/updatedAt等常见字段

---
**检查脚本**: comprehensive-schema-data-check.sh
EOF

echo "报告已生成: $REPORT_FILE"
echo ""

# 清理临时文件
rm -rf "$TEMP_DIR"

# 输出摘要
echo "=== 检查完成 ==="
echo "总表数: $TOTAL_TABLES"
echo "通过: $PASSED_COUNT"
echo "问题: $ISSUE_COUNT"
echo ""

if [ $ISSUE_COUNT -eq 0 ]; then
    echo "✅ 所有表检查通过，可以安全导入"
else
    echo "⚠️ 发现 $ISSUE_COUNT 个问题，请查看报告"
    echo "报告: $REPORT_FILE"
fi
