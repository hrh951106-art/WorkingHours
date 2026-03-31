# JY精益工时管理系统 - 生产环境部署完整指南

> **版本**: v3.0.0
> **更新日期**: 2025-03-31
> **数据库**: PostgreSQL 14+
> **Node.js**: 18.x+

---

## 📋 部署概述

本指南提供了在全新的生产环境中部署JY精益工时管理系统的完整步骤，包括PostgreSQL数据库的初始化、应用程序的配置和启动。

### 部署架构

```
生产环境
├── PostgreSQL 数据库
│   ├── 数据库: jy_production
│   ├── Schema: public
│   └── 初始化数据
├── Node.js 应用
│   ├── NestJS 后端
│   ├── Prisma ORM
│   └── 生产环境配置
└── 部署文件
    ├── 迁移脚本
    ├── 种子数据
    └── 配置文件
```

---

## 📦 部署文件清单

### 1. 数据库迁移文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 表结构迁移 | `prisma/migrations_postgres/20250331_init/migration.sql` | PostgreSQL表结构（49张表） |
| 完整迁移 | `prisma/migrations_postgres/20250331_init/migration_full.sql` | 表结构+种子数据（推荐使用） |
| 生产初始化 | `prisma/migrations_postgres/20250331_init/init_production.sql` | 生产环境专用初始化脚本 |

### 2. 种子数据脚本

| 文件 | 路径 | 说明 |
|------|------|------|
| 数据源初始化 | `prisma/seed-datasources.ts` | 数据源配置（11个数据源） |
| 人事页签初始化 | `prisma/seed-employee-info-tabs.ts` | 员工信息页签配置（5个页签） |
| 完整种子数据 | `prisma/seed-all.ts` | 综合种子数据脚本 |

### 3. 配置文件

| 文件 | 路径 | 说明 |
|------|------|------|
| 生产环境配置 | `.env.production.example` | 生产环境配置模板 |
| Prisma Schema | `prisma/schema.prisma` | 数据模型定义 |
| 数据库提供者 | `prisma/schema.prisma` | PostgreSQL配置 |

### 4. 部署文档

| 文件 | 路径 | 说明 |
|------|------|------|
| PostgreSQL部署指南 | `POSTGRESQL_PRODUCTION_GUIDE.md` | PostgreSQL安装和配置 |
| 生产部署指南 | `PRODUCTION_DEPLOYMENT_GUIDE.md` | 完整生产部署步骤 |
| 部署清单 | `DEPLOYMENT_CHECKLIST.md` | 部署检查清单 |

---

## 🚀 快速部署（推荐方式）

### 前置条件

```bash
# 检查PostgreSQL版本
psql --version  # 应该 >= 14

# 检查Node.js版本
node --version  # 应该 >= 18.x

# 检查npm版本
npm --version   # 应该 >= 9.x
```

### 步骤 1: 创建生产数据库

```bash
# 以postgres超级用户登录
sudo -u postgres psql

# 创建数据库和用户
CREATE USER jy_admin WITH PASSWORD 'your_strong_password_here';
CREATE DATABASE jy_production OWNER jy_admin;
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_admin;
\q
```

### 步骤 2: 执行数据库迁移

```bash
# 进入项目目录
cd /path/to/JY/backend

# 方式A: 使用完整迁移脚本（推荐 - 包含表结构和种子数据）
psql -U jy_admin -d jy_production -f prisma/migrations_postgres/20250331_init/migration_full.sql

# 方式B: 分步执行
# 2.1 先执行表结构
psql -U jy_admin -d jy_production -f prisma/migrations_postgres/20250331_init/migration.sql

# 2.2 再执行种子数据
npm run prisma:seed:all
```

### 步骤 3: 配置生产环境

```bash
# 复制环境配置模板
cp .env.production.example .env.production

# 编辑生产环境配置
nano .env.production
```

**`.env.production` 必需配置**:

```env
# 数据库连接
DATABASE_URL="postgresql://jy_admin:your_strong_password_here@localhost:5432/jy_production?schema=public"

# JWT配置（必须修改！）
JWT_SECRET="your-super-secret-jwt-key-min-32-characters-long-change-this"

# 应用配置
PORT=3000
NODE_ENV="production"

# 日志级别
LOG_LEVEL="info"
```

### 步骤 4: 构建应用

```bash
# 安装依赖
npm ci --production=false

# 生成Prisma客户端
npm run prisma:generate

# 构建应用
npm run build

# 安装生产依赖
npm ci --production
```

### 步骤 5: 启动应用

```bash
# 直接启动
npm run start:prod

# 或使用PM2（推荐）
pm2 start npm --name "jy-backend" -- start:prod
pm2 save
pm2 startup
```

### 步骤 6: 验证部署

```bash
# 检查应用状态
curl http://localhost:3000/health

# 检查数据库连接
psql -U jy_admin -d jy_production -c "SELECT COUNT(*) FROM \"User\";"

# 运行验证脚本
psql -U jy_admin -d jy_production -f scripts/verify-deployment.sql
```

---

## 📊 数据库初始化详情

### 初始化的数据包括

#### 1. 系统数据源 (DataSource)
- 11个预定义数据源（性别、学历、民族等）
- 每个数据源包含多个选项

#### 2. 系统角色 (Role)
- 超级管理员 (SUPER_ADMIN)
- 人事管理员 (HR_ADMIN)
- 考勤管理员 (ATTENDANCE_ADMIN)
- 普通用户 (USER)

#### 3. 系统用户 (User)
- 默认管理员: admin / admin123
- 测试用户: testuser / test123

#### 4. 组织架构 (Organization)
- 根组织: 公司总部
- 示例部门: 技术部、人事部、财务部

#### 5. 员工信息页签配置 (EmployeeInfoTab)

**主页签（5个）**:
- `basic_info` - 基本信息（3个分组，17个字段）
- `work_info` - 工作信息（3个分组，8个字段）
- `education_info` - 学历信息（子表）
- `work_experience` - 工作经历（子表）
- `family_info` - 家庭信息（子表）

**分组（11个）**:
- 基本信息分组：基础资料、联系方式、个人详情
- 工作信息分组：岗位信息、部门信息、考勤设置

**字段（126个）**:
- 包括姓名、性别、出生日期、员工编号等标准字段
- 自定义字段支持

#### 6. 班次配置 (Shift)
- 标准班次 (STANDARD)
- 早班 (MORNING)
- 中班 (AFTERNOON)
- 晚班 (NIGHT)
- 弹性班 (FLEXIBLE)

---

## ⚠️ 已知问题与解决方案

### 问题1: 重复的人事信息页签

**症状**: 基本信息和工作信息页签各显示两个，其中一个没有数据

**原因**: 历史数据中存在重复的页签代码（大写和小写版本）
- `BASIC_INFO` (旧版，应删除)
- `basic_info` (新版，正确)
- `WORK_INFO` (旧版，应删除)
- `work_info` (新版，正确)

**解决方案**:

执行以下SQL删除重复数据：

```sql
-- 删除重复的大写代码页签
DELETE FROM "EmployeeInfoTabField" WHERE "tabId" IN (
  SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTabGroup" WHERE "tabId" IN (
  SELECT id FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY')
);

DELETE FROM "EmployeeInfoTab" WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'EDUCATION', 'WORK_EXPERIENCE', 'FAMILY');
```

**验证**:

```sql
-- 检查是否还有重复
SELECT code, name, COUNT(*)
FROM "EmployeeInfoTab"
WHERE code IN ('BASIC_INFO', 'WORK_INFO', 'basic_info', 'work_info')
GROUP BY code, name;
```

### 问题2: Prisma Client未生成

**症状**: 启动时报错 "This command is only supported when Prisma Client is generated"

**解决方案**:

```bash
npm run prisma:generate
```

### 问题3: 数据库连接失败

**症状**: "Can't reach database server"

**检查清单**:

```bash
# 1. 检查PostgreSQL服务状态
sudo systemctl status postgresql

# 2. 检查数据库是否存在
psql -U jy_admin -d jy_production -c "SELECT 1;"

# 3. 检查连接字符串
echo $DATABASE_URL

# 4. 检查防火墙
sudo ufw status
sudo ufw allow 5432/tcp
```

---

## 🔒 安全建议

### 1. 修改默认密码

```sql
-- 修改管理员密码（使用bcrypt加密后的新密码）
UPDATE "User"
SET password = '$2b$10$新的bcrypt哈希值'
WHERE username = 'admin';
```

### 2. JWT密钥配置

```bash
# 生成强随机JWT密钥
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 3. 数据库权限

```sql
-- 收紧生产数据库权限
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO jy_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jy_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jy_admin;
```

### 4. 环境变量保护

```bash
# 设置正确的文件权限
chmod 600 .env.production
chown app-user:app-user .env.production

# 添加到.gitignore
echo ".env.production" >> .gitignore
```

---

## 📈 性能优化

### 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_employee_org_id ON "Employee"(org_id);
CREATE INDEX idx_employee_status ON "Employee"(status);
CREATE INDEX idx_user_username ON "User"(username);
CREATE INDEX idx_shift_code ON "Shift"(code);

-- 分析表统计信息
ANALYZE;

-- 配置自动清理
ALTER DATABASE jy_production SET autovacuum = ON;
```

### 应用优化

```bash
# 启用集群模式（推荐）
pm2 start npm --name "jy-backend" -i max -- start:prod

# 配置PM2日志
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## 🔄 备份与恢复

### 备份策略

```bash
# 每日自动备份（添加到crontab）
0 2 * * * pg_dump -U jy_admin -d jy_production -F c -f /backup/jy_production_$(date +\%Y\%m\%d).dump

# 保留最近7天的备份
find /backup -name "jy_production_*.dump" -mtime +7 -delete
```

### 恢复流程

```bash
# 从备份恢复
pg_restore -U jy_admin -d jy_production -c /backup/jy_production_20250331.dump

# 验证恢复
psql -U jy_admin -d jy_production -c "SELECT COUNT(*) FROM \"User\";"
```

---

## 📞 部署支持

### 常用命令

```bash
# 查看应用日志
pm2 logs jy-backend

# 查看数据库日志
sudo tail -f /var/log/postgresql/postgresql-14-main.log

# 重启应用
pm2 restart jy-backend

# 查看数据库连接
psql -U jy_admin -d jy_production -c "SELECT * FROM pg_stat_activity WHERE datname = 'jy_production';"
```

### 监控指标

- 数据库连接数
- 应用响应时间
- CPU和内存使用率
- 磁盘空间

### 故障排查

1. **应用无法启动** → 检查 `.env.production` 配置
2. **数据库连接失败** → 检查PostgreSQL服务状态和防火墙
3. **API返回500错误** → 查看应用日志和数据库日志
4. **登录失败** → 检查JWT_SECRET是否正确配置

---

## ✅ 部署验证清单

使用 `DEPLOYMENT_CHECKLIST.md` 中的详细清单进行验证。

- [ ] PostgreSQL安装并运行
- [ ] 数据库创建成功
- [ ] 表结构迁移成功
- [ ] 种子数据导入成功
- [ ] 环境变量配置正确
- [ ] 应用构建成功
- [ ] 应用启动成功
- [ ] API接口可访问
- [ ] 用户登录测试成功
- [ ] 数据库连接正常
- [ ] 日志输出正常
- [ ] 备份策略配置完成

---

## 📝 更新日志

### v3.0.0 (2025-03-31)
- ✅ 完整PostgreSQL支持
- ✅ 生产环境初始化脚本
- ✅ 重复数据清理方案
- ✅ 完整部署文档
- ✅ 安全加固建议

### v2.0.0 (2025-03-30)
- ✅ PostgreSQL迁移文件
- ✅ 人事页签种子数据
- ✅ 环境配置模板

### v1.0.0 (2025-03-29)
- ✅ 初始版本
- ✅ SQLite支持
- ✅ 基础部署流程

---

**部署完成后，请参考 `DEPLOYMENT_CHECKLIST.md` 进行完整验证。**
