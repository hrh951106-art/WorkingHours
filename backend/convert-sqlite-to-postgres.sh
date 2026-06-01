#!/bin/bash

# 转换SQLite到PostgreSQL脚本
set -e

DB_PATH="prisma/dev.db"
OUTPUT_DIR="postgres-export"

echo "=== 开始转换SQLite数据库到PostgreSQL格式 ==="
echo "数据库路径: $DB_PATH"
echo "输出目录: $OUTPUT_DIR"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

SCHEMA_FILE="$OUTPUT_DIR/schema.sql"
DATA_FILE="$OUTPUT_DIR/data.sql"

# 清空文件
> "$SCHEMA_FILE"
> "$DATA_FILE"

# 写入PostgreSQL头部
echo "-- PostgreSQL Schema Export" | cat > "$SCHEMA_FILE"
echo "-- Generated from SQLite database: $DB_PATH" | cat >> "$SCHEMA_FILE"
echo "" | cat >> "$SCHEMA_FILE"
echo "SET client_encoding = 'UTF8';" | cat >> "$SCHEMA_FILE"
echo "SET standard_conforming_strings = on;" | cat >> "$SCHEMA_FILE"
echo "" | cat >> "$SCHEMA_FILE"

echo "-- PostgreSQL Data Export" | cat > "$DATA_FILE"
echo "-- Generated from SQLite database: $DB_PATH" | cat >> "$DATA_FILE"
echo "" | cat >> "$DATA_FILE"
echo "SET client_encoding = 'UTF8';" | cat >> "$DATA_FILE"
echo "SET standard_conforming_strings = on;" | cat >> "$DATA_FILE"
echo "" | cat >> "$DATA_FILE"
echo "BEGIN;" | cat >> "$DATA_FILE"
echo "" | cat >> "$DATA_FILE"

# 使用sqlite3获取所有表名
TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")

TOTAL_TABLES=$(echo "$TABLES" | wc -l | xargs)
echo "找到 $TOTAL_TABLES 个表"
echo ""

CURRENT_TABLE=0

for TABLE in $TABLES; do
  CURRENT_TABLE=$((CURRENT_TABLE + 1))
  echo "[$CURRENT_TABLE/$TOTAL_TABLES] 处理表: $TABLE"

  # 获取表结构
  echo "-- Table: $TABLE" >> "$SCHEMA_FILE"
  echo "DROP TABLE IF EXISTS \"$TABLE\" CASCADE;" >> "$SCHEMA_FILE"

  # 获取CREATE TABLE语句
  CREATE_SQL=$(sqlite3 "$DB_PATH" ".schema \"$TABLE\"")

  # 转换SQLite类型到PostgreSQL
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/INTEGER PRIMARY KEY/AUTOINCREMENT/ INTEGER/g' | sed 's/AUTOINCREMENT/INTEGER/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/"id" INTEGER/SERIAL/g' | sed 's/SERIAL SERIAL/SERIAL/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/BOOLEAN/BOOLEAN/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/TEXT/TEXT/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/REAL/DOUBLE PRECISION/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/BLOB/BYTEA/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/DATETIME/TIMESTAMP/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/CURRENT_TIMESTAMP/CURRENT_TIMESTAMP/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed "s/'TRUE'/true/g")
  CREATE_SQL=$(echo "$CREATE_SQL" | sed "s/'FALSE'/false/g")

  # 移除SQLite特定的语法
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/CREATE TABLE IF NOT EXISTS/CREATE TABLE/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/AUTOINCREMENT//g')

  echo "$CREATE_SQL" | sed '/^$/d' >> "$SCHEMA_FILE"
  echo "" >> "$SCHEMA_FILE"

  # 获取行数
  ROW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null || echo "0")

  if [ "$ROW_COUNT" -gt 0 ]; then
    echo "  导出 $ROW_COUNT 条记录"
    echo "-- Data for table: $TABLE" >> "$DATA_FILE"
    echo "TRUNCATE TABLE \"$TABLE\" RESTART IDENTITY CASCADE;" >> "$DATA_FILE"

    # 导出数据 - 使用sqlite3的dump功能
    sqlite3 "$DB_PATH" <<EOF | grep "INSERT INTO \"$TABLE" | sed "s/INSERT INTO/INSERT/g" >> "$DATA_FILE"
.mode insert "$TABLE"
SELECT * FROM "$TABLE";
EOF

    echo "" >> "$DATA_FILE"
  else
    echo "  表为空，跳过"
  fi
done

echo "" >> "$DATA_FILE"
echo "COMMIT;" >> "$DATA_FILE"
echo "" >> "$DATA_FILE"

# 文件大小
SCHEMA_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
DATA_SIZE=$(du -h "$DATA_FILE" | cut -f1)

echo ""
echo "=== 转换完成 ==="
echo "✅ Schema文件: $SCHEMA_FILE ($SCHEMA_SIZE)"
echo "✅ Data文件: $DATA_FILE ($DATA_SIZE)"
echo ""
echo "使用方法:"
echo "  1. 创建PostgreSQL数据库"
echo "  2. 执行: psql -d your_database -f schema.sql"
echo "  3. 执行: psql -d your_database -f data.sql"
