-- 人事信息配置字段重新分组迁移脚本
-- 目的：
-- 1. 将"个人详情"分组里的字段合并到"个人资料"分组中
-- 2. 将"联系方式"分组中的"手机号码"、"电子邮箱"、"现居住地址"也合并到"个人资料"分组中

-- 开始事务
BEGIN TRANSACTION;

-- 1. 将"个人详情"分组（ID=3）中的所有字段移动到"个人资料"分组（ID=1）
UPDATE EmployeeInfoTabField
SET groupId = 1
WHERE tabId = 1 AND groupId = 3;

-- 2. 将"联系方式"分组中的特定字段移动到"个人资料"分组
UPDATE EmployeeInfoTabField
SET groupId = 1
WHERE tabId = 1 AND fieldCode IN ('phone', 'email', 'currentAddress');

-- 3. 删除"个人详情"分组（因为已经没有字段了）
DELETE FROM EmployeeInfoTabGroup WHERE id = 3;

-- 4. 验证结果
SELECT '=== 迁移后的字段分组情况 ===' AS info;
SELECT
  g.id AS groupId,
  g.code AS groupCode,
  g.name AS groupName,
  COUNT(f.id) AS fieldCount
FROM EmployeeInfoTabGroup g
LEFT JOIN EmployeeInfoTabField f ON f.groupId = g.id
WHERE g.tabId = 1
GROUP BY g.id
ORDER BY g.id;

SELECT '=== "个人资料"分组中的所有字段 ===' AS info;
SELECT id, fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 1 AND groupId = 1
ORDER BY sort;

SELECT '=== "联系方式"分组中剩余的字段 ===' AS info;
SELECT id, fieldCode, fieldName, sort
FROM EmployeeInfoTabField
WHERE tabId = 1 AND groupId = 2
ORDER BY sort;

COMMIT TRANSACTION;

-- 说明：
-- 执行此脚本后，"基本信息"页签下将只剩两个分组：
-- 1. 个人资料（包含原有的字段 + 个人详情的所有字段 + 联系方式的部分字段）
-- 2. 联系方式（只包含紧急联系人相关字段）
-- "个人详情"分组将被删除
