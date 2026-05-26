# 计算结果数据流转分析与实施方案

## 📊 当前状态分析

### 1. 表结构关系

```
CalcResult (计算管理)
├── calculationAttendanceCodeId → CalculationAttendanceCode.id
└── attendanceCodeId → AttendanceCode.id (废弃)

WorkHourResult (工时模块)
├── definitionAttendanceCodeId → DefinitionAttendanceCode.id
├── definitionAttendanceCodeStr (冗余)
└── calcAttendanceCode (原始计算代码)
```

### 2. 代码映射关系

**CalculationAttendanceCode** (计算模块):
| ID | Code | Name |
|----|------|------|
| 1 | A02 | 作业工时 |
| 2 | A03 | 分摊工时 |
| 3 | A04 | 车间工时 |

**DefinitionAttendanceCode** (分摊模块):
| ID | Code | Name | calcAttendanceCode |
|----|------|------|-------------------|
| 2 | NORMAL_WORK | 正常工时 | A01 |
| 3 | PRODUCTION_WORK | 生产工时 | A02 |
| 4 | ALLOCATION_WORK | 分摊工时 | A03 |
| 5 | OVERTIME_WORK | 加班工时 | A04 |
| 6 | LEAVE_WORK | 请假工时 | A05 |
| 7 | HOLIDAY_WORK | 节假日工时 | A06 |

### 3. 当前问题

❌ **问题1**: CalcResult.calculationAttendanceCodeId 为 NULL
```sql
SELECT id, employeeNo, calcDate, calculationAttendanceCodeId, actualHours
FROM CalcResult;
-- 结果: calculationAttendanceCodeId = NULL
```

❌ **问题2**: WorkHourResult 表为空
```sql
SELECT COUNT(*) FROM WorkHourResult;
-- 结果: 0
```

❌ **问题3**: calculateEngine.calculateDaily 返回数据中缺少 calculationAttendanceCodeId

---

## 🎯 需要实现的数据流转

```
┌──────────────────────────────────────────────────────────────────┐
│ 1. 计算管理模块                                                  │
├──────────────────────────────────────────────────────────────────┤
│ 打卡数据 → calculateEngine.calculateDaily()                      │
│           ↓                                                      │
│   确定计算出勤代码（CalculationAttendanceCode）                  │
│           ↓                                                      │
│   创建 CalcResult 记录                                           │
│   - calculationAttendanceCodeId = CalculationAttendanceCode.id   │
│   - actualHours, overtimeHours, etc.                            │
└──────────────────────────────────────────────────────────────────┘
                           ↓
┌──────────────────────────────────────────────────────────────────┐
│ 2. 实时同步到工时模块                                            │
├──────────────────────────────────────────────────────────────────┤
│ WorkHourPushService.pushWorkHourResults(calcResultIds)           │
│           ↓                                                      │
│   代码映射查询:                                                  │
│   SELECT * FROM DefinitionAttendanceCode                        │
│   WHERE calcAttendanceCode = ?                                  │
│           ↓                                                      │
│   创建 WorkHourResult 记录                                       │
│   - definitionAttendanceCodeId = DefinitionAttendanceCode.id    │
│   - definitionAttendanceCodeStr = DefinitionAttendanceCode.code │
│   - calcAttendanceCode = CalculationAttendanceCode.code (原始)  │
│   - workHours = CalcResult.actualHours                          │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔧 实施方案

### 方案1: 修改计算引擎，自动确定计算出勤代码

#### 1.1 确定计算出勤代码的逻辑

**方法A: 基于排班类型/班次类型**
```typescript
// 如果班次是生产班次，使用 A02 (作业工时)
// 如果班次是分摊班次，使用 A03 (分摊工时)
// 如果班次是车间班次，使用 A04 (车间工时)
```

**方法B: 基于劳动力账户层级**
```typescript
// 查询员工的账户层级
// 如果是特定层级，使用对应的计算出勤代码
```

**方法C: 基于打卡规则配置**
```typescript
// 在打卡规则中配置默认的计算出勤代码
```

#### 1.2 修改 calculateEngine.calculateDaily

```typescript
async calculateDaily(employeeNo: string, calcDate: Date) {
  // ... 现有计算逻辑 ...

  // ✅ 新增：确定计算出勤代码
  const calculationAttendanceCode = await this.determineCalculationAttendanceCode(
    employeeNo,
    schedule,
    shift
  );

  return {
    employeeNo,
    calcDate,
    shiftId: shift.id,
    shiftName: shift.name,
    // ✅ 新增
    calculationAttendanceCodeId: calculationAttendanceCode?.id,
    // ... 其他字段 ...
  };
}

// ✅ 新增方法：确定计算出勤代码
private async determineCalculationAttendanceCode(
  employeeNo: string,
  schedule: any,
  shift: any
) {
  // 方法1: 基于班次名称/类型
  if (shift.name?.includes('生产')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A02' }
    });
  }

  if (shift.name?.includes('分摊')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A03' }
    });
  }

  // 默认返回正常工时代码
  return this.prisma.calculationAttendanceCode.findFirst({
    where: {
      code: 'A02',
      status: 'ACTIVE'
    }
  });
}
```

### 方案2: 计算完成后自动同步到工时模块

#### 2.1 在 calculate.service.ts 中集成推送服务

```typescript
import { WorkHourPushService } from './work-hour-push.service';

@Injectable()
export class CalculateService {
  constructor(
    // ... 现有注入 ...
    private workHourPushService: WorkHourPushService,  // ✅ 新增
  ) {}

  async calculate(dto: any) {
    // ... 现有计算逻辑 ...

    // 创建或更新 CalcResult
    const result = await this.prisma.calcResult.upsert({
      where: { id },
      create: { ...calcResult },
      update: { ...calcResult },
    });

    // ✅ 新增：实时同步到工时模块
    try {
      await this.workHourPushService.pushWorkHourResults([result.id]);
    } catch (error) {
      console.error('同步到工时模块失败:', error);
      // 不影响主流程，记录错误即可
    }

    return result;
  }
}
```

#### 2.2 WorkHourPushService 已实现

现有的 `work-hour-push.service.ts` 已经实现了代码映射逻辑：

```typescript
// 获取定义出勤代码映射关系
const definitionCodes = await this.prisma.definitionAttendanceCode.findMany({
  where: {
    calcAttendanceCode: { not: null },
    status: 'ACTIVE',
  },
});

// 创建映射关系
const codeMapping = new Map<string, { id: number; code: string }>();
definitionCodes.forEach((code) => {
  if (code.calcAttendanceCode) {
    codeMapping.set(code.calcAttendanceCode, {
      id: code.id,
      code: code.code,
    });
  }
});

// 使用映射
const mappedCodeInfo = codeMapping.get(calcAttendanceCode.code);
await this.prisma.workHourResult.create({
  data: {
    definitionAttendanceCodeId: mappedCodeInfo.id,
    definitionAttendanceCodeStr: mappedCodeInfo.code,
    calcAttendanceCode: calcAttendanceCode.code,
    // ...
  },
});
```

---

## 📝 完整数据流示例

### 场景：员工 202604003 在 2026-04-15 的工时计算

#### 步骤1: 计算出勤代码确定
```
排班: 生产班次
    ↓
CalculationAttendanceCode: A02 (作业工时)
calculationAttendanceCodeId = 1
```

#### 步骤2: 创建 CalcResult
```sql
INSERT INTO CalcResult (
  employeeNo,
  calcDate,
  calculationAttendanceCodeId,  -- ✅ 1
  actualHours,
  overtimeHours,
  status
) VALUES (
  '202604003',
  '2026-04-15',
  1,  -- A02 的 ID
  9.0,
  0.0,
  'PENDING'
);
```

#### 步骤3: 实时同步到 WorkHourResult
```typescript
// WorkHourPushService 推送
const calcAttendanceCode = { code: 'A02', id: 1 };

// 查询映射
// DefinitionAttendanceCode WHERE calcAttendanceCode = 'A02'
// 结果: PRODUCTION_WORK (id=3, code='PRODUCTION_WORK', calcAttendanceCode='A02')

// 创建 WorkHourResult
INSERT INTO WorkHourResult (
  employeeNo,
  calcDate,
  definitionAttendanceCodeId,    -- ✅ 3 (PRODUCTION_WORK 的 ID)
  definitionAttendanceCodeStr,   -- ✅ 'PRODUCTION_WORK'
  calcAttendanceCode,             -- ✅ 'A02' (原始计算代码)
  workHours,
  sourceType,
  status
) VALUES (
  '202604003',
  '2026-04-15',
  3,           -- PRODUCTION_WORK 的 ID
  'PRODUCTION_WORK',
  'A02',       -- 原始计算代码
  9.0,
  'CALCULATED',
  'CONFIRMED'
);
```

---

## ⚠️ 当前映射关系不完整

**问题**: CalculationAttendanceCode 缺少 A01、A05、A06

**当前**:
- CalculationAttendanceCode: A02, A03, A04
- DefinitionAttendanceCode 映射: A01→NORMAL_WORK, A02→PRODUCTION_WORK, A03→ALLOCATION_WORK, A04→OVERTIME_WORK, A05→LEAVE_WORK, A06→HOLIDAY_WORK

**需要补充**:
```sql
-- 添加缺少的计算出勤代码
INSERT INTO CalculationAttendanceCode (code, name, type, calculateHours, priority, color, status) VALUES
('A01', '正常工时', 'LEAN_HOURS', 1, 1, '#52c41a', 'ACTIVE'),
('A05', '请假工时', 'LEAN_HOURS', 0, 5, '#722ed1', 'ACTIVE'),
('A06', '节假日工时', 'LEAN_HOURS', 1, 6, '#eb2f96', 'ACTIVE');
```

---

## ✅ 实施检查清单

### 阶段1: 数据准备
- [ ] 添加缺少的 CalculationAttendanceCode (A01, A05, A06)
- [ ] 验证代码映射关系完整性

### 阶段2: 计算引擎改造
- [ ] 实现 `determineCalculationAttendanceCode` 方法
- [ ] 修改 `calculateDaily` 返回 calculationAttendanceCodeId
- [ ] 测试计算结果是否正确设置出勤代码

### 阶段3: 自动同步集成
- [ ] 在 `calculate.service.ts` 中注入 `WorkHourPushService`
- [ ] 计算完成后自动调用推送服务
- [ ] 测试数据是否正确同步到 WorkHourResult

### 阶段4: 前端验证
- [ ] `calculate/work-hour-results` 页面显示 CalcResult 数据
- [ ] 验证工时模块页面显示 WorkHourResult 数据
- [ ] 验证代码映射是否正确

---

## 📚 相关文件

### 后端
- `src/modules/calculate/calculate.engine.ts` - 计算引擎
- `src/modules/calculate/calculate.service.ts` - 计算服务
- `src/modules/calculate/work-hour-push.service.ts` - 推送服务（已实现）
- `src/modules/calculate/calculation-attendance-code.service.ts` - 计算出勤代码服务
- `src/modules/allocation/definition-attendance-code.service.ts` - 定义出勤代码服务

### 前端
- `src/pages/calculate/WorkHourResultPage.tsx` - 工时结果页面（应显示 CalcResult）

---

## 🎯 下一步行动

1. ✅ **立即**: 添加缺少的 CalculationAttendanceCode (A01, A05, A06)
2. ✅ **修改**: calculate.engine.ts 添加确定出勤代码的逻辑
3. ✅ **集成**: calculate.service.ts 集成自动推送功能
4. ✅ **测试**: 端到端测试数据流转

---

**文档创建时间**: 2026-04-23
**状态**: 待实施
