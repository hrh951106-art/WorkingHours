import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkLaborForm() {
  const formNo = 'LABOR202606010835032538';

  console.log('=== 检查表单 ' + formNo + ' 的工时结果 ===\n');

  // 1. 查找工时汇报单
  console.log('1. 查找工时汇报单（LaborHourReportRequest）:');
  const laborRequest = await prisma.laborHourReportRequest.findFirst({
    where: {
      requestNo: formNo,
    },
  });

  if (!laborRequest) {
    console.log('❌ 未找到该表单');
    return;
  }

  console.log('✓ 找到表单:');
  console.log(`   - 表单号: ${laborRequest.requestNo}`);
  console.log(`   - 标题: ${laborRequest.title}`);
  console.log(`   - 状态: ${laborRequest.status}`);
  console.log(`   - 创建时间: ${laborRequest.createdAt}`);
  console.log(`   - 汇总日期: ${laborRequest.reportDate.toISOString().substring(0, 10)}`);
  console.log(`   - 报工类型: ${laborRequest.hourTypeName} (${laborRequest.hourType})`);
  console.log(`   - 报工模式: ${laborRequest.reportMode}`);
  console.log(`   - 申请人工号: ${laborRequest.employeeNo || '无'}`);
  console.log(`   - 申请人: ${laborRequest.employeeName || '无'}`);
  console.log(`   - 申请人ID: ${laborRequest.employeeId || '无'}`);
  console.log(`   - 请求人工号: ${laborRequest.requesterName}`);
  console.log(`   - 账户: ${laborRequest.accountPath}`);

  // 2. 查找该表单关联的员工
  console.log('\n2. 查找表单关联的员工（LaborHourReportEmployee）:');
  const employees = await prisma.laborHourReportEmployee.findMany({
    where: {
      requestId: laborRequest.id,
    },
  });

  console.log(`   找到 ${employees.length} 个员工`);

  if (employees.length > 0) {
    console.log('\n   员工列表:');
    for (const emp of employees.slice(0, 10)) {
      console.log(`   - 员工: ${emp.employeeNo}, 姓名: ${emp.employeeName || '未知'}`);
    }
    if (employees.length > 10) {
      console.log(`   ... 还有 ${employees.length - 10} 个员工`);
    }
  }

  // 3. 查找WorkHourResult中该表单相关的数据
  console.log('\n3. 查找WorkHourResult中的相关数据:');

  // 尝试多种方式查找：
  // 方式1: 通过表单号作为source
  // 方式2: 通过汇总日期和员工号查找
  const workHourResults = await prisma.workHourResult.findMany({
    where: {
      OR: [
        {
          source: formNo,
        },
        {
          sourceId: laborRequest.id,
        },
        {
          workDate: laborRequest.reportDate,
          employeeNo: laborRequest.employeeNo || '',
        },
      ],
    },
  });

  console.log(`   找到 ${workHourResults.length} 条工时结果`);

  if (workHourResults.length > 0) {
    console.log('\n   工时结果详情:');
    for (const result of workHourResults.slice(0, 10)) {
      console.log(`   - 员工: ${result.employeeNo}`);
      console.log(`     工作日期: ${result.workDate.toISOString().substring(0, 10)}`);
      console.log(`     工时: ${result.workHours}`);
      console.log(`     出勤代码: ${result.attendanceCode || '无'}`);
      console.log(`     账户: ${result.accountPath || '无'}`);
      console.log(`     状态: ${result.status}`);
      console.log(`     来源: ${result.source || '无'}`);
      console.log('');
    }
    if (workHourResults.length > 10) {
      console.log(`   ... 还有 ${workHourResults.length - 10} 条记录`);
    }

    // 按状态统计
    const statusGroups = new Map<string, number>();
    for (const result of workHourResults) {
      const status = result.status || 'UNKNOWN';
      statusGroups.set(status, (statusGroups.get(status) || 0) + 1);
    }

    console.log('\n   按状态统计:');
    for (const [status, count] of statusGroups.entries()) {
      console.log(`   - ${status}: ${count} 条`);
    }
  } else {
    console.log('   ❌ 未找到任何工时结果');
  }

  // 4. 如果是团队报工，检查所有团队成员的工时记录
  if (laborRequest.reportMode === 'team' && workHourResults.length === 0) {
    console.log('\n4. 团队报工模式，检查所有团队成员的工时记录:');

    if (employees.length > 0 && laborRequest.reportDate) {
      const workHourByDate = await prisma.workHourResult.findMany({
        where: {
          workDate: laborRequest.reportDate,
          employeeNo: {
            in: employees.map(e => e.employeeNo),
          },
        },
        take: 50,
      });

      console.log(`   找到 ${workHourByDate.length} 条记录`);

      if (workHourByDate.length > 0) {
        console.log('\n   详细记录:');
        for (const result of workHourByDate) {
          console.log(`   - 员工: ${result.employeeNo}, 工时: ${result.workHours}, 状态: ${result.status}, 来源: ${result.source || '无'}`);
        }
      }
    }
  }

  // 5. 总结
  console.log('\n=== 总结 ===');
  console.log(`表单状态: ${laborRequest.status}`);
  console.log(`报工模式: ${laborRequest.reportMode}`);
  console.log(`汇总日期: ${laborRequest.reportDate.toISOString().substring(0, 10)}`);
  console.log(`员工数量: ${employees.length}`);
  console.log(`WorkHourResult记录数: ${workHourResults.length}`);

  if (workHourResults.length > 0) {
    const activeCount = workHourResults.filter(r => r.status === 'ACTIVE').length;
    console.log(`其中ACTIVE状态: ${activeCount} 条`);
    console.log('\n✓ 该表单已生成工时结果，数据已进入WorkHourResult表');
  } else {
    console.log('\n❌ 该表单未生成工时结果，数据未进入WorkHourResult表');
    console.log('可能原因:');
    console.log('1. 工时推送未执行');
    console.log('2. 工时推送失败');
    console.log('3. 批次号未正确关联');
  }
}

checkLaborForm()
  .then(() => {
    console.log('\n检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  });
