  /**
   * 按实际工时比例分摊
   */
  private async executeActualHoursAllocation(params: any): Promise<number> {
    const {
      batchNo,
      config,
      rule,
      calcResult,
      calcDate,
      shiftId,
      shiftName,
      actualHoursAttendanceCodeId,
      indirectHoursAttendanceCodeId,
      indirectHoursAttendanceCodeStr,
      calcTime,
      executeById,
      executeByName,
    } = params;

    let resultCount = 0;

    console.log(`\n[分摊计算] 开始按实际工时分摊`);
    console.log(`  规则ID: ${rule.id}`);
    console.log(`  分摊依据: ${rule.allocationBasis}`);
    console.log(`  分摊范围ID: ${rule.allocationScopeId}`);

    // ✅ 步骤1: 从待分摊数据的 accountPath 中提取分摊范围层级的值
    if (!calcResult.accountPath) {
      console.log(`❌ 待分摊数据没有 accountPath，跳过分摊`);
      return 0;
    }

    const sourceAccountPath = calcResult.accountPath;
    const pathParts = sourceAccountPath.split('/');
    console.log(`  源账户路径: ${sourceAccountPath}`);
    console.log(`  路径分段: [${pathParts.join(', ')}]`);

    // 获取分摊范围配置，确定层级索引
    // allocationScopeId 指向 Organization 表，代表某个层级的组织
    // 我们需要根据这个组织的层级来确定 accountPath 中的索引
    const scopeOrg = await this.prisma.organization.findUnique({
      where: { id: rule.allocationScopeId },
      select: { id: true, code: true, name: true, type: true, parentId: true }
    });

    if (!scopeOrg) {
      console.log(`❌ 分摊范围配置不存在 (ID=${rule.allocationScopeId})，跳过分摊`);
      return 0;
    }

    console.log(`  分摊范围组织: ${scopeOrg.name} (代码: ${scopeOrg.code}, 类型: ${scopeOrg.type})`);

    // 根据组织类型确定层级索引
    // 类型01: 集团(索引0), 02: 工厂(索引1), 03: 车间(索引2), 04: 产线(索引3)
    const typeLevelMap: Record<string, number> = {
      '01': 0, // 集团
      '02': 1, // 工厂
      '03': 2, // 车间
      '04': 3, // 产线
    };

    const scopeLevelIndex = typeLevelMap[scopeOrg.type];
    if (scopeLevelIndex === undefined) {
      console.log(`❌ 未知的组织类型: ${scopeOrg.type}，跳过分摊`);
      return 0;
    }

    const scopeValue = pathParts[scopeLevelIndex];
    console.log(`  分摊范围层级: ${scopeLevelIndex} (类型${scopeOrg.type})`);
    console.log(`  提取的层级值: ${scopeValue}`);

    // ✅ 步骤2: 用日期+班次匹配开线计划表
    console.log(`\n[分摊计算] 步骤2: 匹配开线计划表`);
    console.log(`  匹配条件: 日期=${calcDate.toISOString().split('T')[0]}, 班次ID=${shiftId}`);

    const lineShifts = await this.prisma.lineShift.findMany({
      where: {
        scheduleDate: calcDate,
        shiftId: shiftId,
      }
    });

    console.log(`  找到 ${lineShifts.length} 条开线计划记录`);

    if (lineShifts.length === 0) {
      console.log(`❌ 没有找到匹配的开线计划记录，跳过分摊`);
      return 0;
    }

    // ✅ 步骤3: 从开线记录的 accountPath 中提取相同层级值并筛选
    console.log(`\n[分摊计算] 步骤3: 筛选匹配的开线记录`);

    const matchedTargets: Array<{
      lineShiftId: number;
      orgId: number;
      orgName: string;
      accountId: number | null;
      scopeValue: string;
    }> = [];

    for (const lineShift of lineShifts) {
      console.log(`\n  开线记录 ID=${lineShift.id}:`);
      console.log(`    组织ID: ${lineShift.orgId}`);
      console.log(`    账户ID: ${lineShift.accountId || 'N/A'}`);

      let lineScopeValue: string | null = null;

      if (lineShift.accountId) {
        // 从劳动力账户路径中提取层级值
        const account = await this.prisma.laborAccount.findUnique({
          where: { id: lineShift.accountId },
          select: { path: true, namePath: true }
        });

        if (account && account.path) {
          const accountParts = account.path.split('/');
          lineScopeValue = accountParts[scopeLevelIndex];
          console.log(`    账户路径: ${account.path}`);
          console.log(`    提取的层级值: ${lineScopeValue}`);
        }
      } else {
        // 如果没有账户ID，尝试从组织的父级关系中推断
        const org = await this.prisma.organization.findUnique({
          where: { id: lineShift.orgId },
          select: { id: true, code: true, name: true, parentId: true }
        });

        if (org) {
          // 对于产线组织，其父级应该是车间
          // 我们需要向上遍历到对应的层级
          let currentOrg = org;
          let currentLevel = 3; // 产线层级

          while (currentOrg && currentLevel > scopeLevelIndex) {
            if (currentOrg.parentId) {
              currentOrg = await this.prisma.organization.findUnique({
                where: { id: currentOrg.parentId },
                select: { id: true, code: true, name: true, parentId: true, type: true }
              });
              currentLevel--;
            } else {
              break;
            }
          }

          if (currentOrg && currentLevel === scopeLevelIndex) {
            lineScopeValue = currentOrg.code;
            console.log(`    组织推断: ${currentOrg.name} (代码: ${currentOrg.code})`);
            console.log(`    提取的层级值: ${lineScopeValue}`);
          }
        }
      }

      // 筛选匹配的记录
      if (lineScopeValue === scopeValue) {
        console.log(`    ✅ 匹配！将作为分摊目标`);

        // 获取组织名称
        const org = await this.prisma.organization.findUnique({
          where: { id: lineShift.orgId },
          select: { name: true }
        });

        matchedTargets.push({
          lineShiftId: lineShift.id,
          orgId: lineShift.orgId,
          orgName: org?.name || 'N/A',
          accountId: lineShift.accountId,
          scopeValue: lineScopeValue
        });
      } else {
        console.log(`    ❌ 不匹配（期望: ${scopeValue}, 实际: ${lineScopeValue || 'N/A'}）`);
      }
    }

    console.log(`\n[分摊计算] 步骤4: 确定分摊目标`);
    console.log(`  共匹配到 ${matchedTargets.length} 个分摊目标`);

    if (matchedTargets.length === 0) {
      console.log(`❌ 没有匹配的分摊目标，跳过分摊`);
      return 0;
    }

    matchedTargets.forEach((target, index) => {
      console.log(`  目标${index + 1}: 组织ID=${target.orgId}, 名称=${target.orgName}`);
    });

    // ✅ 步骤5: 获取当天所有班次的直接工时数据（按产线汇总）
    const directHoursByLine = await this.getDirectHoursByLine({
      calcDate,
      actualHoursAttendanceCodeId,
    });

    // ✅ 步骤6: 计算分摊范围的总工时
    let scopeDirectHours = 0;

    for (const target of matchedTargets) {
      const lineDirectHoursKey = `${target.orgId}-${shiftId}`;
      const lineDirectHours = directHoursByLine[lineDirectHoursKey] || 0;
      scopeDirectHours += lineDirectHours;
    }

    console.log(`\n[分摊计算] 分摊范围总直接工时: ${scopeDirectHours}`);

    if (scopeDirectHours === 0) {
      console.log(`❌ 分摊范围的直接工时为0，无法按比例分摊，跳过分摊`);
      return 0;
    }

    // ✅ 步骤7: 对每个分摊目标进行分摊
    console.log(`\n[分摊计算] 步骤5: 执行分摊`);
    console.log(`  待分摊工时: ${calcResult.workHours}`);

    for (const target of matchedTargets) {
      // 获取该目标的直接工时
      const lineDirectHoursKey = `${target.orgId}-${shiftId}`;
      const lineDirectHours = directHoursByLine[lineDirectHoursKey] || 0;

      console.log(`\n  目标: ${target.orgName} (组织ID: ${target.orgId})`);
      console.log(`    直接工时: ${lineDirectHours}`);

      // 如果该目标没有直接工时，跳过
      if (lineDirectHours === 0) {
        console.log(`    ⚠️  该目标没有直接工时，跳过`);
        continue;
      }

      // 计算分摊系数和分摊工时
      const allocationRatio = lineDirectHours / scopeDirectHours;
      const allocatedHours = calcResult.workHours * allocationRatio;

      console.log(`    分摊系数: ${allocationRatio.toFixed(4)}`);
      console.log(`    分摊工时: ${allocatedHours.toFixed(2)}`);

      // 只保存有效的分摊结果
      if (allocatedHours > 0) {
        // 获取间接设备账户
        let targetAccountId: number | null = null;
        let targetAccountName: string | null = null;

        if (target.accountId) {
          targetAccountId = target.accountId;
          const account = await this.prisma.laborAccount.findUnique({
            where: { id: target.accountId },
            select: { name: true }
          });
          targetAccountName = account?.name || null;
        } else {
          // 如果没有配置账户，创建间接设备账户
          const indirectAccount = await this.getLineIndirectAccount({
            orgId: target.orgId,
            orgName: target.orgName
          });
          if (indirectAccount) {
            targetAccountId = indirectAccount.id;
            targetAccountName = indirectAccount.name;
          }
        }

        if (!targetAccountId) {
          console.log(`    ❌ 无法确定目标账户，跳过`);
          continue;
        }

        // 创建分摊结果记录
        await this.prisma.allocationResult.create({
          data: {
            batchNo,
            recordDate: calcDate,
            calcResultId: calcResult.id,
            configId: config.id,
            configVersion: config.version,
            ruleId: rule.id,
            sourceEmployeeNo: calcResult.employeeNo,
            sourceEmployeeName: calcResult.employee?.name || 'N/A',
            sourceAccountId: calcResult.accountId,
            sourceAccountName: calcResult.accountName || 'N/A',
            attendanceCodeId: calcResult.attendanceCodeId,
            attendanceCode: calcResult.attendanceCode || 'N/A',
            sourceHours: calcResult.workHours,
            targetType: 'ORGANIZATION',
            targetId: target.orgId,
            targetName: target.orgName,
            targetAccountId: targetAccountId,
            allocationBasis: rule.allocationBasis,
            basisValue: lineDirectHours,
            weightValue: scopeDirectHours,
            allocationRatio,
            allocatedHours,
            calcTime,
          },
        });

        // 创建分摊后的工时记录（WorkHourResult）
        await this.createOrUpdateAllocationWorkHour({
          employeeNo: calcResult.employeeNo,
          calcDate: calcDate,
          shiftId: shiftId,
          shiftName: shiftName,
          definitionAttendanceCodeId: indirectHoursAttendanceCodeId,
          definitionAttendanceCodeStr: indirectHoursAttendanceCodeStr,
          workHours: allocatedHours,
          accountId: targetAccountId,
          accountName: targetAccountName || 'N/A',
          ruleId: rule.id,
          batchNo: batchNo,
        });

        resultCount++;
        console.log(`    ✅ 分摊成功`);
      }
    }

    console.log(`\n[分摊计算] 完成，共生成 ${resultCount} 条分摊结果`);

    return resultCount;
  }
