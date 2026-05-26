# 计算结果数据流转配置完成报告

## ✅ 完成时间
2026-04-23

---

## 📊 完整的代码映射关系

### CalculationAttendanceCode (计算模块)

| ID | Code | Name | calculateHours | Priority | Color |
|----|------|------|----------------|----------|-------|
| 1 | A02 | 作业工时 | ✅ | 0 | #1890ff |
| 2 | A03 | 分摊工时 | ❌ | 0 | #1890ff |
| 3 | A04 | 车间工时 | ✅ | 0 | #1890ff |
| 4 | A01 | 正常工时 | ✅ | 1 | #52c41a |
| 5 | A05 | 请假工时 | ❌ | 5 | #722ed1 |
| 6 | A06 | 节假日工时 | ✅ | 6 | #eb2f96 |

### DefinitionAttendanceCode (分摊模块)

| ID | Code | Name | calcAttendanceCode | 计算代码名称 |
|----|------|------|-------------------|-------------|
| 2 | NORMAL_WORK | 正常工时 | A01 | 正常工时 |
| 3 | PRODUCTION_WORK | 生产工时 | A02 | 作业工时 |
| 4 | ALLOCATION_WORK | 分摊工时 | A03 | 分摊工时 |
| 5 | OVERTIME_WORK | 加班工时 | A04 | 车间工时 |
| 6 | LEAVE_WORK | 请假工时 | A05 | 请假工时 |
| 7 | HOLIDAY_WORK | 节假日工时 | A06 | 节假日工时 |

### 完整映射表

| 计算代码 | 计算名称 | → | 定义代码 | 定义名称 |
|----------|----------|---|----------|----------|
| A01 | 正常工时 | → | NORMAL_WORK | 正常工时 |
| A02 | 作业工时 | → | PRODUCTION_WORK | 生产工时 |
| A03 | 分摊工时 | → | ALLOCATION_WORK | 分摊工时 |
| A04 | 车间工时 | → | OVERTIME_WORK | 加班工时 |
| A05 | 请假工时 | → | LEAVE_WORK | 请假工时 |
| A06 | 节假日工时 | → | HOLIDAY_WORK | 节假日工时 |

✅ **所有映射关系已完整配置！**

---

## 🔄 数据流转流程

### 1️⃣ 计算管理模块

```
打卡数据 → calculateEngine.calculateDaily()
           ↓
      确定计算出勤代码 (CalculationAttendanceCode)
           ↓
      创建 CalcResult 记录
      - calculationAttendanceCodeId = CalculationAttendanceCode.id
      - actualHours = 9.0
      - status = 'PENDING'
```

**示例**:
```json
{
  "employeeNo": "202604003",
  "calcDate": "2026-04-15",
  "calculationAttendanceCodeId": 1,  // A02 - 作业工时
  "actualHours": 9.0,
  "overtimeHours": 0.0,
  "status": "PENDING"
}
```

### 2️⃣ 实时同步到工时模块

```
CalcResult (A02, id=1, actualHours=9.0)
    ↓
WorkHourPushService.pushWorkHourResults([1])
    ↓
查询映射: DefinitionAttendanceCode WHERE calcAttendanceCode = 'A02'
    ↓
找到: PRODUCTION_WORK (id=3, code='PRODUCTION_WORK')
    ↓
创建 WorkHourResult 记录
    ↓
{
  "employeeNo": "202604003",
  "calcDate": "2026-04-15",
  "definitionAttendanceCodeId": 3,      // PRODUCTION_WORK 的 ID
  "definitionAttendanceCodeStr": "PRODUCTION_WORK",
  "calcAttendanceCode": "A02",           // 原始计算代码
  "workHours": 9.0,
  "sourceType": "CALCULATED",
  "status": "CONFIRMED"
}
```

---

## 🎯 数据流转验证

### 测试场景：员工 202604003，2026-04-15，生产班次

#### 输入：
- 员工工号：202604003
- 计算日期：2026-04-15
- 班次类型：生产班次
- 实际工时：9.0 小时

#### 流程：

**步骤1**: 确定计算出勤代码
```
班次：生产班次
    ↓
CalculationAttendanceCode: A02 (作业工时)
calculationAttendanceCodeId = 1
```

**步骤2**: 创建 CalcResult
```sql
INSERT INTO CalcResult (
  employeeNo, calcDate, calculationAttendanceCodeId,
  actualHours, status
) VALUES (
  '202604003', '2026-04-15', 1,  -- A02.id
  9.0, 'PENDING'
);
```

**步骤3**: 同步到 WorkHourResult
```typescript
// 1. 获取计算代码
const calcCode = { id: 1, code: 'A02' };

// 2. 查询映射
const defCode = await prisma.definitionAttendanceCode.findFirst({
  where: { calcAttendanceCode: 'A02' }
});
// 结果: { id: 3, code: 'PRODUCTION_WORK', calcAttendanceCode: 'A02' }

// 3. 创建 WorkHourResult
await prisma.workHourResult.create({
  data: {
    employeeNo: '202604003',
    calcDate: '2026-04-15',
    definitionAttendanceCodeId: 3,        // PRODUCTION_WORK.id
    definitionAttendanceCodeStr: 'PRODUCTION_WORK',
    calcAttendanceCode: 'A02',
    workHours: 9.0,
    sourceType: 'CALCULATED',
    status: 'CONFIRMED'
  }
});
```

#### 预期结果：

**CalcResult 表**:
| ID | employeeNo | calcDate | calculationAttendanceCodeId | actualHours | status |
|----|------------|----------|----------------------------|-------------|--------|
| 1 | 202604003 | 2026-04-15 | 1 (A02) | 9.0 | PENDING |

**WorkHourResult 表**:
| ID | employeeNo | calcDate | definitionAttendanceCodeId | calcAttendanceCode | workHours | status |
|----|------------|----------|---------------------------|-------------------|-----------|--------|
| 1 | 202604003 | 2026-04-15 | 3 (PRODUCTION_WORK) | A02 | 9.0 | CONFIRMED |

---

## 📋 API 端点

### CalcResult API (计算管理模块)
- `GET /api/calculate/work-hour-results` - 查询计算结果
- `POST /api/calculate/work-hour-results` - 创建计算结果
- `PUT /api/calculate/work-hour-results/:id` - 更新计算结果
- `POST /api/calculate/work-hours/push` - 推送到工时模块

### WorkHourResult API (工时模块)
- `GET /api/allocation/work-hours` - 查询工时结果
- `POST /api/allocation/work-hours/receive` - 接收工时数据

---

## ✅ 配置完成清单

### 数据准备
- [x] ✅ 添加 CalculationAttendanceCode A01 (正常工时)
- [x] ✅ 添加 CalculationAttendanceCode A05 (请假工时)
- [x] ✅ 添加 CalculationAttendanceCode A06 (节假日工时)
- [x] ✅ 验证所有代码映射关系完整

### 后端实现
- [x] ✅ CalculationAttendanceCodeService 已实现
- [x] ✅ DefinitionAttendanceCodeService 已实现
- [x] ✅ WorkHourPushService 已实现（代码映射逻辑）
- [ ] ⏳ calculateEngine 需要添加确定计算出勤代码的逻辑
- [ ] ⏳ calculate.service.ts 需要集成自动推送功能

### 前端实现
- [x] ✅ AttendanceCodePage 已更新（使用 CalculationAttendanceCode API）
- [ ] ⏳ WorkHourResultPage 需要确认显示正确的表（CalcResult）

---

## 📝 代码映射逻辑（已实现）

WorkHourPushService 已实现完整的代码映射：

```typescript
// 1. 获取所有定义出勤代码
const definitionCodes = await this.prisma.definitionAttendanceCode.findMany({
  where: {
    calcAttendanceCode: { not: null },
    status: 'ACTIVE',
  },
});

// 2. 构建映射表
const codeMapping = new Map<string, { id: number; code: string }>();
definitionCodes.forEach((code) => {
  if (code.calcAttendanceCode) {
    codeMapping.set(code.calcAttendanceCode, {
      id: code.id,
      code: code.code,
    });
  }
});

// 3. 使用映射
const calcAttendanceCode = calcResult.calculationAttendanceCode; // { id: 1, code: 'A02' }
const mappedCodeInfo = codeMapping.get(calcAttendanceCode.code); // { id: 3, code: 'PRODUCTION_WORK' }

// 4. 创建 WorkHourResult
await this.prisma.workHourResult.create({
  data: {
    definitionAttendanceCodeId: mappedCodeInfo.id,       // 3
    definitionAttendanceCodeStr: mappedCodeInfo.code,    // 'PRODUCTION_WORK'
    calcAttendanceCode: calcAttendanceCode.code,         // 'A02'
    workHours: calcResult.actualHours,
  },
});
```

---

## 🎯 下一步工作

### 1. 修改 calculateEngine（必需）
**文件**: `src/modules/calculate/calculate.engine.ts`

添加确定计算出勤代码的方法：
```typescript
private async determineCalculationAttendanceCode(
  employeeNo: string,
  schedule: any,
  shift: any
): Promise<CalculationAttendanceCode | null> {
  // 根据班次、排班或其他条件确定计算出勤代码
  // 返回 CalculationAttendanceCode 对象
}
```

### 2. 修改 calculate.service.ts（必需）
**文件**: `src/modules/calculate/calculate.service.ts`

集成自动推送功能：
```typescript
async calculate(dto: any) {
  // 计算工时
  const result = await this.prisma.calcResult.create({ ... });

  // 自动同步到工时模块
  await this.workHourPushService.pushWorkHourResults([result.id]);

  return result;
}
```

### 3. 确认前端页面（必需）
**文件**: `src/pages/calculate/WorkHourResultPage.tsx`

确认页面从 CalcResult 表获取数据，而不是 WorkHourResult。

---

## 📚 相关文档

- `/backend/docs/calculation-workhour-data-flow-analysis.md` - 详细分析文档
- `/backend/docs/attendance-code-tables-redesign.md` - 表重构设计
- `/backend/docs/attendance-code-tables-migration-complete.md` - 迁移完成文档

---

## ✅ 总结

1. **代码映射关系** - ✅ 已完整配置
2. **WorkHourPushService** - ✅ 已实现映射逻辑
3. **CalculationAttendanceCode** - ✅ 6个代码已齐全
4. **DefinitionAttendanceCode** - ✅ 6个映射已配置

**剩余工作**：
- 修改 calculateEngine 添加确定计算出勤代码的逻辑
- 集成自动推送功能到 calculate.service.ts
- 确认前端页面显示正确的数据源

---

**更新完成时间**: 2026-04-23
**状态**: ✅ 代码映射配置完成，待集成到计算流程
