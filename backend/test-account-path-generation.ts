import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const employeeNo = '202604003';
  
  const employee = await prisma.employee.findFirst({
    where: { employeeNo },
    include: { org: true }
  });
  
  if (!employee) {
    console.log('员工不存在');
    return;
  }
  
  console.log('=== 员工信息 ===');
  console.log('工号:', employee.employeeNo);
  console.log('姓名:', employee.name);
  console.log('当前组织:', employee.org?.name, '(ID:', employee.orgId, ')');
  
  // 模拟账户路径计算
  const hierarchyConfigs = await prisma.accountHierarchyConfig.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { level: 'asc' }
  });
  
  console.log('\n=== 账户层级配置 ===');
  hierarchyConfigs.forEach(config => {
    console.log('Level ' + config.level + ': ' + config.name + ' (type=' + config.mappingType + ', value=' + config.mappingValue + ')');
  });
  
  // 测试 findOrgByType 方法
  console.log('\n=== 测试组织查找 ===');
  
  const orgTypes = ['02', '03', '04'];
  for (const orgType of orgTypes) {
    const org = await findOrgByType(prisma, employee.orgId, orgType);
    console.log('Type=' + orgType + ' -> ' + (org?.name || '未找到'));
  }
  
  // 构建完整路径
  console.log('\n=== 构建账户路径 ===');
  const pathParts = [];
  
  for (const config of hierarchyConfigs) {
    let accountCode = '-';
    
    if (config.mappingType === 'ORG') {
      if (config.mappingValue) {
        accountCode = await findOrgByType(prisma, employee.orgId, config.mappingValue);
      }
    }
    
    pathParts.push(accountCode || '-');
    console.log('Level ' + config.level + ': ' + accountCode + ' (' + config.name + ')');
  }
  
  console.log('\n完整路径: ' + pathParts.join('/'));
}

async function findOrgByType(prisma: PrismaClient, orgId: number, orgType: string): Promise<string | null> {
  let org = await prisma.organization.findUnique({
    where: { id: orgId }
  });
  
  if (!org) return null;
  
  // 如果当前组织就是目标类型，直接返回
  if (org.type === orgType) {
    return org.name;
  }
  
  // 否则向上查找
  while (org && org.parentId) {
    org = await prisma.organization.findUnique({
      where: { id: org.parentId }
    });
    
    if (org && org.type === orgType) {
      return org.name;
    }
  }
  
  return null;
}

main()
  .then(() => console.log('\n测试完成'))
  .catch(console.error)
  .finally(() => prisma.$disconnect());
