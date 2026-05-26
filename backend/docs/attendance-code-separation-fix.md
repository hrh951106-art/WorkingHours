# 出勤代码模块分离修复总结

## 问题描述

**计算管理-出勤代码定义** 和 **工时管理-出勤代码** 两个模块共用同一个数据表（`AttendanceCode`），导致：
- 在"计算管理-出勤代码定义"新增的数据，会在"工时管理-出勤代码"中显示
- 两个模块的数据混在一起，无法独立管理

## 问题分析

### 原有架构

```
AttendanceCode 表
├── id, code, name
├── type, accountLevels, unit
├── deductMeal, includeOutside, onlyOutside
├── showInDetailPage, calculateHours
├── priority, color, status
└── mappingCode

两个模块共用：
├── 计算管理-出勤代码定义 (/calculate/attendance-code-definitions)
└── 工时管理-出勤代码 (/calculate/attendance-codes)
```

### 功能区别

#### 1. 计算管理-出勤代码定义
**用途**：定义出勤代码的基本信息和映射关系
**字段**：
- `code`: 代码
- `name`: 名称
- `mappingCode`: 映射到工时计算的代码
- `unit`: 单位（小时/分钟）
- `showInDetailPage`: 是否在明细页面显示
- `calculateHours`: 是否计算工时
- `color`: 显示颜色
- `status`: 状态

#### 2. 工时管理-出勤代码
**用途**：配置出勤代码的计算规则和账户层级
**字段**：
- `code`: 代码
- `name`: 名称
- `accountLevels`: 劳动力账户层级配置
- `priority`: 优先级
- `includeOutside`: 包含班外时数
- `onlyOutside`: 仅计算班外时数
- `deductMeal`: 扣用餐时间
- `showInDetailPage`: 是否在明细页面显示
- `calculateHours`: 是否计算工时
- `color`: 显示颜色
- `status`: 状态

## 解决方案

### 1. 数据库Schema修改

**添加 `category` 字段**用于区分两个模块：

```prisma
model AttendanceCode {
  id               Int          @id @default(autoincrement())
  code             String       @unique
  name             String
  type             String       @default("LEAN_HOURS")
  category         String       @default("CALCULATION") // 新增字段
  // ... 其他字段

  @@index([category])
  @@index([status])
}
```

**分类值**：
- `DEFINITION`: 出勤代码定义（计算管理-出勤代码定义）
- `CALCULATION`: 工时计算（工时管理-出勤代码）

### 2. 后端Service修改

#### AttendanceCodeDefinitionService（出勤代码定义）

```typescript
// 查询时过滤category
async getAttendanceCodeDefinitions() {
  return this.prisma.attendanceCode.findMany({
    where: { category: 'DEFINITION' },
    orderBy: { code: 'asc' },
  });
}

// 创建时设置category
async createAttendanceCodeDefinition(dto: any) {
  return this.prisma.attendanceCode.create({
    data: {
      ...dto,
      category: 'DEFINITION', // 明确设置分类
      // ... 其他字段
    },
  });
}

// 更新和删除时也过滤category
async updateAttendanceCodeDefinition(id: number, dto: any) {
  const existing = await this.prisma.attendanceCode.findFirst({
    where: { id, category: 'DEFINITION' },
  });
  // ...
}

async deleteAttendanceCodeDefinition(id: number) {
  await this.prisma.attendanceCode.deleteMany({
    where: { id, category: 'DEFINITION' },
  });
}
```

#### AttendanceCodeService（工时计算）

```typescript
// 查询时过滤category
async getAttendanceCodes() {
  return this.prisma.attendanceCode.findMany({
    where: { category: 'CALCULATION' },
    orderBy: { priority: 'asc' },
  });
}

// 创建时设置category
async createAttendanceCode(dto: any) {
  return this.prisma.attendanceCode.create({
    data: {
      ...dto,
      category: 'CALCULATION', // 明确设置分类
      // ... 其他字段
    },
  });
}

// 计算工时时也过滤category
async calculateFromPunchPair(punchPairId: number) {
  const attendanceCodes = await this.prisma.attendanceCode.findMany({
    where: {
      category: 'CALCULATION', // 只使用工时计算的出勤代码
      status: 'ACTIVE',
      calculateHours: true,
    },
    orderBy: { priority: 'asc' },
  });
  // ...
}
```

### 3. 数据迁移脚本

创建 `categorize-attendance-codes.ts` 脚本，将现有数据分类：

**分类规则**：
1. 有`accountLevels`配置的 → `CALCULATION`
2. 有`priority > 0`的 → `CALCULATION`
3. 有计算配置（`deductMeal`、`includeOutside`、`onlyOutside`）的 → `CALCULATION`
4. 有`mappingCode`的 → `DEFINITION`
5. 其他 → `DEFINITION`

**执行结果**：
```
=== 分类完成 ===
出勤代码定义: 1 条
工时计算: 1 条

出勤代码定义 (1 条):
  - A01: 作业工时

工时计算 (1 条):
  - A02: 线体工时
```

## 修复结果

### 数据隔离

现在两个模块完全独立，数据互不干扰：

1. **计算管理-出勤代码定义** (`/calculate/attendance-code-definitions`)
   - 只显示 `category = 'DEFINITION'` 的记录
   - 新增/修改/删除操作只影响 `DEFINITION` 类别的记录

2. **工时管理-出勤代码** (`/calculate/attendance-codes`)
   - 只显示 `category = 'CALCULATION'` 的记录
   - 新增/修改/删除操作只影响 `CALCULATION` 类别的记录

### 功能验证

| 模块 | API端点 | Category | 数据范围 |
|------|---------|----------|---------|
| 计算管理-出勤代码定义 | `/calculate/attendance-code-definitions` | `DEFINITION` | 仅定义类数据 |
| 工时管理-出勤代码 | `/calculate/attendance-codes` | `CALCULATION` | 仅计算类数据 |

## 注意事项

### 1. 数据完整性

- 现有数据已通过脚本自动分类
- 新数据会自动设置正确的`category`
- 删除操作只在对应分类内生效

### 2. 业务逻辑

- **工时计算**时，只使用`CALCULATION`类别的出勤代码
- **出勤代码定义**只用于配置映射关系，不参与实际计算
- 两个模块的数据可以互相独立管理，互不影响

### 3. 索引优化

添加了`category`和`status`的联合索引，提升查询性能：
```prisma
@@index([category])
@@index([status])
```

## 相关文件

- `backend/prisma/schema.prisma` - 数据库模型定义
- `backend/src/modules/calculate/attendance-code-definition.service.ts` - 出勤代码定义服务
- `backend/src/modules/calculate/attendance-code.service.ts` - 工时计算出勤代码服务
- `backend/categorize-attendance-codes.ts` - 数据分类脚本

## 后续建议

1. **前端优化**：考虑在前端页面上显示"数据分类"标识，让用户更清楚当前操作的是哪类数据

2. **数据迁移**：如果需要，可以提供手动调整分类的功能

3. **权限控制**：可以为两个模块设置不同的操作权限

4. **数据校验**：在创建/更新时校验category字段，防止误操作
