#!/bin/bash

echo "=== 修复Organization表时间戳列类型 ==="
echo ""

DB_NAME="jy_production"

echo "检查当前Organization表的列类型..."
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
echo "如果列类型不是timestamp，执行以下修复..."
echo ""

# 修复Organization表
sudo -u postgres psql -d $DB_NAME << 'EOSQL'
-- 修复Organization表的时间戳列
DO $$
BEGIN
    -- 修复createdAt列（如果类型不对）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Organization'
          AND column_name = 'createdAt'
          AND data_type != 'timestamp without time zone'
    ) THEN
        ALTER TABLE "Organization"
        ALTER COLUMN "createdAt" TYPE timestamp USING NULL;
        RAISE NOTICE 'Organization.createdAt 已修复为timestamp类型';
    END IF;

    -- 修复updatedAt列（如果类型不对）
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Organization'
          AND column_name = 'updatedAt'
          AND data_type != 'timestamp without time zone'
    ) THEN
        ALTER TABLE "Organization"
        ALTER COLUMN "updatedAt" TYPE timestamp USING NULL;
        RAISE NOTICE 'Organization.updatedAt 已修复为timestamp类型';
    END IF;
END $$;

-- 验证修复结果
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'Organization'
  AND column_name IN ('createdAt', 'updatedAt');
EOSQL

echo ""
echo "=== 修复完成 ==="
