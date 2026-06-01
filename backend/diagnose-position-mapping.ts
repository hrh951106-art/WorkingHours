import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnosePositionMapping() {
  console.log('=== 诊断岗位字段映射问题 ===\n');

  try {
    // 1. 查找POSITION数据源
    console.log('1. 查找POSITION数据源\n');

    const positionDS = await prisma.dataSource.findFirst({
      where: { code: 'POSITION' },
    });

    if (!positionDS) {
      console.log('❌ 未找到POSITION数据源');
      await prisma.$disconnect();
      return;
    }

    console.log(`POSITION数据源ID: ${positionDS.id}`);
    console.log(`名称: ${positionDS.name}`);
    console.log('');

    // 2. 查询POSITION数据源的选项
    console.log('2. POSITION数据源选项\n');

    const positionOptions = await prisma.dataSourceOption.findMany({
      where: { dataSourceId: positionDS.id },
      orderBy: { sort: 'asc' },
    });

    console.log(`选项数量: ${positionOptions.length}\n`);

    const positionMap = new Map();
    positionOptions.forEach((opt) => {
      console.log(`  代码: ${opt.value}, 标签: ${opt.label}`);
      positionMap.set(opt.value, opt.label);
    });
    console.log('');

    // 3. 选择一个员工进行诊断
    const employeeNo = '202605014';
    console.log(`3. 查询员工 ${employeeNo} 的数据\n`);

    const employee = await prisma.employee.findFirst({
      where: { employeeNo },
      select: { id: true, name: true },
    });

    if (!employee) {
      console.log('❌ 未找到该员工');
      await prisma.$disconnect();
      return;
    }

    console.log(`员工ID: ${employee.id}, 姓名: ${employee.name}`);
    console.log('');

    // 4. 查询WorkInfoHistory中的岗位值
    console.log('4. WorkInfoHistory中的岗位值\n');

    const workInfoList = await prisma.workInfoHistory.findMany({
      where: { employeeId: employee.id },
      orderBy: { effectiveDate: 'desc' },
      take: 3,
    });

    workInfoList.forEach((wih, index) => {
      console.log(`任职记录 ${index + 1}:`);
      console.log(`  effectiveDate: ${wih.effectiveDate.toISOString().substring(0, 10)}`);
      console.log(`  isCurrent: ${wih.isCurrent}`);
      console.log(`  position: ${wih.position || 'NULL'}`);
      console.log('');
    });

    const currentPosition = workInfoList[0]?.position;
    console.log(`当前任职记录的position: ${currentPosition || 'NULL'}`);
    console.log('');

    // 5. 查询主劳动力账户
    console.log('5. 主劳动力账户层级值\n');

    const mainAccounts = await prisma.laborAccount.findMany({
      where: {
        employeeId: employee.id,
        type: 'MAIN',
        status: 'ACTIVE',
      },
      orderBy: { effectiveDate: 'desc' },
    });

    if (mainAccounts.length === 0) {
      console.log('❌ 未找到活跃的主劳动力账户');
      await prisma.$disconnect();
      return;
    }

    const mainAccount = mainAccounts[0];
    console.log(`账户ID: ${mainAccount.id}`);
    console.log(`路径: ${mainAccount.path}`);
    console.log(`名称路径: ${mainAccount.namePath}`);
    console.log('');

    // 6. 解析hierarchyValues
    console.log('6. 层级值详情\n');

    if (mainAccount.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(mainAccount.hierarchyValues);

        hierarchyValues.forEach((level: any, index: number) => {
          console.log(`Level ${level.level} - ${level.name}:`);
          console.log(`  levelId: ${level.levelId}`);
          console.log(`  mappingType: ${level.mappingType}`);
          console.log(`  mappingValue: ${level.mappingValue || 'NULL'}`);

          if (level.selectedValue) {
            console.log(`  selectedValue.id: ${level.selectedValue.id}`);
            console.log(`  selectedValue.name: ${level.selectedValue.name}`);
            console.log(`  selectedValue.code: ${level.selectedValue.code}`);
          } else {
            console.log(`  selectedValue: NULL`);
          }

          // 检查岗位层级（Level 6）
          if (level.level === 6) {
            console.log(`  ⚠️ 这是岗位层级！`);
            console.log(`  WorkInfoHistory.position: ${currentPosition || 'NULL'}`);
            console.log(`  账户中的岗位代码: ${level.selectedValue?.code || 'NULL'}`);
            console.log(`  账户中的岗位名称: ${level.selectedValue?.name || 'NULL'}`);

            if (level.selectedValue?.code !== currentPosition) {
              console.log(`  ❌ 不匹配！WorkInfoHistory中的岗位与账户中的岗位不一致`);
            } else {
              console.log(`  ✅ 匹配`);
            }
          }
          console.log('');
        });
      } catch (e) {
        console.log('解析hierarchyValues失败:', e);
      }
    }

    console.log('\n=== 分析 ===\n');

    if (currentPosition && mainAccount.hierarchyValues) {
      try {
        const hierarchyValues = JSON.parse(mainAccount.hierarchyValues);
        const positionLevel = hierarchyValues.find((l: any) => l.level === 6);

        if (positionLevel && positionLevel.selectedValue) {
          const accountPositionCode = positionLevel.selectedValue.code;
          const accountPositionName = positionLevel.selectedValue.name;

          console.log('对比结果:');
          console.log(`  WorkInfoHistory.position: ${currentPosition}`);
          console.log(`  账户中的岗位代码: ${accountPositionCode}`);
          console.log(`  账户中的岗位名称: ${accountPositionName}`);
          console.log('');

          // 检查POSITION数据源中是否有这两个值
          const hasWorkInfoPosition = positionMap.has(currentPosition);
          const hasAccountPosition = positionMap.has(accountPositionCode);

          console.log('POSITION数��源检查:');
          console.log(`  ${currentPosition}: ${hasWorkInfoPosition ? '存在 ✅' : '不存在 ❌'} ${hasWorkInfoPosition ? `(${positionMap.get(currentPosition)})` : ''}`);
          console.log(`  ${accountPositionCode}: ${hasAccountPosition ? '存在 ✅' : '不存在 ❌'} ${hasAccountPosition ? `(${positionMap.get(accountPositionCode)})` : ''}`);
          console.log('');

          if (accountPositionCode !== currentPosition) {
            console.log('🔍 问题分析:');
            console.log('  WorkInfoHistory中的岗位代码与账户中的岗位代码不一致');
            console.log('');
            console.log('  可能原因:');
            console.log('  1. 账户生成时的WorkInfoHistory记录已更新');
            console.log('  2. 同步层级时使用了错误的映射逻辑');
            console.log('  3. position字段在CustomField表中的配置有误');
            console.log('');
            console.log('  建议: 需要重新同步该员工的劳动力账户层级');
          } else if (!hasWorkInfoPosition) {
            console.log('🔍 问题分析:');
            console.log('  WorkInfoHistory中的岗位代码在POSITION数据源中不存在');
            console.log('  可能是过时或错误的岗位代码');
          }
          console.log('');

          if (accountPositionCode !== currentPosition) {
            console.log('🔍 问题诊断:');
            console.log('  WorkInfoHistory中的岗位代码与账户中的岗位代码不一致');
            console.log('');
            console.log('  可能原因:');
            console.log('  1. 账户生成时的WorkInfoHistory记录已更新');
            console.log('  2. 同步层级时使用了错误的映射逻辑');
            console.log('  3. position字段在CustomField表中的配置有误');
          }
        }
      } catch (e) {
        console.log('分析失败:', e);
      }
    }

  } catch (error) {
    console.error('❌ 诊断失败:', error);
    throw error;
  }

  await prisma.$disconnect();
}

diagnosePositionMapping()
  .then(() => {
    console.log('\n诊断完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('诊断失败:', error);
    process.exit(1);
  });
