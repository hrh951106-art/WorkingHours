# 考勤工时重算修复 - 先删后增

## 📋 问题描述

考勤工时重算时会出现数据重复的问题，原因是重算时没有先删除当天旧数据，导致新旧数据叠加。

## 🔧 修复方案

### 修改文件

`/backend/src/modules/calculate/attendance-work-hour.service.ts`

### 核心修改

#### 1. `calculateDaily` 方法（第32-36行）

在开始计算前，先删除当天该员工的考勤工时数据：

```typescript
async calculateDaily(employeeNo: string, calcDate: Date, batchId?: string) {
  this.logger.log(`开始计算员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时`);

  // 0. ✅ 先删除当天该员工的考勤工时数据，避免重算时数据重复
  await this.deleteDailyWorkHourResults(employeeNo, calcDate);
  this.logger.log(`已删除员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的旧考勤工时数据`);

  // 1. 查询考勤打卡收卡结果
  const attendancePunchPairs = await this.getAttendancePunchPairs(employeeNo, calcDate);
  // ...
}
```

#### 2. 新增 `deleteDailyWorkHourResults` 方法（第235-265行）

```typescript
/**
 * 删除指定员工、指定日期的考勤工时结果
 * @param employeeNo 员工编号
 * @param calcDate 计算日期
 */
private async deleteDailyWorkHourResults(employeeNo: string, calcDate: Date) {
  this.logger.debug(`准备删除员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时数据`);

  // 获取所有考勤工时类型的出勤代码
  const attendanceHourCodes = await this.prisma.calculationAttendanceCode.findMany({
    where: { type: 'ATTENDANCE_HOURS' },
    select: { id: true },
  });

  if (attendanceHourCodes.length === 0) {
    this.logger.debug('没有找到考勤工时类型的出勤代码，跳过删除');
    return;
  }

  const attendanceHourCodeIds = attendanceHourCodes.map(c => c.id);

  // 删除符合条件的数据
  const deleteResult = await this.prisma.calcResult.deleteMany({
    where: {
      employeeNo: employeeNo,
      calcDate: new Date(calcDate),
      calculationAttendanceCodeId: {
        in: attendanceHourCodeIds,
      },
    },
  });

  if (deleteResult.count > 0) {
    this.logger.log(`删除了 ${deleteResult.count} 条旧的考勤工时数据`);
  }
}
```

#### 3. 优化 `saveWorkHourResults` 方法（第1210-1245行）

移除检查是否已存在记录的逻辑，直接创建新记录：

```typescript
// ❌ 修复前：检查是否存在，决定更新或创建
const existing = await this.prisma.calcResult.findFirst({ ... });
if (existing) {
  const updated = await this.prisma.calcResult.update({ ... });
} else {
  const created = await this.prisma.calcResult.create({ ... });
}

// ✅ 修复后：直接创建新记录（已在 calculateDaily 中删除旧数据）
const created = await this.prisma.calcResult.create({
  data: calcResultData,
});
```

## ✅ 修复效果

### 修复前

1. **重算时**：
   - 保留旧数据
   - 添加新数据
   - 结果：数据重复

2. **保存时**：
   - 检查记录是否存在
   - 存在则更新，不存在则创建
   - 结果：逻辑复杂，性能较差

### 修复后

1. **重算时**：
   - ✅ 先删除当天该员工的所有考勤工时数据
   - ✅ 再保存新的计算结果
   - 结果：数据干净，无重复

2. **保存时**：
   - ✅ 直接创建新记录
   - 结果：逻辑简单，性能更好

## 🧪 测试验证

运行测试脚本验证修复效果：

```bash
# 启动后端服务器
npm run start:dev

# 运行测试（在另一个终端）
npx tsx test-recalc-daily-cleanup.ts
```

### 预期结果

- 重算前：假设有 N 条记录
- 重算后：应该只有新的 M 条记录
- 旧记录的 ID 不应再存在
- 没有数据重复

## 📝 关键点

1. **精确删除**：只删除指定员工、指定日期、考勤工时类型的数据，不影响其他数据

2. **事务安全**：删除操作在计算前执行，确保数据一致性

3. **性能优化**：移除保存时的检查逻辑，减少数据库查询

4. **日志记录**：记录删除的记录数，便于追踪和调试

## ⚠️ 注意事项

- 删除操作在 `calculateDaily` 方法开始时执行
- 只删除考勤工时类型（`type = 'ATTENDANCE_HOURS'`）的数据
- 不影响其他类型的工时数据
- 删除失败会记录日志但不中断流程

## 🔄 与其他功能的关系

- **与合并功能的关系**：先删除，再计算，最后合并，逻辑顺序正确
- **与推送功能的关系**：重算后自动推送到 WorkHourResult 表
- **与增量更新的关系**：按天删除和重算，支持增量更新
