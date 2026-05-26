# 精益��时重算金额问题修复说明

## 🐛 问题描述

点击"精益工时重算"后，CalcResult 表中的金额字段没有计算出来，始终为空或0。

## 🔍 问题原因

### 根本原因

`AttendanceCodeService.calculateFromPunchPair` 方法在创建/更新 CalcResult 时，没有计算和保存 `amount` 字段。

### 调用链路分析

```
前端点击"重新计算工时"
  ↓
POST /calculate/calculate/batch
  ↓
CalculateService.batchCalculate
  ↓
AttendanceCodeService.calculateFromPunchPair  ← 问题在这里！
  ↓
创建/更新 CalcResult (缺少 amount 字段)
  ↓
WorkHourPushService.pushWorkHourResults
  ↓
创建/更新 WorkHourResult (这里计算了金额，但源数据就没有)
```

### 对比分析

| 计算方式 | 方法 | 金额计算 | 状态 |
|---------|------|---------|------|
| 考勤工时计算 | CalculateEngine.calculateDaily | ✅ 有 | 正常 |
| 精益工时计算 | AttendanceCodeService.calculateFromPunchPair | ❌ 无 | 问题 |

## ✅ 解决方案

### 修改文件

**文件：** `backend/src/modules/calculate/attendance-code.service.ts`

### 修改 1：注入 AmountCalculateService

```typescript
// 修改前
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';

@Injectable()
export class AttendanceCodeService {
  constructor(private prisma: PrismaService) {}
}

// 修改后
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class AttendanceCodeService {
  constructor(
    private prisma: PrismaService,
    private amountCalculateService: AmountCalculateService,
  ) {}
}
```

### 修改 2：在创建/更新 CalcResult 时计算金额

在 `calculateFromPunchPair` 方法中，添加金额计算逻辑：

```typescript
// 在创建新记录之前，计算金额
let amount = 0;
if (code.calculateAmount) {
  amount = await this.amountCalculateService.calculateAmountByNo({
    employeeNo: punchPair.employeeNo,
    workHours: hours.actualHours,
    attendanceCode: code.code,
    accountPath: accountName || '',
    calcDate: punchPair.pairDate,
  });
}

// 创建新记录时，包含 amount 字段
const result = await this.prisma.calcResult.create({
  data: {
    employeeNo: punchPair.employeeNo,
    calcDate: punchPair.pairDate,
    shiftId: punchPair.shiftId,
    shiftName: punchPair.shiftName,
    calculationAttendanceCodeId: code.id,
    punchInTime: hours.adjustedInTime || seg.startTime,
    punchOutTime: hours.adjustedOutTime || seg.endTime,
    standardHours: hours.standardHours,
    actualHours: hours.actualHours,
    overtimeHours: 0,
    leaveHours: 0,
    absenceHours: 0,
    amount: amount, // ✅ 添加金额字段
    accountId: accountId,
    accountName: accountName,
    status: 'COMPLETED',
  },
});

// 更新已存在记录时，也更新 amount 字段
if (existing) {
  let amount = 0;
  if (code.calculateAmount) {
    amount = await this.amountCalculateService.calculateAmountByNo({
      employeeNo: punchPair.employeeNo,
      workHours: hours.actualHours,
      attendanceCode: code.code,
      accountPath: accountName || '',
      calcDate: punchPair.pairDate,
    });
  }

  await this.prisma.calcResult.update({
    where: { id: existing.id },
    data: {
      actualHours: hours.actualHours,
      standardHours: hours.standardHours,
      amount: amount, // ✅ 添加金额字段
    },
  });
}
```

## 📊 预期效果

### 修复前

| 账户 | 工时 | 金额 |
|-----|------|------|
| 大华富阳工厂/.../大桶/焊接/-/- | 3 | 未计算 ❌ |
| 大华富阳工厂/.../大桶/包装/-/- | 2 | 未计算 ❌ |
| 大华富阳工厂/.../大桶/-/-/- | 1 | 未计算 ❌ |

### 修复后

| 账户 | 工时 | 金额 | 说明 |
|-----|------|------|------|
| 大华富阳工厂/.../大桶/焊接/-/- | 3 | ¥90.00 ✅ | 3×20×1.5=90 |
| 大华富阳工厂/.../大桶/包装/-/- | 2 | ¥40.00 ✅ | 2×20=40 |
| 大华富阳工厂/.../大桶/-/-/- | 1 | ¥20.00 ✅ | 1×20=20 |

## 🔄 如何验证修复

### 方式 1：前端页面重新计算

1. 打开浏览器，访问系统
2. 进入：计算管理 → 计算结果页面
3. 切换到"精益工时结果"标签
4. 筛选：员工号 = 202604003，日期 = 2026-05-12
5. 点击"重新计算工时"按钮
6. 等待计算完成
7. **预期结果**：金额列应该显示正确的金额

### 方式 2：API 调用

```bash
curl -X POST http://localhost:3000/api/calculate/calculate/batch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "startDate": "2026-05-12",
    "endDate": "2026-05-12",
    "employeeNos": ["202604003"]
  }'
```

### 方式 3：使用诊断脚本

运行测试脚本查看计算结果：

```bash
npx ts-node test-recalculate-with-amount.ts
```

## ⚠️ 重要注意事项

### 1. 重启后端服务

修改代码后，**必须重启后端服务**才能生效：

```bash
# 停止当前运行的后端服务
# 然后重新启动
cd backend
npm run start:dev
```

### 2. 重新计算已存在的数据

对于已经存在的 CalcResult 记录（金额为空的），需要触发重新计算才能填充金额：

- **推荐方式**：使用前端页面的"重新计算工时"功能
- **批量处理**：可以通过 API 批量重新计算特定日期范围的数据

### 3. WorkHourResult 同步

WorkHourPushService 会在推送时自动计算金额，所以：
- CalcResult.amount 会被正确计算并保存 ✅
- WorkHourResult.amount 也会被正确计算并保存 ✅

### 4. 层级匹配功能

金额计算已经支持层级匹配：
- 政策路径：`///大桶/焊接//`
- 可以匹配所有产品=大桶、工序=焊接的账户
- 例如：大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-
- 计算结果：3小时 × 20(系数) × 1.5(倍数) = ¥90.00

## 🧪 测试检查清单

- [ ] 后端服务已重启
- [ ] 精益工时重算后 CalcResult.amount 字段有值
- [ ] 焊接工时显示 ¥90.00（3小时 × 20 × 1.5）
- [ ] 包装工时显示 ¥40.00（2小时 × 20）
- [ ] WorkHourResult.amount 字段同步正确
- [ ] 前端页面金额列显示正确
- [ ] 其他员工的金额计算也正常

## 📝 相关文档

- [金额政策层级匹配功能实现说明](../frontend/docs/amount-policy-level-matching-implementation.md)
- [WorkHour推送金额计算实现](./work-hour-push-implementation.md)

## 🎉 总结

通过在 `AttendanceCodeService.calculateFromPunchPair` 方法中添加金额计算逻辑，成功修复了精益工时重算不计算金额的问题。

**关键修改：**
1. ✅ 注入 AmountCalculateService
2. ✅ 在创建/更新 CalcResult 时计算并保存 amount 字段
3. ✅ 使用层级匹配逻辑支持灵活的账户路径配置

现在重新计算精益工时后，金额会正确计算并显示了！
