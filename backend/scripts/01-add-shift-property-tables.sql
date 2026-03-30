-- =====================================================
-- 班次属性管理功能 - 数据库迁移脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 创建班次属性定义和班次属性关联表
-- =====================================================

-- 1. 创建班次属性定义表
CREATE TABLE IF NOT EXISTS "ShiftPropertyDefinition" (
    "id" INTEGER NOT NULL,
    "propertyKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "valueType" TEXT NOT NULL DEFAULT 'TEXT',
    "options" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ShiftPropertyDefinition_pkey" PRIMARY KEY ("id")
);

-- 创建唯一索引
CREATE UNIQUE INDEX IF NOT EXISTS "ShiftPropertyDefinition_propertyKey_key" ON "ShiftPropertyDefinition"("propertyKey");

-- 创建状态索引
CREATE INDEX IF NOT EXISTS "ShiftPropertyDefinition_status_idx" ON "ShiftPropertyDefinition"("status");

-- 2. 为 ShiftProperty 表添加描述字段（如果不存在）
ALTER TABLE "ShiftProperty" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- 3. 为 ShiftProperty 表添加排序字段（如果不存在）
ALTER TABLE "ShiftProperty" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;

-- 4. 添加外键约束（如果不存在）
-- ShiftProperty 表已经存在，只检查约束
-- DO $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM pg_constraint WHERE conname = 'ShiftProperty_shiftId_fkey'
--   ) THEN
--     ALTER TABLE "ShiftProperty" ADD CONSTRAINT "ShiftProperty_shiftId_fkey"
--       FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;
--   END IF;
-- END $$;

-- 5. 创建序列（如果不存在）
CREATE SEQUENCE IF NOT EXISTS "ShiftPropertyDefinition_id_seq";

-- 6. 设置序列所有者
SELECT setval('"ShiftPropertyDefinition_id_seq"', (SELECT COALESCE(MAX("id"), 0) FROM "ShiftPropertyDefinition"));

COMMENT ON TABLE "ShiftPropertyDefinition" IS '班次属性定义表-用于定义班次的属性类型';
COMMENT ON COLUMN "ShiftPropertyDefinition.propertyKey" IS '属性键-唯一标识一个属性类型';
COMMENT ON COLUMN "ShiftPropertyDefinition.name" IS '属性名称-显示名称';
COMMENT ON COLUMN "ShiftPropertyDefinition.description" IS '属性描述-详细说明';
COMMENT ON COLUMN "ShiftPropertyDefinition.valueType" IS '值类型-TEXT/SELECT/MULTI_SELECT/NUMBER';
COMMENT ON COLUMN "ShiftPropertyDefinition.options" IS '选项值-JSON格式，用于SELECT类型';
COMMENT ON COLUMN "ShiftPropertyDefinition.status" IS '状态-ACTIVE/INACTIVE';
COMMENT ON COLUMN "ShiftPropertyDefinition.sortOrder" IS '排序-显示顺序';
COMMENT ON TABLE "ShiftProperty" IS '班次属性表-记录班次与属性的关联关系';
COMMENT ON COLUMN "ShiftProperty.shiftId" IS '班次ID';
COMMENT ON COLUMN "ShiftProperty.propertyKey" IS '属性键-关联到属性定义';
COMMENT ON COLUMN "ShiftProperty.propertyValue" IS '属性值';
COMMENT ON COLUMN "ShiftProperty.description" IS '描述';
COMMENT ON COLUMN "ShiftProperty.sortOrder" IS '排序';
