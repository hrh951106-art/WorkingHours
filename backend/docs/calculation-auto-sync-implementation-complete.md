# 计算结果自动同步功能实施完成

## ✅ 完成时间
2026-04-23

---

## 🎯 实施目标

实现计算管理模块到工时模块的实时数据同步，确保：
1. CalcResult 使用 CalculationAttendanceCode
2. 计算完成后自动同步到 WorkHourResult
3. WorkHourResult 使用 DefinitionAttendanceCode（通过 calcAttendanceCode 映射）

---

## 🔧 实施内容

### 1. 修改 calculateEngine.ts

**文件**: `/backend/src/modules/calculate/calculate.engine.ts`

#### 1.1 添加确定计算出勤代码的方法

```typescript
/**
 * 确定计算出勤代码
 * 根据班次类型、排班信息等确定应该使用的计算出勤代码
 */
private async determineCalculationAttendanceCode(
  shift: any,
  schedule: any
) {
  const shiftName = shift?.name?.toLowerCase() || '';

  // 根据班次名称关键词匹配计算出勤代码
  if (shiftName.includes('生产') || shiftName.includes('作业')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A02' } // 作业工时
    });
  }

  if (shiftName.includes('分摊')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A03' } // 分摊工时
    });
  }

  if (shiftName.includes('车间') || shiftName.includes('加班')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A04' } // 车间工时
    });
  }

  if (shiftName.includes('正常') || shiftName.includes('常班')) {
    return this.prisma.calculationAttendanceCode.findUnique({
      where: { code: 'A01' } // 正常工时
    });
  }

  // 默认返回优先级最高的代码（A02 作业工时）
  return this.prisma.calculationAttendanceCode.findFirst({
    where: {
      status: 'ACTIVE',
      calculateHours: true
    },
    orderBy: [
      { priority: 'asc' },
      { id: 'asc' }
    ]
  });
}
```

#### 1.2 修改 calculateDaily 方法

在返回值中添加 `calculationAttendanceCodeId`:

```typescript
async calculateDaily(employeeNo: string, calcDate: Date) {
  // ... 现有计算逻辑 ...

  // ✅ 新增：确定计算出勤代码
  const calculationAttendanceCode = await this.determineCalculationAttendanceCode(
    shift,
    schedule
  );

  return {
    employeeNo,
    calcDate,
    shiftId: shift.id,
    shiftName: shift.name,
    calculationAttendanceCodeId: calculationAttendanceCode?.id, // ✅ 新增
    // ... 其他字段 ...
  };
}
```

---

### 2. 修改 calculate.service.ts

**文件**: `/backend/src/modules/calculate/calculate.service.ts`

#### 2.1 导入 WorkHourPushService

```typescript
import { WorkHourPushService } from './work-hour-push.service';
```

#### 2.2 注入服务

```typescript
constructor(
  private prisma: PrismaService,
  private calculateEngine: CalculateEngine,
  private attendanceCodeService: AttendanceCodeService,
  private dataScopeService: DataScopeService,
  private workHourPushService: WorkHourPushService, // ✅ 新增
) {}
```

#### 2.3 在 calculate 方法中集成自动推送

```typescript
async calculate(dto: any) {
  // ... 计算逻辑 ...

  let result;

  if (existing) {
    result = await this.prisma.calcResult.update({
      where: { id: existing.id },
      data: {
        ...calcResult,
        calcDate: dayStart,
        status: 'PENDING',
      },
    });
  } else {
    result = await this.prisma.calcResult.create({
      data: {
        ...calcResult,
        calcDate: dayStart,
      },
    });
  }

  // ✅ 自动同步到工时模块
  try {
    await this.workHourPushService.pushWorkHourResults([result.id]);
  } catch (error) {
    console.error('同步到工时模块失败:', error);
    // 不影响主流程，记录错误即可
  }

  return result;
}
```

---

### 3. 修改 calculate.module.ts

**文件**: `/backend/src/modules/calculate/calculate.module.ts`

#### 3.1 导入 WorkHourPushService

```typescript
import { WorkHourPushService } from './work-hour-push.service';
```

#### 3.2 注册到 providers

```typescript
@Module({
  controllers: [...],
  providers: [
    CalculateService,
    CalculateEngine,
    AttendanceCodeService,
    AttendanceCodeDefinitionService,
    CalculationAttendanceCodeService,
    WorkHourPushService, // ✅ 新增
    PrismaService,
    DataScopeService,
  ],
  exports: [...],
})
export class CalculateModule {}
```

---

## 🔄 完整数据流转

### 流程图

```
1. 计算工时
   ├─ 用户调用: POST /api/calculate/calculate
   ├─ calculateEngine.calculateDaily()
   │  ├─ 确定计算出勤代码
   │  └─ 返回 calculationAttendanceCodeId
   ├─ 创建/更新 CalcResult
   │  └─ calculationAttendanceCodeId = 1 (A02)
   └─ 自动触发推送
      └─ workHourPushService.pushWorkHourResults([result.id])

2. 推送到工时模块
   ├─ 查询 CalcResult (包含 calculationAttendanceCode)
   ├─ 代码映射
   │  ├─ calcAttendanceCode = 'A02'
   │  └─ 查询: DefinitionAttendanceCode WHERE calcAttendanceCode='A02'
   │  └─ 找到: PRODUCTION_WORK (id=3, code='PRODUCTION_WORK')
   └─ 创建 WorkHourResult
      ├─ definitionAttendanceCodeId = 3
      ├─ definitionAttendanceCodeStr = 'PRODUCTION_WORK'
      ├─ calcAttendanceCode = 'A02'
      └─ workHours = 9.0
```

### 数据示例

#### 输入
```json
{
  "calcDate": "2026-04-15",
  "employeeNo": "202604003",
  "shift": {
    "name": "生产班次"
  }
}
```

#### CalcResult (计算管理)
```sql
| id | employeeNo | calcDate | calculationAttendanceCodeId | actualHours | status |
|----|------------|----------|----------------------------|-------------|--------|
| 3  | 202604003  | 2026-04-15 | 1 (A02 - 作业工时) | 9.0 | PENDING |
```

#### WorkHourResult (工时模块)
```sql
| id | employeeNo | calcDate | definitionAttendanceCodeId | definitionAttendanceCodeStr | calcAttendanceCode | workHours | sourceType | status |
|----|------------|----------|---------------------------|-------------------------|-------------------|-----------|------------|--------|
| 1  | 202604003  | 2026-04-15 | 3 (PRODUCTION_WORK) | PRODUCTION_WORK | A02 | 9.0 | CALCULATED | CONFIRMED |
```

---

## ✅ 功能验证

### 1. 后端编译
```bash
✔ Nest application successfully started
🚀 Server is running on: http://localhost:3001
```
✅ 后端成功启动，无编译错误

### 2. API 端点

**计算管理模块**:
- `POST /api/calculate/calculate` - 计算工时（自动推送）
- `GET /api/calculate/results` - 查询 CalcResult
- `POST /api/calculate/work-hours/push` - 手动推送

**工时模块**:
- `GET /api/allocation/work-hours` - 查询 WorkHourResult

### 3. 前端页面

**工时结果页面** (`calculate/work-hour-results`):
- ✅ 使用 `/calculate/results` API
- ✅ 显示 CalcResult 数据
- ✅ 显示计算出勤代码 (calculationAttendanceCodeId)

---

## 📋 代码映射关系

### 完整映射表

| 计算代码 | 计算名称 | → | 定义代码 | 定义名称 |
|----------|----------|---|----------|----------|
| A01 | 正常工时 | → | NORMAL_WORK | 正常工时 |
| A02 | 作业工时 | → | PRODUCTION_WORK | 生产工时 |
| A03 | 分摊工时 | → | ALLOCATION_WORK | 分摊工时 |
| A04 | 车间工时 | → | OVERTIME_WORK | 加班工时 |
| A05 | 请假工时 | → | LEAVE_WORK | 请假工时 |
| A06 | 节假日工时 | → | HOLIDAY_WORK | 节假日工时 |

### WorkHourPushService 映射逻辑

```typescript
// 1. 查询所有定义出勤代码
const definitionCodes = await this.prisma.definitionAttendanceCode.findMany({
  where: {
    calcAttendanceCode: { not: null },
    status: 'ACTIVE',
  },
});

// 2. 构建映射表 Map<calcCode, definitionCode>
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
const calcCode = calcResult.calculationAttendanceCode.code; // 'A02'
const mappedCode = codeMapping.get(calcCode); // { id: 3, code: 'PRODUCTION_WORK' }

// 4. 创建 WorkHourResult
await this.prisma.workHourResult.create({
  data: {
    definitionAttendanceCodeId: mappedCode.id,       // 3
    definitionAttendanceCodeStr: mappedCode.code,    // 'PRODUCTION_WORK'
    calcAttendanceCode: calcCode,                    // 'A02'
    workHours: calcResult.actualHours,
  },
});
```

---

## 🧪 测试步骤

### 测试1: 单个员工计算

```bash
# 1. 登录
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  | grep -o '"access_token":"[^"]*"' \
  | cut -d'"' -f4)

# 2. 触发计算
curl -X POST http://localhost:3001/api/calculate/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "calcDate": "2026-04-15",
    "employeeNo": "202604003"
  }'

# 3. 验证 CalcResult
sqlite3 prisma/dev.db "SELECT id, employeeNo, calculationAttendanceCodeId, actualHours FROM CalcResult WHERE employeeNo='202604003' ORDER BY id DESC LIMIT 1;"

# 4. 验证 WorkHourResult
sqlite3 prisma/dev.db "SELECT id, employeeNo, definitionAttendanceCodeStr, calcAttendanceCode, workHours FROM WorkHourResult WHERE employeeNo='202604003' ORDER BY id DESC LIMIT 1;"
```

**预期结果**:
- CalcResult.calculationAttendanceCodeId = 1 (A02)
- WorkHourResult.definitionAttendanceCodeStr = 'PRODUCTION_WORK'
- WorkHourResult.calcAttendanceCode = 'A02'

### 测试2: 批量计算

```bash
curl -X POST http://localhost:3001/api/calculate/calculate/batch \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2026-04-15",
    "endDate": "2026-04-15"
  }'
```

---

## 🎯 核心改进点

### 1. 自动确定计算出勤代码

**之前**: calcResult.calculationAttendanceCodeId = NULL
**现在**: calcResult.calculationAttendanceCodeId = 1 (根据班次自动确定)

### 2. 实时同步到工时模块

**之前**: 需要手动调用推送 API
**现在**: 计算完成后自动推送

### 3. 完整的代码映射

**之前**: 代码映射关系不完整
**现在**: 6个代码全部映射完成

---

## 📝 后续优化建议

### 1. 增强计算出勤代码确定逻辑

当前基于班次名称匹配，可以考虑：
- 基于排班类型匹配
- 基于打卡规则配置
- 基于员工岗位/部门

### 2. 添加推送失败重试机制

当前推送失败只记录日志，可以考虑：
- 记录失败的任务到队列
- 定时重试
- 失败通知

### 3. 添加推送状态字段

在 CalcResult 表中添加：
- `syncStatus` - 同步状态 (PENDING/SUCCESS/FAILED)
- `syncedAt` - 同步时间
- `lastSyncError` - 最后一次同步错误

---

## 📚 相关文件

### 后端
- `/backend/src/modules/calculate/calculate.engine.ts` - ✅ 已修改
- `/backend/src/modules/calculate/calculate.service.ts` - ✅ 已修改
- `/backend/src/modules/calculate/calculate.module.ts` - ✅ 已修改
- `/backend/src/modules/calculate/work-hour-push.service.ts` - 已存在

### 前端
- `/frontend/src/pages/calculate/WorkHourResultPage.tsx` - 已正确配置

### 文档
- `/backend/docs/calculation-workhour-data-flow-setup-complete.md` - 配置完成文档
- `/backend/docs/calculation-workhour-data-flow-analysis.md` - 分析文档

---

## ✅ 完成状态

- [x] ✅ calculateEngine 添加确定计算出勤代码逻辑
- [x] ✅ calculate.service 集成自动推送功能
- [x] ✅ calculate.module 注册 WorkHourPushService
- [x] ✅ 后端编译成功
- [x] ✅ 前端页面使用正确 API
- [ ] ⏳ 端到端测试（需要测试数据）

---

**实施完成时间**: 2026-04-23
**状态**: ✅ 代码实施完成，待测试验证
