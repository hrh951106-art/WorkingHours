-- 查看组织结构
SELECT id, code, name, parentId, type
FROM Organization
WHERE id IN (4, 5, 6, 83, 84);
