-- 调整人事信息字段结构
-- 1. 工号移到工作信息页签的入职信息分组
-- 2. 手机号码和邮箱移到基本信息分组
-- 3. 删除联系电话和联系邮箱分组

-- 开始事务
BEGIN TRANSACTION;

-- 步骤1: 将工号(employee_no)从基本信息-联系电话分组移到工作信息-入职信息分组
-- 工号字段 id=27, 当前 groupId=2, tabId=5
-- 移到 groupId=6 (入职信息), tabId=6
UPDATE EmployeeInfoTabField
SET tabId = 6, groupId = 6, sort = 0
WHERE id = 27;

-- 步骤2: 将手机号码(mobile)从联系电话分组移到个人信息分组
-- 手机号码字段 id=40, 当前 groupId=2
-- 移到 groupId=1 (个人信息)
UPDATE EmployeeInfoTabField
SET groupId = 1, sort = 11
WHERE id = 40;

-- 步骤3: 将邮箱(email)从联系邮箱分组移到个人信息分组
-- 邮箱字段 id=41, 当前 groupId=3
-- 移到 groupId=1 (个人信息)
UPDATE EmployeeInfoTabField
SET groupId = 1, sort = 12
WHERE id = 41;

-- 步骤4: 删除联系电话分组 (groupId=2)
-- 先将分组下的其他字段（如果有）移到个人信息分组或删除
-- 工号(id=27)已移动，手机号码(id=40)已移动
-- 联系电话分组应该没有其他字段了
DELETE FROM EmployeeInfoTabGroup WHERE id = 2;

-- 步骤5: 删除联系邮箱分组 (groupId=3)
-- 邮箱(id=41)已移动
DELETE FROM EmployeeInfoTabGroup WHERE id = 3;

-- 更新个人信息分组为系统内置分组
UPDATE EmployeeInfoTabGroup
SET isSystem = 1
WHERE id = 1;

-- 更新入职信息分组为系统内置分组
UPDATE EmployeeInfoTabGroup
SET isSystem = 1
WHERE id = 6;

-- 更新职位信息分组为系统内置分组
UPDATE EmployeeInfoTabGroup
SET isSystem = 1
WHERE id = 5;

-- 提交事务
COMMIT;

-- 验证结果
SELECT '基本信息页签分组:' as info;
SELECT id, code, name, isSystem FROM EmployeeInfoTabGroup WHERE tabId = 5;

SELECT '工作信息页签分组:' as info;
SELECT id, code, name, isSystem FROM EmployeeInfoTabGroup WHERE tabId = 6;

SELECT '工号字段:' as info;
SELECT id, tabId, groupId, fieldCode, fieldName FROM EmployeeInfoTabField WHERE fieldCode = 'employee_no';

SELECT '手机号码字段:' as info;
SELECT id, tabId, groupId, fieldCode, fieldName FROM EmployeeInfoTabField WHERE fieldCode = 'mobile';

SELECT '邮箱字段:' as info;
SELECT id, tabId, groupId, fieldCode, fieldName FROM EmployeeInfoTabField WHERE fieldCode = 'email';
