import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 修复jobLevel字段的数据源配置
 */
async function fixJobLevelDataSource() {
  console.log('=== 修复jobLevel字段数据源配置 ===\n');

  // 1. 将jobLevel字段的数据源改回JOB_LEVEL
  console.log('1. 更新jobLevel字段的数据源为JOB_LEVEL...');

  const updated = await prisma.customField.update({
    where: { code: 'jobLevel' },
    data: {
      dataSourceId: 13, // JOB_LEVEL数据源的ID
    },
  });

  console.log(`✅ 已更新jobLevel字段`);
  console.log(`   字段ID: ${updated.id}`);
  console.log(`   新数据源ID: ${updated.dataSourceId}`);
  console.log('');

  // 2. 验证更新
  console.log('2. 验证配置...');

  const jobLevelField = await prisma.customField.findUnique({
    where: { code: 'jobLevel' },
    include: {
      dataSource: {
        include: {
          options: {
            where: { isActive: true },
            orderBy: { value: 'asc' },
          },
        },
      },
    },
  });

  let level008Option: any = null;

  if (jobLevelField?.dataSource) {
    console.log(`当前数据源: ${jobLevelField.dataSource.code} - ${jobLevelField.dataSource.name}`);
    console.log('');

    level008Option = jobLevelField.dataSource.options.find(
      (opt: any) => opt.value === 'LEVEL_008'
    );

    if (level008Option) {
      console.log('✅ LEVEL_008配置验证:');
      console.log(`   值: ${level008Option.value}`);
      console.log(`   标签: ${level008Option.label}`);
      console.log('');
      console.log('✅ 修复成功！LEVEL_008现在显示为: ' + level008Option.label);
    }
  }

  // 3. 更新202605014的账户
  console.log('');
  console.log('3. 更新202605014的账户显示...');

  const employee = await prisma.employee.findFirst({
    where: { employeeNo: '202605014' },
    select: { id: true },
  });

  if (employee && level008Option) {
    const account = await prisma.laborAccount.findFirst({
      where: {
        employeeId: employee.id,
        type: 'MAIN',
        status: 'ACTIVE',
      },
    });

    if (account && account.hierarchyValues) {
      const hv = JSON.parse(account.hierarchyValues);
      const level7 = hv.find((level: any) => level.level === 7);

      if (level7 && level7.selectedValue) {
        // 更新namePath
        const pathParts = account.namePath?.split('/') || [];
        if (pathParts.length >= 7) {
          pathParts[6] = level008Option.label;
          const newNamePath = pathParts.join('/');

          await prisma.laborAccount.update({
            where: { id: account.id },
            data: {
              namePath: newNamePath,
              hierarchyValues: JSON.stringify(hv),
            },
          });

          console.log('✅ 账户已更新');
          console.log(`   新名称路径: ${newNamePath}`);
        }
      }
    }
  }

  console.log('');
  console.log('=== 修复完成 ===');
  console.log('jobLevel字段现在使用正确的数据源JOB_LEVEL');
  console.log('LEVEL_008将显示为: 四类三级');

  await prisma.$disconnect();
}

fixJobLevelDataSource()
  .then(() => {
    console.log('\n操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('操作失败:', error);
    process.exit(1);
  });
