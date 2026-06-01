#!/bin/bash

# SQLite到PostgreSQL转换脚本 - 分离表结构和数据
set -e

DB_PATH="prisma/dev.db"
OUTPUT_DIR="postgres-export"

echo "=== SQLite到PostgreSQL转换（表结构与数据分离）==="
echo "数据库路径: $DB_PATH"
echo "输出目录: $OUTPUT_DIR"
echo ""

# 创建输出目录
mkdir -p "$OUTPUT_DIR"

SCHEMA_FILE="$OUTPUT_DIR/01-schema.sql"
DATA_FILE="$OUTPUT_DIR/02-data.sql"

# 清空文件
> "$SCHEMA_FILE"
> "$DATA_FILE"

# ========== 写入Schema文件头部 ==========
cat > "$SCHEMA_FILE" << 'EOF'
-- =====================================================
-- PostgreSQL Schema Export (表结构定义)
-- 数据库: SQLite dev.db
-- 生成时间: $(date)
-- =====================================================

-- 设置客户端编码
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- 禁用触发器（导入时）
SET session_replication_role = 'replica';

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

-- 授权
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

COMMENT ON SCHEMA public IS 'standard public schema';

EOF

# ========== 写入Data文件头部 ==========
cat > "$DATA_FILE" << 'EOF'
-- =====================================================
-- PostgreSQL Data Export (数据导入)
-- 数据库: SQLite dev.db
-- 生成时间: $(date)
-- =====================================================

-- 设置客户端编码
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;

-- 开始事务
BEGIN;

EOF

# ========== 获取所有表名 ==========
TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")

TOTAL_TABLES=$(echo "$TABLES" | wc -l | xargs)
echo "找到 $TOTAL_TABLES 个表"
echo ""

CURRENT_TABLE=0

for TABLE in $TABLES; do
  CURRENT_TABLE=$((CURRENT_TABLE + 1))
  echo "[$CURRENT_TABLE/$TOTAL_TABLES] 处理表: $TABLE"

  # ========== 处理表结构 ==========
  echo "" >> "$SCHEMA_FILE"
  echo "-- =====================================================" >> "$SCHEMA_FILE"
  echo "-- Table: $TABLE" >> "$SCHEMA_FILE"
  echo "-- =====================================================" >> "$SCHEMA_FILE"
  echo "" >> "$SCHEMA_FILE"
  echo "DROP TABLE IF EXISTS \"$TABLE\" CASCADE;" >> "$SCHEMA_FILE"
  echo "" >> "$SCHEMA_FILE"

  # 获取CREATE TABLE语句
  CREATE_SQL=$(sqlite3 "$DB_PATH" ".schema \"$TABLE\"")

  # 转换SQLite类型到PostgreSQL
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/CREATE TABLE IF NOT EXISTS/CREATE TABLE/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/INTEGER PRIMARY KEY/INTEGER PRIMARY KEY/g')

  # 处理字段类型
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ INTEGER/ INTEGER/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ TEXT/ TEXT/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ REAL/ DOUBLE PRECISION/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ BLOB/ BYTEA/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ DATETIME/ TIMESTAMP/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ BOOLEAN/ BOOLEAN/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/ NUMERIC/ NUMERIC/g')

  # 处理默认值
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/CURRENT_TIMESTAMP/CURRENT_TIMESTAMP/g')
  CREATE_SQL=$(echo "$CREATE_SQL" | sed "s/'TRUE'/true/g")
  CREATE_SQL=$(echo "$CREATE_SQL" | sed "s/'FALSE'/false/g")

  # 移除SQLite特定的语法
  CREATE_SQL=$(echo "$CREATE_SQL" | sed 's/AUTOINCREMENT//g')

  echo "$CREATE_SQL" | sed '/^$/d' >> "$SCHEMA_FILE"
  echo "" >> "$SCHEMA_FILE"

  # 获取并创建索引
  INDEXES=$(sqlite3 "$DB_PATH" "SELECT name, sql FROM sqlite_master WHERE type='index' AND tbl_name='$TABLE' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%'")

  if [ -n "$INDEXES" ]; then
    echo "$INDEXES" | while read LINE; do
      INDEX_NAME=$(echo "$LINE" | cut -d'|' -f1)
      INDEX_SQL=$(echo "$LINE" | cut -d'|' -f2)

      if [ -n "$INDEX_SQL" ]; then
        # 转换索引语法
        INDEX_SQL=$(echo "$INDEX_SQL" | sed 's/CREATE UNIQUE INDEX/CREATE UNIQUE INDEX/g')
        INDEX_SQL=$(echo "$INDEX_SQL" | sed 's/CREATE INDEX/CREATE INDEX/g')
        INDEX_SQL=$(echo "$INDEX_SQL" | sed "s/ON \"$TABLE\"/ON \"$TABLE\"/g")

        echo "$INDEX_SQL;" >> "$SCHEMA_FILE"
      fi
    done
  fi

  echo "" >> "$SCHEMA_FILE"

  # ========== 处理数据 ==========
  echo "" >> "$DATA_FILE"
  echo "-- =====================================================" >> "$DATA_FILE"
  echo "-- Data for table: $TABLE" >> "$DATA_FILE"
  echo "-- =====================================================" >> "$DATA_FILE"
  echo "" >> "$DATA_FILE"

  # 获取行数
  ROW_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM \"$TABLE\";" 2>/dev/null || echo "0")

  if [ "$ROW_COUNT" -gt 0 ]; then
    echo "  导出 $ROW_COUNT 条记录"

    # 先清空表（如果需要重新导入）
    echo "TRUNCATE TABLE \"$TABLE\" RESTART IDENTITY CASCADE;" >> "$DATA_FILE"

    # 使用sqlite3的dump功能获取INSERT语句
    sqlite3 "$DB_PATH" <<EOSQL | grep "INSERT INTO \"$TABLE" >> "$DATA_FILE"
.mode insert "$TABLE"
SELECT * FROM "$TABLE";
EOSQL

    echo "" >> "$DATA_FILE"
  else
    echo "  表为空，跳过数据导出"
  fi
done

# ========== 写入Schema文件尾部 ==========
cat >> "$SCHEMA_FILE" << 'EOF'

-- =====================================================
-- 启用触发器
-- =====================================================
SET session_replication_role = 'origin';

-- 完成
EOF

# ========== 写入Data文件尾部 ==========
cat >> "$DATA_FILE" << 'EOF'

-- =====================================================
-- 重置序列
-- =====================================================
DO $$
DECLARE
  table_name text;
  column_name text;
  max_id bigint;
BEGIN
  FOR table_name, column_name IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_default LIKE 'nextval%'
  LOOP
    EXECUTE format(
      'SELECT COALESCE(MAX(%I), 0) FROM %I.%I',
      column_name,
      'public',
      table_name
    ) INTO max_id;

    IF max_id > 0 THEN
      EXECUTE format(
        'SELECT setval(pg_get_serial_sequence(''%I'', ''%I''), %s, true)',
        table_name,
        column_name,
        max_id
      );
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 提交事务
-- =====================================================
COMMIT;

-- =====================================================
-- 验证数据
-- =====================================================
DO $$
DECLARE
  table_count int;
  row_count bigint;
BEGIN
  -- 统计表数量
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public';

  RAISE NOTICE '已导入 % 个表', table_count;

  -- 显示每个表的行数
  FOR table_name IN
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  LOOP
    EXECUTE format('SELECT COUNT(*) FROM %I', table_name) INTO row_count;
    RAISE NOTICE '表 %: % 行', table_name, row_count;
  END LOOP;
END $$;

EOF

# 文件大小
SCHEMA_SIZE=$(du -h "$SCHEMA_FILE" | cut -f1)
DATA_SIZE=$(du -h "$DATA_FILE" | cut -f1)

echo ""
echo "=== 转换完成 ==="
echo "✅ Schema文件: $SCHEMA_FILE ($SCHEMA_SIZE)"
echo "✅ Data文件: $DATA_FILE ($DATA_SIZE)"
echo ""
echo "使用方法:"
echo "  步骤1: 创建数据库"
echo "    createdb jy_production"
echo ""
echo "  步骤2: 导入表结构"
echo "    psql -d jy_production -f 01-schema.sql"
echo ""
echo "  步骤3: 导入数据（可选）"
echo "    psql -d jy_production -f 02-data.sql"
echo ""
echo "独立使用:"
echo "  - 只更新结构: psql -d jy_production -f 01-schema.sql"
echo "  - 只同步数据: psql -d jy_production -f 02-data.sql"
