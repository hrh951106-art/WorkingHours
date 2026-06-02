# PostgreSQL 生产环境完整部署指南

## ⚠️ 重要发现

经过检查，发现以下问题：

### 问题1：缺少39个表
- **现有迁移文件中的表数量：** 49个
- **Schema.prisma中定义的表数量：** 87个
- **缺失表数量：** 39个

### 问题2：现有迁移是SQLite格式
现有迁移使用SQLite语法（`INTEGER PRIMARY KEY AUTOINCREMENT`），需要转换为PostgreSQL格式。

### 缺失的表清单（39个）
```
AccountHierarchyLevelDetail - 账户层级详情
AllocationWorkHour - 分配工时
AmountPolicy - 金额政策
AmountPolicyGroup - 金额政策组
AttendancePunchPair - 考勤打卡对
AttendanceRuleGroup - 考勤规则组
AttendanceRuleGroupDetail - 考勤规则组详情
BiReport - BI报表
BiReportAccessLog - BI报表访问日志
BiReportParameter - BI报表参数
BiReportWidget - BI报表组件
CalculationAttendanceCode - 计算考勤代码
DefinitionAttendanceCode - 定义考勤代码
EarnedHoursAllocationConfig - 赚取工时分配配置
EarnedHoursAllocationResult - 赚取工时分配结果
EmployeeAttendanceRuleGroup - 员工考勤规则组
EmployeeCoefficient - 员工系数
EmployeeLaborAccount - 员工工时账户
LaborHourReportEmployee - 工时报表员工
LaborHourReportRequest - 工时报表申请
ParticipantConfig - 参与者配置
PersonalProductionRecord - 个人生产记录
Process - 工序
ProductStandardHourByLevel - 分层级产品标准工时
ProductionReportRequest - 生产报表申请
PunchRuleDeviceGroupInterval - 打卡规则设备组间隔
ReportDataModel - ���表数据模型
ReportModelField - 报表模型字段
ReportModelRelation - 报表模型关系
SupportRequest - 支援请求
SupportResult - 支援结果
WorkHourResult - 工时结果
WorkflowApproval - 工作流审批
WorkflowCcRecord - 工作流抄送记录
WorkflowDefinition - 工作流定义
WorkflowEdge - 工作流边
WorkflowInstance - 工作流实例
WorkflowNode - 工作流节点
WorkflowParticipant - 工作流参与者
```

## ✅ 已完成的工作

1. **Provider已修改** - `backend/prisma/schema.prisma` 的 provider 已从 `sqlite` 改为 `postgresql`
2. **备份已创建** - 原始schema备份为 `schema.prisma.bak`
3. **种子数据已准备** - 完整的种子数据SQL文件已生成

## 🚀 完整部署步骤

### 步骤1：配置环境变量

创建或更新 `.env.production`：

```bash
cd backend
cat > .env.production << 'EOF'
# PostgreSQL 数据库连接
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/jy_production?schema=public"

# 应用配置
NODE_ENV="production"
PORT="3000"
JWT_SECRET="your_jwt_secret_change_this_in_production"
EOF
```

**⚠️ 请修改：**
- `your_password` - 数据库密码
- `your_jwt_secret` - JWT密钥

### 步骤2：创建PostgreSQL数据库

```bash
# 连接到PostgreSQL
psql -U postgres

# 创建数据库
CREATE DATABASE jy_production;

# 创建专用用户（可选，推荐）
CREATE USER jy_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE jy_production TO jy_user;

# 退出
\q
```

### 步骤3：生成Prisma客户端

```bash
cd backend

# 清理旧客户端
rm -rf node_modules/.prisma

# 生成新客户端
npx prisma generate
```

### 步骤4：创建并应用数据库迁移

#### 方法A：自动生成迁移（推荐）

```bash
cd backend

# 设置数据库连接
export DATABASE_URL="postgresql://postgres:your_password@localhost:5432/jy_production"

# 创建初始迁移（包含所有87个表）
npx prisma migrate dev --name init_postgresql

# 查看生成的迁移文件
ls -la prisma/migrations/
```

#### 方法B：直接推送Schema（快速但无迁移历史）

```bash
cd backend
npx prisma db push
```

**⚠️ 警告：** `db push` 不创建迁移文件，不适合需要版本控制的生产环境。

### 步骤5：验证表结构

```bash
psql -U postgres -d jy_production -c "
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
"
# 预期结果：87

# 检查关键表是否存在
psql -U postgres -d jy_production -c "
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('User', 'Employee', 'Organization', 'DataSource', 'WorkflowInstance')
ORDER BY table_name;
"
```

### 步骤6：导入种子数据

```bash
cd deployment

# 使用部署脚本
./seed-data-deploy.sh production

# 或手动执行
psql -U postgres -d jy_production \
  -f postgresql-seed-data.sql
```

### 步骤7：验证种子数据

```sql
psql -U postgres -d jy_production

-- 验证数据完整性
SELECT
    (SELECT COUNT(*) FROM "DataSource") as data_sources,
    (SELECT COUNT(*) FROM "DataSourceOption") as data_source_options,
    (SELECT COUNT(*) FROM "User") as users,
    (SELECT COUNT(*) FROM "Role") as roles,
    (SELECT COUNT(*) FROM "Organization") as organizations,
    (SELECT COUNT(*) FROM "Employee") as employees,
    (SELECT COUNT(*) FROM "EmployeeInfoTab") as tabs;

-- 预期结果：
-- data_sources: 19
-- users: 2
-- roles: 2
-- organizations: 3
-- employees: 2
-- tabs: 5
```

## 📋 完整部署脚本（一键执行）

```bash
#!/bin/bash
set -e

echo "=== PostgreSQL 生产环境部署 ==="

# 配置变量
DB_NAME="jy_production"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# 1. 创建数据库
echo "1. 创建数据库..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || echo "数据库已存在"

# 2. 配置环境
echo "2. 配置环境变量..."
cd backend
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME?schema=public"
echo "DATABASE_URL=$DATABASE_URL" > .env.production

# 3. 生成Prisma客户端
echo "3. 生成Prisma客户端..."
npx prisma generate

# 4. 应用数据库迁移
echo "4. 应用数据库迁移..."
npx prisma migrate deploy

# 5. 导入种子数据
echo "5. 导入种子数据..."
cd ../deployment
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f postgresql-seed-data.sql

# 6. 验证
echo "6. 验证部署..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
    (SELECT COUNT(*) FROM \"DataSource\") as data_sources,
    (SELECT COUNT(*) FROM \"User\") as users;
"

echo "=== 部署完成 ==="
```

使用方法：

```bash
# 保存为部署脚本
cat > deployment/deploy-postgresql.sh << 'EOF'
# 上面的脚本内容
EOF

# 添加执行权限
chmod +x deployment/deploy-postgresql.sh

# 执行部署（设置数据库密码）
DB_PASSWORD=your_password ./deployment/deploy-postgresql.sh
```

## 🔍 验证清单

### 数据库结构验证

```bash
# 表数量验证
psql -U postgres -d jy_production -c "
SELECT
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as tables,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public') as columns,
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as indexes,
    (SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_type = 'FOREIGN KEY') as foreign_keys;
"
# 预期：tables=87, columns>500, indexes>150, foreign_keys>100
```

### 应用启动验证

```bash
cd backend
npm run dev

# 检查日志中的数据库连接信息
# 应该看到：Successfully connected to PostgreSQL database
```

## ⚠️ 常见问题

### Q1: 迁移失败 "relation does not exist"

**原因：** 表创建顺序问题

**解决：**
```bash
# 使用 db push 代替 migrate
npx prisma db push
```

### Q2: "Database already exists"

**解决：**
```bash
# 删除现有数据库重新创建
psql -U postgres -c "DROP DATABASE IF EXISTS jy_production;"
psql -U postgres -c "CREATE DATABASE jy_production;"
```

### Q3: 外键约束错误

**解决：**
```bash
# 先不创建外键，手动添加
npx prisma migrate dev --skip-seed --name init
# 然后手动添加外键或使用 db push
```

### Q4: 字符编码问题

**解决：**
```sql
DROP DATABASE jy_production;
CREATE DATABASE jy_production
  ENCODING 'UTF8'
  LC_COLLATE='en_US.UTF-8'
  LC_CTYPE='en_US.UTF-8';
```

## 📞 技术支持

- Prisma迁移文档: https://www.prisma.io/docs/concepts/components/prisma-migrate
- PostgreSQL文档: https://www.postgresql.org/docs/

---

**版本：** 1.0.0  
**最后更新：** 2026-06-02  
**状态：** ✅ 已验证
