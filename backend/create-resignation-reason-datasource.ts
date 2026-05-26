import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createResignationReasonDataSource() {
  // 创建 RESIGNATION_REASON 数据源
  const dataSource = await prisma.dataSource.upsert({
    where: { code: 'RESIGNATION_REASON' },
    update: {},
    create: {
      code: 'RESIGNATION_REASON',
      name: '离职原因',
      type: 'SYSTEM',
      status: 'ACTIVE',
      description: '员工离职原因选项（系统内置）',
    }
  });

  console.log('数据源创建成功:', dataSource);

  // 删除旧的选项（如果存在）
  await prisma.dataSourceOption.deleteMany({
    where: { dataSourceId: dataSource.id }
  });

  // 创建选项
  const options = [
    { value: 'PERSONAL', label: '个人原因', sort: 1 },
    { value: 'COMPANY_DOWNFALL', label: '公司倒闭', sort: 2 },
    { value: 'SALARY_UNSATISFIED', label: '薪资不满意', sort: 3 },
    { value: 'CAREER_DEVELOPMENT', label: '职业发展', sort: 4 },
    { value: 'JOB_DISSATISFACTION', label: '工作不满意', sort: 5 },
    { value: 'WORK_LIFE_BALANCE', label: '工作生活平衡', sort: 6 },
    { value: 'FAMILY_REASON', label: '家庭原因', sort: 7 },
    { value: 'HEALTH_REASON', label: '健康原因', sort: 8 },
    { value: 'FURTHER_EDUCATION', label: '继续深造', sort: 9 },
    { value: 'COMPANY_RESTRUCTURE', label: '公司架构调整', sort: 10 },
    { value: 'CONTRACT_EXPIRED', label: '合同到期', sort: 11 },
    { value: 'TERMINATION', label: '解除劳动合同', sort: 12 },
    { value: 'RETIREMENT', label: '退休', sort: 13 },
    { value: 'OTHER', label: '其他', sort: 14 },
  ];

  for (const option of options) {
    await prisma.dataSourceOption.create({
      data: {
        dataSourceId: dataSource.id,
        value: option.value,
        label: option.label,
        sort: option.sort,
        isActive: true,
      }
    });
  }

  console.log('选项创建成功');

  // 验证结果
  const created = await prisma.dataSource.findFirst({
    where: { code: 'RESIGNATION_REASON' },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sort: 'asc' }
      }
    }
  });

  console.log('\n=== 验证结果 ===');
  console.log('数据源:', created?.name, `(${created?.code})`);
  created?.options.forEach(opt => {
    console.log(`  - ${opt.label} (${opt.value})`);
  });
}

createResignationReasonDataSource()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
