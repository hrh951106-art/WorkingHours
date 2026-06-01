import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixAccount162() {
  const employeeNo = '202605013';
  console.log(`=== 修复员工 ${employeeNo} 的账户162 ===\n`);

  // 1. 查询员工
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    select: { id: true, name: true },
  });

  if (!employee) {
    console.log('未找到员工');
    return;
  }

  console.log(`员工: ${employee.name} (${employeeNo})`);

  // 2. 查询WorkInfoHistory获取岗位和职级
  const workInfoHistory = await prisma.workInfoHistory.findFirst({
    where: {
      employeeId: employee.id,
      isCurrent: true,
    },
    select: {
      position: true,
      jobLevel: true,
    },
  });

  if (!workInfoHistory) {
    console.log('未找到WorkInfoHistory');
    return;
  }

  console.log(`WorkInfoHistory数据:`);
  console.log(`  岗位: ${workInfoHistory.position || 'NULL'}`);
  console.log(`  职级: ${workInfoHistory.jobLevel || 'NULL'}`);

  if (!workInfoHistory.position || !workInfoHistory.jobLevel) {
    console.log('❌ WorkInfoHistory缺少岗位或职级数据');
    return;
  }

  // 3. 查询账户162
  const account = await prisma.laborAccount.findFirst({
    where: {
      employeeId: employee.id,
      id: 162,
    },
  });

  if (!account) {
    console.log('未找到账户162');
    return;
  }

  console.log(`\n当前账户162 ID: ${account.id}`);
  console.log(`当前状态: ${account.status}`);

  // 4. 解析现有的hierarchyValues
  let hierarchyValues: any[] = [];
  if (account.hierarchyValues) {
    try {
      hierarchyValues = JSON.parse(account.hierarchyValues);
      console.log(`\n现有层级数量: ${hierarchyValues.length}`);
    } catch (e) {
      console.log('解析hierarchyValues失败，将重新创建');
      hierarchyValues = [];
    }
  }

  // 5. 查询员工组织信息
  const employeeWithOrg = await prisma.employee.findFirst({
    where: { id: employee.id },
    select: {
      org: {
        select: {
          id: true,
          name: true,
          code: true,
          type: true,
          parentId: true,
          parent: {
            select: {
              id: true,
              name: true,
              code: true,
              type: true,
              parentId: true,
              parent: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                  type: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 6. 准备所有7层的层级值
  const allLevelValues: any[] = [];

  // Level 1: 工厂 (从组织向上查找第3级)
  let level1Org = employeeWithOrg?.org;
  while (level1Org && level1Org.parent && level1Org.parent.parent) {
    level1Org = level1Org.parent.parent;
  }
  if (level1Org) {
    allLevelValues.push({
      level: 1,
      name: '杭州工厂',
      selectedValue: {
        id: level1Org.id,
        name: level1Org.name,
        code: level1Org.code,
        type: level1Org.type,
        value: level1Org.code,
      },
      selectedValueLabel: level1Org.name,
    });
  }

  // Level 2: 车间 (从组织向上查找第2级)
  let level2Org = employeeWithOrg?.org;
  while (level2Org && level2Org.parent && level2Org.parent.parent) {
    level2Org = level2Org.parent;
  }
  if (level2Org) {
    allLevelValues.push({
      level: 2,
      name: '苏州工厂',
      selectedValue: {
        id: level2Org.id,
        name: level2Org.name,
        code: level2Org.code,
        type: level2Org.type,
        value: level2Org.code,
      },
      selectedValueLabel: level2Org.name,
    });
  }

  // Level 3: 班组 (员工所属组织)
  if (employeeWithOrg?.org) {
    allLevelValues.push({
      level: 3,
      name: '焊接班组',
      selectedValue: {
        id: employeeWithOrg.org.id,
        name: employeeWithOrg.org.name,
        code: employeeWithOrg.org.code,
        type: employeeWithOrg.org.type,
        value: employeeWithOrg.org.code,
      },
      selectedValueLabel: employeeWithOrg.org.name,
    });
  }

  // Level 4-5: 产品/工序 (暂无数据，设为NULL)
  allLevelValues.push({ level: 4, name: '产品', selectedValue: null, selectedValueLabel: null });
  allLevelValues.push({ level: 5, name: '工序', selectedValue: null, selectedValueLabel: null });

  // Level 6: 岗位
  allLevelValues.push({
    level: 6,
    name: '岗位',
    selectedValue: {
      name: '焊接岗位',
      code: workInfoHistory.position,
      value: workInfoHistory.position,
    },
    selectedValueLabel: '焊接岗位',
  });

  // Level 7: 技能等级
  allLevelValues.push({
    level: 7,
    name: '技能等级',
    selectedValue: {
      name: '五类二级',
      code: workInfoHistory.jobLevel,
      value: workInfoHistory.jobLevel,
    },
    selectedValueLabel: '五类二级',
  });

  // 7. 更新hierarchyValues
  hierarchyValues = allLevelValues;
  console.log(`\n✅ 准备更新所有7层层级值`);

  // 6. 按level排序
  hierarchyValues.sort((a, b) => a.level - b.level);

  // 7. 更新账户
  const updatedAccount = await prisma.laborAccount.update({
    where: { id: 162 },
    data: {
      hierarchyValues: JSON.stringify(hierarchyValues),
    },
  });

  console.log(`\n✅ 账户162已更新`);
  console.log(`更新后的层级数量: ${hierarchyValues.length}`);

  console.log('\n更新后的层级详情：');
  hierarchyValues.forEach((hv) => {
    const hasValue = hv.selectedValue ? '✅' : '❌';
    const valueStr = hv.selectedValue ? JSON.stringify(hv.selectedValue) : 'NULL';
    console.log(`  ${hasValue} Level ${hv.level}: ${valueStr}`);
  });

  // 8. 验证buildNamePath结果
  const namePath = hierarchyValues
    .filter((v: any) => v.selectedValue)
    .map((v: any) => v.selectedValueLabel || v.selectedValue?.name)
    .join('/');

  console.log(`\nbuildNamePath结果: ${namePath}`);

  await prisma.$disconnect();
}

fixAccount162()
  .then(() => {
    console.log('\n修复完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('修复失败:', error);
    process.exit(1);
  });
