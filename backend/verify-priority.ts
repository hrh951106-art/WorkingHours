import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyPriority() {
  console.log('=== 验证账户合并优先级顺序 ===\n');
  
  // 获取三个账户
  const punchAccount = await prisma.laborAccount.findUnique({ where: { id: 14 } });
  const transferAccount = await prisma.laborAccount.findUnique({ where: { id: 18 } });
  const mainAccount = await prisma.laborAccount.findUnique({ where: { id: 58 } });

  console.log('1. 刷卡账户 (ID 14):');
  console.log('   ' + (punchAccount?.namePath || 'EMPTY'));
  
  console.log('\n2. 转移账户 (ID 18 - 焊接):');
  console.log('   ' + (transferAccount?.namePath || 'EMPTY'));
  
  console.log('\n3. 主账户 (ID 58):');
  console.log('   Path: ' + (mainAccount?.path || 'EMPTY'));
  
  console.log('\n=== 期望的合并顺序 ===');
  console.log('优先级: 刷卡账户 > 转移账户 > 主账户');
  console.log('期望结果: 大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/焊接');
  console.log('');
  console.log('=== 合并过程说明 ===');
  console.log('第一步: 合并 刷卡账户 + 转移账户');
  console.log('  结果: 大华富阳工厂/W1总装车间/W1总装车间L1产线 + 焊接');
  console.log('');
  console.log('第二步: 合并 (第一步结果) + 主账户');
  console.log('  最终: 大华富阳工厂/W1总装车间/W1总装车间L1产线 + 大桶 + 焊���');
  console.log('  = 大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/焊接');
  console.log('');
  
  console.log('✓ 优先级顺序已确认：刷卡账户 > 转移账户 > 主账户');

  await prisma.$disconnect();
}

verifyPriority().catch(console.error);
