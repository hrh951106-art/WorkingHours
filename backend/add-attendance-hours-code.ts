import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addCode() {
  try {
    console.log('=== 添加考勤工时出勤代码 ===\n');

    // 1. 检查是否已存在
    const existing = await prisma.definitionAttendanceCode.findFirst({
      where: {
        type: 'ATTENDANCE_HOURS',
        code: 'AC_001',
      },
    });

    if (existing) {
      console.log('出勤代码 AC_001 已存在，跳过创建');
      console.log(`ID: ${existing.id}, 名称: ${existing.name}`);
      return;
    }

    // 2. 创建考勤工时出勤代码
    const newCode = await prisma.definitionAttendanceCode.create({
      data: {
        code: 'AC_001',
        name: '出勤工时',
        type: 'ATTENDANCE_HOURS',
        description: '正常出勤工时，用于考勤工时计算',
        status: 'ACTIVE',
        calculateHours: true,
        priority: 1,
        deductMealTime: false,
      },
    });

    console.log(`✅ 创建出勤代码成功: ID=${newCode.id}, code=${newCode.code}, name=${newCode.name}`);

    // 3. 获取默认考勤规则组
    const defaultRuleGroup = await prisma.attendanceRuleGroup.findFirst({
      where: {
        isDefault: true,
      },
    });

    if (!defaultRuleGroup) {
      console.warn('⚠️  未找到默认考勤规则组，请手动配置');
      return;
    }

    console.log(`找到默认考勤规则组: ${defaultRuleGroup.name} (ID=${defaultRuleGroup.id})`);

    // 4. 添加出勤代码到规则组（通过 JSON 字段）
    // TODO: 这里需要根据实际的规则组配置方式来调整
    console.log('请手动将出勤代码添加到考勤规则组');

    console.log('\n完成！');

  } catch (error) {
    console.error('❌ 添加出勤代码失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addCode();
