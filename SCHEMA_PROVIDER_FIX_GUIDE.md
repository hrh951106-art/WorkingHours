# Prisma Provider修复指南

## 问题诊断

**当前状态**: `backend/prisma/schema.prisma` 中的 `provider = "sqlite"`
**期望状态**: 生产环境应该是 `provider = "postgresql"`

## 修复步骤

### 方法1: 手动修复（推荐）

```bash
cd /Users/aaron.he/Desktop/AI/JY

# 1. 备份当前schema文件
cp backend/prisma/schema.prisma backend/prisma/schema.prisma.manual_backup

# 2. 编辑schema文件
nano backend/prisma/schema.prisma
# 或使用其他编辑器: vim, VS Code等

# 3. 找到这一行:
# provider = "sqlite"

# 4. 修改为:
# provider = "postgresql"

# 5. 保存并退出

# 6. 验证修改
grep -A 2 "datasource db" backend/prisma/schema.prisma

# 7. 重新生成Prisma客户端
cd backend
npx prisma generate
```

### 方法2: 自动修复

```bash
cd /Users/aaron.he/Desktop/AI/JY

# 使用sed直接修改
sed -i.bak 's/provider = "sqlite"/provider = "postgresql"/' backend/prisma/schema.prisma

# 验证修改
grep -A 2 "datasource db" backend/prisma/schema.prisma

# 重新生成Prisma客户端
cd backend
npx prisma generate
```

## 验证修复

```bash
# 检查provider配置
cd backend
grep "provider" prisma/schema.prisma

# 应该看到:
# provider = "postgresql"

# 测试Prisma连接
npx prisma db pull

# 如果连接成功，说明provider配置正确
```

## 部署前检查清单

- [ ] Prisma provider设置为postgresql
- [ ] .env.production配置正确的DATABASE_URL
- [ ] Prisma客户端已重新生成
- [ ] 数据库连接测试成功
- [ ] 迁移脚本已准备

## 生产环境DATABASE_URL格式

```
postgresql://[用户名]:[密码]@[主机]:[端口]/[数据库名]?schema=public

示例:
postgresql://jy_user:jy_password@localhost:5432/jy_production?schema=public
```

## 故障排除

### 问题1: Prisma连接失败

**症状**: `Error: Invalid connection string`

**解决方案**:
1. 检查DATABASE_URL格式
2. 验证数据库服务器可达性
3. 确认用户名密码正确

### 问题2: 迁移执行失败

**症状**: `Error: PGRST116`

**解决方案**:
1. 确认provider为postgresql
2. 检查数据库权限
3. 验证表结构一致性

---

**重要**: 此修复必须在生产部署前完成！