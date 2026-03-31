# 快速部署指南 - PostgreSQL 生产环境

## 一、快速部署（5分钟部署）

### 前提条件
- 已安装 Node.js 18+ 和 PostgreSQL 14+
- 已有 Git 仓库访问权限

### 部署步骤

```bash
# 1. 进入项目目录
cd /path/to/JY/backend

# 2. 安装依赖
npm ci --production

# 3. 配置环境变量
cp .env.production .env.local
# 编辑 .env.local，修改数据库连接字符串和JWT密钥

# 4. 生成 Prisma Client
npm run prisma:generate

# 5. 推送数据库结构
DATABASE_URL="postgresql://user:pass@localhost:5432/jy_production" \
  npm run prisma:push

# 6. 执行数据迁移脚本（按顺序）
psql -U user -d jy_production -f scripts/postgres-migrations/003-init-datasources.sql
psql -U user -d jy_production -f scripts/postgres-migrations/004-fix-employee-field-types.sql
psql -U user -d jy_production -f scripts/postgres-migrations/005-verify-datasources.sql

# 7. 构建应用
npm run build

# 8. 启动应用
NODE_ENV=production node dist/main.js
```

---

## 二、数据库迁移脚本说明

### 脚本清单

| 脚本文件 | 功能 | 必须执行 | 执行顺序 |
|---------|------|---------|---------|
| 003-init-datasources.sql | 初始化所有数据源及选项 | ✓ | 1 |
| 004-fix-employee-field-types.sql | 修复系统字段类型 | ✓ | 2 |
| 005-verify-datasources.sql | 验证数据源配置 | 建议执行 | 3 |

### 执行示例

```bash
# 方式1：直接执行
psql -U postgres -d jy_production -f 003-init-datasources.sql

# 方式2：使用环境变量
psql "$DATABASE_URL" -f 003-init-datasources.sql

# 方式3：远程数据库
psql -h db.example.com -U jy_user -d jy_production \
  -f 003-init-datasources.sql
```

---

## 三、重要修复说明

### 本次部署包含的关键修复

#### 1. 字段类型修复

**问题**：部分系统字段的 fieldType 错误设置为 'SELECT'

**影响**：员工详情页面字段显示为空

**修复**：将以下字段的 fieldType 改为 'SYSTEM'
- position (职位)
- employeeType (员工类型)
- resignationReason (离职原因)
- nation (民族)
- educationLevel (学历层次)
- educationType (学历类型)

#### 2. 数据源初始化

**初始化的数据源**：
- gender (性别)
- nation (民族)
- marital_status (婚姻状况)
- political_status (政治面貌)
- JOB_LEVEL (职级)
- POSITION (职位)
- EMPLOYEE_TYPE (员工类型)
- education_level (学历层次)
- education_type (学历类型)
- employment_status (在职状态)
- emergency_relation (紧急联系人关系)
- family_relation (家庭成员关系)
- change_type (异动类型)

---

## 四、验证部署

### 快速验证命令

```bash
# 1. 检查应用启动
curl http://localhost:3001/health

# 2. 检查数据源配置
psql -U jy_user -d jy_production -c "
SELECT COUNT(*) FROM \"DataSource\";
-- 预期结果：13-15 个数据源
"

# 3. 检查字段类型
psql -U jy_user -d jy_production -c "
SELECT \"fieldCode\", \"fieldType\"
FROM \"EmployeeInfoTabField\"
WHERE \"fieldCode\" IN ('position', 'employeeType', 'nation')
ORDER BY \"fieldCode\";
-- 预期结果：所有 fieldType = 'SYSTEM'
"

# 4. 检查前端连接
# 在浏览器打开前端应用，检查：
# - 登录功能
# - 员工列表
# - 员工详情页面（下拉字段显示标签）
```

---

## 五、常见问题速查

| 问题 | 解决方案 |
|------|---------|
| 应用启动失败 | 检查 .env.local 文件配置 |
| 数据库连接失败 | 检查 DATABASE_URL 是否正确 |
| 字段显示为空 | 执行 004-fix-employee-field-types.sql |
| 下拉显示代码 | 执行 003-init-datasources.sql |
| 权限错误 | 检查数据库用户权限 |

---

## 六、回滚方案

如果部署后发现问题：

```bash
# 1. 停止应用
pm2 stop jy-backend

# 2. 恢复之前的版本
git log
git checkout <previous-commit>

# 3. 重新构建
npm ci --production
npm run build

# 4. 重启应用
pm2 restart jy-backend
```

---

## 七、生产环境检查清单

部署完成后，请确认以下项目：

- [ ] 应用正常启动（pm2 status 显示 online）
- [ ] 健康检查接口返回正常
- [ ] 用户可以正常登录
- [ ] 员工列表可以正常查看
- [ ] 员工详情页面字段显示正确
- [ ] 下拉字段显示标签而不是代码
- [ ] 可以新增和编辑员工
- [ ] 数据源配置完整（005 脚本验证通过）
- [ ] 日志正常输出
- [ ] 数据库备份已配置

---

**快速联系**：
- 技术支持：查看完整文档 `PRODUCTION_DEPLOYMENT_GUIDE.md`
- 问题反馈：提交 Issue 到项目仓库
