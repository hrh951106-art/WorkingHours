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
    const sourceConfigStr = config.sourceConfig;
    if (!sourceConfigStr) {
      throw new NotFoundException('配置数据源不存在');
    }

    // Parse JSON string to object
    let sourceConfig: any = {};
    try {
      sourceConfig = JSON.parse(sourceConfigStr);
    } catch (e) {
      this.logger.error('解析sourceConfig失败:', e);
      sourceConfig = {};
    }

    // 解析筛选条件
    let employeeFilter = { fieldGroups: [] };
    let workHoursFilter = { hierarchySelections: [], attendanceCodes: [] };

    try {
      if (sourceConfig.productionFilter && sourceConfig.productionFilter !== '{}') {
        employeeFilter = JSON.parse(sourceConfig.productionFilter);
      }
    } catch (e) {
      this.logger.error('解析人员筛选条件失败:', e);
    }

    try {
      if (sourceConfig.accountFilter && sourceConfig.accountFilter !== '{}') {
        const parsed = JSON.parse(sourceConfig.accountFilter);
        workHoursFilter = {
          hierarchySelections: parsed.hierarchySelections || [],
          attendanceCodes: parsed.attendanceCodes || [],
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

    // 4. 计算每条生产记录的分摊
    let totalResults = 0;
    const results = [];

    // 生成批次号
    const batchNo = `EHA-${Date.now()}`;

    // Parse rules from JSON string
    let rules: any[] = [];
    try {
      rules = JSON.parse(config.rules || '[]');
    } catch (e) {
      this.logger.error('解析rules失败:', e);
      rules = [];
    }

    for (const record of productionRecords) {
      const result = await this.allocateForProductionRecord(
        record,
        employeeFilter,
        workHoursFilter,
        rules,
        new Date(),
        batchNo,
        configId,
      );

      if (result) {
        results.push(result);
        totalResults++;
      }
    }

    this.logger.log(`分摊完成，共生成 ${totalResults} 条结果`);

    return {
      message: '分摊计算完成',
      batchNo,
      totalResults,
      results,
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

    if (!record.lineId) {
      this.logger.warn(`生产记录 ${record.id} 没有关联劳动力账户`);
      return null;
    }

    // 获取劳动力账户信息
    const account = await this.prisma.laborAccount.findFirst({
      where: { id: record.lineId },
    });

    if (!account) {
      this.logger.warn(`生产记录 ${record.id} 的劳动力账户 ${record.lineId} 不存在`);
      return null;
    }

    // 解析账户的层级信息，找到工序层级
    let processLevelId: number | null = null;
    let processOptionValue: string | null = null;
    let processOptionLabel: string | null = null;

    try {
      const hierarchyValues = JSON.parse(account.hierarchyValues || '[]');
      const processLevel = hierarchyValues.find((hv: any) => hv.name === '工序');

      if (processLevel && processLevel.selectedValue) {
        processLevelId = processLevel.levelId;
        processOptionValue = processLevel.selectedValue.id;
        processOptionLabel = processLevel.selectedValue.name;
      }

      this.logger.log(
        `账户 ${account.code} 的工序层级: levelId=${processLevelId}, optionValue=${processOptionValue}, optionLabel=${processOptionLabel}`
      );
    } catch (e) {
      this.logger.error(`解析账户 ${account.code} 的层级信息失败:`, e);
    }

    if (!processLevelId || !processOptionValue) {
      this.logger.warn(`账户 ${account.code} 没有配置工序层级信息`);
      return null;
    }

    // 查询产品标准工时配置
    const standardHourConfig = await this.prisma.productStandardHourByLevel.findFirst({
      where: {
        productId: record.productId,
        accountLevel: String(processLevelId),
        status: 'ACTIVE',
      },
    });

    this.logger.log(
      `查询标准工时配置: productId=${record.productId}, levelId=${processLevelId}, optionValue=${processOptionValue}`
    );

    if (!standardHourConfig) {
      this.logger.warn(
        `未找到产品 ${record.productName} (ID:${record.productId}) 在工序 ${processOptionLabel} (optionValue:${processOptionValue}) 下的标准工时配置`
      );
      return null;
    }

    // 计算总得工时
    const quantity = standardHourConfig.quantity || 1; // 标准件数，默认为1
    const standardHours = standardHourConfig.standardHours; // 标准工时
    const totalEarnedHours = (record.actualQty / quantity) * standardHours;

    this.logger.log(
      `生产记录: ${record.productName}, 产量: ${record.actualQty}, 标准配置: ${quantity}件=${standardHours}小时, 总得工时: ${totalEarnedHours.toFixed(2)}`
    );

    if (totalEarnedHours <= 0) {
      return null;
    }

    // 2. 使用生产记录中的劳动力账户（lineId存储的就是accountId）
    const lineAccounts = await this.getLineLaborAccounts(record.lineId);

    if (lineAccounts.length === 0) {
      this.logger.warn(`产线 ${record.lineName} 没有关联劳动力账户`);
      return null;
    }

    // 3. 根据工时筛选条件过滤账户
    const filteredAccounts = await this.filterAccountsByWorkHours(
      lineAccounts,
      workHoursFilter,
      record.recordDate
    );

    this.logger.log(`过滤后的账户数量: ${filteredAccounts.length}`);

    if (filteredAccounts.length === 0) {
      return null;
    }

    // 4. 获取账户下的员工及工时
    const employeesWithHours = await this.getEmployeesWithHours(
      filteredAccounts.map((a) => a.id),
      workHoursFilter.attendanceCodes,
      record.recordDate,
      record // 传入完整的生产记录，用于获取刷卡账户和日期
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
      batchNo,  // 从外部传入
      configId,
      new Date(),  // calcTime
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
   * 注意：ProductionRecord 中的 lineId 字段存储的是 LaborAccount 的 ID
   */
  private async getLineLaborAccounts(lineId: number) {
    // 直接返回指定的账户
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
   * path 格式: "level1/level2/level3/level4/level5/level6/level7"
   * 注意：保留 "-" 表示该层级存在但值为空
   */
  private parsePathToHierarchyValues(path: string): string {
    const segments = path.split('/').filter(s => s !== '');

    // 确保至少有7个层级
    while (segments.length < 7) {
      segments.push('-');
    }

    const hierarchyValues = [
      {
        levelId: 4,
        level: 1,
        name: '工厂',
        mappingType: 'ORG',
        mappingValue: '02',
        selectedValue: this.parsePathSegment(segments[0]),
      },
      {
        levelId: 5,
        level: 2,
        name: '车间',
        mappingType: 'ORG',
        mappingValue: '03',
        selectedValue: this.parsePathSegment(segments[1]),
      },
      {
        levelId: 6,
        level: 3,
        name: '产线',
        mappingType: 'ORG',
        mappingValue: '04',
        selectedValue: this.parsePathSegment(segments[2]),
      },
      {
        levelId: 7,
        level: 4,
        name: '产品',
        mappingType: 'FIELD_A01',
        mappingValue: null,
        selectedValue: this.parsePathSegment(segments[3]),
      },
      {
        levelId: 8,
        level: 5,
        name: '工序',
        mappingType: 'FIELD_A02',
        mappingValue: null,
        selectedValue: this.parsePathSegment(segments[4]),
      },
      {
        levelId: 9,
        level: 6,
        name: '员工类型',
        mappingType: 'FIELD_employeeType',
        mappingValue: null,
        selectedValue: this.parsePathSegment(segments[5]),
      },
      {
        levelId: 10,
        level: 7,
        name: '岗位',
        mappingType: 'FIELD_jobPost',
        mappingValue: null,
        selectedValue: this.parsePathSegment(segments[6]),
      },
    ];

    return JSON.stringify(hierarchyValues);
  }

  /**
   * 解析 path 中的单个层级段
   * "-" 表示存在但为空，返回特殊对象
   * 其他值返回正常的 selectedValue 对象
   */
  private parsePathSegment(segment: string): any {
    if (!segment || segment === '-') {
      return { name: '-', isEmpty: true };
    }
    return { name: segment, isEmpty: false };
  }

  /**
   * 合并多个劳动力账户
   *
   * 账户合并优先级（从高到低）：
   * 1. 刷卡账户（从设备配置获取）
   * 2. 转移账户（从排班adjustedSegments获取）
   * 3. 主账户（员工的主劳动力账户）
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
   *
   * 合并规则（逐层比较）：
   * - 如果 priorityAccount（高优先级）在某层级有值，使用该值
   * - 如果 priorityAccount（高优先级）在某层级无值，使用 secondaryAccount（低优先级）的值
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

    const maxLevel = Math.max(
      priorityValues.length > 0 ? priorityValues[priorityValues.length - 1].level : 0,
      secondaryValues.length > 0 ? secondaryValues[secondaryValues.length - 1].level : 0
    );

    return {
      id: priorityAccount.id,
      namePath: this.buildNamePath(mergedValues),
      level: maxLevel,
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
   * 获取员工的合并账户（用于精益工时计算）
   *
   * 账户合并优先级（从高到低）：
   * 1. 刷卡账户：从生产记录的 lineId 获取（精益工时的"刷卡"位置）
   * 2. 转移账户：从排班数据的 adjustedSegments 获取
   * 3. 主账户：员工的主劳动力账户
   *
   * @param employeeNo 员工工号
   * @param productionRecord 生产记录
   * @param recordDate 记录日期
   * @returns 合并后的账户
   */
  /**
   * 根据工时筛选条件过滤账户
   */
  private async filterAccountsByWorkHours(
    accounts: any[],
    workHoursFilter: any,
    calcDate: Date
  ) {
    // TODO: 实现层级和出勤代码筛选
    // 暂时返回所有账户
    return accounts;
  }

  /**
   * 获取账户下有工时的员工
   *
   * 注意：这里返回的员工已经包含了合并后的账户信息
   * 合并逻辑：
   * 1. 刷卡账户：从 PunchPair 表获取（精益摆卡结果）
   * 2. 转移账户：从排班数据的 adjustedSegments 获取
   * 3. 主账户：员工的主劳动力账户
   * 合并优先级：刷卡账户 > 转移账户 > 主账户
   */
  private async getEmployeesWithHours(
    accountIds: number[],
    attendanceCodes: string[],
    calcDate: Date,
    productionRecord: any
  ) {
    // 查询这些账户下的工时记录
    const calcResults = await this.prisma.calcResult.findMany({
      where: {
        accountId: { in: accountIds },
        calcDate: calcDate,
      },
    });

    // 按员工分组统计工时
    const employeeHoursMap = new Map<string, any>();

    for (const calc of calcResults) {
      const key = calc.employeeNo;
      if (!employeeHoursMap.has(key)) {
        // 1. 从 PunchPair 获取刷卡账户（精益摆卡结果）
        const punchPair = await this.prisma.punchPair.findFirst({
          where: {
            employeeNo: calc.employeeNo,
            pairDate: calcDate,
          },
        });

        if (!punchPair || !punchPair.accountId) {
          this.logger.warn(
            `员工 ${calc.employeeNo} 在 ${calcDate.toISOString().substring(0, 10)} 没有找到对应的 PunchPair 记录，跳过`
          );
          continue;
        }

        // 获取刷卡账户（从 PunchPair.accountId）
        const punchAccount = await this.prisma.laborAccount.findFirst({
          where: {
            id: punchPair.accountId,
            status: 'ACTIVE',
          },
        });

        if (!punchAccount) {
          this.logger.warn(`PunchPair ${punchPair.id} 的刷卡账户 ${punchPair.accountId} 不存在，跳过`);
          continue;
        }

        this.logger.debug(`员工 ${calc.employeeNo} 刷卡账户（从PunchPair）: ${punchAccount.namePath || punchAccount.code}`);

        // 2. 获取转移账户（从排班的 adjustedSegments）
        let transferAccount = null;
        const employee = await this.prisma.employee.findFirst({
          where: { employeeNo: calc.employeeNo },
          select: { id: true },
        });

        if (employee) {
          const schedule = await this.prisma.schedule.findFirst({
            where: {
              employeeId: employee.id,
              scheduleDate: calcDate,
            },
          });

          if (schedule && schedule.adjustedSegments) {
            try {
              const adjustedSegments = JSON.parse(schedule.adjustedSegments);
              // 根据时间段查找对应的转移账户
              if (adjustedSegments.length > 0) {
                // 简化处理：如果有转移账户配置，使用第一个
                // TODO: 根据 calc.punchInTime 和 calc.punchOutTime 匹配对应班段的转移账户
                const segmentWithTransfer = adjustedSegments.find((seg: any) => seg.accountId);
                if (segmentWithTransfer && segmentWithTransfer.accountId) {
                  transferAccount = await this.prisma.laborAccount.findFirst({
                    where: {
                      id: segmentWithTransfer.accountId,
                      status: 'ACTIVE',
                    },
                  });

                  if (transferAccount) {
                    this.logger.debug(`员工 ${calc.employeeNo} 转移账户（从排班）: ${transferAccount.namePath || transferAccount.code}`);
                  }
                }
              }
            } catch (error) {
              this.logger.warn(`解析排班adjustedSegments失败: ${error.message}`);
            }
          }
        }

        // 3. 获取员工的主账户
        let mainAccount = null;
        if (employee) {
          mainAccount = await this.getEmployeeMainAccount(employee.id);
          if (mainAccount) {
            this.logger.debug(`员工 ${calc.employeeNo} 主账户: ${mainAccount.namePath || mainAccount.code}`);
          }
        }

        // 4. 按优先级合并三个账户：刷卡 > 转移 > 主
        const accountsToMerge = [punchAccount];
        if (transferAccount) {
          accountsToMerge.push(transferAccount);
        }
        if (mainAccount) {
          accountsToMerge.push(mainAccount);
        }

        const mergedAccount = this.mergeMultipleAccounts(accountsToMerge);

        this.logger.log(
          `员工 ${calc.employeeNo} 账户合并: ` +
          `刷卡[${punchAccount.namePath}]` +
          (transferAccount ? ` + 转移[${transferAccount.namePath}]` : '') +
          (mainAccount ? ` + 主账户[${mainAccount.namePath}]` : '') +
          ` = ${mergedAccount.namePath}`
        );

        employeeHoursMap.set(key, {
          employeeNo: calc.employeeNo,
          workHours: (calc.actualHours || 0) + (calc.standardHours || 0),
          standardHours: (calc.standardHours || 0),
          calcResultIds: [calc.id],
          mergedAccount: mergedAccount, // 添加合并后的账户
        });
      } else {
        const existing = employeeHoursMap.get(key);
        existing.workHours += (calc.actualHours || 0) + (calc.standardHours || 0);
        existing.standardHours += (calc.standardHours || 0);
        existing.calcResultIds.push(calc.id);
      }
    }

    return Array.from(employeeHoursMap.values());
  }

  /**
   * 根据人员筛选条件过滤员工
   */
  private async filterEmployees(employees: any[], employeeFilter: any) {
    // TODO: 实现人员条件筛选
    // 暂时返回所有员工
    return employees;
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
  ) {
    const results = [];

    // 获取分摊规则（第一条生效的规则）
    const rule = rules.find((r) => {
      const now = new Date();
      const startTime = r.effectiveStartTime ? new Date(r.effectiveStartTime) : null;
      const endTime = r.effectiveEndTime ? new Date(r.effectiveEndTime) : null;
      return (!startTime || now >= startTime) && (!endTime || now <= endTime);
    });

    if (!rule) {
      this.logger.warn('没有找到生效的分摊规则');
      return [];
    }

    this.logger.log(`使用规则: ${rule.ruleName}, 分摊方式: ${rule.allocationBasis}`);

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

        // 使用合并后的账户
        const mergedAccount = employee.mergedAccount || {
          id: productionRecord.lineId,
          namePath: productionRecord.lineName,
        };

        // 保存分摊结果到数据库
        await this.prisma.earnedHoursAllocationResult.create({
          data: {
            batchNo,
            recordDate: new Date(productionRecord.recordDate),
            calcResultId: employee.calcResultIds?.[0] || 0,
            configId,
            configVersion: 1,
            sourceEmployeeNo: employee.employeeNo,
            sourceEmployeeName: employeeName,
            sourceAccountId: productionRecord.lineId,
            sourceAccountName: productionRecord.lineName,
            sourceHours: employee.workHours,
            targetType: 'EMPLOYEE',
            targetId: 0,
            targetName: employeeName,
            targetAccountId: mergedAccount.id, // 使用合并后的账户ID
            targetAccountName: mergedAccount.namePath,
            allocatedHours,
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
          mergedAccountName: mergedAccount.namePath, // 添加合并后的账户名称
        });

        this.logger.log(
          `员工 ${employee.employeeNo}: 工时=${employee.workHours}, 比例=${ratio.toFixed(4)}, 分得工时=${allocatedHours.toFixed(2)}, 合并账户=${mergedAccount.namePath}`
        );
      }
    } else if (rule.allocationBasis === 'AVERAGE') {
      // 平均分摊
      const perPersonHours = totalEarnedHours / employees.length;

      for (const employee of employees) {
        const employeeName = employeeMap.get(employee.employeeNo) || 'Unknown';

        // 使用合并后的账户
        const mergedAccount = employee.mergedAccount || {
          id: productionRecord.lineId,
          namePath: productionRecord.lineName,
        };

        // 保存分摊结果到数据库
        await this.prisma.earnedHoursAllocationResult.create({
          data: {
            batchNo,
            recordDate: new Date(productionRecord.recordDate),
            calcResultId: employee.calcResultIds?.[0] || 0,
            configId,
            configVersion: 1,
            sourceEmployeeNo: employee.employeeNo,
            sourceEmployeeName: employeeName,
            sourceAccountId: productionRecord.lineId,
            sourceAccountName: productionRecord.lineName,
            sourceHours: employee.workHours,
            targetType: 'EMPLOYEE',
            targetId: 0,
            targetName: employeeName,
            targetAccountId: mergedAccount.id, // 使用合并后的账户ID
            targetAccountName: mergedAccount.namePath,
            allocatedHours: perPersonHours,
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
          mergedAccountName: mergedAccount.namePath, // 添加合并后的账户名称
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
    const { page = 1, pageSize = 10, batchNo, startDate, endDate, targetName } = query;
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Number(pageSize);

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

    return {
      items: list,
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

    // 按产品汇总
    const byProduct = this.groupBy(results, 'sourceProductName', ['allocatedHours']);

    // 按员工汇总
    const byEmployee = this.groupBy(results, 'targetName', ['allocatedHours']);

    return {
      total: {
        totalAllocatedHours,
        totalRecords,
      },
      byProduct,
      byEmployee,
    };
  }

  /**
   * 分组汇总辅助方法
   */
  private groupBy(data: any[], key: string, sumFields: string[]) {
    const map = new Map();

    for (const item of data) {
      const groupKey = item[key];
      if (!map.has(groupKey)) {
        map.set(groupKey, {
          [key]: groupKey,
          _count: 0,
          _sum: {} as any,
        });
        sumFields.forEach(field => map.get(groupKey)._sum[field] = 0);
      }

      const group = map.get(groupKey);
      group._count++;
      sumFields.forEach(field => {
        group._sum[field] += item[field] || 0;
      });
    }

    return Array.from(map.values());
  }
}
