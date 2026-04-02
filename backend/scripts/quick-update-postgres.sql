-- ====================================================================
-- PostgreSQL 快速迁移脚本（简化版）
-- 版本：20260402
-- 用途：快速执行数据库迁移
-- ====================================================================

BEGIN;

-- 1. 修改 Employee 表字段为可选
ALTER TABLE "Employee" ALTER COLUMN "name" DROP NOT NULL;
ALTER TABLE "Employee" ALTER COLUMN "gender" DROP NOT NULL;

-- 2. 更新数据源关联
UPDATE "EmployeeInfoTabField" SET "dataSourceId" = 19 WHERE "fieldCode" = 'emergencyRelation';
UPDATE "EmployeeInfoTabField" SET "dataSourceId" = 13 WHERE "fieldCode" = 'jobLevel';
UPDATE "EmployeeInfoTabField" SET "dataSourceId" = 15 WHERE "fieldCode" = 'status';

COMMIT;

-- 验证
\d "Employee"
SELECT "fieldCode", "fieldName", "dataSourceId" FROM "EmployeeInfoTabField"
WHERE "fieldCode" IN ('emergencyRelation', 'jobLevel', 'status');
