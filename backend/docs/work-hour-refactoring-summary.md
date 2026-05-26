# 工时存储重构 - 实施总结

## 已完成的工作

### 1. 数据库表结构设计 ✅

#### 新增表：WorkHourResult（工时结果表）
- **用途**：存储从计算管理模块推送过来的工时数据
- **关键字段**：
  - `attendanceCode`: 分摊模块的出勤代码（映射后的）
  - `calcAttendanceCode`: 计算管理模块的出勤代码（原始的）
  - `sourceType`: 数据来源（CALCULATED/REPORTED/MANUAL）
  - `sourceId`: 来源记录ID
  - `status`: 状态（DRAFT/CONFIRMED/LOCKED）

#### 新增表：AllocationWorkHour（分摊工时表）
- **用途**：存储分摊计算使用的工时数据
- **关键字段**：
  - `sourceResultId`: 来源工时结果ID（关联WorkHourResult）
  - `reportRequestId`: 工时报表申请ID
  - `isApproved`: 是否已审批
  - `isAllocated`: 是否已分摊

#### 修改表：AttendanceCode
- **新增字段**：`calcAttendanceCode` - 关联的计算出勤代码（用于接收计算管理模块的数据）

### 2. 服务层实现 ✅

#### WorkHourPushService（工时推送服务）
- **路径**：`backend/src/modules/calculate/work-hour-push.service.ts`
- **功能**：
  - `pushWorkHourResults()`: 推送指定的工时计算结果
  - `pushWorkHourResultsByDateRange()`: 按日期范围批量推送
- **逻辑**：
  1. 获取工时计算结果
  2. 查询出勤代码映射关系
  3. 转换数据格式（计算代码 → 分摊代码）
  4. 存储到WorkHourResult表

#### WorkHourReceiverService（工时接收服务）
- **路径**：`backend/src/modules/allocation/work-hour-receiver.service.ts`
- **功能**：
  - `receiveWorkHourResults()`: 接收并存储工时结果
  - `confirmWorkHourResult()`: 确认工时结果
  - `getWorkHourResults()`: 查询工时结果列表

#### WorkHourReceiverController（工时接收API）
- **路径**：`backend/src/modules/allocation/work-hour-receiver.controller.ts`
- **接口**：
  - `POST /allocation/work-hours/receive`: 接收工时推送
  - `GET /allocation/work-hours`: 查询工时结果
  - `POST /allocation/work-hours/:id/confirm`: 确认工时结果
  - `POST /allocation/work-hours/batch-confirm`: 批量确认工时结果

### 3. 数据库迁移 ✅
- 已生成Prisma客户端
- 已运行数据库迁移，创建新表和字段

## 后续需要完成的任务

### 1. 集成工时推送逻辑到计算模块 🔧

**文件**：`backend/src/modules/calculate/calculate.service.ts`

**需要修改的位置**：
```typescript
// 在工时计算完成后，自动推送数据
async calculateWorkHours(params: any) {
  // ... 现有的计算逻辑 ...

  // 计算完成后，推送结果到工时模块
  const calcResultIds = results.map(r => r.id);
  await this.workHourPushService.pushWorkHourResults(calcResultIds);

  return results;
}
```

**需要做的**：
1. 在 `calculate.module.ts` 中导入 `WorkHourPushService`
2. 在计算完成后调用推送服务

### 2. 修改工时明细页面 🔧

**文件**：`frontend/src/pages/attendance/WorkHourDetailPage.tsx`

**需要修改**：
- 将工时结果Tab的数据源从 `/calculate/work-hour-results` 改为 `/allocation/work-hours`
- 更新查询参数和响应数据的字段映射

**示例修改**：
```typescript
// 原来的查询
const { data: workHourData } = useQuery({
  queryKey: ['workHourResults', ...],
  queryFn: () => request.get('/calculate/work-hour-results', ...).then(res => res),
});

// 修改后的查询
const { data: workHourData } = useQuery({
  queryKey: ['allocationWorkHours', ...],
  queryFn: () => request.get('/allocation/work-hours', ...).then(res => res),
});
```

### 3. 配置出勤代码映射关系 🔧

**页面**：`frontend/src/pages/allocation/AttendanceCodeDefinitionPage`

**需要添加的功能**：
- 在出勤代码定义页面添加"计算代码映射"字段
- 允许用户选择关联的计算出勤代码

**API修改**：
```typescript
// DTO添加字段
export class UpdateAttendanceCodeDto {
  // ... 现有字段 ...
  calcAttendanceCode?: string; // 新增
}
```

### 4. 实现工时报表审批后存储 🔧

**文件**：`backend/src/modules/labor-hour-report/labor-hour-report.service.ts`

**需要修改的位置**：
```typescript
// 在报表审批通过后，将数据存储到WorkHourResult表
async approveReport(reportId: number) {
  // ... 现有的审批逻辑 ...

  // 审批通过后，存储工时结果
  await this.storeApprovedWorkHours(reportId);

  return result;
}

async storeApprovedWorkHours(reportId: number) {
  // 获取报表详情
  const report = await this.prisma.laborHourReportRequest.findUnique({
    where: { id: reportId },
    include: { items: true },
  });

  // 转换并存储到WorkHourResult表
  for (const item of report.items) {
    await this.prisma.workHourResult.create({
      data: {
        employeeNo: item.employeeNo,
        calcDate: item.workDate,
        attendanceCode: item.attendanceCode,
        workHours: item.workHours,
        sourceType: 'REPORTED',
        sourceId: item.id,
        reportRequestId: reportId,
        status: 'CONFIRMED',
      },
    });
  }
}
```

### 5. 实现分摊计算使用新表 🔧

**文件**：`backend/src/modules/allocation/allocation.service.ts`

**需要修改**：
- 从 `AllocationWorkHour` 表读取工时数据
- 使用 `isApproved=true` 且 `isAllocated=false` 的工时进行分摊

```typescript
async performAllocation(params: any) {
  // 从新表获取工时数据
  const workHours = await this.prisma.allocationWorkHour.findMany({
    where: {
      isApproved: true,
      isAllocated: false,
      calcDate: {
        gte: params.startDate,
        lte: params.endDate,
      },
    },
  });

  // 执行分摊计算
  // ...

  // 标记为已分摊
  await this.prisma.allocationWorkHour.updateMany({
    where: { id: { in: workHourIds } },
    data: { isAllocated: true },
  });
}
```

### 6. 将AllocationWorkHour添加到AllocationModule 🔧

**文件**：`backend/src/modules/allocation/allocation.module.ts`

```typescript
@Module({
  imports: [PrismaModule],
  providers: [
    // ... 现有providers ...
    WorkHourReceiverService,
  ],
  controllers: [
    // ... 现有controllers ...
    WorkHourReceiverController,
  ],
  exports: [AllocationService],
})
export class AllocationModule {}
```

## 数据流程图

```
┌─────────────────┐
│ punch/records   │ 原始刷卡数据
└────────┬────────┘
         │ 打卡规则处理
         ▼
┌─────────────────┐
│calculate/pairing│ 摆卡结果
│-results         │
└────────┬────────┘
         │ 出勤代码配置 + 计算
         ▼
┌─────────────────┐
│ calculate/calc  │ 工时计算结果
│-results         │
└────────┬────────┘
         │ WorkHourPushService推送
         │ 出勤代码映射
         ▼
┌─────────────────┐
│ WorkHourResult  │ 工时结果表（新）
└────────┬────────┘
         │
         ├─────────────┐
         │             │
         ▼             ▼
┌──────────────┐  ┌──────────────┐
│分摊计算使用   │  │工时报表审批  │
│AllocationWork│  │后存储        │
│Hour          │  └──────────────┘
└──────────────┘
```

## 测试步骤

1. **配置出勤代码映射**
   - 访问 `allocation/attendance-code-definition` 页面
   - 为分摊出勤代码设置对应的计算出勤代码

2. **测试工时推送**
   - 在计算管理模块执行工时计算
   - 检查 `WorkHourResult` 表是否有数据

3. **测试工时查询**
   - 访问 `attendance/workhour-details` 页面
   - 确认显示的数据来自新表

4. **测试分摊计算**
   - 执行分摊计算
   - 确认使用 `AllocationWorkHour` 表的数据

## 注意事项

1. **数据一致性**：推送时要确保出勤代码映射关系已配置
2. **性能优化**：大批量数据推送时使用分批处理
3. **错误处理**：推送失败要记录日志，支持重试机制
4. **权限控制**：API接口需要配置相应的权限
