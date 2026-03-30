# Admin密码更新说明

**更新日期**: 2026-03-30

## 新的登录凭据

```
用户名: admin
密码: 1qaz2wsx
```

## 已完成的更新

### 1. 前端登录页面更新
- ✅ 文件: `frontend/src/pages/auth/LoginPage.tsx`
- ✅ 表单默认值已更新为 `1qaz2wsx`
- ✅ 页面显示的默认账号已更新为 `admin / 1qaz2wsx`

### 2. 数据库密码更新
- ✅ SQLite开发数据库已更新
- ✅ 密码使用 bcrypt 加密（salt rounds = 10）
- ✅ 更新时间: 2026-03-30 19:47:18

## 生产环境部署

如果需要在生产环境更新密码，请执行以下步骤：

### 方法一：使用SQL脚本（推荐）

```bash
# PostgreSQL
psql -U postgres -d jy -f scripts/reset-admin-password.sql

# 或直接执行SQL
psql -U postgres -d jy
UPDATE "User"
SET "password" = '$2b$10$FBZ1/bn6oCA0CGvjzSWMxOo7MnNbsAkpoAhhfHtsk/DowgY08PovC',
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin';
```

### 方法二：使用TypeScript脚本

```bash
cd backend
npx ts-node scripts/update-admin-password.ts
```

## 密码加密信息

- **明文密码**: `1qaz2wsx`
- **加密算法**: bcrypt
- **Salt Rounds**: 10
- **哈希值**: `$2b$10$FBZ1/bn6oCA0CGvjzSWMxOo7MnNbsAkpoAhhfHtsk/DowgY08PovC`

## 安全提醒

⚠️ **重要提示**:
1. 这是一个默认密码，仅用于开发和演示环境
2. 生产环境部署后，请立即通过系统修改密码功能修改为强密码
3. 不要将此密码提交到公开的代码仓库
4. 建议定期更换密码

## 验证更新

### 前端验证
1. 启动前端服务: `cd frontend && npm run dev`
2. 访问登录页面
3. 确认页面显示: `admin / 1qaz2wsx`
4. 使用新凭据登录测试

### 后端验证
```bash
# 查看用户信息
sqlite3 backend/prisma/dev.db "SELECT username, name, status FROM User WHERE username = 'admin';"

# 或使用PostgreSQL
psql -U postgres -d jy -c "SELECT username, name, status FROM \"User\" WHERE username = 'admin';"
```

## 相关文件

- `frontend/src/pages/auth/LoginPage.tsx` - 登录页面组件
- `backend/scripts/reset-admin-password.sql` - SQL密码重置脚本
- `backend/scripts/update-admin-password.ts` - TypeScript密码更新脚本

## 回滚

如果需要恢复旧密码（admin123），可以使用以下SQL：

```sql
-- 旧密码的bcrypt哈希值（根据实际环境生成）
UPDATE "User"
SET "password" = '$2b$10$xxxxxx',  -- 替换为实际的哈希值
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "username" = 'admin';
```

或使用TypeScript脚本修改密码后运行。

---

**维护者**: 技术团队
**文档版本**: v1.0
