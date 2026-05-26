import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const accountId = 22;

  console.log(`=== 详细检查账户 ${accountId} ===\n`);

  const account = await prisma.laborAccount.findUnique({
    where: { id: accountId }
  });

  if (!account) {
    console.log('账户不存在');
    return;
  }

  console.log('账户基本信息:');
  console.log(`  ID: ${account.id}`);
  console.log(`  名称路径: ${account.namePath}`);
  console.log(`  路径: ${account.path}`);
  console.log(`  层级: ${account.level}`);
  console.log(`  hierarchyValues: ${account.hierarchyValues || 'NULL'}`);
  console.log('');

  // 解析hierarchyValues
  const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : null;

  if (!hierarchyValues || hierarchyValues.length === 0) {
    console.log('❌ hierarchyValues为空！');
    console.log('');
    console.log('问题分析:');
    console.log('1. 账户路径是: ' + account.path);
    console.log('2. 层级是: ' + account.level);
    console.log('3. 但是hierarchyValues字段为空');
    console.log('');
    console.log('影响:');
    console.log('- 无法进行账户匹配');
    console.log('- 无法计算需要特定层级的出勤代码（如AC_003工序工时）');
    console.log('');
    console.log('解决方案:');
    console.log('- 需要修复��户22的hierarchyValues字段');
    console.log('- 或者重新生成这个账户');
  } else {
    console.log('hierarchyValues内容:');
    hierarchyValues.forEach((hv: any, index: number) => {
      console.log(`  [${index}] level=${hv.level}, name=${hv.name}, mappingType=${hv.mappingType}`);
      if (hv.selectedValue) {
        console.log(`      selectedValue=${JSON.stringify(hv.selectedValue)}`);
      } else {
        console.log(`      selectedValue=null`);
      }
    });
  }

  // 检查AC_003的匹配情况
  console.log('\n=== AC_003（工序工时）匹配测试 ===\n');

  const ac003 = await prisma.calculationAttendanceCode.findFirst({
    where: { code: 'AC_003' }
  });

  if (!ac003) {
    console.log('AC_003不存在');
    return;
  }

  console.log(`AC_003要求: ${ac003.accountLevels}`);
  const accountLevels = JSON.parse(ac003.accountLevels || '[]');

  if (!hierarchyValues || hierarchyValues.length === 0) {
    console.log('');
    console.log('❌ 账户匹配失败: hierarchyValues为空');
    console.log('');
    console.log('需要的层级:');
    accountLevels.forEach((sortValue: number) => {
      const level = sortValue + 1;
      console.log(`  - Level ${level}`);
    });
    console.log('');
    console.log('账户hierarchyValues为空，无法匹配');
  } else {
    console.log('');
    console.log('检查每个层级:');
    let allMatch = true;
    for (const sortValue of accountLevels) {
      const level = sortValue + 1;
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      if (!levelConfig) {
        console.log(`  Level ${level}: ❌ 找不到层级配置`);
        allMatch = false;
      } else if (!levelConfig.selectedValue) {
        console.log(`  Level ${level}: ❌ 没有值`);
        allMatch = false;
      } else {
        const valueName = levelConfig.selectedValue.name || levelConfig.selectedValue.code || levelConfig.selectedValue;
        console.log(`  Level ${level}: ✅ 有值 (${valueName})`);
      }
    }

    console.log('');
    if (allMatch) {
      console.log('✅ 账户匹配AC_003');
    } else {
      console.log('❌ 账户不匹配AC_003');
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
