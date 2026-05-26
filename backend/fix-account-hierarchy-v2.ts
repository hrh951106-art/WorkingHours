import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== 修复账户22和27的hierarchyValues（V2）===\n');

  // 1. 查���组织数据
  console.log('步骤1：查找组织数据\n');

  // 查找工厂（杭州工厂）
  const company = await prisma.organization.findFirst({
    where: { type: 'COMPANY' }
  });
  console.log(`工厂: ${company ? `ID=${company.id}, Code=${company.code}, Name=${company.name}` : '未找到'}`);

  // 查找"W1总装车间"
  const department = await prisma.organization.findFirst({
    where: { name: 'W1总装车间' }
  });
  console.log(`W1总装车间: ${department ? `ID=${department.id}, Code=${department.code}` : '未找到'}`);

  // 查找"W1总装L2产线"
  const team = await prisma.organization.findFirst({
    where: { name: 'W1总装L2产线' }
  });
  console.log(`W1总装L2产线: ${team ? `ID=${team.id}, Code=${team.code}` : '未找到'}`);

  console.log('');
  console.log('步骤2：重新构建hierarchyValues\n');

  // 根据账户7的结构，构建账户22的hierarchyValues
  const account22HierarchyValues = [
    {
      levelId: 4,
      level: 1,
      name: "工厂",
      mappingType: "ORG",
      mappingValue: "COMPANY",
      selectedValue: company ? {
        id: company.id,
        name: company.name,
        code: company.code,
        type: "COMPANY"
      } : null
    },
    {
      levelId: 5,
      level: 2,
      name: "车间",
      mappingType: "ORG",
      mappingValue: "DEPARTMENT",
      selectedValue: department ? {
        id: department.id,
        name: department.name,
        code: department.code,
        type: "DEPARTMENT"
      } : null
    },
    {
      levelId: 6,
      level: 3,
      name: "产线",
      mappingType: "ORG",
      mappingValue: "TEAM",
      selectedValue: team ? {
        id: team.id,
        name: team.name,
        code: team.code,
        type: "TEAM"
      } : null
    },
    {
      levelId: 7,
      level: 4,
      name: "产品",
      mappingType: "FIELD_A01",
      mappingValue: null,
      selectedValue: null
    },
    {
      levelId: 8,
      level: 5,
      name: "工序",
      mappingType: "FIELD_A02",
      mappingValue: null,
      selectedValue: {
        name: "焊接",
        code: "A01"
      }
    }
  ];

  // 构建账户27的hierarchyValues（喷漆）
  const account27HierarchyValues = [
    {
      levelId: 4,
      level: 1,
      name: "工厂",
      mappingType: "ORG",
      mappingValue: "COMPANY",
      selectedValue: company ? {
        id: company.id,
        name: company.name,
        code: company.code,
        type: "COMPANY"
      } : null
    },
    {
      levelId: 5,
      level: 2,
      name: "车间",
      mappingType: "ORG",
      mappingValue: "DEPARTMENT",
      selectedValue: department ? {
        id: department.id,
        name: department.name,
        code: department.code,
        type: "DEPARTMENT"
      } : null
    },
    {
      levelId: 6,
      level: 3,
      name: "产线",
      mappingType: "ORG",
      mappingValue: "TEAM",
      selectedValue: team ? {
        id: team.id,
        name: team.name,
        code: team.code,
        type: "TEAM"
      } : null
    },
    {
      levelId: 7,
      level: 4,
      name: "产品",
      mappingType: "FIELD_A01",
      mappingValue: null,
      selectedValue: null
    },
    {
      levelId: 8,
      level: 5,
      name: "工序",
      mappingType: "FIELD_A02",
      mappingValue: null,
      selectedValue: {
        name: "喷漆",
        code: "A02"
      }
    }
  ];

  console.log('步骤3：更新账户22\n');

  // 更新账户22
  await prisma.laborAccount.update({
    where: { id: 22 },
    data: {
      hierarchyValues: JSON.stringify(account22HierarchyValues),
      path: `${company?.code || 'DH'}/${department?.code || 'DH01'}/${team?.code || 'DH01002'}//A01`,
      namePath: `${company?.name || '杭州工厂'}/${department?.name || 'W1总装车间'}/${team?.name || 'W1总装L2产线'}//焊接`,
      level: 4
    }
  });
  console.log('✅ 账户22已更新');

  console.log('');
  console.log('步骤4：更新账户27\n');

  // 更新账户27
  await prisma.laborAccount.update({
    where: { id: 27 },
    data: {
      hierarchyValues: JSON.stringify(account27HierarchyValues),
      path: `${company?.code || 'DH'}/${department?.code || 'DH01'}/${team?.code || 'DH01002'}//A02`,
      namePath: `${company?.name || '杭州工厂'}/${department?.name || 'W1总装车间'}/${team?.name || 'W1总装L2产线'}//喷漆`,
      level: 4
    }
  });
  console.log('✅ 账户27已更新');

  console.log('');
  console.log('=== 修复完成 ===\n');
  console.log('下一步：验证修复结果并重新计算5月9日的工时');
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
