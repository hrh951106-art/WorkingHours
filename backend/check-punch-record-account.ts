import { PrismaService } from './src/database/prisma.service';

/**
 * 检查打卡记录中的账户字段
 */

async function checkPunchRecordAccounts() {
  const prisma = new PrismaService();

  try {
    console.log('=== 检查打卡记录的账户字段 ===\n');

    // 查询所有打卡记录
    const records = await prisma.punchRecord.findMany({
      include: {
        device: true,
        account: true,
      },
      take: 10,
    });

    console.log(`找到 ${records.length} 条打卡记录\n`);

    // 查询设备账户绑定
    const deviceAccounts = await prisma.deviceAccount.findMany({
      where: {
        deviceId: {
          in: records.map(r => r.deviceId),
        },
      },
      include: {
        account: true,
      },
    });

    // 按设备ID分组
    const deviceAccountsMap = new Map<number, any[]>();
    for (const da of deviceAccounts) {
      if (!deviceAccountsMap.has(da.deviceId)) {
        deviceAccountsMap.set(da.deviceId, []);
      }
      deviceAccountsMap.get(da.deviceId)!.push(da);
    }

    for (const record of records) {
      console.log(`--- 记录 ID: ${record.id} ---`);
      console.log(`员工: ${record.employeeNo}`);
      console.log(`打卡时间: ${record.punchTime}`);
      console.log(`设备: ${record.device.name} (ID: ${record.device.id})`);

      // 显示设备绑定的账户
      const accounts = deviceAccountsMap.get(record.deviceId) || [];
      if (accounts.length > 0) {
        console.log('设备绑定的账户:');
        for (const deviceAccount of accounts) {
          console.log(`  - 账户ID: ${deviceAccount.accountId}`);
          if (deviceAccount.account) {
            console.log(`    账户名称: ${deviceAccount.account.name}`);
            console.log(`    账户路径: ${deviceAccount.account.path}`);
          }
        }
      } else {
        console.log('设备未绑定账户');
      }

      // 显示打卡记录的账户
      console.log(`打卡记录的 accountId: ${record.accountId}`);
      if (record.account) {
        console.log(`打卡记录的账户名称: ${record.account.name}`);
        console.log(`打卡记录的账户路径: ${record.account.path}`);
      } else {
        console.log('打卡记录未设置账户 (应该是 null)');
      }

      console.log('');
    }

    // 检查是否有 accountId 被自动设置为设备账户的情况
    console.log('\n=== 检查自动合并情况 ===\n');

    let autoMergedCount = 0;
    for (const record of records) {
      const accounts = deviceAccountsMap.get(record.deviceId) || [];
      if (record.accountId && accounts.length > 0) {
        // 检查打卡记录的 accountId 是否等于设备绑定的 accountId
        const deviceAccountIds = accounts.map(da => da.accountId);
        if (deviceAccountIds.includes(record.accountId)) {
          console.log(`⚠️  记录 ID ${record.id}: accountId (${record.accountId}) 与设备绑定的账户相同`);
          autoMergedCount++;
        }
      }
    }

    if (autoMergedCount === 0) {
      console.log('✓ 未发现自动合并的情况');
    } else {
      console.log(`\n✗ 发现 ${autoMergedCount} 条记录可能被自动合并了账户`);
    }

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPunchRecordAccounts();
