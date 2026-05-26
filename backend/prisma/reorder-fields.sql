-- 重新排序"个人资料"分组的字段
-- 使字段顺序更符合逻辑

BEGIN TRANSACTION;

-- 更新字段排序
UPDATE EmployeeInfoTabField SET sort = 1 WHERE tabId = 1 AND fieldCode = 'employeeNo';
UPDATE EmployeeInfoTabField SET sort = 2 WHERE tabId = 1 AND fieldCode = 'name';
UPDATE EmployeeInfoTabField SET sort = 3 WHERE tabId = 1 AND fieldCode = 'gender';
UPDATE EmployeeInfoTabField SET sort = 4 WHERE tabId = 1 AND fieldCode = 'idCard';
UPDATE EmployeeInfoTabField SET sort = 5 WHERE tabId = 1 AND fieldCode = 'photo';
UPDATE EmployeeInfoTabField SET sort = 6 WHERE tabId = 1 AND fieldCode = 'phone';
UPDATE EmployeeInfoTabField SET sort = 7 WHERE tabId = 1 AND fieldCode = 'email';
UPDATE EmployeeInfoTabField SET sort = 8 WHERE tabId = 1 AND fieldCode = 'currentAddress';
UPDATE EmployeeInfoTabField SET sort = 9 WHERE tabId = 1 AND fieldCode = 'birthDate';
UPDATE EmployeeInfoTabField SET sort = 10 WHERE tabId = 1 AND fieldCode = 'age';
UPDATE EmployeeInfoTabField SET sort = 11 WHERE tabId = 1 AND fieldCode = 'maritalStatus';
UPDATE EmployeeInfoTabField SET sort = 12 WHERE tabId = 1 AND fieldCode = 'nativePlace';
UPDATE EmployeeInfoTabField SET sort = 13 WHERE tabId = 1 AND fieldCode = 'politicalStatus';
UPDATE EmployeeInfoTabField SET sort = 14 WHERE tabId = 1 AND fieldCode = 'householdRegister';

-- 验证排序结果
SELECT fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 1 AND groupId = 1
ORDER BY sort;

COMMIT TRANSACTION;
