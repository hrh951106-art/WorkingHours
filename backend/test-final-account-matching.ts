import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const lineCode = await prisma.calculationAttendanceCode.findFirst({
    where: { code: 'A02' },
  });

  const accountLevels = JSON.parse(lineCode?.accountLevels || '[]');
  console.log('线体工���配置:');
  console.log(`  账户层级配置: ${accountLevels}`);
  console.log(`  对应层级: level${accountLevels.map(l => l + 1).join(', level')}`);
  console.log(`  层级名称: ${accountLevels.map(l => l === 0 ? '工厂' : l === 1 ? '车间' : '产线').join(', ')}`);
  console.log('');

  // 测试场景
  const testCases = [
    {
      name: '场景1：账户只有工厂、车间、产线（符合配置）',
      hierarchyValues: [
        { level: 1, name: '工厂', mappingType: 'ORG', selectedValue: { name: '大华富阳工厂' } },
        { level: 2, name: '车间', mappingType: 'ORG', selectedValue: { name: 'W1总装车间' } },
        { level: 3, name: '产线', mappingType: 'ORG', selectedValue: { name: 'W1总装车间L1产线' } },
      ],
      expected: true,
    },
    {
      name: '场景2：账户有工厂、车间、产线、产品（超出配置）',
      hierarchyValues: [
        { level: 1, name: '工厂', mappingType: 'ORG', selectedValue: { name: '大华富阳工厂' } },
        { level: 2, name: '车间', mappingType: 'ORG', selectedValue: { name: 'W1总装车间' } },
        { level: 3, name: '产线', mappingType: 'ORG', selectedValue: { name: 'W1总装车间L1产线' } },
        { level: 4, name: '产品', mappingType: 'FIELD_A01', selectedValue: { name: 'A产品' } },
      ],
      expected: false,
    },
    {
      name: '场景3：账户有工厂、车间、产线、工序（超出配置）',
      hierarchyValues: [
        { level: 1, name: '工厂', mappingType: 'ORG', selectedValue: { name: '大华富阳工厂' } },
        { level: 2, name: '车间', mappingType: 'ORG', selectedValue: { name: 'W1总装车间' } },
        { level: 3, name: '产线', mappingType: 'ORG', selectedValue: { name: 'W1总装车间L1产线' } },
        { level: 5, name: '工序', mappingType: 'FIELD_A02', selectedValue: { name: '组装' } },
      ],
      expected: false,
    },
  ];

  console.log('测试场景：\n');

  for (const testCase of testCases) {
    const hierarchyValues = testCase.hierarchyValues;
    const configLevels = accountLevels.map((sortValue: number) => sortValue + 1);

    // 找出账户中有值的所有层级（包括组织层级和字段层级）
    const filledLevels = hierarchyValues
      .filter((hv: any) => hv.selectedValue)
      .map((hv: any) => hv.level);

    // 检查1：配置的每个层级是否都有值
    let check1Passed = true;
    for (const level of configLevels) {
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);
      if (!levelConfig || !levelConfig.selectedValue) {
        check1Passed = false;
        break;
      }
    }

    // 检查2：账户中不能有配置之外的层级有值
    let check2Passed = true;
    for (const filledLevel of filledLevels) {
      if (!configLevels.includes(filledLevel)) {
        check2Passed = false;
        break;
      }
    }

    const matched = check1Passed && check2Passed;

    console.log(`${testCase.name}`);
    console.log(`  有值的层级: ${filledLevels.join(', ')}`);
    console.log(`  配置的层级: ${configLevels.join(', ')}`);
    console.log(`  检查1: ${check1Passed ? '✅' : '❌'}`);
    console.log(`  检查2: ${check2Passed ? '✅' : '❌'}`);
    console.log(`  结果: ${matched ? '✅ 匹配' : '❌ 不匹配'}`);
    console.log(`  预期: ${testCase.expected ? '✅ 匹配' : '❌ 不匹配'}`);
    console.log(`  测试: ${matched === testCase.expected ? '✅ 通过' : '❌ 失败'}`);
    console.log('');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
