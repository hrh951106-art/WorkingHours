-- 将部分CUSTOM字段改为SYSTEM字段
-- 这些字段虽然是自定义的，但应该作为系统内置字段使用

BEGIN TRANSACTION;

-- 更新字段类型为SYSTEM
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'gender';           -- 性别
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'nation';           -- 民族
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'marital_status';   -- 婚姻状况
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'political_status';  -- 政治面貌
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'job_level';         -- 职级
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'employee_type';     -- 员工类型
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'status';            -- 在职状态
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'resignation_reason'; -- 离职原因
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'education_level';   -- 学历层次
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'education_type';    -- 学历类型
UPDATE EmployeeInfoTabField SET fieldType = 'SYSTEM' WHERE fieldCode = 'member_relation';   -- 关系

COMMIT;

-- 验证结果
SELECT '验证更新结果:' as '';
SELECT fieldCode, fieldName, fieldType FROM EmployeeInfoTabField
WHERE fieldCode IN ('gender', 'nation', 'marital_status', 'political_status',
                    'job_level', 'employee_type', 'status', 'resignation_reason',
                    'education_level', 'education_type', 'member_relation')
ORDER BY fieldCode;
