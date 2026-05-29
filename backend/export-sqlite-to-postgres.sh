#!/bin/bash
# SQLite 到 PostgreSQL 完整数据库导出脚本
# 确保所有表结构、索引、外键和数据都能正确迁移

set -e

DB_FILE="prisma/dev.db"
OUTPUT_FILE="jy_production_complete_$(date +%Y%m%d_%H%M%S).sql"
TEMP_SCHEMA_FILE="temp_schema.sql"
TEMP_DATA_FILE="temp_data.sql"

echo "========================================"
echo "SQLite 到 PostgreSQL 完整导出工具"
echo "========================================"
echo "数据库文件: $DB_FILE"
echo "输出文件: $OUTPUT_FILE"
echo ""

# 检查数据库文件是否存在
if [ ! -f "$DB_FILE" ]; then
    echo "错误: 数据库文件不存在: $DB_FILE"
    exit 1
fi

echo "【步骤 1/6】获取数据库表列表..."
TABLES=$(sqlite3 "$DB_FILE" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
TABLE_COUNT=$(echo "$TABLES" | wc -l | tr -d ' ')
echo "找到 $TABLE_COUNT 张表"
echo "$TABLES" | tr '\n' ' ' && echo ""

# 开始导出
echo ""
echo "【步骤 2/6】导出表结构（包括索引、外键、约��）..."

# 创建输出文件
cat > "$OUTPUT_FILE" << 'EOF'
-- ==========================================
-- 精益工时管理系统 - 完整数据库导出
-- 从 SQLite 迁移到 PostgreSQL
-- 生成时间: $(date '+%Y-%m-%d %H:%M:%S')
-- ==========================================

-- 禁用触发器加速导入
SET session_replication_role = 'replication';

-- 开始事务
BEGIN;

EOF

# 为每个表导出结构
echo "$TABLES" | while read -r TABLE; do
    if [ -n "$TABLE" ]; then
        echo "  导出表结构: $TABLE"

        # 获取 CREATE TABLE 语句
        sqlite3 "$DB_FILE" ".schema $TABLE" >> "$TEMP_SCHEMA_FILE" 2>/dev/null || true

        # 获取表的索引
        INDEXES=$(sqlite3 "$DB_FILE" "SELECT sql FROM sqlite_master WHERE type='index' AND tbl_name='$TABLE' AND sql IS NOT NULL;")
        if [ -n "$INDEXES" ]; then
            echo "$INDEXES" >> "$TEMP_SCHEMA_FILE"
        fi
    fi
done

echo ""
echo "【步骤 3/6】转换为 PostgreSQL 格式..."

# 处理并追加到输出文件
python3 << 'PYTHON_SCRIPT'
import re
import sys

def sqlite_to_postgresql(sql_content):
    """将 SQLite DDL 转换为 PostgreSQL DDL"""

    # 移除 SQLite 特有的语法
    lines = []
    for line in sql_content.split('\n'):
        # 跳过注释
        if line.strip().startswith('--'):
            continue

        # INTEGER PRIMARY KEY -> SERIAL PRIMARY KEY
        line = re.sub(r'INTEGER PRIMARY KEY\s+AUTOINCREMENT', 'SERIAL PRIMARY KEY', line)
        line = re.sub(r'INTEGER PRIMARY KEY', 'SERIAL PRIMARY KEY', line)

        # TEXT -> TEXT (保持不变，PostgreSQL 支持 TEXT)
        # REAL -> DOUBLE PRECISION
        line = re.sub(r'\bREAL\b', 'DOUBLE PRECISION', line)

        # BLOB -> BYTEA
        line = re.sub(r'\bBLOB\b', 'BYTEA', line)

        # DATETIME -> TIMESTAMP
        line = re.sub(r'\bDATETIME\b', 'TIMESTAMP', line)

        # BOOLEAN -> BOOLEAN (保持不变)

        # 移除 AUTOINCREMENT（PostgreSQL 使用 SERIAL 自动处理）
        line = re.sub(r'\s+AUTOINCREMENT', '', line)

        # 处理表名和列名（避免使用保留字）
        # 引用所有标识符
        line = re.sub(r'"([^"]+)"', r'"\1"', line)

        lines.append(line)

    return '\n'.join(lines)

# 读取临时文件
try:
    with open('temp_schema.sql', 'r') as f:
        schema_content = f.read()

    # 转换
    pg_schema = sqlite_to_postgresql(schema_content)

    # 写入输出文件
    with open(sys.argv[1], 'a') as f:
        f.write('\n-- ========================================\n')
        f.write('-- 表结构定义\n')
        f.write('-- ========================================\n\n')
        f.write(pg_schema)
        f.write('\n\n')

    print("✓ 表结构转换完成")
except Exception as e:
    print(f"错误: {e}")
    sys.exit(1)
PYTHON_SCRIPT

python3 export-sqlite-to-postgres.py "$OUTPUT_FILE"

echo ""
echo "【步骤 4/6】导出表数据..."

# 为每个表导出数据
echo "$TABLES" | while read -r TABLE; do
    if [ -n "$TABLE" ]; then
        # 获取表的行数
        ROW_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM '$TABLE';" 2>/dev/null || echo "0")
        echo "  导出表数据: $TABLE ($ROW_COUNT 行)"

        # 导出数据（使用 .dump 的方式）
        sqlite3 "$DB_FILE" << SQLITE_EOF
.mode insert
.output $TEMP_DATA_FILE
SELECT * FROM "$TABLE";
.quit
SQLITE_EOF

        # 追加到输出文件（PostgreSQL 不需要双引号，但可以保留）
        cat "$TEMP_DATA_FILE" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

echo ""
echo "【步骤 5/6】清理和优化..."

# 追加结束语句
cat >> "$OUTPUT_FILE" << 'EOF'

-- 提交事务
COMMIT;

-- 恢复触发器
SET session_replication_role = 'origin';

-- 重新生成序列（根据表的最大ID）
DO $$
DECLARE
    table_record RECORD;
    max_id BIGINT;
BEGIN
    FOR table_record IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    LOOP
        EXECUTE format('SELECT COALESCE(MAX(id), 0) FROM %I', table_record.table_name) INTO max_id;
        IF max_id > 0 THEN
            EXECUTE format('SELECT setval(pg_get_serial_sequence(''%s'', ''id''), %s, true)', table_record.table_name, max_id);
        END IF;
    END LOOP;
END $$;

-- 创建索引的函数（如果需要）
-- 分析表统计信息
ANALYZE;

-- ==========================================
-- 导出完成
-- ==========================================
EOF

echo ""
echo "【步骤 6/6】验证导出..."

# 统计信息
SCHEMA_LINES=$(grep -c "CREATE TABLE" "$OUTPUT_FILE" || echo "0")
INSERT_LINES=$(grep -c "^INSERT" "$OUTPUT_FILE" || echo "0")
FILE_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')

echo ""
echo "========================================"
echo "✓ 导出完成！"
echo "========================================"
echo "输出文件: $OUTPUT_FILE"
echo "文件大小: $FILE_SIZE"
echo "CREATE TABLE 语句: $SCHEMA_LINES"
echo "INSERT 语句: $INSERT_LINES"
echo ""

# 清理临时文件
rm -f "$TEMP_SCHEMA_FILE" "$TEMP_DATA_FILE" export-sqlite-to-postgres.py

echo "提示:"
echo "1. 检查导出的 SQL 文件: cat $OUTPUT_FILE | head -100"
echo "2. 导入到 PostgreSQL: psql -U username -d database -f $OUTPUT_FILE"
echo ""
