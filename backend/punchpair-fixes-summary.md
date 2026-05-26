# PunchPair 修复总结

## 修复内容

### 1. 修复前端精益摆卡结果页签的子劳动力账户字段显示问题

**问题描述**：
- 数据库中有 accountId、accountName、accountPath 字段且有值
- 但前端页面显示"子劳动力账户"列为空

**根本原因**：
- 前端代码期望从 `account.namePath` 读取数据（第372行）
- 但后端API的 `getPunchPairs` 方法没有包含 `account` 关联
- 只有 accountId、accountName、accountPath 字段，没有 account 对象

**修复方案**：
1. ✅ 在 `prisma/schema.prisma` 中为 PunchPair 模型添加 account 关联
   ```prisma
   account  LaborAccount? @relation(fields: [accountId], references: [id], onDelete: SetNull)
   ```

2. ✅ 在 LaborAccount 模型添加反向关联
   ```prisma
   punchPairs  PunchPair[]
   ```

3. ✅ 在 `pairing.service.ts` 的 `getPunchPairs` 方法中包含 account 关联
   ```typescript
   include: {
     employee: true,
     account: true,  // ✅ 新增
     inPunch: { ... },
     outPunch: { ... },
   }
   ```

**测试结果**：
```
ID: 34
- accountId: 8
- account.name: 大华工厂/W1总装车间/W1总装L1产线
- account.namePath: 大华工厂/W1总装车间/W1总装L1产线//
✅ 成功返回account对象
```

---

### 2. 修复 pairDate 存储实际时间的问题

**问题描述**：
- pairDate 存储的是排班日期（schedule.scheduleDate）
- 而不是实际的打卡日期

**根本原因**：
- 代码中直接使用传入的 pairDate 参数（来自排班日期）
- 没有考虑实际打卡时间可能跨越排班日期边界的情况

**修复方案**：
在 `createPunchPairsForAccount` 和 `createPunchPairsForUnscheduledDay` 方法中：
```typescript
// ✅ 修复：pairDate 使用实际打卡日期（inPunchTime 或 outPunchTime 的日期部分）
const actualPunchDate = inTime || outTime;
const actualPairDate = actualPunchDate
  ? new Date(actualPunchDate.getFullYear(), actualPunchDate.getMonth(), actualPunchDate.getDate())
  : pairDate;

const pair = await this.createPunchPair({
  ...
  pairDate: actualPairDate,  // ✅ 使用实际打卡日期
  ...
});
```

**注意事项**：
- pairDate 存储的是日期部分（00:00:00），不是完整的时间戳
- 实际的签入/签出时间仍然存储在 inPunchTime 和 outPunchTime 字段中
- 旧数据的 pairDate 不会自动更新，需要重新执行摆卡才会生效

---

## 修改的文件

1. **backend/prisma/schema.prisma**
   - PunchPair 模型添加 account 关联
   - LaborAccount 模型添加 punchPairs 反向关联

2. **backend/src/modules/punch/pairing.service.ts**
   - getPunchPairs 方法：添加 account 关联到 include
   - createPunchPairsForAccount 方法：使用实际打卡日期作为 pairDate
   - createPunchPairsForUnscheduledDay 方法：使用实际打卡日期作为 pairDate

---

## 验证步骤

### 1. 重新生成 Prisma 客户端
```bash
npx prisma generate
```

### 2. 重启后端服务
```bash
npm run start:dev
```

### 3. 测试子劳动力账户显示
1. 打开前端：系统配置 → 计算管理 → 计算结果页面
2. 切换到"精益摆卡结果"页签
3. 检查"子劳动力账户"列是否正常显示账户路径

### 4. 测试 pairDate 修复（需要重新摆卡）
1. 删除某天的摆卡数据
2. 重新执行精益摆卡
3. 检查新创建的 PunchPair 记录的 pairDate 是否为实际打卡日期

---

## 数据库变更

需要执行 Prisma schema 更新：
```bash
npx prisma db push
```

**注意**：这个操作不会删除现有数据，只是添加关联关系。

---

## 测试脚本验证结果

```bash
npx tsx test-punchpair-fixes.ts
```

**测试结果**：
- ✅ account 关联成功返回
- ✅ account.namePath 字段有值
- ✅ pairDate 使用实际打卡日期（新数据）
- ⚠️ 旧数据的 pairDate 仍是排班日期，需要重新摆卡
