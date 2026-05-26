-- 查看产线组织
SELECT id, code, name, parentId, type
FROM Organization
WHERE id IN (3, 7, 8, 9, 10)
ORDER BY id;
