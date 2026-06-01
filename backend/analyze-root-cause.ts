import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== A01 分摊问题根本��因分析 ==========\n');

  // 1. 获取关键数据
  const prodRecord = await prisma.productionRecord.findFirst({
    where: { recordDate: new Date('2026-05-19') }
  });

  const workHours = await prisma.workHourResult.findMany({
    where: {
      calcDate: new Date('2026-05-19'),
      attendanceCode: 'A06'
    }
  });

  // 2. 检查生产记录的组织
  console.log('【关键数据】');
  console.log(`生产记录组织ID: ${prodRecord?.orgId}`);
  console.log(`生产记录组织名称: ${prodRecord?.orgName}`);
  console.log(`工时结果账户路径: ${workHours[0]?.accountPath}`);
  console.log(`工时结果数量: ${workHours.length}`);

  // 3. 获取组织113的信息
  console.log('\n【组织113信息】');
  const org = await prisma.organization.findUnique({
    where: { id: prodRecord?.orgId }
  });

  if (org) {
    console.log(`代码: ${org.code}`);
    console.log(`名称: ${org.name}`);
    console.log(`类型: ${org.type}`);
    console.log(`父组织ID: ${org.parentId}`);
  }

  // 4. 查看工时结果中员工的详细信息
  console.log('\n【工时结果详情】');
  for (const wh of workHours) {
    const emp = await prisma.employee.findUnique({
      where: { employeeNo: wh.employeeNo }
    });

    // 获取该员工的主账户
    const mainAccount = await prisma.laborAccount.findFirst({
      where: {
        employeeId: emp?.id,
        type: 'MAIN'
      }
    });

    console.log(`员工: ${wh.employeeNo}`);
    console.log(`  主账户路径: ${mainAccount?.namePath}`);
    console.log(`  工时结果账户: ${wh.accountPath}`);
    console.log(`  工时: ${wh.workHours}`);
    console.log('');
  }

  // 5. 核心问题分析
  console.log('【核心问题】\n');

  console.log('问题1: 账户层级不匹配');
  console.log(`  工时结果账户路径: ${workHours[0]?.accountPath}`);
  console.log(`  包含层级: SZ/SU01/SZ0101//A03//`);
  console.log(`  生产记录组织: ${prodRecord?.orgName} (orgId=${prodRecord?.orgId})`);
  console.log(`  ❌ 工时结果的账户是A03层级，不是电焊层级`);

  console.log('\n问题2: 生产记录的orgId与工时结果账户不对应');
  console.log(`  生产记录orgId: ${prodRecord?.orgId}`);
  console.log(`  这个orgId(${prodRecord?.orgId})可能指向"电焊"这个层级`);
  console.log(`  但工时结果来自A03层级的账户`);
  console.log(`  分摊计算时，找不到orgId=${prodRecord?.orgId}的账户，所以无法分摊`);

  console.log('\n问题3: 分摊计算逻辑');
  console.log('  分摊计算的流程:');
  console.log('  1. 获取生产记录（包含orgId作为来源账户）');
  console.log('  2. 查询工时结果（按账户筛选条件过滤）');
  console.log('  3. 使用来源账户(orgId)匹配工时结果的账户');
  console.log('  4. 如果工时结果的账户路径不包含来源账户，则无法分摊');

  console.log('\n【根本原因】');
  console.log('❌ 工时结果的账户(A03层级)与生产记录的来源账户(orgId=113,可能是电焊层级)不匹配');
  console.log('❌ 导致分摊计算时找不到对应的账户，无法计算分摊比例');
  console.log('❌ 最终结果：没有产生分摊数据');

  console.log('\n========== 分析完成 ==========');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
