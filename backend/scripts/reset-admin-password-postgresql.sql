-- =====================================================
-- 修改Admin用户密码为 1qaz2wsx
-- 数据库: PostgreSQL
-- =====================================================

-- 说明：
-- 密码 '1qaz2wsx' 使用 bcrypt 加密后的哈希值（salt rounds: 10）
-- 生成时间: 2026-03-19
-- 哈希值: $2b$10$WIMGerkUqJqttvNKbxawX.KR6uuvsRFefY2xN/caeb.f7mOvNWhsy

-- =====================================================
-- 方法1: 如果admin用户存在，则更新密码
-- =====================================================

UPDATE "User"
SET
    "password" = '$2b$10$WIMGerkUqJqttvNKbxawX.KR6uuvsRFefY2xN/caeb.f7mOvNWhsy',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin';

-- =====================================================
-- 方法2: 如果admin用户不存在，则创建新用户
-- =====================================================

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
ON CONFLICT ("username") DO UPDATE
SET
    "password" = EXCLUDED."password",
    "updatedAt" = CURRENT_TIMESTAMP;

-- =====================================================
-- 方法3: 使用 UPSERT (推荐)
-- =====================================================

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
-- 验证密码是否更新成功
-- =====================================================

SELECT
    "id",
    "username",
    "name",
    "email",
    "status",
    "createdAt",
    "updatedAt",
    -- 注意：实际使用时不要返回密码字段
    CASE
        WHEN "password" = '$2b$10$WIMGerkUqJqttvNKbxawX.KR6uuvsRFefY2xN/caeb.f7mOvNWhsy'
        THEN '密码已正确更新'
        ELSE '密码哈希不匹配'
    END as "PasswordStatus"
FROM "User"
WHERE "username" = 'admin';

-- =====================================================
-- 注意事项：
-- =====================================================

-- 1. bcrypt 哈希值已生成，可以直接使用
-- 2. 如需重新生成哈希值，可以使用以下方法：
--    - 使用 Node.js: require('bcrypt').hash('1qaz2wsx', 10)
--    - 使用在线工具: https://bcrypt-generator.com/
--    - 使用命令行: htpasswd -bnBC 10 "" '1qaz2wsx' | tr -d ':\n'

-- 3. 重新生成 bcrypt 哈希的命令（Node.js）:
--    node -e "const bcrypt = require('bcrypt'); bcrypt.hash('1qaz2wsx', 10).then(console.log);"

-- 4. 执行SQL后，可以使用以下用户名和密码登录:
--    用户名: admin
--    密码: 1qaz2wsx

-- 5. 如需修改为其他密码，请重新生成 bcrypt 哈希值并替换上面的哈希字符串
