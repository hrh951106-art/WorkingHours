# 工时结果表数据对比报告

生成时间：2026-04-23

---

## 📊 数据概览

| 表名 | 记录数 | 说明 |
|------|--------|------|
| **CalcResult**（计算管理模块） | 2 条 | 计算结果表 - 存储计算模块所有的工时结果数据 |
| **WorkHourResult**（工时��块） | 0 条 | 工时结果表 - 用于存储实际工时，包含计算模块推送的数据以及录入的数据 |

---

## 1️⃣ 计算管理模块 - CalcResult 表

### 表结构

```
┌─────────────────┬──────────────┬──────────┬───────────────┐
│ 字段名          │ 类型         │ 必填     │ 说明          │
├─────────────────┼──────────────┼──────────┼───────────────┤
│ id              │ INTEGER      │ ✅       │ 主键          │
│ employeeNo      │ TEXT         │ ✅       │ 员工工号      │
│ calcDate        │ DATETIME     │ ✅       │ 计算日期      │
│ shiftId         │ INTEGER      │ ✅       │ 班次ID        │
│ shiftName       │ TEXT         │ ❌       │ 班次名称      │
│ attendanceCodeId│ INTEGER      │ ❌       │ 出勤代码ID    │
│ punchInTime     │ DATETIME     │ ❌       │ 签入时间      │
│ punchOutTime    │ DATETIME     │ ❌       │ 签出时间      │
│ standardHours   │ REAL         │ ✅       │ 标准工时      │
│ actualHours     │ REAL         │ ✅       │ 实际工时      │
│ overtimeHours   │ REAL         │ ✅       │ 加班工时      │
│ leaveHours      │ REAL         │ ✅       │ 请假工时      │
│ absenceHours    │ REAL         │ ✅       │ 缺勤工时      │
│ accountHours    │ TEXT         │ ✅       │ 账户工时(JSON)│
│ exceptions      │ TEXT         │ ✅       │ 异常信息(JSON)│
│ status          │ TEXT         │ ✅       │ 状态          │
│ accountId       │ INTEGER      │ ❌       │ 账户ID        │
│ accountName     │ TEXT         │ ❌       │ 账户名称      │
│ createdAt       │ DATETIME     │ ✅       │ 创建时间      │
│ updatedAt       │ DATETIME     │ ✅       │ 更新时间      │
└─────────────────┴──────────────┴──────────┴───────────────┘
```

### 当前数据

```
┌────┬─────────────┬────────────┬─────────┬──────────┬────────┬────────┬────────┬─────────┐
│ id │ employeeNo  │ calcDate   │ 实际工时│ 加班     │ 请假    │ 缺勤    │ 状态     │
├────┼─────────────┼────────────┼─────────┼──────────┼────────┼────────┼─────────┤
│ 1  │ 202604003   │ 2026-04-15 │ 9.0     │ 0.0      │ 0.0    │ 0.0    │ PENDING  │
│ 2  │ 202604002   │ 2026-04-15 │ 6.0     │ 0.0      │ 0.0    │ 0.0    │ PENDING  │
└────┴─────────────┴────────────┴─────────┴──────────┴────────┴────────┴─────────┘
```

**说明**：
- 共有 2 条工时计算结果
- 计算日期：2026-04-15
- 状态：PENDING（待处理）
- 出勤代码ID：1

---

## 2️⃣ 工时模块 - WorkHourResult 表

### 表结构

```
┌──────────────────┬───────────┬──────────┬────────────────────────────────┐
│ 字段名           │ 类型      │ 必填     │ 说明                            │
├──────────────────┼───────────┼──────────┼────────────────────────────────┤
│ id               │ INTEGER   │ ✅       │ 主键                            │
│ employeeNo       │ TEXT      │ ✅       │ 员工工号                        │
│ employeeId       │ INTEGER   │ ❌       │ 员工ID                         │
│ calcDate         │ DATETIME  │ ✅       │ 计算日期                        │
│ shiftId          │ INTEGER   │ ❌       │ 班次ID                         │
│ shiftName        │ TEXT      │ ❌       │ 班次名称（冗余）                │
│ attendanceCodeId │ INTEGER   │ ❌       │ ✨ 分摊出勤代码ID（外键）        │
│ attendanceCode   │ TEXT      │ ❌       │ ✨ 分摊出勤代码（冗余）          │
│ calcAttendanceCode│ TEXT     │ ✅       │ ✨ 计算出勤代码（原始）          │
│ workHours        │ REAL      │ ✅       │ 工时数                          │
│ sourceType       │ TEXT      │ ✅       │ 来源：CALCULATED/REPORTED/MANUAL│
│ sourceId         │ INTEGER   │ ❌       │ 来源记录ID                      │
│ accountId        │ INTEGER   │ ❌       │ 劳动力账户ID                    │
│ accountName      │ TEXT      │ ❌       │ 劳动力账户名称（冗余）          │
│ status           │ TEXT      │ ✅       │ 状态：DRAFT/CONFIRMED/LOCKED    │
│ remark           │ TEXT      │ ❌       │ 备注                            │
│ createdAt        │ DATETIME  │ ✅       │ 创建时间                        │
│ updatedAt        │ DATETIME  │ ✅       │ 更新时间                        │
└──────────────────┴───────────┴──────────┴────────────────────────────────┘
```

**✨ 核心字段说明**：

1. **attendanceCodeId** (INTEGER)
   - 外键，指向 `AttendanceCode.id`
   - 用于分摊模块的出勤代码
   - 高性能查询

2. **attendanceCode** (TEXT)
   - 冗余字段，存储出勤代码字符串
   - 便于快速查询和显示

3. **calcAttendanceCode** (TEXT)
   - 原始的计算模块出勤代码
   - 用于追溯数据来源

### 当前数据

📭 **表为空（0条记录）**

---

## 🔍 数据对比分析

### 关键差异

| 项目 | CalcResult（计算模块） | WorkHourResult（工时模块） |
|------|------------------------|--------------------------|
| **主键** | id (自增) | id (自增) |
| **出勤代码** | attendanceCodeId | attendanceCodeId + attendanceCode + calcAttendanceCode |
| **工时字段** | actualHours, overtimeHours, leaveHours, absenceHours | workHours（统一工时） |
| **数据来源** | 计算得出 | 推送/填报/手动 |
| **状态** | PENDING | DRAFT/CONFIRMED/LOCKED |
| **外键关联** | 无 | ✅ 关联 AttendanceCode |
| **数据量** | 2 条 | 0 条（待推送） |

### 数据流向

```
CalcResult（计算结果）
    ↓ WorkHourPushService 推送
    ↓ 出勤代码映射（calcAttendanceCode → attendanceCodeId）
WorkHourResult（工时结果）
    ↓ 分摊计算
AllocationWorkHour（分摊工时）
```

---

## 💡 为什么 WorkHourResult 表为空？

### 原因分析

1. **推送功能未触发**
   - 计算管理模块计算出工时后，需要手动或自动触发推送
   - 推送服务 `WorkHourPushService` 已创建，但未集成到计算流程中

2. **映射关系未配置**
   - DEFINITION 类型的出勤代码需要配置 `calcAttendanceCode`
   - 虽然已创建示例数据，但 CalcResult 使用的 attendanceCodeId=1 可能没有对应映射

3. **数据流程未打通**
   - CalcResult.status = 'PENDING'（待处理）
   - 需要在状态变更时触发推送

---

## 🚀 如何填充 WorkHourResult 表

### 方法1：手动推送（推荐测试）

```bash
# 1. 登录获取token
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

# 2. 触发推送
curl -X POST http://localhost:3001/api/calculate/work-hours/push \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calcResultIds": [1, 2]
  }'
```

### 方法2：通过API批量推送

```bash
# 按日期范围推送
curl -X POST http://localhost:3001/api/calculate/work-hours/push-by-date \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-01",
    "endDate": "2026-04-30",
    "employeeNos": ["202604003", "202604002"]
  }'
```

### 方法3：集成到计算流程

修改 `calculate.service.ts`，在计算完成后自动推送：

```typescript
async calculateWorkHours(params: any) {
  // ... 执行计算 ...

  const results = await this.prisma.calcResult.createMany({...});

  // ✅ 计算完成后自动推送
  await this.workHourPushService.pushWorkHourResults(calcResultIds);

  return results;
}
```

---

## 📋 验证推送结果

推送成功后，查询 WorkHourResult 表：

```sql
SELECT
  id,
  employeeNo,
  date(calcDate / 1000, 'unixepoch') AS calcDate,
  attendanceCode,
  calcAttendanceCode,
  workHours,
  sourceType,
  status
FROM WorkHourResult;
```

预期输出：

```
┌────┬─────────────┬────────────┬─────────┬────────────┬───────────┬───────────┬────────┐
│ id │ employeeNo  │ calcDate   │ 出勤代码│ 计算代码    │ 工时      │ 来源      │ 状态    │
├────┼─────────────┼────────────┼─────────┼────────────┼───────────┼───────────┼────────┤
│ 1  │ 202604003   │ 2026-04-15 │ NORMAL_ │ A01        │ 9.0       │ CALCULATED│ DRAFT  │
│    │             │            │ WORK    │            │           │           │        │
│ 2  │ 202604002   │ 2026-04-15 │ NORMAL_ │ A01        │ 6.0       │ CALCULATED│ DRAFT  │
│    │             │            │ WORK    │            │           │           │        │
└────┴─────────────┴────────────┴─────────┴────────────┴───────────┴───────────┴────────┘
```

---

## 🎯 下一步操作

1. ✅ **配置出勤代码映射**
   - 确认 CalcResult 使用的 attendanceCodeId=1 对应哪个出勤代码
   - 在 DEFINITION 类型代码中设置 `calcAttendanceCode`

2. 🔧 **集成推送功能**
   - 在计算完成后自动调用推送服务
   - 或提供手动推送按钮

3. 📊 **验证数据流转**
   - 推送后检查 WorkHourResult 表
   - 确认数据正确映射

4. 🔄 **更新前端页面**
   - 工时明细页面从 WorkHourResult 表读取数据
   - 显示映射后的出勤代码

---

## 📚 相关文档

- `backend/docs/work-hour-refactoring-summary.md` - 重构总结
- `backend/docs/attendance-code-mapping-guide.md` - 映射机制详解
- `backend/docs/attendance-code-mapping-implementation.md` - 实施指南
