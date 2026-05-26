-- 查看账户的 hierarchyValues
SELECT id, code, name, level, hierarchyValues
FROM LaborAccount
WHERE id IN (83, 84);
