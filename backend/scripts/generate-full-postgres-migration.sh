#!/bin/bash
# 生成完整的PostgreSQL迁移脚本（包含表结构和数据）

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_FILE="$PROJECT_DIR/prisma/migrations_postgres/20250331_init/migration_with_data.sql"

echo "========================================="
echo "生成PostgreSQL完整迁移脚本"
echo "========================================="
echo ""

cd "$PROJECT_DIR"

# 步骤1: 添加表结构
echo "【步骤 1/2】读取表结构..."
cat prisma/migrations_postgres/20250331_init/migration.sql > "$OUTPUT_FILE"
echo "✓ 表结构已添加"

# 步骤2: 导出数据
echo ""
echo "【步骤 2/2】导出种子数据..."

# 使用SQLite的dump功能并转换为PostgreSQL格式
sqlite3 prisma/dev.db <<'EOSQL' | sed '
  s/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g;
  s/DATETIME/TIMESTAMP/g;
  s/CURRENT_TIMESTAMP/NOW()/g;
  s/INSERT INTO "/INSERT INTO "/g;
  s/,"/, "/g;
  s/) VALUES(/) VALUES (/g;
' >> "$OUTPUT.sql"

.mode insert
.output seed_data.sql

-- 导出数据源和选项
SELECT 'SELECT setval(\'"DataSource_id_seq"\', COALESCE((SELECT MAX(id) FROM "DataSource"), 0), true);' as sql;
SELECT * FROM "DataSource" ORDER BY id;
SELECT * FROM "DataSourceOption" ORDER BY id;

-- 导出角色和用户
SELECT 'SELECT setval(\'"Role_id_seq"\', COALESCE((SELECT MAX(id) FROM "Role"), 0), true);' as sql;
SELECT * FROM "Role" ORDER BY id;
SELECT * FROM "User" ORDER BY id;
SELECT * FROM "UserRole" ORDER BY id;

-- 导出组织
SELECT 'SELECT setval(\'"Organization_id_seq"\', COALESCE((SELECT MAX(id) FROM "Organization"), 0), true);' as sql;
SELECT * FROM "Organization" ORDER BY id;

-- 导出员工
SELECT 'SELECT setval(\'"Employee_id_seq"\', COALESCE((SELECT MAX(id) FROM "Employee"), 0), true);' as sql;
SELECT * FROM "Employee" ORDER BY id;

-- 导出班次
SELECT 'SELECT setval(\'"Shift_id_seq"\', COALESCE((SELECT MAX(id) FROM "Shift"), 0), true);' as sql;
SELECT * FROM "Shift" ORDER BY id;

-- 导出班次属性
SELECT * FROM "ShiftProperty" ORDER BY id;

-- 导出设备
SELECT 'SELECT setval(\'"PunchDevice_id_seq"\', COALESCE((SELECT MAX(id) FROM "PunchDevice"), 0), true);' as sql;
SELECT * FROM "PunchDevice" ORDER BY id;

-- 导出人事信息页签配置
SELECT 'SELECT setval(\'"EmployeeInfoTab_id_seq"\', COALESCE((SELECT MAX(id) FROM "EmployeeInfoTab"), 0), true);' as sql;
SELECT * FROM "EmployeeInfoTab" ORDER BY id;
SELECT * FROM "EmployeeInfoTabGroup" ORDER BY id;
SELECT * FROM "EmployeeInfoTabField" ORDER BY id;

-- 导出自定义字段
SELECT 'SELECT setval(\'"CustomField_id_seq"\', COALESCE((SELECT MAX(id) FROM "CustomField"), 0), true);' as sql;
SELECT * FROM "CustomField" ORDER BY id;

.output stdout

EOSQL

echo ""
echo "✓ 种子数据已导出"
echo ""
echo "========================================="
echo "✓ PostgreSQL迁移脚本生成完成！"
echo "========================================="
echo "文件: $OUTPUT_FILE"
echo ""
echo "使用方法:"
echo "  psql -U username -d database -f $OUTPUT_FILE"
echo "========================================="
