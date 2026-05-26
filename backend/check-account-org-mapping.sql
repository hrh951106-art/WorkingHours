-- 查看账户详情
SELECT '=== 源工时账户（A04_WORKSHOP） ===' as info;
SELECT id, code, name, path, namePath, hierarchyValues
FROM LaborAccount
WHERE id IN (83, 84);

SELECT '=== 直接工时账户（A02_LINE） ===' as info;
SELECT id, code, name, path, namePath, hierarchyValues
FROM LaborAccount
WHERE id IN (14, 15);

-- 查看产线组织
SELECT '=== 产线组织 ===' as info;
SELECT id, code, name, parentId
FROM Organization
WHERE id IN (7, 8, 9, 10, 14, 15)
ORDER BY id;
