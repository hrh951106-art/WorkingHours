-- =====================================================
-- 修改Admin用户密码为 1qaz2wsx (简化版)
-- 数据库: PostgreSQL
-- =====================================================

-- 使用 UPSERT 语法，如果用户不存在则创建，存在则更新
INSERT INTO "User" (
    "username",
    "password",
    "name",
    "email",
    "status",
    "createdAt",
    "updatedAt"
)
VALUES (
    'admin',
    '$2b$10$WIMGerkUqJqttvNKbxawX.KR6uuvsRFefY2xN/caeb.f7mOvNWhsy',
    '系统管理员',
    'admin@system.com',
    'ACTIVE',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT ("username")
DO UPDATE SET
    "password" = EXCLUDED."password",
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "updatedAt" = CURRENT_TIMESTAMP;

-- =====================================================
-- 验证修改结果
-- =====================================================

SELECT
    "id",
    "username",
    "name",
    "email",
    "status",
    "createdAt",
    "updatedAt"
FROM "User"
WHERE "username" = 'admin';

-- =====================================================
-- 登录信息
-- =====================================================
-- 用户名: admin
-- 密码: 1qaz2wsx
