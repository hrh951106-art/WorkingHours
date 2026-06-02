# PostgreSQL 种子数据部署指南

## 概述

本指南说明如何将种子数据导入到PostgreSQL生产数据库。种子数据包含系统运行所需的基础配置数据。

## 包含的数据

### 1. 数据源配置（19个数据源，100+选项）
- **组织类型** (ORG_TYPE): 集团、公司、部门、小组、岗位
- **性别** (gender): 男、女
- **民族** (nation): 汉族、壮族、回族、满族、维吾尔族、苗族、其他
- **婚姻状况** (marital_status): 未婚、已婚、离婚、丧偶
- **政治面貌** (political_status): 党员、团员、群众、民主党派、其他
- **职级** (JOB_LEVEL): M1-M4（管理岗）、P1-P4（专业岗）
- **职位** (POSITION): 助理、专员、高级专员、主管、经理、高级经理、总监、副总裁、CEO、CTO、CFO、COO
- **员工类型** (EMPLOYEE_TYPE): 全职、兼职、合同工、实习生、外包
- **学历层次** (education_level): 小学、初中、高中、中专、大专、本科、硕士、博士
- **学历类型** (education_type): 全日制、非全日制、职业、成人、自考、函授、远程、其他
- **在职状态** (employment_status): 在职、试用期、离职、停薪留职、退休
- **紧急联系人关系** (emergency_relation): 配偶、父亲、母亲、子女、兄弟姐妹、其他
- **家庭成员关系** (family_relation): 配偶、父亲、母亲、子女、兄弟姐妹、其他
- **异动类型** (change_type): 晋升、降职、调动、离职、转正、试用期延长、薪资调整、其他
- **工作地点** (WORK_LOCATION): 总部、分公司、工厂、办公室、远程、现场
- **产品** (PRODUCT): 内置数据源（用于生产模块）
- **工序** (PROCESS): 内置数据源（用于生产模块）
- **学历** (EDUCATION): 高中、大专、本科、硕士、博士（兼容旧版本）
- **工作状态** (WORK_STATUS): 在职、试用期、请假、离职（兼容旧版本）

### 2. 人事信息页签配置
- **基本信息**: 个人资料、联系方式、个人详情（3个分组，17个字段）
- **工作信息**: 当前职位、雇佣信息、组织信息（3个分组，13个字段）
- **学历信息**: 学历列表子表
- **工作经历**: 工作经历子表
- **家庭信息**: 家庭成员子表

### 3. 用户和角色
- **系统管理员** (admin / admin123): 拥有所有权限
- **HR管理员** (hr_admin / hr123): 人事管理权限（默认角色）

### 4. 组织架构
- 集团总部
  - 技术部
  - 人力资源部

### 5. 班次配置
- **正常班**: 08:00-12:00, 13:30-17:30（标准工时7.5小时）

### 6. 打卡设备
- 前台考勤机 (FACE)

### 7. 示例员工
- 张三 (EMP001) - 技术部
- 李四 (EMP002) - 技术部

## 部署方法

### 方法一：自动部署脚本（推荐）

```bash
# 生产环境
cd deployment
chmod +x seed-data-deploy.sh
./seed-data-deploy.sh production

# 开发环境
./seed-data-deploy.sh dev
```

脚本功能：
- ✅ 自动读取数据库配置
- ✅ 测试数据库连接
- ✅ 可选备份现有数据
- ✅ 交互式确认
- ✅ 导入后验证
- ✅ 显示默认账户信息

### 方法二：手动执行SQL

```bash
# 设置环境变量
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=jy_production
export DB_USER=postgres
export DB_PASSWORD=your_password

# 执行SQL文件
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
  -f deployment/postgresql-seed-data.sql
```

### 方法三：使用Prisma Seed

```bash
# 确保DATABASE_URL已配置
export DATABASE_URL="postgresql://postgres:password@localhost:5432/jy_production"

# 进入backend目录
cd backend

# 运行种子数据脚本
npm run prisma:seed:all
```

## 部署前准备

### 1. 确认数据库Schema已创建

```bash
# 方法一：使用Prisma迁移
cd backend
npx prisma migrate deploy

# 方法二：手动创建Schema
psql -h localhost -U postgres -d jy_production -f backend/prisma/schema.prisma
```

### 2. 准备环境配置文件

确保 `.env.production` 文件包含正确的数据库连接字符串：

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/jy_production"
```

### 3. 验证数据库权限

确保数据库用户有以下权限：
- SELECT
- INSERT
- UPDATE
- CREATE (如果表不存在)

## 验证部署

### 执行验证查询

```sql
-- 数据源数量
SELECT COUNT(*) FROM "DataSource";
-- 预期: 5

-- 页签数量
SELECT COUNT(*) FROM "EmployeeInfoTab";
-- 预期: 5

-- 用户数量
SELECT COUNT(*) FROM "User";
-- 预期: 2

-- 角色数量
SELECT COUNT(*) FROM "Role";
-- 预期: 2

-- 组织数量
SELECT COUNT(*) FROM "Organization";
-- 预期: 3

-- 班次数量
SELECT COUNT(*) FROM "Shift";
-- 预期: 1

-- 设备数量
SELECT COUNT(*) FROM "PunchDevice";
-- 预期: 1

-- 员工数量
SELECT COUNT(*) FROM "Employee";
-- 预期: 2
```

### 验证登录

使用默认账户登录系统：
- 管理员: `admin / admin123`
- HR管理员: `hr_admin / hr123`

## 安全建议

### ⚠️ 生产环境必做

1. **立即修改默认密码**
   ```sql
   -- 使用bcrypt生成新密码的hash
   -- 然后更新密码
   UPDATE "User" SET password = '$2b$10$...' WHERE username = 'admin';
   ```

2. **删除或禁用示例员工**
   ```sql
   -- 软删除示例员工
   UPDATE "Employee" SET status = 'DELETED' WHERE "employeeNo" IN ('EMP001', 'EMP002');
   ```

3. **更新组织信息**
   - 将"集团总部"、"技术部"等名称改为实际组织名称
   - 更新负责人信息

4. **配置实际班次**
   - 根据实际工作时间调整班次配置
   - 添加其他班次（如夜班、轮班等）

5. **添加实际设备**
   - 删除示例设备或更新为实际设备信息
   - 配置设备IP地址和分组

## 常见问题

### Q1: SQL执行失败，提示表不存在

**原因**: 数据库Schema未创建

**解决**:
```bash
cd backend
npx prisma migrate deploy
```

### Q2: 出现 "ON CONFLICT" 语法错误

**原因**: PostgreSQL版本过低（需要9.5+）

**解决**:
```bash
# 检查PostgreSQL版本
psql --version

# 如果版本过低，请升级PostgreSQL
```

### Q3: 用户已存在，导入失败

**原因**: 用户表有username唯一约束

**解决**: SQL文件使用 `ON CONFLICT` 子句处理冲突，会自动更新已存在的记录。

### Q4: 密码bcrypt哈希值不匹配

**原因**: 使用了不兼容的bcrypt库

**解决**:
```bash
# 重新生成密码哈希
cd backend
node -e "const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('admin123', 10));"
```

### Q5: 部署脚本无法读取数据库配置

**原因**: .env文件格式不正确

**解决**: 确保.env文件格式正确：
```env
DATABASE_URL="postgresql://user:pass@host:port/db"
```

## 回滚

如果需要回滚种子数据导入：

### 方法一：从备份恢复

```bash
# 如果执行了备份
psql -h localhost -U postgres -d jy_production \
  -f deployment/seed_backup_YYYYMMDD_HHMMSS.sql
```

### 方法二：手动删除

```sql
-- 删除示例数据（注意顺序，先删除依赖数据）
DELETE FROM "EmployeeInfoTabField";
DELETE FROM "EmployeeInfoTabGroup";
DELETE FROM "EmployeeInfoTab";

DELETE FROM "DataSourceOption";
DELETE FROM "DataSource";

DELETE FROM "Employee";
DELETE FROM "Organization";
DELETE FROM "UserRole";
DELETE FROM "User";
DELETE FROM "Role";

DELETE FROM "ShiftSegment";
DELETE FROM "Shift";
DELETE FROM "PunchDevice";
```

## 文件清单

- `deployment/postgresql-seed-data.sql` - 种子数据SQL文件
- `deployment/seed-data-deploy.sh` - 自动部署脚本
- `deployment/SEED_DATA_GUIDE.md` - 本指南

## 技术支持

如有问题，请联系技术支持或查看项目文档。

---

**最后更新**: 2026-06-02
**版本**: 1.0.0
