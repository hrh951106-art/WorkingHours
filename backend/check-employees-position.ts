import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('========== 检���员工202605012和202605013的详细信息 ==========\n');

  const employees = await prisma.employee.findMany({
    where: {
      employeeNo: {
        in: ['202605012', '202605013']
      }
    },
    include: {
      org: true,
    }
  });

  for (const emp of employees) {
    console.log(`\n=== 员工: ${emp.employeeNo} - ${emp.name} ===`);
    console.log(`组织: ${emp.org?.name} (${emp.org?.code})`);
    console.log(`入职日期: ${emp.entryDate}`);

    // 查询当前工作信息
    const workInfo = await prisma.workInfoHistory.findFirst({
      where: {
        employeeId: emp.id,
        isCurrent: true
      }
    });

    if (workInfo) {
      console.log('\n当前工作信息:');
      console.log(`  岗位(position): ${workInfo.position || '-'}`);
      console.log(`  职级(jobLevel): ${workInfo.jobLevel || '-'}`);
      console.log(`  用工形式(employeeType): ${workInfo.employeeType || '-'}`);
      console.log(`  工作地点(workLocation): ${workInfo.workLocation || '-'}`);
      console.log(`  成本中心(costCenter): ${workInfo.costCenter || '-'}`);
      console.log(`  工作关系(employmentRelation): ${workInfo.employmentRelation || '-'}`);
      console.log(`  自定义字段: ${workInfo.customFields || '{}'}`);
    }

    // 查询主劳动力账户
    const mainAccount = await prisma.laborAccount.findFirst({
      where: {
        employeeId: emp.id,
        type: 'MAIN'
      }
    });

    if (mainAccount) {
      console.log('\n当前主劳动力账户:');
      console.log(`  路径: ${mainAccount.path}`);
      console.log(`  名称路径: ${mainAccount.namePath}`);
      console.log(`  层级值: ${mainAccount.hierarchyValues || '{}'}`);

      // 解析层级值
      if (mainAccount.hierarchyValues && mainAccount.hierarchyValues !== '{}') {
        try {
          const levels = JSON.parse(mainAccount.hierarchyValues);
          console.log('\n层级详情:');
          levels.forEach((level: any, idx: number) => {
            console.log(`  层级${idx + 1}: ${level.name} (${level.code}) - ${level.value || '-'}`);
          });
        } catch (e) {
          console.error('解析层级值失败:', e);
        }
      }
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
