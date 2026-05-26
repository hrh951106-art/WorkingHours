# 计算结果表与工时结果表说明

## 📋 表定义

### 1. CalcResult - 计算结果表

**用途**: 存储计算模块所有的工时结果数据

**数据来源**:
- 计算引擎执行考勤计算后生成的结果
- 包含打卡记录解析、班次匹配、工时计算等过程数据

**主要特点**:
- 存储原始计算结果，包含详细的工时分项（标准工时、实际工时、加班工时、请假工时、缺勤工时）
- 记录计算过程中的异常信息
- 用于追溯计算历史和调试计算问题
- 作为推送数据源

**关键字段**:
```prisma
model CalcResult {
  id                  Int
  employeeNo          String
  calcDate            DateTime
  shiftId             Int
  shiftName           String
  calculationAttendanceCodeId Int
  punchInTime         DateTime
  punchOutTime        DateTime
  standardHours       Float
  actualHours         Float
  overtimeHours       Float
  leaveHours          Float
  absenceHours        Float
  accountHours        String        // JSON: 账户工时分配
  amount              Float         // 金额
  exceptions          String        // JSON: 异常信息
  accountId           Int
  accountName         String
  status              String
}
```

---

### 2. WorkHourResult - 工时结果表

**用途**: 用于存储实际工时，包含计算模块推送的数据以及录入的数据

**数据来源**:
- **计算模块推送**: CalcResult 推送的工时数据
- **手动填报**: 用户手工录入的工时
- **报表导入**: 从报表系统导入的工时数据
- **其他来源**: 第三方系统集成的工时数据

**主要特点**:
- 统一的工时存储表，支持多种数据来源
- 记录数据来源类型（CALCULATED/REPORTED/MANUAL）
- 关联分摊出勤代码，用于成本分摊
- 支持状态流转（草稿→确认→锁定）
- 作为成本分摊、报表统计的数据源

**关键字段**:
```prisma
model WorkHourResult {
  id                      Int
  employeeNo              String
  employeeId              Int
  calcDate                DateTime
  shiftId                 Int
  shiftName               String
  definitionAttendanceCodeId Int
  definitionAttendanceCodeStr String
  calcAttendanceCode      String        // 原始计算出勤代码（追溯用）
  workHours               Float         // 统一工时字段
  amount                  Float         // 金额
  source                  Int           // 来源类型
  sourceType              String        // 来源类型: CALCULATED/REPORTED/MANUAL
  sourceId                Int           // 来源记录ID
  sourceBatchId           String        // 批次ID
  accountId               Int
  accountName             String
  status                  String        // DRAFT/CONFIRMED/LOCKED
  remark                  String
  attendanceCodeId        Int
}
```

---

## 🔄 数据流转

```
┌─────────────┐
│  打卡记录   │
└──────┬──────┘
       │
       ↓
┌─────────────────────┐
│  计算引擎执行       │
│  - 班次匹配         │
│  - 工时计算         │
│  - 金额计算         │
└──────┬──────────────┘
       │
       ↓
┌─────────────────────┐
│ CalcResult          │  ← 计算结果表（存储所有计算细节）
│ - 标准工时          │
│ - 实际工时          │
│ - 加班工时          │
│ - 金额              │
│ - 异常信息          │
└──────┬──────────────┘
       │
       │ WorkHourPushService
       │ (推送服务)
       ↓
┌─────────────────────┐
│ WorkHourResult      │  ← 工时结果表（统一存储）
│ - 工时              │
│ - 金额              │
│ - 来源: CALCULATED  │
│ - 状态: DRAFT       │
└──────┬──────────────┘
       │
       ├──────────────┐
       │              │
       ↓              ↓
  ┌─────────┐   ┌──────────┐
  │ 成本分摊 │   │ 报表统计 │
  └─────────┘   └──────────┘
```

---

## 📊 表对比

| 项目 | CalcResult（计算结果表） | WorkHourResult（工时结果表） |
|------|------------------------|--------------------------|
| **用途** | 存储计算模块所有的工时结果数据 | 存储实际工时，包含计算推送和录入的数据 |
| **数据来源** | 计算引擎生成 | 计算推送 + 手动填报 + 报表导入 |
| **工时字段** | 分项存储（标准/实际/加班/请假/缺勤） | 统一存储（workHours） |
| **金额字段** | ✅ 有 | ✅ 有 |
| **账户工时** | accountHours (JSON数组) | 每条记录对应一个账户 |
| **异常信息** | ✅ 详细记录 | ❌ 无 |
| **出勤代码** | calculationAttendanceCode | calcAttendanceCode + definitionAttendanceCodeId |
| **数据状态** | PENDING/COMPLETED | DRAFT/CONFIRMED/LOCKED |
| **数据追溯** | 完整的计算过程记录 | 记录来源类型和来源ID |
| **主要用途** | 计算历史追溯、问题排查 | 成本分摊、报表统计、工资核算 |
| **删除策略** | 定期清理（保留一定期限） | 长期保存（作为财务凭证） |

---

## 💡 使用场景

### CalcResult 适用场景

1. **计算问题排查**
   - 查看计算过程中的异常信息
   - 分析打卡配对和班次匹配情况
   - 追溯工时计算依据

2. **计算历史审计**
   - 查看某天某个员工的所有计算结果
   - 对比不同时期的计算差异

3. **数据推送源**
   - 作为 WorkHourResult 的数据源
   - 推送到成本分摊模块

### WorkHourResult 适用场景

1. **成本分摊**
   - 按账户和出勤代码分摊人工成本
   - 计算产品成本

2. **报表统计**
   - 工时报表
   - 成本报表
   - 工资核算

3. **工时管理**
   - 确认工时数据
   - 锁定工时数据
   - 导入其他系统数据

---

## 🗂️ 数据管理建议

### CalcResult（计算结果表）

**保留策略**:
- 保留最近 3-6 个月的计算结果
- 超过期限的数据可归档或删除

**清理方式**:
```sql
-- 删除指定日期之前的计算结果
DELETE FROM CalcResult
WHERE calcDate < '指定日期';
```

### WorkHourResult（工时结果表）

**保留策略**:
- 长期保存，作为财务和成本核算的凭证
- 已锁定数据不应删除

**状态管理**:
- DRAFT（草稿）: 可编辑、可删除
- CONFIRMED（已确认）: 不可编辑，可取消确认
- LOCKED（已锁定）: 不可编辑、不可删除

---

## 📝 相关文档

- [工时表对比](./workhour-tables-comparison.md) - 详细的表结构对比
- [金额计算实现](./amount-calculation-implementation-summary.md) - 金额计算功能
- [工时推送机制](./work-hour-push-implementation-summary.md) - CalcResult 推送到 WorkHourResult
