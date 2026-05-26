# 出勤代码表重构方案

## 🎯 设计目标

将原来混在一起的 `AttendanceCode` 表拆分为两张独立的表：

1. **CalculationAttendanceCode**（计算出勤代码表）
   - 服务对象：计算管理模块
   - 用途：工时计算时使用

2. **DefinitionAttendanceCode**（定义出勤代码表）
   - 服务对象：工时/分摊模块
   - 用途：分摊计算、报表展示
   - 通过 `calcAttendanceCode` 字段映射到计算代码

---

## 📊 新表结构设计

### 1. CalculationAttendanceCode 表

```prisma
model CalculationAttendanceCode {
  id               Int      @id @default(autoincrement())
  code             String   @unique
  name             String
  type             String   @default("LEAN_HOURS")
  unit             String   @default("HOURS")
  deductMeal       Boolean  @default(false)
  includeOutside   Boolean  @default(false)
  onlyOutside      Boolean  @default(false)
  calculateHours   Boolean  @default(true)
  priority         Int      @default(0)
  color            String   @default("#1890ff")
  status           String   @default("ACTIVE")
  description      String?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  calcResults      CalcResult[]

  @@index([status])
  @@index([code])
}
```

### 2. DefinitionAttendanceCode 表

```prisma
model DefinitionAttendanceCode {
  id                  Int      @id @default(autoincrement())
  code                String   @unique
  name                String
  type                String   @default("LEAN_HOURS")
  unit                String   @default("HOURS")
  calculateHours      Boolean  @default(true)
  showInDetailPage    Boolean  @default(false)
  priority            Int      @default(0)
  color               String   @default("#1890ff")
  status              String   @default("ACTIVE")
  calcAttendanceCode  String?  // ✨ 映射到 CalculationAttendanceCode.code
  description         String?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  workHourResults     WorkHourResult[]
  allocationWorkHours AllocationWorkHour[]

  @@index([status])
  @@index([code])
  @@index([calcAttendanceCode])
}
```

---

## 🔄 数据关系

### CalcResult 表调整

```prisma
model CalcResult {
  // ...
  calculationAttendanceCodeId  Int?  // ✅ 改为关联 CalculationAttendanceCode
  calculationAttendanceCode     CalculationAttendanceCode? @relation(fields: [calculationAttendanceCodeId], references: [id])
}
```

### WorkHourResult 表调整

```prisma
model WorkHourResult {
  // ...
  definitionAttendanceCodeId  Int?  // ✅ 改为关联 DefinitionAttendanceCode
  definitionAttendanceCode     DefinitionAttendanceCode? @relation(fields: [definitionAttendanceCodeId], references: [id])
}
```

---

## 📋 迁移计划

### 阶段1：创建新表结构
1. 添加 CalculationAttendanceCode 表
2. 添加 DefinitionAttendanceCode 表
3. 修改 CalcResult 和 WorkHourResult 的外键

### 阶段2：数据迁移
1. 将 category='CALCULATION' 的数据迁移到 CalculationAttendanceCode
2. 将 category='DEFINITION' 的数据迁移到 DefinitionAttendanceCode
3. 更新外键关系

### 阶段3：代码调整
1. 创建新的 Service（CalculationAttendanceCodeService）
2. 创建新的 Service（DefinitionAttendanceCodeService）
3. 更新 WorkHourPushService 使用新表
4. 更新 WorkHourReceiverService 使用新表

### 阶段4：API调整
1. 新增 API：`/api/calculate/calculation-attendance-codes`
2. 新增 API：`/api/allocation/definition-attendance-codes`
3. 保留旧 API 兼容或废弃

---

## 🎯 最终效果

### 优点

1. **职责清晰**
   - CalculationAttendanceCode：只服务于计算模块
   - DefinitionAttendanceCode：只服务于分摊模块

2. **查询高效**
   - 不需要过滤 category
   - 索引更精准

3. **维护简单**
   - 各模块独立操作
   - 字段可以各自扩展

4. **业务清晰**
   - API 路径更清晰
   - 代码更易理解

### API 示例

```typescript
// 计算模块 API
GET  /api/calculate/calculation-attendance-codes
POST /api/calculate/calculation-attendance-codes
PUT  /api/calculate/calculation-attendance-codes/:id
DELETE /api/calculate/calculation-attendance-codes/:id

// 分摊/工时模块 API
GET  /api/allocation/definition-attendance-codes
POST /api/allocation/definition-attendance-codes
PUT  /api/allocation/definition-attendance-codes/:id
DELETE /api/allocation/definition-attendance-codes/:id
```
