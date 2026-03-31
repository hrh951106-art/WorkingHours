# Employee表结构详细设计文档

> **表名**: Employee
> **说明**: 员工信息主表
> **数据库**: SQLite (开发) / PostgreSQL (生产)
> **更新时间**: 2025-03-31

---

## 📊 表结构概览

Employee表是系统的核心表，存储员工的基本信息、工作信息和联系信息。该表与其他多个表存在关联关系。

### 表关系图

```
Employee (员工主表)
├── Organization (组织架构) - 多对一
├── CalcResult (计算结果) - 一对多
├── EmployeeChangeLog (变更日志) - 一对多
├── EmployeeEducation (学历信息) - 一对多
├── EmployeeFamilyMember (家庭成员) - 一对多
├── EmployeeWorkExperience (工作经历) - 一对多
├── LaborAccount (劳工账户) - 一对多
├── PunchPair (打卡对) - 一对多
├── PunchRecord (打卡记录) - 一对多
├── Schedule (排班) - 一对多
└── WorkInfoHistory (工作信息历史) - 一对多
```

---

## 📋 字段详细设计

### 1️⃣ 基础标识字段

| 字段名 | 类型 | 必填 | 默认值 | 约束 | 说明 |
|--------|------|------|--------|------|------|
| **id** | `Int` | ✓ | AUTOINCREMENT | PRIMARY KEY | 主键ID，自增 |
| **employeeNo** | `String` | ✓ | - | UNIQUE | 员工编号，全局唯一，用于系统内部识别 |

**设计说明**:
- `id`: 使用自增整数作为主键，提高查询性能
- `employeeNo`: 业务主键，通常格式如 "EMP20250331001"，用于对外展示和业务操作

---

### 2️⃣ 核心个人信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **name** | `String` | ✓ | - | 员工姓名，中文全名 |
| **gender** | `String` | ✓ | - | 性别，通常为 "男" 或 "女" |
| **idCard** | `String` | ✗ | NULL | 身份证号码，18位，唯一约束 |
| **age** | `Int` | ✗ | NULL | 年龄，整数 |
| **birthDate** | `DateTime` | ✗ | NULL | 出生日期 |
| **photo** | `String` | ✗ | NULL | 证件照URL或Base64编码 |

**设计说明**:
- `gender`: **必填字段**，代码中会使用此字段进行数据筛选和展示
- `age`: **可选字段**，但前端界面可能会使用此字段，需要在人事信息页签配置中添加
- `idCard`: 唯一约束，防止重复录入
- `birthDate`: 可与age字段互算，建议优先使用birthDate，age作为缓存字段

**数据示例**:
```json
{
  "name": "张三",
  "gender": "男",
  "idCard": "110101199001011234",
  "age": 35,
  "birthDate": "1990-01-01T00:00:00.000Z",
  "photo": "https://example.com/photos/emp001.jpg"
}
```

---

### 3️⃣ 联系信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **phone** | `String` | ✗ | NULL | 手机号码，11位 |
| **email** | `String` | ✗ | NULL | 电子邮箱地址 |
| **currentAddress** | `String` | ✗ | NULL | 现居住地址 |
| **emergencyContact** | `String` | ✗ | NULL | 紧急联系人姓名 |
| **emergencyPhone** | `String` | ✗ | NULL | 紧急联系人电话 |
| **emergencyRelation** | `String` | ✗ | NULL | 与紧急联系人关系 |

**设计说明**:
- `phone`: 主要联系方式，建议必填
- `email`: 用于系统通知和密码重置
- 紧急联系人信息对于安全生产非常重要

**数据示例**:
```json
{
  "phone": "13800138000",
  "email": "zhangsan@company.com",
  "currentAddress": "北京市朝阳区XX路XX号",
  "emergencyContact": "李四",
  "emergencyPhone": "13900139000",
  "emergencyRelation": "配偶"
}
```

---

### 4️⃣ 工作信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **orgId** | `Int` | ✓ | - | 所属组织ID，外键关联Organization表 |
| **entryDate** | `DateTime` | ✓ | - | 入职日期 |
| **status** | `String` | ✓ | "ACTIVE" | 在职状态，见下方状态枚举 |

**status字段枚举值**:
- `ACTIVE`: 在职
- `PROBATION`: 试用期
- `RESIGNED`: 离职
- `SUSPENDED`: 停职
- `RETIRED`: 退休

**设计说明**:
- `orgId`: 关联组织架构表，用于权限管理和数据隔离
- `entryDate`: 计算工龄、社保等重要依据
- `status`: 控制员工是否可登录、是否计入统计等

**数据示例**:
```json
{
  "orgId": 5,
  "entryDate": "2023-03-15T00:00:00.000Z",
  "status": "ACTIVE"
}
```

---

### 5️⃣ 个人详细信息字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **maritalStatus** | `String` | ✗ | NULL | 婚姻状况：未婚/已婚/离异/丧偶 |
| **politicalStatus** | `String` | ✗ | NULL | 政治面貌：群众/党员/团员等 |
| **nativePlace** | `String` | ✗ | NULL | 籍贯，通常到省市 |
| **householdRegister** | `String` | ✗ | NULL | 户口所在地 |
| **homeAddress** | `String` | ✗ | NULL | 家庭住址（老家地址） |
| **homePhone** | `String` | ✗ | NULL | 家庭电话 |

**设计说明**:
- 这些字段通常用于人事档案管理
- 部分字段可能涉及隐私，需要权限控制

**数据示例**:
```json
{
  "maritalStatus": "已婚",
  "politicalStatus": "群众",
  "nativePlace": "山东省济南市",
  "householdRegister": "山东省济南市",
  "homeAddress": "山东省济南市XX区XX路",
  "homePhone": "0531-12345678"
}
```

---

### 6️⃣ 扩展字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **customFields** | `String` | ✓ | "{}" | 自定义字段，JSON格式存储 |

**设计说明**:
- 存储企业特定的扩展信息
- JSON格式，灵活可扩展
- 示例结构：
```json
{
  "skills": ["Java", "Python"],
  "certifications": ["PMP", "ACP"],
  "hobbies": "阅读、游泳",
  "foodPreference": "素食"
}
```

---

### 7️⃣ 系统字段

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| **createdAt** | `DateTime` | ✓ | now() | 记录创建时间 |
| **updatedAt** | `DateTime` | ✓ | now() | 记录最后更新时间，自动更新 |

**设计说明**:
- 用于审计和追踪
- `updatedAt` 使用 `@updatedAt` 自动维护

---

## 🔗 关系字段说明

Employee表通过以下字段与其他表建立关联：

| 关系字段 | 关联表 | 关系类型 | 说明 |
|---------|--------|---------|------|
| **orgId** | Organization | 多对一 | 员工所属组织 |
| **calcResults** | CalcResult | 一对多 | 员工的计算结果 |
| **changeLogs** | EmployeeChangeLog | 一对多 | 员工信息变更日志 |
| **educations** | EmployeeEducation | 一对多 | 员工的学历信息 |
| **familyMembers** | EmployeeFamilyMember | 一对多 | 员工的家庭成员 |
| **workExperiences** | EmployeeWorkExperience | 一对多 | 员工的工作经历 |
| **accounts** | LaborAccount | 一对多 | 员工的劳工账户 |
| **punchPairs** | PunchPair | 一对多 | 员工的打卡对配置 |
| **punchRecords** | PunchRecord | 一对多 | 员工的打卡记录 |
| **schedules** | Schedule | 一对多 | 员工的排班记录 |
| **workInfoHistory** | WorkInfoHistory | 一对多 | 员工的工作信息变更历史 |

---

## 📐 数据库表结构SQL

### SQLite版本 (开发环境)

```sql
CREATE TABLE "Employee" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employeeNo TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    idCard TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    orgId INTEGER NOT NULL,
    entryDate DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    customFields TEXT NOT NULL DEFAULT '{}',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    age INTEGER,
    birthDate DATETIME,
    currentAddress TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    emergencyRelation TEXT,
    homeAddress TEXT,
    homePhone TEXT,
    householdRegister TEXT,
    maritalStatus TEXT,
    nativePlace TEXT,
    photo TEXT,
    politicalStatus TEXT,
    FOREIGN KEY (orgId) REFERENCES "Organization"(id)
);

CREATE INDEX idx_employee_org_id ON "Employee"(orgId);
CREATE INDEX idx_employee_status ON "Employee"(status);
CREATE INDEX idx_employee_employee_no ON "Employee"(employeeNo);
```

### PostgreSQL版本 (生产环境)

```sql
CREATE TABLE "Employee" (
    id SERIAL PRIMARY KEY,
    "employeeNo" TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    gender TEXT NOT NULL,
    idCard TEXT UNIQUE,
    phone TEXT,
    email TEXT,
    orgId INTEGER NOT NULL,
    entryDate TIMESTAMP NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    customFields TEXT NOT NULL DEFAULT '{}',
    createdAt TIMESTAMP NOT NULL DEFAULT NOW(),
    updatedAt TIMESTAMP NOT NULL,
    age INTEGER,
    birthDate TIMESTAMP,
    currentAddress TEXT,
    emergencyContact TEXT,
    emergencyPhone TEXT,
    emergencyRelation TEXT,
    homeAddress TEXT,
    homePhone TEXT,
    householdRegister TEXT,
    maritalStatus TEXT,
    nativePlace TEXT,
    photo TEXT,
    politicalStatus TEXT,
    CONSTRAINT "Employee_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"(id) ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX idx_employee_org_id ON "Employee"(orgId);
CREATE INDEX idx_employee_status ON "Employee"(status);
CREATE INDEX idx_employee_employee_no ON "Employee"(employeeNo);
CREATE INDEX idx_employee_entry_date ON "Employee"(entryDate);
```

---

## 🔍 常用查询示例

### 1. 查询员工基本信息

```sql
SELECT
    e.id,
    e.employeeNo,
    e.name,
    e.gender,
    e.age,
    e.phone,
    e.email,
    e.status,
    o.name AS organizationName,
    e.entryDate
FROM Employee e
LEFT JOIN Organization o ON o.id = e.orgId
WHERE e.status = 'ACTIVE'
ORDER BY e.entryDate DESC;
```

### 2. 查询员工完整信息（包含子表）

```sql
SELECT
    e.*,
    (SELECT COUNT(*) FROM EmployeeEducation WHERE employeeId = e.id) AS educationCount,
    (SELECT COUNT(*) FROM EmployeeWorkExperience WHERE employeeId = e.id) AS workExpCount,
    (SELECT COUNT(*) FROM EmployeeFamilyMember WHERE employeeId = e.id) AS familyCount
FROM Employee e
WHERE e.id = ?;
```

### 3. 统计在职员工性别分布

```sql
SELECT
    gender,
    COUNT(*) AS count,
    ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM Employee WHERE status = 'ACTIVE'), 2) AS percentage
FROM Employee
WHERE status = 'ACTIVE'
GROUP BY gender;
```

---

## ⚠️ 重要注意事项

### 1. **gender和age字段**
- 这两个字段在Employee表中**确实存在**
- `gender` 是**必填字段**
- `age` 是**可选字段**
- 如果前端报错提示缺少这些字段，问题可能出在：
  - ❌ 人事信息页签配置（EmployeeInfoTabField）中缺少对应字段
  - ❌ 字段代码不匹配（大小写问题）
  - ❌ 前端查询参数错误

### 2. **字段命名规范**
- 数据库表名和字段名使用**驼峰命名**（camelCase）
- PostgreSQL中需要用双引号包裹：`"Employee"`, `"orgId"`
- SQLite可以直接使用：`Employee`, `orgId`

### 3. **必填字段**
以下字段为必填，创建员工时必须提供：
- `employeeNo` - 员工编号
- `name` - 姓名
- `gender` - 性别 ⚠️
- `orgId` - 所属组织
- `entryDate` - 入职日期

### 4. **唯一约束**
- `employeeNo`: 全局唯一，建议使用公司前缀+日期+序号
- `idCard`: 身份证号唯一，防止重复录入

### 5. **外键约束**
- `orgId` 关联 Organization 表
- 删除组织时，由于有 `ON DELETE RESTRICT`，需要先处理员工

---

## 🛠️ 排查字段缺失问题的步骤

如果生产环境提示缺少 `gender` 或 `age` 字段：

### 步骤1: 检查Employee表结构

```sql
-- SQLite
PRAGMA table_info(Employee);

-- PostgreSQL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Employee'
  AND column_name IN ('gender', 'age');
```

### 步骤2: 检查人事信息页签配置

```sql
SELECT
    f.fieldCode,
    f.fieldName,
    f.fieldType,
    f.isRequired
FROM "EmployeeInfoTabField" f
INNER JOIN "EmployeeInfoTab" t ON t.id = f."tabId"
WHERE t.code = 'basic_info'
  AND f.fieldCode IN ('gender', 'age');
```

### 步骤3: 如果配置缺失，运行修复脚本

```bash
# PostgreSQL生产环境
psql -U username -d database_name -f scripts/fix-employee-fields.sql
```

---

## 📚 相关文档

- [员工信息表结构分析.md](../员工信息表结构分析.md) - 完整表结构分析
- [人事信息页签配置.md](./人事信息页签配置.md) - 页签配置说明
- [字段修复脚本.sql](../scripts/fix-employee-fields.sql) - 自动修复脚本

---

**文档版本**: v1.0.0
**最后更新**: 2025-03-31
**维护者**: JY开发团队
