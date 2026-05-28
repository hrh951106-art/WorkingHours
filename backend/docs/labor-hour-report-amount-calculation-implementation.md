# 工时报工金额计算功能实现文档

## 需求背景

在工时报工往工时结果表中推送数据的时候，也需要计算出金额，根据申报时选择的出勤代码到代码定义表匹配的对应的计算代码，结合个人的金额规则计算出金额。

## 实现方案

### 1. 数据流程

```
工时报工申请 (LaborHourReportRequest)
    ↓ (选择出勤代码 hourType)
定义出勤代码表 (DefinitionAttendanceCode)
    ↓ (获取计算代码 calcAttendanceCode)
计算出勤代码 (CalculationAttendanceCode)
    ↓ (结合金额规则)
金额计算服务 (AmountCalculateService)
    ↓ (计算金额)
工时结果表 (WorkHourResult)
```

### 2. 核心逻辑

#### 2.1 代码映射关系

- **定义出勤代码** (`DefinitionAttendanceCode`)：用户在报工时选择的代码
- **计算出勤代码** (`CalculationAttendanceCode`)：用于金额计算的代码
- 通过 `DefinitionAttendanceCode.calcAttendanceCode` 字段建立映射关系

#### 2.2 金额计算公式

金额计算服务 `AmountCalculateService` 提供以下计算逻辑：

1. **获取员工系数**：从 `EmployeeCoefficient` 表获取员工的基础金额系数
2. **匹配金额规则**：根据计算出勤代码和账户路径匹配 `AmountPolicy`
3. **计算最终金额**：
   - **无金额规则**：金额 = 员工系数 × 工时数
   - **MULTIPLY 规则**：金额 = 员工系数 × 倍数 × 工时数
   - **ADD 规则**：金额 = 员工系数 × (工时数 + 固定值)
   - **CUSTOM 规则**：金额 = 固定值 × 工时数

### 3. 代码实现

#### 3.1 注入金额计算服务

在 `labor-hour-report.service.ts` 中注入 `AmountCalculateService`：

```typescript
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class LaborHourReportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workflowInstanceService: WorkflowInstanceService,
    private readonly amountCalculateService: AmountCalculateService,
  ) {}
}
```

#### 3.2 在审批时计算金额

在 `approveRequest` 方法中，创建工时结果记录时添加金额计算逻辑：

```typescript
// 获取计算代码
const calcAttendanceCode = definitionAttendanceCode.calcAttendanceCode || definitionAttendanceCode.code;

// 计算金额
let amount = 0;
try {
  amount = await this.amountCalculateService.calculateAmountByNo({
    employeeNo: employee.employeeNo,
    workHours: request.value,
    attendanceCode: calcAttendanceCode,
    accountPath: account.path,
    calcDate: request.reportDate,
  });
} catch (error) {
  console.error('金额计算失败:', error);
  amount = 0;
}

// 创建工时结果记录时填充金额字段
await tx.workHourResult.create({
  data: {
    // ... 其他字段
    amount: Math.round(amount * 100) / 100,
    calculateAmount: Math.round(amount * 100) / 100,
    // ...
  },
});
```

### 4. 测试验证

#### 4.1 测试脚本

创建了测试脚本 `scripts/test-labor-hour-amount-calculation.ts`，用于验证金额计算功能。

#### 4.2 测试结果

测试示例：
- 员工系数：20
- 工时数：8 小时
- 金额规则：MULTIPLY 类型，倍数 1.5
- 计算结果：20 × 8 × 1.5 = 240 元

### 5. 关键字段说明

#### 5.1 WorkHourResult 表字段

- `amount`：计算出的金额
- `calculateAmount`：计算出的金额（与 amount 相同）
- `definitionAttendanceCodeId`：定义出勤代码 ID
- `definitionAttendanceCodeStr`：定义出勤代码（用户选择的代码）
- `calcAttendanceCode`：计算出勤代码（用于金额计算）

#### 5.2 DefinitionAttendanceCode 表字段

- `code`：定义出勤代码
- `calcAttendanceCode`：计算出勤代码（指向 CalculationAttendanceCode）

### 6. 注意事项

1. **金额计算失败处理**：如果金额计算失败，金额设置为 0，不影响工时结果记录的创建
2. **精度处理**：金额保留两位小数，使用 `Math.round(amount * 100) / 100` 进行精度控制
3. **日志输出**：添加了详细的日志输出，便于调试和追踪金额计算过程
4. **向后兼容**：保留了旧的字段（如 `attendanceCode`、`attendanceCodeName`）以保持兼容性

### 7. 验证步骤

1. 创建新的工时报工申请
2. 审批通过
3. 检查工时结果表中的金额字段是否正确计算
4. 验证金额计算是否符合预期：
   - 如果有匹配的金额规则，应按规则计算
   - 如果没有金额规则，应使用员工系数 × 工时数计算

### 8. 后续优化建议

1. 可以添加金额计算的批量处理，提高性能
2. 可以添加金额计算的日志记录，便于审计
3. 可以添加金额计算的异常告警，及时发现处理问题
