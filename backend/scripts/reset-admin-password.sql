-- =====================================================
-- 重置admin账户密码脚本
-- 版本: v1.0
-- 日期: 2026-03-30
-- 说明: 将admin账户密码重置为 1qaz2wsx
-- 注意: 此脚本使用bcrypt加密，salt rounds = 10
-- =====================================================

\echo '========================================'
\echo '重置admin账户密码'
\echo '========================================'
\echo ''
\echo '新密码: 1qaz2wsx'
\echo ''

-- 更新admin用户密码
-- 密码: 1qaz2wsx
-- bcrypt hash (salt rounds = 10): $2b$10$FBZ1/bn6oCA0CGvjzSWMxOo7MnNbsAkpoAhhfHtsk/DowgY08PovC
UPDATE "User"
SET "password" = '$2b$10$FBZ1/bn6oCA0CGvjzSWMxOo7MnNbsAkpoAhhfHtsk/DowgY08PovC',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin';

\echo ''
\echo '========================================'
\echo '密码重置完成！'
\echo '========================================'
\echo ''
\echo '登录信息：'
\echo '  用户名: admin'
\echo '  密码: 1qaz2wsx'
\echo ''
\echo '请妥善保管密码信息。'
\echo ''

-- 验证更新
SELECT
  "id",
  "username",
  "name",
  CASE
    WHEN LENGTH("password") = 60 THEN '✓ 密码格式正确（bcrypt）'
    ELSE '✗ 密码格式异常'
  END as "密码状态",
  "status",
  "updatedAt"
FROM "User"
WHERE "username" = 'admin';
