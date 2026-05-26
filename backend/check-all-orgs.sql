-- 查看所有组织结构
SELECT id, code, name, parentId, type
FROM Organization
WHERE parentId = 5
ORDER BY id;
