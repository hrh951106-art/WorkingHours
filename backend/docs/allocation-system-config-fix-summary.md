# 间接工时分摊SystemConfig配置修复说明

## 问题描述

之前发现前端页面显示的配置值与后端实际使用的配置值不一致：

- **前端页面**（系统配置-工时管理-基础配置）显示：
  - AL1001（实际工时代码）：A02_LINE
  - AL1002（间接工时代码）：A06

- **后端实际使用**（AllocationGeneralConfig表）：
  - AL1001：A01
  - AL1002：A02_LINE

这导致用户在页面上看到的是A02_LINE和A06，但后端执行A02间接工时分摊规则时使用的是A01和A02_LINE，造成配置混乱和分摊结果不正确。

## 根本原因

系统中存在两个配置表：
1. **SystemConfig表**：前端UI使用，通过`/hr/system-configs` API访问
2. **AllocationGeneralConfig表**：后端分摊计算使用

这两个表的数据不同步，导致前后端配置不一致。

## 解决方案

修改后端代码，让分摊计算也使用SystemConfig表，与前端保持一致：

### 修改文件
`/Users/aaron.he/Desktop/AI/JY/backend/src/modules/allocation/allocation.service.ts`

### 修改位置
Lines 2360-2385

### 修改内容

**修改前**（使用AllocationGeneralConfig表）：
```typescript
// 获取通用配置
const generalConfig = await this.prisma.allocationGeneralConfig.findFirst();
if (!generalConfig || !generalConfig.actualHoursAllocationCode || !generalConfig.indirectHoursAllocationCode) {
  console.error(`[分摊计算] 通用配置未设置，generalConfig:`, generalConfig);
  throw new BadRequestException('请先配置通用配置中的直接工时和间接工时代码');
}

console.log(`[分摊计算] 通用配置 - 直接工时代码: ${generalConfig.actualHoursAllocationCode}, 间接工时代码: ${generalConfig.indirectHoursAllocationCode}`);

// 获取直接工时出勤代码（从定义考勤代码表）
const actualHoursCode = await this.prisma.definitionAttendanceCode.findUnique({
  where: { code: generalConfig.actualHoursAllocationCode },
});
// ...
```

**修改后**（使用SystemConfig表）：
```typescript
// 从SystemConfig获取AL1001和AL1002参数
const systemConfigs = await this.prisma.systemConfig.findMany({
  where: {
    configKey: {
      in: ['actualHoursAllocationCode', 'indirectHoursAllocationCode'],
    },
  },
});

const actualHoursAllocationCodeConfig = systemConfigs.find(c => c.configKey === 'actualHoursAllocationCode');
const indirectHoursAllocationCodeConfig = systemConfigs.find(c => c.configKey === 'indirectHoursAllocationCode');

if (!actualHoursAllocationCodeConfig || !actualHoursAllocationCodeConfig.configValue) {
  console.error(`[分摊计算] SystemConfig中未找到AL1001参数(actualHoursAllocationCode)`);
  throw new BadRequestException('请先在系统配置-工时管理-基础配置中设置AL1001实际工时代码');
}

if (!indirectHoursAllocationCodeConfig || !indirectHoursAllocationCodeConfig.configValue) {
  console.error(`[分摊计算] SystemConfig中未找到AL1002参数(indirectHoursAllocationCode)`);
  throw new BadRequestException('请先在系统配置-工时管理-基础配置中设置AL1002间接工时代码');
}

console.log(`[分摊计算] SystemConfig配置 - AL1001(实际工时): ${actualHoursAllocationCodeConfig.configValue}, AL1002(间接工时): ${indirectHoursAllocationCodeConfig.configValue}`);

// 获取实际工时出勤代码（从定义考勤代码表）
const actualHoursCode = await this.prisma.definitionAttendanceCode.findUnique({
  where: { code: actualHoursAllocationCodeConfig.configValue },
});
// ...
```

## 验证结果

运行验证脚本 `verify-system-config-fix.ts`：

```
1️⃣ SystemConfig表中的AL1001和AL1002参数:
  ✅ AL1001 (实际工时代码): "A02_LINE"
  ✅ AL1002 (间接工时代码): "A06"

2️⃣ 验证代码在DefinitionAttendanceCode表中是否存在:
  ✅ "A02_LINE" 存在 - 线体工时
  ✅ "A06" 存在 - 分摊工时

3️⃣ AllocationGeneralConfig表（旧配置，不再使用）:
  AL1001: "A01"
  AL1002: "A02_LINE"

4️⃣ 验证结论:
  前端使用: SystemConfig表
  后端使用: SystemConfig表 ✅ (已修复)
  数据一致性: ✅ 已统一
```

## 功能说明

修复后的行为：

1. **间接工时分摊时使用按实际工时比例分摊**：
   - 从SystemConfig表的AL1001参数获取实际工时代码（当前：A02_LINE）
   - 使用该代码的工时作为分摊基数

2. **分摊完成后存储**：
   - 从SystemConfig表的AL1002参数获取目标出勤代码（当前：A06）
   - 分摊后的工时存储到该代码

3. **前后端一致性**：
   - 前端页面修改配置后，后端自动使用新配置
   - 无需手动同步两个表的数据

## 使用说明

1. **修改配置**：
   - 登录系统
   - 进入：系统配置 → 工时管理 → 基础配置
   - 在"工时基础配置"页签中修改AL1001和AL1002参数
   - 保存后立即生效

2. **执行分摊计算**：
   - 进入：成本分摊 → 分摊配置
   - 选择A02间接工时分摊规则
   - 点击执行计算
   - 系统会自动使用SystemConfig中的最新配置

## 注意事项

- AllocationGeneralConfig表已不再使用，保留仅为向后兼容
- 所有配置修改应通过前端页面进行
- 后端代码会从SystemConfig读取配置，确保实时性

## 相关文件

- 修改的代码：`src/modules/allocation/allocation.service.ts` (lines 2360-2385)
- 验证脚本：`verify-system-config-fix.ts`
- 前端页面：`frontend/src/pages/allocation/AllocationBasicConfigPage.tsx`
