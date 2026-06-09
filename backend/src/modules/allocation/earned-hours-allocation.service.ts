import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EarnedHoursAllocationService {
  private readonly logger = new Logger(EarnedHoursAllocationService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 执行挣得工时分摊计算
   */
  async executeEarnedHoursAllocation(dto: any) {
    const {
      configId,          // 挣得工时配置ID
      startDate,         // 计算开始日期
      endDate,           // 计算结束日期
      executeById,       // 执行人ID
      executeByName,     // 执行人姓名
    } = dto;

    this.logger.log(`[挣得工时分摊] 开始执行计算`);
    this.logger.log(`配置ID: ${configId}, 日期范围: ${startDate} ~ ${endDate}`);

    // 1. 获取挣得工时配置
    const config = await this.prisma.earnedHoursAllocationConfig.findFirst({
      where: { id: configId, deletedAt: null },
    });

    if (!config) {
      throw new NotFoundException('挣得工时配置不存在');
    }

    this.logger.log(`配置: ${config.configName} (${config.code})`);

    // 2. 解析配置
    let sourceConfig: any = {};
    try {
      sourceConfig = JSON.parse(config.sourceConfig || '{}');
    } catch (e) {
      this.logger.error('解析sourceConfig失败:', e);
      sourceConfig = {};
    }

    // 解析筛选条件
    let employeeFilter = { fieldGroups: [] };
    let workHoursFilter = { hierarchySelections: [], attendanceCodes: [] };

    try {
      // 修复：使用 employeeFilter 而不是 productionFilter
      if (sourceConfig.employeeFilter && sourceConfig.employeeFilter.fieldGroups) {
        employeeFilter = sourceConfig.employeeFilter;
      }
    } catch (e) {
      this.logger.error('解析人员筛选条件失败:', e);
    }

    try {
      // 从 accountFilter 中提取层级筛选和出勤代码
      if (sourceConfig.accountFilter) {
        workHoursFilter = {
          hierarchySelections: sourceConfig.accountFilter.hierarchySelections || [],
          attendanceCodes: sourceConfig.attendanceCodes || [],
        };
      }
    } catch (e) {
      this.logger.error('解析工时筛选条件失败:', e);
    }

    this.logger.log(`人员筛选条件: ${JSON.stringify(employeeFilter)}`);
    this.logger.log(`工时筛选条件: ${JSON.stringify(workHoursFilter)}`);

    // 3. 获取日期范围内的生产记录
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.logger.log(`查询生产记录: ${start.toISOString()} ~ ${end.toISOString()}`);

    const productionRecords = await this.prisma.productionRecord.findMany({
      where: {
        recordDate: { gte: start, lte: end },
        deletedAt: null,
      },
      orderBy: { recordDate: 'asc' },
    });

    this.logger.log(`找到 ${productionRecords.length} 条生产记录`);

    if (productionRecords.length === 0) {
      return {
        message: '没有找到生产记录',
        totalResults: 0,
      };
    }

    // 4. 按日期+劳动力账户对生产记录进行分组
    // 每个分组应该独立计算分摊，生成独立的批次号
    const recordGroups = new Map<string, any[]>();

    productionRecords.forEach(record => {
      // 日期需要转换为统一的格式（去掉时分秒）
      const dateKey = new Date(record.recordDate).toISOString().split('T')[0];
      const groupKey = `${dateKey}_${record.orgId}`;

      if (!recordGroups.has(groupKey)) {
        recordGroups.set(groupKey, []);
      }

      recordGroups.get(groupKey)!.push(record);
    });

    this.logger.log(`生产记录已分为 ${recordGroups.size} 个分组（按日期+劳动力账户）`);

    // Parse rules from JSON string
    let rules: any[] = [];
    try {
      rules = JSON.parse(config.rules || '[]');
    } catch (e) {
      this.logger.error('解析rules失败:', e);
      rules = [];
    }

    // 5. 删除旧数据（防重复）
    // 对每个分组，先删除已有的分摊结果，避免重复
    // 注意：不在这里删除，而是在处理每个规则时删除该规则的旧结果
    // 这样可以确保不同规则的结果互不影响

    // 6. 对每个分组分别进行分摊计算
    let totalResults = 0;
    const batchResults = [];

    for (const [groupKey, groupRecords] of recordGroups.entries()) {
      // 为每个分组生成独立的批次号
      const batchNo = `EHA-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      this.logger.log(`处理分组 ${groupKey}，共 ${groupRecords.length} 条生产记录，批次号: ${batchNo}`);

      // 合并同一分组的产量
      let totalQty = 0;
      let totalStdHours = 0;
      const mergedRecord = { ...groupRecords[0] };

      for (const record of groupRecords) {
        totalQty += record.actualQty || 0;
        totalStdHours += record.totalStdHours || 0;
      }

      mergedRecord.actualQty = totalQty;
      mergedRecord.totalStdHours = totalStdHours;

      this.logger.log(`  合并后产量: ${totalQty}，总标准工时: ${totalStdHours}`);

      // 对合并后的生产记录执行分摊
      const result = await this.allocateForProductionRecord(
        mergedRecord,
        employeeFilter,
        workHoursFilter,
        rules,
        new Date(),
        batchNo,
        configId,
      );

      if (result && result.allocationResults) {
        batchResults.push({
          batchNo,
          groupKey,
          totalQty,
          totalStdHours,
          employeeCount: result.employeeCount || 0,
          result,
        });
        totalResults += result.allocationResults.length || 0;
      }
    }

    this.logger.log(`分摊完成，共生成 ${totalResults} 条结果，${recordGroups.size} 个批次`);

    return {
      message: '分摊计算完成',
      totalBatches: recordGroups.size,
      totalResults,
      batchResults,
    };
  }

  /**
   * 为单条生产记录执行分摊
   */
  private async allocateForProductionRecord(
    record: any,
    employeeFilter: any,
    workHoursFilter: any,
    rules: any[],
    calcTime: Date,
    batchNo: string,
    configId: number,
  ) {
    // 1. 计算总得工时 = (产量 / 标准件数) * 标准工时
    // 从产品标准工时配置中获取标准工时

    if (!record.orgId) {
      this.logger.warn(`生产记录 ${record.id} 没有关联劳动力账户`);
      return null;
    }

    // 获取劳动力账户信息
    const account = await this.prisma.laborAccount.findFirst({
      where: { id: record.orgId },
    });

    if (!account) {
      this.logger.warn(`生产记录 ${record.id} 的劳动力账户 ${record.orgId} 不存在`);
      return null;
    }

    // 查询产品标准工时配置（使用与个人产量记录相同的匹配逻辑）
    const recordDate = new Date(record.recordDate);
    recordDate.setHours(0, 0, 0, 0);

    this.logger.log(
      `查询标准工时配置: productId=${record.productId}, orgId=${record.orgId}, orgName=${record.orgName}, recordDate=${recordDate.toISOString().substring(0, 10)}`
    );

    // 使用智能匹配逻辑查找标准工时配置
    const finalConfig = await this.findMatchingStandardHourConfig(
      record.productId,
      record.orgId,
      record.orgName || '',
      recordDate
    );

    if (!finalConfig) {
      this.logger.warn(
        `未找到产品 ${record.productName} (ID:${record.productId}) 的标准工时配置`
      );
      return null;
    }

    // 计算总得工时
    const quantity = finalConfig.quantity || 1; // 标准件数
    const standardHours = finalConfig.standardHours; // 标准工时
    const totalEarnedHours = (record.actualQty / quantity) * standardHours;

    this.logger.log(
      `生产记录: ${record.productName}, 产量: ${record.actualQty}, 标准配置: ${quantity}件=${standardHours}小时, 总得工时: ${totalEarnedHours.toFixed(2)}`
    );

    if (totalEarnedHours <= 0) {
      return null;
    }

    // 2. 使用生产记录中的劳动力账户（orgId存储的就是劳动力账户ID）
    const lineAccounts = await this.getLineLaborAccounts(record.orgId);

    if (lineAccounts.length === 0) {
      this.logger.warn(`产线 ${record.orgName} 没有关联劳动力账户`);
      return null;
    }

    // 3. 根据工时筛选条件过滤账户（层级筛选）
    const filteredAccounts = await this.filterAccountsByWorkHours(
      lineAccounts,
      workHoursFilter,
      record.recordDate
    );

    this.logger.log(`过滤后的账户数量: ${filteredAccounts.length}`);

    if (filteredAccounts.length === 0) {
      return null;
    }

    // 4. 获取账户下的员工及工时（从WorkHourResult表获取，应用出勤代码筛选）
    const employeesWithHours = await this.getEmployeesWithHours(
      filteredAccounts.map((a) => a.id),
      workHoursFilter.attendanceCodes,
      record.recordDate,
      record
    );

    this.logger.log(`账户下有工时的员工数量: ${employeesWithHours.length}`);

    if (employeesWithHours.length === 0) {
      return null;
    }

    // 5. 根据人员筛选条件过滤员工
    const filteredEmployees = await this.filterEmployees(
      employeesWithHours,
      employeeFilter
    );

    this.logger.log(`过滤后的员工数量: ${filteredEmployees.length}`);

    if (filteredEmployees.length === 0) {
      return null;
    }

    // 6. 计算总工时
    const totalWorkHours = filteredEmployees.reduce(
      (sum, emp) => sum + (emp.workHours || 0),
      0
    );

    this.logger.log(`总工时: ${totalWorkHours}`);

    if (totalWorkHours <= 0) {
      return null;
    }

    // 7. 按分摊方式分摊得工时
    const allocationResults = await this.allocateEarnedHours(
      totalEarnedHours,
      filteredEmployees,
      totalWorkHours,
      rules,
      record,
      batchNo,
      configId,
      new Date(),
      finalConfig.unit || '小时', // 添加单位参数
    );

    return {
      productionRecordId: record.id,
      productCode: record.productCode,
      productName: record.productName,
      totalEarnedHours,
      totalWorkHours,
      employeeCount: filteredEmployees.length,
      allocationResults,
    };
  }

  /**
   * 获取产线关联的劳动力账户
   */
  private async getLineLaborAccounts(lineId: number) {
    const account = await this.prisma.laborAccount.findFirst({
      where: {
        id: lineId,
        status: 'ACTIVE',
      },
    });

    return account ? [account] : [];
  }

  /**
   * 获取员工的主劳动力账户（层级最高的账户）
   */
  private async getEmployeeMainAccount(employeeId: number) {
    const targetDate = new Date();
    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        employeeId,
        type: 'MAIN',
        effectiveDate: { lte: targetDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: targetDate } },
        ],
      },
      orderBy: { level: 'desc' },
      take: 1,
    });

    const account = accounts[0] || null;
    if (!account) return null;

    // 如果 hierarchyValues 为空，尝试从 path 字段解析
    if (!account.hierarchyValues || account.hierarchyValues === '[]') {
      if (account.path && account.path !== '') {
        account.hierarchyValues = this.parsePathToHierarchyValues(account.path);
        this.logger.debug(`从path字段解析主账户${account.id}的层级值`);
      }
    }

    return account;
  }

  /**
   * 从 path 字符串解析出 hierarchyValues
   */
  private parsePathToHierarchyValues(path: string): string {
    const segments = path.split('/').filter(s => s !== '');

    while (segments.length < 7) {
      segments.push('-');
    }

    const hierarchyValues = [
      { levelId: 4, level: 1, name: '工厂', selectedValue: this.parsePathSegment(segments[0]) },
      { levelId: 5, level: 2, name: '车间', selectedValue: this.parsePathSegment(segments[1]) },
      { levelId: 6, level: 3, name: '产线', selectedValue: this.parsePathSegment(segments[2]) },
      { levelId: 7, level: 4, name: '产品', selectedValue: this.parsePathSegment(segments[3]) },
      { levelId: 8, level: 5, name: '工序', selectedValue: this.parsePathSegment(segments[4]) },
      { levelId: 9, level: 6, name: '员工类型', selectedValue: this.parsePathSegment(segments[5]) },
      { levelId: 10, level: 7, name: '岗位', selectedValue: this.parsePathSegment(segments[6]) },
    ];

    return JSON.stringify(hierarchyValues);
  }

  /**
   * 解析 path 中的单个层级段
   */
  private parsePathSegment(segment: string): any {
    if (!segment || segment === '-') {
      return { name: '-', isEmpty: true };
    }
    return { name: segment, isEmpty: false };
  }

  /**
   * 合并多个劳动力账户
   */
  private mergeMultipleAccounts(accounts: any[]): any {
    if (accounts.length === 0) return null;
    if (accounts.length === 1) return accounts[0];

    let merged = accounts[0];

    for (let i = 1; i < accounts.length; i++) {
      merged = this.mergeAccounts(merged, accounts[i]);
    }

    return merged;
  }

  /**
   * 合并两个劳动力账户
   */
  private mergeAccounts(priorityAccount: any, secondaryAccount: any): any {
    const priorityValues = priorityAccount.hierarchyValues
      ? JSON.parse(priorityAccount.hierarchyValues)
      : [];
    const secondaryValues = secondaryAccount.hierarchyValues
      ? JSON.parse(secondaryAccount.hierarchyValues)
      : [];

    const mergedValuesMap = new Map<number, any>();

    secondaryValues.forEach((v: any) => {
      mergedValuesMap.set(v.level, v);
    });

    priorityValues.forEach((v: any) => {
      if (v.selectedValue) {
        mergedValuesMap.set(v.level, v);
      }
    });

    const mergedValues = Array.from(mergedValuesMap.values())
      .sort((a, b) => a.level - b.level);

    return {
      id: priorityAccount.id,
      namePath: this.buildNamePath(mergedValues),
      hierarchyValues: JSON.stringify(mergedValues),
    };
  }

  /**
   * 根据层级值构建namePath
   */
  private buildNamePath(hierarchyValues: any[]): string {
    return hierarchyValues
      .filter(v => v.selectedValue)
      .map(v => {
        if (v.selectedValueLabel) {
          return v.selectedValueLabel;
        }
        if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
          return v.selectedValue.name || v.selectedValue.value || JSON.stringify(v.selectedValue);
        }
        return String(v.selectedValue);
      })
      .join('/');
  }

  /**
   * 根据工时筛选条件过滤账户（实现层级筛选）
   */
  private async filterAccountsByWorkHours(
    accounts: any[],
    workHoursFilter: any,
    calcDate: Date
  ) {
    if (!workHoursFilter.hierarchySelections || workHoursFilter.hierarchySelections.length === 0) {
      return accounts;
    }

    const filteredAccounts = [];

    for (const account of accounts) {
      try {
        const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
        const hierarchyValuesMap = new Map(
          hierarchyValues.map((hv: any) => [hv.levelId, hv])
        );

        let match = true;
        for (const selection of workHoursFilter.hierarchySelections) {
          const hv: any = hierarchyValuesMap.get(selection.levelId);
          if (!hv) {
            match = false;
            break;
          }

          // 优先使用 code 进行匹配（配置中存储的是 code），其次使用 id 或 value
          const accountValueId = hv.selectedValue?.code || hv.selectedValue?.id || hv.selectedValue?.value;
          if (!selection.valueIds.includes(accountValueId)) {
            match = false;
            break;
          }
        }

        if (match) {
          filteredAccounts.push(account);
        }
      } catch (error) {
        this.logger.error(`解析账户 ${account.id} 层级信息失败:`, error);
      }
    }

    this.logger.log(`账户层级筛选: 输入${accounts.length}个，输出${filteredAccounts.length}个`);
    return filteredAccounts;
  }

  /**
   * 获取账户下有工时的员工（从WorkHourResult表获取）
   * 实现出勤代码筛选和账户路径匹配
   */
  private async getEmployeesWithHours(
    accountIds: number[],
    attendanceCodes: string[],
    calcDate: Date,
    productionRecord: any
  ) {
    // 获取这些账户的路径
    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: accountIds },
        status: 'ACTIVE',
      },
    });

    // 提取账户路径及其所有父级路径
    const accountPaths = new Set<string>();
    for (const account of accounts) {
      if (account.path) {
        accountPaths.add(account.path);
        // 添加所有父级路径
        const segments = account.path.split('/');
        for (let i = 1; i < segments.length; i++) {
          accountPaths.add(segments.slice(0, i + 1).join('/'));
        }
      }
    }

    // 构建查询条件
    const where: any = {
      workDate: calcDate,
    };

    // 账户路径筛选：使用 IN 匹配所有相关路径
    if (accountPaths.size > 0) {
      where.accountPath = { in: Array.from(accountPaths) };
    }

    // 出勤代码筛选
    if (attendanceCodes && attendanceCodes.length > 0) {
      where.attendanceCode = { in: attendanceCodes };
    }

    this.logger.log(`查询工时结果条件: 日期=${calcDate.toISOString().substring(0, 10)}, 账户路径数=${accountPaths.size}, 出勤代码=${attendanceCodes.join(',')}`);
    this.logger.log(`账户路径列表: ${Array.from(accountPaths).join(', ')}`);

    // 查询工时结果
    const workHourResults = await this.prisma.workHourResult.findMany({
      where,
      select: {
        employeeNo: true,
        employeeId: true,
        workHours: true,
        amount: true,
        accountId: true,
        accountName: true,
        accountPath: true,
        attendanceCode: true,
        attendanceCodeName: true,
        shiftId: true,
        shiftName: true,
      },
    });

    this.logger.log(`找到 ${workHourResults.length} 条工时结果`);

    // 按员工分组统计工时
    const employeeHoursMap = new Map<string, any>();

    for (const whr of workHourResults) {
      const key = whr.employeeNo;
      if (!employeeHoursMap.has(key)) {
        // 获取员工的主账户
        const employee = await this.prisma.employee.findFirst({
          where: { employeeNo: whr.employeeNo },
          select: { id: true },
        });

        let mainAccount = null;
        if (employee) {
          mainAccount = await this.getEmployeeMainAccount(employee.id);
        }

        // 使用工时结果中的账户
        let workHourAccount = null;
        if (whr.accountId) {
          workHourAccount = await this.prisma.laborAccount.findFirst({
            where: {
              id: whr.accountId,
              status: 'ACTIVE',
            },
          });
        }

        // 合并账户
        const accountsToMerge = [];
        if (workHourAccount) {
          accountsToMerge.push(workHourAccount);
        }
        if (mainAccount) {
          accountsToMerge.push(mainAccount);
        }

        const mergedAccount = accountsToMerge.length > 0
          ? this.mergeMultipleAccounts(accountsToMerge)
          : (workHourAccount || mainAccount || { id: whr.accountId, namePath: whr.accountName });

        this.logger.debug(
          `员工 ${whr.employeeNo}: ` +
          `工时账户[${whr.accountName || whr.accountPath}]` +
          (mainAccount ? ` + 主账户[${mainAccount.namePath}]` : '') +
          ` = 合并账户[${mergedAccount.namePath}]`
        );

        employeeHoursMap.set(key, {
          employeeNo: whr.employeeNo,
          employeeId: whr.employeeId,
          workHours: whr.workHours || 0,
          amount: whr.amount || 0,
          attendanceCode: whr.attendanceCode,
          attendanceCodeName: whr.attendanceCodeName,
          shiftId: whr.shiftId,
          shiftName: whr.shiftName,
          workHourAccountId: whr.accountId,
          workHourAccountPath: whr.accountPath,
          mergedAccount: mergedAccount,
        });
      } else {
        const existing = employeeHoursMap.get(key);
        existing.workHours += (whr.workHours || 0);
        existing.amount += (whr.amount || 0);
      }
    }

    this.logger.log(`统计后员工数量: ${employeeHoursMap.size}`);
    return Array.from(employeeHoursMap.values());
  }

  /**
   * 根据人员筛选条件过滤员工（实现人员筛选）
   */
  private async filterEmployees(employees: any[], employeeFilter: any) {
    if (!employeeFilter.fieldGroups || employeeFilter.fieldGroups.length === 0) {
      return employees;
    }

    const filteredEmployees = [];

    for (const employee of employees) {
      try {
        let match = true;

        // 检查每个字段组（AND关系）
        for (const fieldGroup of employeeFilter.fieldGroups) {
          if (!fieldGroup.conditions || fieldGroup.conditions.length === 0) {
            continue;
          }

          // 在字段组内，所有条件都要满足（AND关系）
          for (const condition of fieldGroup.conditions) {
            const employeeMatch = await this.checkEmployeeCondition(
              employee,
              condition
            );

            if (!employeeMatch) {
              match = false;
              break;
            }
          }

          if (!match) break;
        }

        if (match) {
          filteredEmployees.push(employee);
        }
      } catch (error) {
        this.logger.error(`过滤员工 ${employee.employeeNo} 时出错:`, error);
      }
    }

    this.logger.log(`人员筛选: 输入${employees.length}个，输出${filteredEmployees.length}个`);
    return filteredEmployees;
  }

  /**
   * 检查单个员工是否满足筛选条件
   */
  private async checkEmployeeCondition(employee: any, condition: any): Promise<boolean> {
    const { fieldCode, operator, value, fieldName } = condition;

    // 获取员工信息
    const employeeInfo = await this.prisma.employee.findFirst({
      where: { employeeNo: employee.employeeNo },
      select: {
        id: true,
        employeeNo: true,
        name: true,
        orgId: true,
        customFields: true,
      },
    });

    if (!employeeInfo) {
      return false;
    }

    // 获取字段值
    let fieldValue: any;

    // 特殊处理 position 字段（从 WorkInfoHistory 获取）
    if (fieldCode === 'position') {
      const workInfo = await this.prisma.workInfoHistory.findFirst({
        where: {
          employeeId: employeeInfo.id,
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        orderBy: {
          effectiveDate: 'desc', // 获取最新的生效记录
        },
        select: {
          position: true,
        },
      });
      fieldValue = workInfo?.position;
    }
    // 特殊处理 organization 字段
    else if (fieldCode === 'organization') {
      fieldValue = employeeInfo.orgId;
    }
    // 从 customFields 中获取其他字段值
    else if (employeeInfo.customFields) {
      try {
        const customFields = JSON.parse(employeeInfo.customFields);
        fieldValue = customFields[fieldCode];
      } catch (e) {
        this.logger.warn(`解析自定义字段失败: ${fieldCode}`);
      }
    }

    // 添加日志：显示筛选条件
    const passes = this.compareValues(fieldValue, operator, value);
    this.logger.log(
      `员工筛选: ${employeeInfo.name}(${employeeInfo.employeeNo}) - ` +
      `字段[${fieldName || fieldCode}] = ${fieldValue ?? 'undefined'}, ` +
      `操作符[${operator}], 值[${value}], ` +
      `结果: ${passes ? '✅通过' : '❌未通过'}`
    );

    return passes;
  }

  /**
   * 比较值
   *
   * 重要：当字段值不存在（undefined/null）时的处理策略：
   * - 对于 eq 操作符：undefined == value 返回 false（字段不存在，无法相等）
   * - 对于 ne 操作符：undefined != value 返回 true（字段不存在，认为不等于任何明确值）
   * - 对于 in 操作符：undefined 不在列表中，返回 false
   * - 对于 not_in 操作符：undefined 不在列表中，返回 true
   */
  private compareValues(fieldValue: any, operator: string, conditionValue: any): boolean {
    // 如果字段值不存在（undefined 或 null），采用保守策略
    if (fieldValue === undefined || fieldValue === null) {
      switch (operator) {
        case 'eq':
          // 字段不存在，无法相等
          return false;
        case 'ne':
          // 字段不存在，认为"不等于"任何明确值（宽松策略：如果不知道岗位，假设其不是班组长）
          return true;
        case 'in':
          // 字段不存在，不在列表中
          return false;
        case 'not_in':
          // 字段不存在，不在列表中
          return true;
        case 'contains':
        case 'not_contains':
          // 字段不存在，无法进行字符串包含判断
          return false;
        default:
          return false;
      }
    }

    // 字段值存在，进行正常比较
    switch (operator) {
      case 'eq':
        return fieldValue == conditionValue;
      case 'ne':
        return fieldValue != conditionValue;
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(conditionValue);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(conditionValue);
      default:
        return true;
    }
  }

  /**
   * 分摊得工时到员工
   */
  private async allocateEarnedHours(
    totalEarnedHours: number,
    employees: any[],
    totalWorkHours: number,
    rules: any[],
    productionRecord: any,
    batchNo: string,
    configId: number,
    calcTime: Date,
    unit: string, // 添加单位参数
  ) {
    const results = [];

    // 获取分摊规则（在生产记录日期��效的规则）
    // 注意：应该使用生产记录的日期来判断规则是否生效，而不是当前时间
    // 这样可以支持回溯计算历史数据
    const rule = rules.find((r) => {
      const recordDate = new Date(productionRecord.recordDate);
      const startTime = r.effectiveStartTime ? new Date(r.effectiveStartTime) : null;
      const endTime = r.effectiveEndTime ? new Date(r.effectiveEndTime) : null;
      return (!startTime || recordDate >= startTime) && (!endTime || recordDate <= endTime);
    });

    if (!rule) {
      this.logger.warn('没有找到生效的分摊规则');
      return [];
    }

    this.logger.log(`使用规则: ${rule.ruleName}, 分摊方式: ${rule.allocationBasis}`);

    // 删除该配置+规则+日期+账户的旧分摊结果，保留最新一条
    const recordDate = new Date(productionRecord.recordDate);
    recordDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(recordDate);
    nextDate.setDate(nextDate.getDate() + 1);

    const deletedCount = await this.prisma.earnedHoursAllocationResult.deleteMany({
      where: {
        recordDate: {
          gte: recordDate,
          lt: nextDate,
        },
        sourceAccountId: productionRecord.orgId,
        configId,
        ruleName: rule.ruleName,
      },
    });

    if (deletedCount.count > 0) {
      this.logger.log(`清理旧数据: configId=${configId}, rule=${rule.ruleName}, account=${productionRecord.orgId}, date=${recordDate.toISOString().substring(0,10)}, 删除 ${deletedCount.count} 条记录`);
    }

    // 获取员工详细信息
    const employeeNos = employees.map(e => e.employeeNo);
    const employeeDetails = await this.prisma.employee.findMany({
      where: { employeeNo: { in: employeeNos } },
      select: { employeeNo: true, name: true },
    });

    const employeeMap = new Map(employeeDetails.map(e => [e.employeeNo, e.name]));

    if (rule.allocationBasis === 'ACTUAL_HOURS') {
      // 按实际工时比例分摊
      for (const employee of employees) {
        const ratio = employee.workHours / totalWorkHours;
        const allocatedHours = totalEarnedHours * ratio;
        const employeeName = employeeMap.get(employee.employeeNo) || 'Unknown';

        const mergedAccount = employee.mergedAccount || {
          id: productionRecord.orgId,
          namePath: productionRecord.orgName,
        };

        // 保存分摊结果到数据库
        await this.prisma.earnedHoursAllocationResult.create({
          data: {
            batchNo,
            recordDate: new Date(productionRecord.recordDate),
            configId,
            configVersion: 1,
            ruleName: rule.ruleName,
            sourceEmployeeNo: employee.employeeNo,
            sourceEmployeeName: employeeName,
            sourceAccountId: productionRecord.orgId,
            sourceAccountName: productionRecord.orgName,
            sourceHours: employee.workHours,
            targetType: 'EMPLOYEE',
            targetId: 0,
            targetName: employeeName,
            targetAccountId: mergedAccount.id,
            targetAccountName: mergedAccount.namePath,
            allocatedHours,
            allocationRatio: ratio,
            unit, // 添加单位
            calcTime,
          },
        });

        results.push({
          employeeNo: employee.employeeNo,
          employeeName,
          allocationBasis: 'ACTUAL_HOURS',
          workHours: employee.workHours,
          ratio,
          allocatedHours,
          mergedAccountName: mergedAccount.namePath,
        });

        this.logger.log(
          `员工 ${employee.employeeNo}: 工时=${employee.workHours}, 比例=${ratio.toFixed(4)}, 分得工时=${allocatedHours.toFixed(2)}, 合并账户=${mergedAccount.namePath}`
        );
      }
    } else if (rule.allocationBasis === 'ACTUAL_HOURS_COEFFICIENT') {
      // 按实际工时系��（金额）比例分摊
      const totalAmount = employees.reduce((sum, emp) => sum + (emp.amount || 0), 0);

      if (totalAmount === 0) {
        this.logger.warn('总金额为0，无法按实际工时系数比例分摊');
        return [];
      }

      for (const employee of employees) {
        const ratio = (employee.amount || 0) / totalAmount;
        const allocatedHours = totalEarnedHours * ratio;
        const employeeName = employeeMap.get(employee.employeeNo) || 'Unknown';

        const mergedAccount = employee.mergedAccount || {
          id: productionRecord.orgId,
          namePath: productionRecord.orgName,
        };

        // 保存分摊结果到数据库
        await this.prisma.earnedHoursAllocationResult.create({
          data: {
            batchNo,
            recordDate: new Date(productionRecord.recordDate),
            configId,
            configVersion: 1,
            ruleName: rule.ruleName,
            sourceEmployeeNo: employee.employeeNo,
            sourceEmployeeName: employeeName,
            sourceAccountId: productionRecord.orgId,
            sourceAccountName: productionRecord.orgName,
            sourceHours: employee.amount || 0,
            targetType: 'EMPLOYEE',
            targetId: 0,
            targetName: employeeName,
            targetAccountId: mergedAccount.id,
            targetAccountName: mergedAccount.namePath,
            allocatedHours,
            allocationRatio: ratio,
            unit, // 添加单位
            calcTime,
          },
        });

        results.push({
          employeeNo: employee.employeeNo,
          employeeName,
          allocationBasis: 'ACTUAL_HOURS_COEFFICIENT',
          workHours: employee.amount || 0,
          ratio,
          allocatedHours,
          mergedAccountName: mergedAccount.namePath,
        });

        this.logger.log(
          `员工 ${employee.employeeNo}: 金额=${employee.amount}, 比例=${ratio.toFixed(4)}, 分得工时=${allocatedHours.toFixed(2)}, 合并账户=${mergedAccount.namePath}`
        );
      }
    } else if (rule.allocationBasis === 'AVERAGE') {
      // 平均分摊
      const perPersonHours = totalEarnedHours / employees.length;
      const avgRatio = 1 / employees.length;

      for (const employee of employees) {
        const employeeName = employeeMap.get(employee.employeeNo) || 'Unknown';

        const mergedAccount = employee.mergedAccount || {
          id: productionRecord.orgId,
          namePath: productionRecord.orgName,
        };

        // 保存分摊结果到数据库
        await this.prisma.earnedHoursAllocationResult.create({
          data: {
            batchNo,
            recordDate: new Date(productionRecord.recordDate),
            configId,
            configVersion: 1,
            ruleName: rule.ruleName,
            sourceEmployeeNo: employee.employeeNo,
            sourceEmployeeName: employeeName,
            sourceAccountId: productionRecord.orgId,
            sourceAccountName: productionRecord.orgName,
            sourceHours: employee.workHours,
            targetType: 'EMPLOYEE',
            targetId: 0,
            targetName: employeeName,
            targetAccountId: mergedAccount.id,
            targetAccountName: mergedAccount.namePath,
            allocatedHours: perPersonHours,
            allocationRatio: avgRatio,
            unit, // 添加单位
            calcTime,
          },
        });

        results.push({
          employeeNo: employee.employeeNo,
          employeeName,
          allocationBasis: 'AVERAGE',
          workHours: employee.workHours,
          ratio: 1 / employees.length,
          allocatedHours: perPersonHours,
          mergedAccountName: mergedAccount.namePath,
        });

        this.logger.log(
          `员工 ${employee.employeeNo}: 分得工时=${perPersonHours.toFixed(2)}, 合并账户=${mergedAccount.namePath}`
        );
      }
    }

    return results;
  }

  /**
   * 获取挣得工时分摊结果列表
   */
  async getEarnedHoursResults(query: any) {
    // 明确区分 undefined 和字符串 'undefined'
    const pageParam = query.page;
    const pageSizeParam = query.pageSize;
    const batchNo = query.batchNo;
    const startDate = query.startDate;
    const endDate = query.endDate;
    const targetName = query.targetName;

    // 对于挣得工时查询，如果不传 page 参数（undefined），则返回所有数据（不分页）
    // 如果传了 page 参数（即使是 'undefined' 字符串），则使用分页
    const usePagination = pageParam !== undefined && pageParam !== null;

    let skip = 0;
    let take: number | undefined = undefined;
    let page = 1;
    let pageSize = 10;

    if (usePagination) {
      page = Number(pageParam) || 1;
      pageSize = Number(pageSizeParam) || 10;
      skip = (page - 1) * pageSize;
      take = pageSize;
    }

    this.logger.log(`[挣得工时查询] usePagination=${usePagination}, skip=${skip}, take=${take === undefined ? 'undefined(获取全部)' : take}`);

    const where: any = {};

    if (batchNo) where.batchNo = batchNo;
    if (targetName) where.targetName = { contains: targetName };
    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    const [list, total] = await Promise.all([
      this.prisma.earnedHoursAllocationResult.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.earnedHoursAllocationResult.count({ where }),
    ]);

    // 计算每个批次的总挣得工时（通过 SUM(allocatedHours)）
    const batchNoList = [...new Set(list.map(item => item.batchNo))];
    const batchTotalEarnedHours = new Map<string, number>();

    await Promise.all(
      batchNoList.map(async (batchNo) => {
        const result = await this.prisma.earnedHoursAllocationResult.aggregate({
          where: { batchNo },
          _sum: {
            allocatedHours: true,
          },
        });
        batchTotalEarnedHours.set(batchNo, result._sum.allocatedHours || 0);
      })
    );

    // 关联生产记录和配置信息
    const enrichedList = await Promise.all(
      list.map(async (item) => {
        // 查找对应的生产记录（通过批次号和日期）
        const productionRecord = await this.prisma.productionRecord.findFirst({
          where: {
            recordDate: item.recordDate,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        });

        // 获取配置和规则信息
        const config = await this.prisma.earnedHoursAllocationConfig.findUnique({
          where: { id: item.configId },
        });

        let ruleName = '-';
        let ruleCode = '-';
        let allocationBasis = '-';
        if (config) {
          try {
            const rules = JSON.parse(config.rules || '[]');
            if (rules.length > 0) {
              ruleName = rules[0].ruleName || '-';
              ruleCode = rules[0].ruleCode || '-';
              allocationBasis = rules[0].allocationBasis || '-';
            }
          } catch (e) {
            // 忽略解析错误
          }
        }

        // 获取该批次的总挣得工时
        const totalEarnedHours = batchTotalEarnedHours.get(item.batchNo) || 0;

        return {
          ...item,
          totalEarnedHours, // 添加总挣得工时字段
          allocationBasis, // 添加分摊方式字段
          productionRecord: productionRecord ? {
            productName: productionRecord.productName,
            productCode: productionRecord.productCode,
            actualQty: productionRecord.actualQty,
            totalStdHours: productionRecord.totalStdHours > 0 ? productionRecord.totalStdHours : totalEarnedHours,
            lineName: productionRecord.lineName,
            shiftName: productionRecord.shiftName,
          } : {
            // 如果找不到生产记录，使用总挣得工时
            productName: '未知产品',
            productCode: '-',
            actualQty: 0,
            totalStdHours: totalEarnedHours,
            lineName: null,
            shiftName: null,
          },
          config: config ? {
            configCode: config.code,
            configName: config.configName || config.name,
          } : null,
          ruleName,
          ruleCode,
          rule: {
            ruleCode,
            ruleName,
          },
        };
      })
    );

    return {
      items: enrichedList,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    };
  }

  /**
   * 获取挣得工时分摊结果汇总
   */
  async getEarnedHoursResultsSummary(query: any) {
    const { batchNo, startDate, endDate } = query;

    const where: any = {};
    if (batchNo) where.batchNo = batchNo;
    if (startDate || endDate) {
      where.recordDate = {};
      if (startDate) where.recordDate.gte = new Date(startDate);
      if (endDate) where.recordDate.lte = new Date(endDate);
    }

    const results = await this.prisma.earnedHoursAllocationResult.findMany({
      where,
    });

    // 汇总统计
    const totalAllocatedHours = results.reduce((sum, r) => sum + r.allocatedHours, 0);
    const totalRecords = results.length;

    return {
      total: {
        totalAllocatedHours,
        totalRecords,
      },
    };
  }

  /**
   * 统一查询挣��工时数据 - 按员工+日期+账户+产品维度聚合
   * 包含团队分摊工时和个人挣得工时
   */
  async getUnifiedEarnedHoursReport(query: any) {
    const { startDate, endDate, employeeNo, orgId, productId } = query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.logger.log(`[统一挣得工时报表] 查询条件: startDate=${startDate}, endDate=${endDate}, employeeNo=${employeeNo}, orgId=${orgId}, productId=${productId}`);

    // 使用Map来聚合数据，key格式: 日期_员工号_账户ID_产品ID
    const dataMap = new Map<string, any>();

    // ========== 1. 查询个人产量记录 ==========
    const personalWhere: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };

    if (employeeNo) personalWhere.employeeNo = employeeNo;
    if (orgId) personalWhere.orgId = Number(orgId);
    if (productId) personalWhere.productId = Number(productId);

    const personalRecords = await this.prisma.personalProductionRecord.findMany({
      where: personalWhere,
      orderBy: { recordDate: 'desc' },
    });

    this.logger.log(`[统一挣得工时报表] 找到 ${personalRecords.length} 条个人产量记录`);

    // 处理个人产量记录
    for (const record of personalRecords) {
      const dateKey = record.recordDate.toISOString().split('T')[0];
      const key = `${dateKey}_${record.employeeNo}_${record.orgId}_${record.productId || 0}`;

      // 查找标准工时配置
      let standardHoursConfig = null;
      let standardQuantity = 1;
      let standardHours = 0;

      if (record.productId) {
        const recordDate = new Date(record.recordDate);
        const standardConfig = await this.findMatchingStandardHourConfig(
          record.productId,
          record.orgId,
          record.orgName,
          recordDate
        );

        if (standardConfig) {
          standardHoursConfig = standardConfig;
          standardQuantity = standardConfig.quantity || 1;
          standardHours = standardConfig.standardHours || 0;
        }
      }

      if (!dataMap.has(key)) {
        dataMap.set(key, {
          recordDate: record.recordDate,
          employeeNo: record.employeeNo,
          employeeName: record.employeeName,
          orgId: record.orgId,
          orgName: record.orgName,
          productId: record.productId,
          productCode: record.productCode,
          productName: record.productName,
          actualQty: record.actualQty || 0,
          standardQuantity,
          standardHours,
          accountPath: standardHoursConfig?.accountPath || null,
          teamAllocatedHours: 0,
          personalEarnedHours: record.earnedHours || 0,
          totalEarnedHours: record.earnedHours || 0,
        });
      } else {
        // 如果已存在，累加个人挣得工时
        const existing = dataMap.get(key);
        existing.personalEarnedHours += record.earnedHours || 0;
        existing.totalEarnedHours = existing.teamAllocatedHours + existing.personalEarnedHours;
      }
    }

    // ========== 2. 查询团队分摊结果 ==========
    const allocationWhere: any = {
      recordDate: { gte: start, lte: end },
      targetType: 'EMPLOYEE',
      deletedAt: null,
    };

    if (employeeNo) allocationWhere.sourceEmployeeNo = employeeNo;
    if (orgId) allocationWhere.sourceAccountId = Number(orgId);

    const allocationResults = await this.prisma.earnedHoursAllocationResult.findMany({
      where: allocationWhere,
      orderBy: { recordDate: 'desc' },
    });

    this.logger.log(`[统一挣得工时报表] 找到 ${allocationResults.length} 条团队分摊结果`);

    // 处理团队分摊结果
    for (const allocation of allocationResults) {
      // 获取对应的生产记录
      const productionRecord = await this.prisma.productionRecord.findFirst({
        where: {
          recordDate: allocation.recordDate,
          orgId: allocation.sourceAccountId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      // 按productId筛选
      if (productId && productionRecord && productionRecord.productId !== Number(productId)) {
        continue;
      }

      const dateKey = allocation.recordDate.toISOString().split('T')[0];
      const prodId = productionRecord?.productId || 0;
      const key = `${dateKey}_${allocation.sourceEmployeeNo}_${allocation.sourceAccountId}_${prodId}`;

      // 查找标准工时配置
      let standardHoursConfig = null;
      let standardQuantity = 1;
      let standardHours = 0;

      if (productionRecord && productionRecord.productId) {
        const recordDate = new Date(allocation.recordDate);
        const standardConfig = await this.findMatchingStandardHourConfig(
          productionRecord.productId,
          allocation.sourceAccountId!,
          allocation.sourceAccountName || '',
          recordDate
        );

        if (standardConfig) {
          standardHoursConfig = standardConfig;
          standardQuantity = standardConfig.quantity || 1;
          standardHours = standardConfig.standardHours || 0;
        }
      }

      if (!dataMap.has(key)) {
        // 创建新记录（只有团队分摊）
        dataMap.set(key, {
          recordDate: allocation.recordDate,
          employeeNo: allocation.sourceEmployeeNo,
          employeeName: allocation.sourceEmployeeName,
          orgId: allocation.sourceAccountId,
          orgName: allocation.sourceAccountName,
          productId: productionRecord?.productId,
          productCode: productionRecord?.productCode,
          productName: productionRecord?.productName,
          actualQty: productionRecord?.actualQty || 0,
          standardQuantity,
          standardHours,
          accountPath: standardHoursConfig?.accountPath || null,
          teamAllocatedHours: allocation.allocatedHours || 0,
          personalEarnedHours: 0,
          totalEarnedHours: allocation.allocatedHours || 0,
        });
      } else {
        // 如果已存在，累加团队分摊工时
        const existing = dataMap.get(key);
        existing.teamAllocatedHours += allocation.allocatedHours || 0;
        existing.totalEarnedHours = existing.teamAllocatedHours + existing.personalEarnedHours;
      }
    }

    // 转换为数组并添加ID
    const results = Array.from(dataMap.values()).map((item, index) => ({
      ...item,
      id: index + 1,
    }));

    // 按日期、员工、账户排序
    results.sort((a, b) => {
      const dateCompare = new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      const empCompare = a.employeeNo.localeCompare(b.employeeNo);
      if (empCompare !== 0) return empCompare;
      return (a.orgId || 0) - (b.orgId || 0);
    });

    // 汇总统计
    const totalRecords = results.length;
    const totalQty = results.reduce((sum, r) => sum + (r.actualQty || 0), 0);
    const totalTeamAllocatedHours = results.reduce((sum, r) => sum + (r.teamAllocatedHours || 0), 0);
    const totalPersonalEarnedHours = results.reduce((sum, r) => sum + (r.personalEarnedHours || 0), 0);
    const totalEarnedHours = results.reduce((sum, r) => sum + (r.totalEarnedHours || 0), 0);

    this.logger.log(`[统一挣得工时报表] 汇总: ${totalRecords} 条记录, 总产量: ${totalQty}, 团队分摊: ${totalTeamAllocatedHours}, 个人挣得: ${totalPersonalEarnedHours}, 总计: ${totalEarnedHours}`);

    return {
      items: results,
      summary: {
        totalRecords,
        totalQty,
        totalTeamAllocatedHours,
        totalPersonalEarnedHours,
        totalEarnedHours,
      },
    };
  }

  /**
   * 从数据库表中读取团队挣得工时分摊结果
   */
  async getTeamProductionEarnedHours(query: any) {
    const { startDate, endDate, orgId, productId } = query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.logger.log(`[团队产量挣得工时] 查询条件: startDate=${startDate}, endDate=${endDate}, orgId=${orgId}, productId=${productId}`);

    // 构建查询条件
    const allocationWhere: any = {
      recordDate: { gte: start, lte: end },
      targetType: 'EMPLOYEE',
      deletedAt: null,
    };

    // 按组织筛选（通过源账户）
    if (orgId) {
      allocationWhere.sourceAccountId = Number(orgId);
    }

    // 查询分摊结果表
    const allocationResults = await this.prisma.earnedHoursAllocationResult.findMany({
      where: allocationWhere,
      orderBy: { recordDate: 'desc' },
    });

    this.logger.log(`[团队产量挣得工时] 找到 ${allocationResults.length} 条分摊结果`);

    if (allocationResults.length === 0) {
      return {
        items: [],
        summary: {
          totalRecords: 0,
          totalQty: 0,
          totalEarnedHours: 0,
        },
      };
    }

    // 获取相关的生产记录信息
    const recordDates = [...new Set(allocationResults.map(r => r.recordDate.toISOString().split('T')[0]))];
    const sourceAccountIds = [...new Set(allocationResults.map(r => r.sourceAccountId).filter(Boolean))];

    // 查询生产记录
    const productionWhere: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };
    if (orgId) productionWhere.orgId = Number(orgId);
    if (productId) productionWhere.productId = Number(productId);

    const productionRecords = await this.prisma.productionRecord.findMany({
      where: productionWhere,
    });

    // 按日期和账户组织生产记录
    const productionMap = new Map<string, any>();
    for (const record of productionRecords) {
      const dateKey = record.recordDate.toISOString().split('T')[0];
      const key = `${dateKey}_${record.orgId}`;
      if (!productionMap.has(key)) {
        productionMap.set(key, record);
      }
    }

    // 按日期+账户聚合分摊结果
    const groupedResults = new Map<string, any>();
    for (const allocation of allocationResults) {
      const dateKey = allocation.recordDate.toISOString().split('T')[0];
      const key = `${dateKey}_${allocation.sourceAccountId}`;

      if (!groupedResults.has(key)) {
        // 获取对应的生产记录
        const prodKey = `${dateKey}_${allocation.sourceAccountId}`;
        const productionRecord = productionMap.get(prodKey);

        // 查找标准工时配置
        let standardHoursConfig = null;
        if (productionRecord && productionRecord.productId) {
          const recordDate = new Date(allocation.recordDate);
          const standardConfig = await this.findMatchingStandardHourConfig(
            productionRecord.productId,
            allocation.sourceAccountId!,
            allocation.sourceAccountName || '',
            recordDate
          );

          if (standardConfig) {
            standardHoursConfig = {
              productId: standardConfig.productId,
              accountPath: standardConfig.accountPath,
              standardHours: standardConfig.standardHours,
              quantity: standardConfig.quantity,
              effectiveDate: standardConfig.effectiveDate,
              expiryDate: standardConfig.expiryDate,
            };
          }
        }

        // 按productId筛选
        if (productId && productionRecord && productionRecord.productId !== Number(productId)) {
          continue;
        }

        groupedResults.set(key, {
          id: allocation.id,
          recordDate: allocation.recordDate,
          orgId: allocation.sourceAccountId,
          orgName: allocation.sourceAccountName,
          productId: productionRecord?.productId,
          productCode: productionRecord?.productCode,
          productName: productionRecord?.productName,
          actualQty: productionRecord?.actualQty || 0,
          totalStdHours: productionRecord?.totalStdHours || 0,
          calculatedEarnedHours: 0,
          standardHoursConfig,
          allocationDetails: [],
        });
      }

      const group = groupedResults.get(key);
      group.calculatedEarnedHours += allocation.allocatedHours || 0;
      group.allocationDetails.push({
        employeeNo: allocation.sourceEmployeeNo,
        employeeName: allocation.sourceEmployeeName,
        allocatedHours: allocation.allocatedHours,
        allocationRatio: allocation.allocationRatio,
        targetAccountName: allocation.targetAccountName,
      });
    }

    const results = Array.from(groupedResults.values());

    // 汇总统计
    const totalQty = results.reduce((sum, r) => sum + (r.actualQty || 0), 0);
    const totalEarnedHours = results.reduce((sum, r) => sum + (r.calculatedEarnedHours || 0), 0);

    this.logger.log(`[团队产量挣得工时] 汇总: ${results.length} 条记录, 总产量: ${totalQty}, 总挣得工时: ${totalEarnedHours}`);

    return {
      items: results,
      summary: {
        totalRecords: results.length,
        totalQty,
        totalEarnedHours,
      },
    };
  }

  /**
   * 从数据库表中读取个人挣得工时数据
   */
  async getPersonalProductionEarnedHours(query: any) {
    const { startDate, endDate, employeeNo, orgId, productId } = query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    this.logger.log(`[个人产量挣得工时] 查询条件: startDate=${startDate}, endDate=${endDate}, employeeNo=${employeeNo}, orgId=${orgId}, productId=${productId}`);

    // 1. 查询个人产量记录表（个人直接记录的产量和挣得工时）
    const personalWhere: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };

    if (employeeNo) personalWhere.employeeNo = employeeNo;
    if (orgId) personalWhere.orgId = Number(orgId);
    if (productId) personalWhere.productId = Number(productId);

    const personalRecords = await this.prisma.personalProductionRecord.findMany({
      where: personalWhere,
      orderBy: { recordDate: 'desc' },
    });

    this.logger.log(`[个人产量挣得工时] 找到 ${personalRecords.length} 条个人产量记录`);

    // 2. 查询团队分摊结果表（团队产量分摊到个人的工时）
    const allocationWhere: any = {
      recordDate: { gte: start, lte: end },
      targetType: 'EMPLOYEE',
      deletedAt: null,
    };

    if (employeeNo) allocationWhere.sourceEmployeeNo = employeeNo;
    if (orgId) allocationWhere.sourceAccountId = Number(orgId);

    const allocationResults = await this.prisma.earnedHoursAllocationResult.findMany({
      where: allocationWhere,
      orderBy: { recordDate: 'desc' },
    });

    this.logger.log(`[个人产量挣得工时] 找到 ${allocationResults.length} 条团队分摊结果`);

    // 3. 合并两种数据来源
    const resultMap = new Map<string, any>();

    // 处理个人产量记录
    for (const record of personalRecords) {
      const key = `${record.recordDate.toISOString().split('T')[0]}_${record.employeeNo}_${record.productId || 'all'}`;

      // 查找标准工时配置
      let standardHoursConfig = null;
      if (record.productId) {
        const recordDate = new Date(record.recordDate);
        const standardConfig = await this.findMatchingStandardHourConfig(
          record.productId,
          record.orgId,
          record.orgName,
          recordDate
        );

        if (standardConfig) {
          standardHoursConfig = {
            productId: standardConfig.productId,
            accountPath: standardConfig.accountPath,
            standardHours: standardConfig.standardHours,
            quantity: standardConfig.quantity,
            effectiveDate: standardConfig.effectiveDate,
            expiryDate: standardConfig.expiryDate,
          };
        }
      }

      resultMap.set(key, {
        id: record.id,
        recordDate: record.recordDate,
        employeeNo: record.employeeNo,
        employeeName: record.employeeName,
        orgId: record.orgId,
        orgName: record.orgName,
        productId: record.productId,
        productCode: record.productCode,
        productName: record.productName,
        actualQty: record.actualQty,
        standardHours: record.standardHours,
        earnedHours: record.earnedHours || 0,
        allocatedHours: 0, // 团队分摊的工时，后续累加
        standardHoursConfig,
        source: 'PERSONAL',
      });
    }

    // 处理团队分摊结果
    for (const allocation of allocationResults) {
      const key = `${allocation.recordDate.toISOString().split('T')[0]}_${allocation.sourceEmployeeNo}_allocation`;

      // 获取生产记录信息
      const productionRecord = await this.prisma.productionRecord.findFirst({
        where: {
          recordDate: allocation.recordDate,
          orgId: allocation.sourceAccountId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      // 按productId筛选
      if (productId && productionRecord && productionRecord.productId !== Number(productId)) {
        continue;
      }

      if (resultMap.has(key)) {
        // 已存在个人记录，累加分摊工时
        const existing = resultMap.get(key);
        existing.allocatedHours += allocation.allocatedHours || 0;
      } else {
        // 不存在个人记录，创建新记录（仅包含分摊工时）
        const recordDate = new Date(allocation.recordDate);
        let standardHoursConfig = null;

        if (productionRecord && productionRecord.productId) {
          const standardConfig = await this.findMatchingStandardHourConfig(
            productionRecord.productId,
            allocation.sourceAccountId!,
            allocation.sourceAccountName || '',
            recordDate
          );

          if (standardConfig) {
            standardHoursConfig = {
              productId: standardConfig.productId,
              accountPath: standardConfig.accountPath,
              standardHours: standardConfig.standardHours,
              quantity: standardConfig.quantity,
              effectiveDate: standardConfig.effectiveDate,
              expiryDate: standardConfig.expiryDate,
            };
          }
        }

        resultMap.set(key, {
          id: allocation.id,
          recordDate: allocation.recordDate,
          employeeNo: allocation.sourceEmployeeNo,
          employeeName: allocation.sourceEmployeeName,
          orgId: allocation.sourceAccountId,
          orgName: allocation.sourceAccountName,
          productId: productionRecord?.productId,
          productCode: productionRecord?.productCode,
          productName: productionRecord?.productName,
          actualQty: productionRecord?.actualQty || 0,
          standardHours: 0,
          earnedHours: 0,
          allocatedHours: allocation.allocatedHours || 0,
          standardHoursConfig,
          source: 'ALLOCATION',
        });
      }
    }

    const results = Array.from(resultMap.values());

    // 汇总统计
    const totalQty = results.reduce((sum, r) => sum + (r.actualQty || 0), 0);
    const totalEarnedHours = results.reduce((sum, r) => sum + (r.earnedHours || 0), 0);
    const totalAllocatedHours = results.reduce((sum, r) => sum + (r.allocatedHours || 0), 0);
    const totalCalculatedEarnedHours = totalEarnedHours + totalAllocatedHours;

    this.logger.log(`[个人产量挣得工时] 汇总: ${results.length} 条记录, 总产量: ${totalQty}, 个人挣得工时: ${totalEarnedHours}, 团队分摊工时: ${totalAllocatedHours}, 总计: ${totalCalculatedEarnedHours}`);

    return {
      items: results,
      summary: {
        totalRecords: results.length,
        totalQty,
        totalCalculatedEarnedHours,
        totalExistingEarnedHours: totalEarnedHours,
        totalAllocatedHours,
      },
    };
  }

  /**
   * 从账户路径中提取匹配值
   * @param namePath 账户名称路径，如 "杭州工厂/W1总装车间/W1总装L1产线/焊接"
   * @param hierarchyLevelsToExtract 要提取的层级配置，如 "产品,工序" 或 "4,5"
   * @returns 提取的值数组，如 ["焊接"] 或 ["W1总装L1产线", "焊接"]
   */
  private extractMatchValues(namePath: string, hierarchyLevelsToExtract: string): string[] {
    if (!namePath || !hierarchyLevelsToExtract) {
      return [];
    }

    // 解析层级配置（支持 "产品,工序" 或 "4,5" 或 "6,8" 格式）
    const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());

    // 将层级名称转换为层级编号（序号）
    const levelNameMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
    };

    // 直接使用层级序号（level字段），不需要levelId映射
    // hierarchyValues中已包含level字段（1-7），SystemConfig直接配置层级序号即可
    const levelsToExtractNumbers = levelsToExtract.map(l => {
      const num = parseInt(l);
      if (isNaN(num)) {
        // 如果不是数字，尝试从层级名称映射
        return levelNameMap[l] || 0;
      }
      // 如果是数字，直接作为层级序号使用（1-7）
      return num;
    }).filter(n => n > 0);

    if (levelsToExtractNumbers.length === 0) {
      return [];
    }

    // 将路径字符串分割成数组
    const pathSegments = namePath.split('/').filter(s => s.trim() !== '');

    this.logger.log(`[标准工时匹配] 账户路径: "${namePath}" 分割后: [${pathSegments.join(', ')}]`);
    this.logger.log(`[标准工时匹配] 要提取的层级序号: [${levelsToExtractNumbers.join(', ')}]`);

    // 按层级序号提取对应的值（序号从1开始）
    const extractedValues = levelsToExtractNumbers
      .map(levelNum => {
        const index = levelNum - 1;  // 转换为数组索引（从0开始）
        if (index >= 0 && index < pathSegments.length) {
          const value = pathSegments[index];
          this.logger.log(`[标准工时匹配] 提取层级${levelNum}(索引${index}): "${value}"`);
          return value;
        }
        this.logger.log(`[标准工时匹配] 层级${levelNum}(索引${index})超出范围，返回null`);
        return null;
      })
      .filter(v => v !== null) as string[];

    this.logger.log(`[标准工时匹配] 最终提取的值: [${extractedValues.join(', ')}]`);

    return extractedValues;
  }

  /**
   * 从hierarchyValues中提取匹配值
   * @param hierarchyValuesJSON hierarchyValues的JSON字符串
   * @param hierarchyLevelsToExtract 要提取的层级配置，如 "产品,工序" 或 "4,5"
   * @returns 提取的值数组，如 ["焊接"] 或 ["W1总装L1产线", "焊接"]
   */
  private extractMatchValuesFromHierarchy(
    hierarchyValuesJSON: string | null,
    hierarchyLevelsToExtract: string
  ): string[] {
    if (!hierarchyValuesJSON || !hierarchyLevelsToExtract) {
      return [];
    }

    // 解析hierarchyValues
    let hierarchyValues: any[] = [];
    try {
      hierarchyValues = JSON.parse(hierarchyValuesJSON);
    } catch (e) {
      this.logger.error(`[标准工时匹配] 解析hierarchyValues失败: ${e}`);
      return [];
    }

    // 解析层级配置（支持 "产品,工序" 或 "4,5" 或 "6,8" 格式）
    const levelsToExtract = hierarchyLevelsToExtract.split(',').map(l => l.trim());

    // 将层级名称转换为层级编号（序号）
    const levelNameMap: Record<string, number> = {
      '工厂': 1,
      '车间': 2,
      '产线': 3,
      '产品': 4,
      '工序': 5,
      '岗位': 6,
      '技能等级': 7,
    };

    // 直接使用层级序号（level字段），不需要levelId映射
    const levelsToExtractNumbers = levelsToExtract.map(l => {
      const num = parseInt(l);
      if (isNaN(num)) {
        // 如果不是数字，尝试从层级名称映射
        return levelNameMap[l] || 0;
      }
      // 如果是数字，直接作为层级序号使用（1-7）
      return num;
    }).filter(n => n > 0);

    if (levelsToExtractNumbers.length === 0) {
      return [];
    }

    this.logger.log(`[标准工时匹配] 从hierarchyValues提取层级: [${levelsToExtractNumbers.join(', ')}]`);

    // 将hierarchyValues转换为level -> value的映射
    const hierarchyValuesMap = new Map<number, string>();
    hierarchyValues.forEach((hv: any) => {
      if (hv.level && hv.selectedValue) {
        const value = hv.selectedValue.name || hv.selectedValue.code || hv.selectedValue.id;
        if (value) {
          hierarchyValuesMap.set(hv.level, String(value));
        }
      }
    });

    this.logger.log(`[标准工时匹配] hierarchyValues包含的层级: [${[...hierarchyValuesMap.keys()].join(', ')}]`);

    // 按层级序号提取对应的值
    const extractedValues = levelsToExtractNumbers
      .map(levelNum => {
        const value = hierarchyValuesMap.get(levelNum);
        if (value) {
          this.logger.log(`[标准工时匹配] 提取层级${levelNum}: "${value}"`);
          return value;
        }
        this.logger.log(`[标准工时匹配] 层级${levelNum}在hierarchyValues中为空，跳过`);
        return null;
      })
      .filter(v => v !== null) as string[];

    this.logger.log(`[标准工时匹配] 最终提取的值: [${extractedValues.join(', ')}]`);

    return extractedValues;
  }

  /**
   * 生成路径组合（从精确到粗粒度）
   * @param values 提取的值数组，如 ["W1总装L1产线", "焊接"]
   * @returns 路径组合数组，如 ["W1总装L1产线/焊接", "W1总装L1产线", "焊接"]
   */
  private generatePathCombinations(values: string[]): string[] {
    const combinations: string[] = [];
    const n = values.length;

    // 从最精确（所有层级）到最粗粒度（单个层级）
    // 按层数从大到小生成组合
    for (let len = n; len >= 1; len--) {
      if (len === 1) {
        // 单个层级，直接添加所有值
        combinations.push(...values);
      } else {
        // 多个层级，生成所有连续的组合
        // 例如: values=[A,B,C], len=2 -> [A/B, B/C]
        for (let i = 0; i <= n - len; i++) {
          const combination = values.slice(i, i + len).join('/');
          combinations.push(combination);
        }
      }
    }

    return combinations;
  }

  /**
   * 查找匹配的产品标准工时配置
   * @param productId 产品ID
   * @param orgId 劳动力账户ID
   * @param orgName 劳动力账户名称路径（保留用于日志）
   * @param targetDate 目标日期
   * @returns 匹配的标准工时配置，如果没有匹配则返回 null
   */
  private async findMatchingStandardHourConfig(
    productId: number,
    orgId: number,
    orgName: string,
    targetDate: Date
  ) {
    // 1. 获取配置的提取层级
    const hierarchyConfig = await this.prisma.systemConfig.findUnique({
      where: { configKey: 'standardHoursHierarchyLevels' },
    });

    const hierarchyLevelsToExtract = hierarchyConfig?.configValue || '';
    this.logger.log(`[标准工时匹配] 配置的提取层级: ${hierarchyLevelsToExtract || '(无配置)'}`);

    // 2. 查询劳动力账户的hierarchyValues
    const laborAccount = await this.prisma.laborAccount.findFirst({
      where: { id: orgId },
      select: { hierarchyValues: true },
    });

    // 3. 提取匹配值（从hierarchyValues而不是name path）
    const extractedValues = this.extractMatchValuesFromHierarchy(
      laborAccount?.hierarchyValues,
      hierarchyLevelsToExtract
    );

    if (extractedValues.length === 0) {
      this.logger.log(`[标准工时匹配] 提取的值为空，跳过精确路径匹配，直接尝试全局配置`);
      // 继续执行，尝试匹配全局配置（accountPath="-"）
    }

    // 3. 生成所有可能的路径组合（从精确到粗粒度）
    const pathCombinations = this.generatePathCombinations(extractedValues);
    this.logger.log(`[标准工时匹配] 生成的路径组合: [${pathCombinations.join(', ')}]`);

    // 4. 按优先级匹配：先查询有明确日期区间的标准配置
    for (const path of pathCombinations) {
      const standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
        where: {
          productId,
          deletedAt: null,
          status: 'ACTIVE',
          effectiveDate: { lte: targetDate },
          expiryDate: { gte: targetDate },
          accountPath: path,
        },
      });

      if (standardHourConfig) {
        this.logger.log(`[标准工时匹配] ✓ 找到匹配的标准配置 (有日期区间): accountPath=${standardHourConfig.accountPath}, standardHours=${standardHourConfig.standardHours}`);
        return standardHourConfig;
      }
    }

    // 5. 如果没有找到有日期区间的配置，查询永久标准
    for (const path of pathCombinations) {
      const standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
        where: {
          productId,
          deletedAt: null,
          status: 'ACTIVE',
          effectiveDate: { lte: targetDate },
          expiryDate: null,
          accountPath: path,
        },
      });

      if (standardHourConfig) {
        this.logger.log(`[标准工时匹配] ✓ 找到匹配的标准配置 (永久): accountPath=${standardHourConfig.accountPath}, standardHours=${standardHourConfig.standardHours}`);
        return standardHourConfig;
      }
    }

    // 6. 如果没有匹配到指定层级的标准，查找全局配置标准（accountPath 为空、"-" 或 null）
    this.logger.log(`[标准工时匹配] 未找到匹配的标准配置，查找全局配置标准...`);

    let standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: { gte: targetDate },
        OR: [
          { accountPath: '' },
          { accountPath: null },
          { accountPath: '-' },
        ],
      },
    });

    if (standardHourConfig) {
      this.logger.log(`[标准工时匹配] ✓ 找到全局配置标准 (有日期区间): standardHours=${standardHourConfig.standardHours}`);
      return standardHourConfig;
    }

    // 7. 最后查找全局配置的永久标准
    standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        productId,
        deletedAt: null,
        status: 'ACTIVE',
        effectiveDate: { lte: targetDate },
        expiryDate: null,
        OR: [
          { accountPath: '' },
          { accountPath: null },
          { accountPath: '-' },
        ],
      },
    });

    if (standardHourConfig) {
      this.logger.log(`[标准工时匹配] ✓ 找到全局配置标准 (永久): standardHours=${standardHourConfig.standardHours}`);
      return standardHourConfig;
    }

    this.logger.log(`[标准工时匹配] ✗ 未找到任何标准配置`);
    return null;
  }
}
