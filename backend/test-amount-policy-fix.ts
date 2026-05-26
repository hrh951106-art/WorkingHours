import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAmountPolicy() {
  console.log('========================================');
  console.log('测试金额政策配置和匹配');
  console.log('========================================\n');

  // 1. 获取金额政策
  const policy = await prisma.amountPolicy.findFirst({
    where: { id: 1, status: 'ACTIVE' },
  });

  console.log('【金额政策配置】');
  console.log('  ID:', policy?.id);
  console.log('  名称:', policy?.name);
  console.log('  账户路径:', policy?.accountPath);
  console.log('  匹配模式:', policy?.accountPathMatch);
  console.log('  出勤代码:', policy?.attendanceCodes);
  console.log('  倍数:', policy?.multiplier);
  console.log('');

  // 2. 测试路径匹配
  const actualPath = '大华富阳工厂/W1总装车间/W1总装车间L2产线/大桶/焊接/-/-';
  const policyPath = policy?.accountPath || '';

  console.log('【路径匹配测试】');
  console.log('  实际路径:', actualPath);
  console.log('  政策路径:', policyPath);

  // 简化的匹配逻辑
  const policyParts = policyPath.split('/');
  const actualParts = actualPath.split('/');

  let requiredMatches = 0;
  let matchCount = 0;

  for (let i = 0; i < Math.max(policyParts.length, actualParts.length); i++) {
    const policyValue = policyParts[i] || '';
    const actualValue = actualParts[i] || '';

    if (!policyValue || policyValue === '-' || policyValue === '') {
      continue;
    }

    requiredMatches++;

    if (actualValue === policyValue) {
      matchCount++;
      console.log(`  ✅ 层级${i}: "${actualValue}" 匹配 "${policyValue}"`);
    } else {
      console.log(`  ❌ 层级${i}: "${actualValue}" 不匹配 "${policyValue}"`);
    }
  }

  const isMatch = matchCount === requiredMatches && requiredMatches > 0;
  console.log('');
  console.log('  匹配结果:', isMatch ? '✅ 成功' : '❌ 失败');
  console.log('  匹配详情:', `${matchCount}/${requiredMatches} 个必需层级匹配`);
  console.log('');

  // 3. 计算预期金额
  const workHours = 3.0;
  const coefficient = 20;
  const expectedAmount = isMatch ? workHours * coefficient * policy!.multiplier : workHours * coefficient;

  console.log('【金额计算】');
  console.log('  工时:', workHours);
  console.log('  人员系数:', coefficient);
  console.log('  金额政策匹配:', isMatch ? '是' : '否');
  console.log('  倍数:', isMatch ? policy?.multiplier : '1 (不适用)');
  console.log('');
  console.log('  计算:', `${workHours} × ${coefficient} ${isMatch ? `× ${policy?.multiplier}` : ''}`);
  console.log('  期望金额:', expectedAmount);
  console.log('');

  // 4. 检查202604003的考勤规则组
  const employee = await prisma.employee.findUnique({
    where: { employeeNo: '202604003' },
    select: {
      employeeNo: true,
      name: true,
      attendanceRuleGroupId: true,
    },
  });

  console.log('【员工考勤规则组】');
  console.log('  员工号:', employee?.employeeNo);
  console.log('  姓名:', employee?.name);
  console.log('  考勤规则组ID:', employee?.attendanceRuleGroupId);
  console.log('');

  if (employee?.attendanceRuleGroupId) {
    const arg = await prisma.attendanceRuleGroup.findUnique({
      where: { id: employee.attendanceRuleGroupId },
      select: {
        id: true,
        name: true,
        amountPolicyIds: true,
      },
    });

    console.log('  考勤规则组名称:', arg?.name);
    console.log('  金额政策IDs:', arg?.amountPolicyIds);
    console.log('');

    // 检查金额政策ID是否在列表中
    const hasPolicy = arg?.amountPolicyIds?.includes(1);
    console.log('  是否包含金额政策ID=1:', hasPolicy ? '✅ 是' : '❌ 否');
  }

  console.log('\n========================================');
}

testAmountPolicy()
  .then(() => {
    console.log('测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('测试失败:', error);
    process.exit(1);
  });
