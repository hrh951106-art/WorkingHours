import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/modules/punch/pairing.service.ts';
let content = readFileSync(filePath, 'utf-8');

// 找到需要替换的部分
const oldCode = `    const allPairs = [];

    for (const [accountId, punches] of accountGroups.entries()) {
      // 删除旧的摆卡记录（未排班日期使用特殊标识）
      // 注意：未排班日期的shiftId为null，删除时不使用shiftId作为条件
      await this.prisma.punchPair.deleteMany({
        where: {
          employeeNo: employeeNo,
          pairDate: dayStart,
          accountId: accountId,
          // 未排班日期：只删除shiftId为null的记录
          // 由于Prisma限制，先删除所有符合条件的记录，然后重新创建
        },
      });

      // 为每个账户组进行摆卡（无班次模式）
      const pairs = await this.createPunchPairsForUnscheduledDay(
        employeeNo,
        dayStart,
        punches,
        punchRule,
        accountId,
        deviceGroupConfigs,
        collectionRange,
      );

      allPairs.push(...pairs);
    }`;

const newCode = `    // ✅ 先删除该员工当天的所有旧未排班摆卡数据（一次性删除，不按账户）
    // 注意：未排班日期的shiftId为null，所以只删除shiftId为null的记录
    const deletedCount = await this.prisma.punchPair.deleteMany({
      where: {
        employeeNo: employeeNo,
        pairDate: dayStart,
        shiftId: null, // 未排班日期
      },
    });

    console.log(\`[未排班摆卡] 删除员工 \${employeeNo} 在 \${pairDate.toISOString().split('T')[0]} 的旧未排班摆卡数据: \${deletedCount.count} 条\`);

    const allPairs = [];

    for (const [accountId, punches] of accountGroups.entries()) {
      // 为每个账户组进行摆卡（无班次模式）
      const pairs = await this.createPunchPairsForUnscheduledDay(
        employeeNo,
        dayStart,
        punches,
        punchRule,
        accountId,
        deviceGroupConfigs,
        collectionRange,
      );

      allPairs.push(...pairs);
    }`;

if (content.includes(oldCode)) {
  content = content.replace(oldCode, newCode);
  writeFileSync(filePath, content, 'utf-8');
  console.log('✅ 修复成功');
} else {
  console.log('❌ 未找到需要替换的代码');
  console.log('请检查文件内容');
}
