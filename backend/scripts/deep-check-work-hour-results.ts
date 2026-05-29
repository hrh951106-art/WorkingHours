import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 深度检查工时结果表中各类数据的字段差异
 */

async function main() {
  console.log('=== 深度检查工时结果表字段差异 ===\n');

  // 1. 获取所有数据按 sourceType 分类
  console.log('1. 按来源类型统计数据:\n');

  const allResults = await prisma.workHourResult.findMany({
    orderBy: { createdAt: 'desc' },
  });

  const typeGroups = new Map<string, any[]>();
  allResults.forEach(result => {
    const type = result.sourceType || 'NULL';
    if (!typeGroups.has(type)) {
      typeGroups.set(type, []);
    }
    typeGroups.get(type)!.push(result);
  });

  console.log(`总记录数: ${allResults.length}\n`);
  console.log('按 sourceType 分组:');
  typeGroups.forEach((results, type) => {
    console.log(`  ${type}: ${results.length} 条`);
  });
  console.log('');

  // 2. 定义所有需要检查的字段
  const fieldsToCheck = [
    'id',
    'employeeNo',
    'employeeId',
    'workDate',
    'calcDate',
    'shiftId',
    'shiftName',
    'attendanceCodeId',
    'attendanceCode',
    'calcAttendanceCode',
    'attendanceCodeName',
    'workHours',
    'amount',
    'calculateAmount',
    'accountId',
    'accountName',
    'accountPath',
    'sourceType',
    'sourceId',
    'source',
    'sourceBatchId',
    'attendancePunchPair',
    'customFields',
    'orgId',
    'definitionAttendanceCodeId',
    'definitionAttendanceCodeStr',
    'startTime',
    'endTime',
    'status',
    'createdAt',
    'updatedAt',
  ];

  // 3. 分析每个字段在不同类型中的存储情况
  console.log('2. 字段存在性分析（按类型）:\n');

  const fieldAnalysis = new Map<string, Map<string, { hasValue: number; nullValue: number; samples: string[] }>>();

  fieldsToCheck.forEach(field => {
    const typeStats = new Map<string, { hasValue: number; nullValue: number; samples: string[] }>();

    typeGroups.forEach((results, type) => {
      let hasValue = 0;
      let nullValue = 0;
      const samples: string[] = [];

      results.forEach(result => {
        const value = result[field as keyof typeof result];
        if (value === null || value === undefined || value === '') {
          nullValue++;
        } else {
          hasValue++;
          // 收集样本（最多3个）
          if (samples.length < 3) {
            let sample = String(value);
            if (sample.length > 30) sample = sample.substring(0, 27) + '...';
            samples.push(sample);
          }
        }
      });

      typeStats.set(type, { hasValue, nullValue, samples });
    });

    fieldAnalysis.set(field, typeStats);
  });

  // 打印字段分析表
  console.log('┌─────────────────────────────┬─────────────────────────────────────────────────────────────┐');
  console.log('│ 字段名                      │ 各类型有值情况                                              │');
  console.log('├─────────────────────────────┼─────────────────────────────────────────────────────────────┤');

  typeGroups.forEach((_, type) => {
    process.stdout.write(`│ ${''.padEnd(27)} │ ${type.padEnd(12)} │`);
  });
  console.log('');
  console.log('├─────────────────────────────┼─────────────────────────────────────────────────────────────┤');

  fieldsToCheck.forEach(field => {
    const typeStats = fieldAnalysis.get(field)!;
    let line = `│ ${field.padEnd(27)} │`;

    typeGroups.forEach((results, type) => {
      const stats = typeStats.get(type)!;
      const total = stats.hasValue + stats.nullValue;
      const percentage = total > 0 ? ((stats.hasValue / total) * 100).toFixed(0) : '0';
      line += ` ${percentage.padStart(3)}% (${stats.hasValue}/${total}) │`;
    });

    console.log(line);
  });

  console.log('└─────────────────────────────┴─────────────────────────────────────────────────────────────┘\n');

  // 4. 检测字段格式差异
  console.log('3. 字段格式差异检测:\n');

  // 检查 definitionAttendanceCodeStr
  console.log('【definitionAttendanceCodeStr】');
  const defCodeStrSamples = new Map<string, string[]>();
  typeGroups.forEach((results, type) => {
    const samples = new Set<string>();
    results.slice(0, 10).forEach(result => {
      if (result.definitionAttendanceCodeStr) {
        samples.add(result.definitionAttendanceCodeStr);
      }
    });
    defCodeStrSamples.set(type, Array.from(samples));
  });

  defCodeStrSamples.forEach((samples, type) => {
    console.log(`  ${type}:`);
    samples.slice(0, 5).forEach(s => {
      const isCode = /^[A-Z]\d{2}$/.test(s); // 检查是否为代码格式 (如 A06)
      const format = isCode ? '✓ 代码格式' : '✗ 名称格式';
      console.log(`    "${s}" - ${format}`);
    });
  });

  // 检查 accountPath
  console.log('\n【accountPath】');
  const accountPathSamples = new Map<string, string[]>();
  typeGroups.forEach((results, type) => {
    const samples = new Set<string>();
    results.slice(0, 10).forEach(result => {
      if (result.accountPath) {
        samples.add(result.accountPath);
      }
    });
    accountPathSamples.set(type, Array.from(samples));
  });

  accountPathSamples.forEach((samples, type) => {
    console.log(`  ${type}:`);
    samples.slice(0, 3).forEach(s => {
      const isPath = s.includes('/') && s.split('/').length >= 2;
      const isCode = s.includes('AUTO-') || s.includes('LINE-');
      let format = '其他';
      if (isPath) format = '✓ 路径格式';
      else if (isCode) format = '✗ 自动编码';
      console.log(`    "${s}" - ${format}`);
    });
  });

  // 检查 source
  console.log('\n【source】');
  const sourceSamples = new Map<string, Set<string>>();
  typeGroups.forEach((results, type) => {
    const samples = new Set<string>();
    results.forEach(result => {
      if (result.source) {
        samples.add(result.source);
      }
    });
    sourceSamples.set(type, samples);
  });

  sourceSamples.forEach((samples, type) => {
    console.log(`  ${type}:`);
    const arr = Array.from(samples);
    arr.slice(0, 5).forEach(s => {
      const isSimple = s.length <= 10;
      const format = isSimple ? '✓ 简短格式' : '✗ 详细描述';
      console.log(`    "${s}" - ${format}`);
    });
    if (arr.length > 5) {
      console.log(`    ... 还有 ${arr.length - 5} 种`);
    }
  });

  // 检查 status
  console.log('\n【status】');
  const statusSamples = new Map<string, Set<string>>();
  typeGroups.forEach((results, type) => {
    const samples = new Set<string>();
    results.forEach(result => {
      if (result.status) {
        samples.add(result.status);
      }
    });
    statusSamples.set(type, samples);
  });

  statusSamples.forEach((samples, type) => {
    console.log(`  ${type}: ${Array.from(samples).join(', ')}`);
  });

  // 5. 检测数值字段范围差异
  console.log('\n4. 数值字段范围分析:\n');

  const numericFields = ['workHours', 'amount', 'calculateAmount'];
  numericFields.forEach(field => {
    console.log(`【${field}】`);

    typeGroups.forEach((results, type) => {
      const values = results
        .map(r => r[field as keyof typeof r] as number)
        .filter(v => v !== null && v !== undefined);

      if (values.length > 0) {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const nonZero = values.filter(v => v !== 0).length;

        console.log(`  ${type}:`);
        console.log(`    范围: ${min} ~ ${max}`);
        console.log(`    平均: ${avg.toFixed(2)}`);
        console.log(`    非零: ${nonZero}/${values.length} (${((nonZero / values.length) * 100).toFixed(0)}%)`);
      } else {
        console.log(`  ${type}: 无数据`);
      }
    });
    console.log('');
  });

  // 6. 检测时间字段格式
  console.log('5. 时间字段格式检查:\n');

  const timeFields = ['workDate', 'calcDate', 'startTime', 'endTime', 'createdAt', 'updatedAt'];
  timeFields.forEach(field => {
    console.log(`【${field}】`);

    typeGroups.forEach((results, type) => {
      const hasValue = results.filter(r => r[field as keyof typeof r] !== null).length;
      const total = results.length;
      const percentage = total > 0 ? ((hasValue / total) * 100).toFixed(0) : '0';

      console.log(`  ${type}: ${hasValue}/${total} (${percentage}%)`);
    });
    console.log('');
  });

  // 7. 字段一致性评分
  console.log('6. 字段一致性评分:\n');

  const consistencyScores = new Map<string, number>();

  fieldsToCheck.forEach(field => {
    const typeStats = fieldAnalysis.get(field)!;
    const types = Array.from(typeGroups.keys());

    // 检查该字段在所有类型中的有值比例是否一致
    const percentages = types.map(type => {
      const stats = typeStats.get(type)!;
      const total = stats.hasValue + stats.nullValue;
      return total > 0 ? (stats.hasValue / total) : 0;
    });

    const maxP = Math.max(...percentages);
    const minP = Math.min(...percentages);
    const diff = maxP - minP;

    // 评分：差异越小分数越高
    const score = diff < 0.1 ? 100 : diff < 0.3 ? 80 : diff < 0.5 ? 60 : diff < 0.7 ? 40 : 20;
    consistencyScores.set(field, score);
  });

  // 按分数排序
  const sortedFields = Array.from(consistencyScores.entries())
    .sort((a, b) => b[1] - a[1]);

  console.log('┌─────────────────────────────┬──────────┬──────────────┐');
  console.log('│ 字段名                      │ 一致性   │ 说明         │');
  console.log('├─────────────────────────────┼──────────┼──────────────┤');

  sortedFields.forEach(([field, score]) => {
    let description = '';
    if (score === 100) description = '完全一致';
    else if (score >= 80) description = '基本一致';
    else if (score >= 60) description = '有些差异';
    else if (score >= 40) description = '差异较大';
    else description = '差异很大';

    console.log(`│ ${field.padEnd(27)} │ ${score.toString().padStart(6)} │ ${description.padEnd(12)} │`);
  });

  console.log('└─────────────────────────────┴──────────┴──────────────┘\n');

  // 8. 发现的问题总结
  console.log('7. 发现的问题总结:\n');

  const issues: string[] = [];

  // 检查 definitionAttendanceCodeStr
  const defCodeIssues = checkDefinitionAttendanceCodeStr(defCodeStrSamples);
  if (defCodeIssues.length > 0) {
    issues.push(...defCodeIssues);
  }

  // 检查 accountPath
  const accountPathIssues = checkAccountPath(accountPathSamples);
  if (accountPathIssues.length > 0) {
    issues.push(...accountPathIssues);
  }

  // 检查 source
  const sourceIssues = checkSource(sourceSamples);
  if (sourceIssues.length > 0) {
    issues.push(...sourceIssues);
  }

  // 检查一致性低的字段
  sortedFields.forEach(([field, score]) => {
    if (score < 60) {
      issues.push(`字段 "${field}" 在不同类型间的使用差异很大 (一致性: ${score}%)`);
    }
  });

  if (issues.length > 0) {
    console.log('⚠️ 发现以下问题:\n');
    issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue}`);
    });
  } else {
    console.log('✅ 未发现明显问题');
  }

  console.log('\n=== 检查完成 ===');
}

function checkDefinitionAttendanceCodeStr(samples: Map<string, string[]>): string[] {
  const issues: string[] = [];

  samples.forEach((vals, type) => {
    const hasCode = vals.some(v => /^[A-Z]\d{2}$/.test(v));
    const hasName = vals.some(v => !/^[A-Z]\d{2}$/.test(v) && v.length > 0);

    if (hasName && !hasCode) {
      issues.push(`${type} 类型的 definitionAttendanceCodeStr 存储名称而非代码`);
    } else if (hasCode && hasName) {
      issues.push(`${type} 类型的 definitionAttendanceCodeStr 混用代码和名称格式`);
    }
  });

  return issues;
}

function checkAccountPath(samples: Map<string, string[]>): string[] {
  const issues: string[] = [];

  samples.forEach((vals, type) => {
    const hasPath = vals.some(v => v.includes('/') && v.split('/').length >= 2);
    const hasCode = vals.some(v => (v.includes('AUTO-') || v.includes('LINE-')) && !v.includes('/'));

    if (hasCode && !hasPath) {
      issues.push(`${type} 类型的 accountPath 存储自动编码而非路径`);
    } else if (hasCode && hasPath) {
      issues.push(`${type} 类型的 accountPath 混用路径和编码格式`);
    }
  });

  return issues;
}

function checkSource(samples: Map<string, Set<string>>): string[] {
  const issues: string[] = [];

  samples.forEach((vals, type) => {
    const arr = Array.from(vals);
    const hasLong = arr.some(v => v.length > 20);
    const hasShort = arr.some(v => v.length <= 10);

    if (hasLong && !hasShort) {
      issues.push(`${type} 类型的 source 使用详细描述而非简短格式`);
    } else if (hasLong && hasShort) {
      issues.push(`${type} 类型的 source 混用详细和简短格式`);
    }
  });

  return issues;
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('检查失败:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
