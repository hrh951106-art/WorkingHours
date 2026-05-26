import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { differenceInMinutes } from 'date-fns';

/**
 * 精益工时计算服务 - 增强版
 * 包含班段交叉比对和账户合并逻辑
 */
@Injectable()
export class LeanHoursCalculationService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据摆卡结果计算工时并保存到数据库
   */
  async calculateFromPunchPair(punchPairId: number) {
    // 获取摆卡结果
    const punchPair = await this.prisma.punchPair.findUnique({
      where: { id: punchPairId },
      include: {
        employee: true,
      },
    });

    if (!punchPair) {
      throw new NotFoundException('摆卡结果不存在');
    }

    // 获取班次信息
    const shift = await this.prisma.shift.findUnique({
      where: { id: punchPair.shiftId },
      include: {
        segments: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('班次不存在');
    }

    // 获取有效的计算出勤代码（按优先级排序），只获取精益工时类型且允许计算工时的代码
    const attendanceCodes = await this.prisma.calculationAttendanceCode.findMany({
      where: {
        status: 'ACTIVE',
        type: 'LEAN_HOURS',
        calculateHours: true,
      },
      orderBy: { priority: 'asc' },
    });

    if (attendanceCodes.length === 0) {
      throw new BadRequestException('未找到有效的精益工时出勤代码');
    }

    // ✅ 1. 提取打卡时间
    const startTime = punchPair.inPunchTime ? new Date(punchPair.inPunchTime) : null;
    const endTime = punchPair.outPunchTime ? new Date(punchPair.outPunchTime) : null;

    if (!startTime || !endTime) {
      // 单卡摆卡，不计算工时
      return [];
    }

    // ✅ 2. 获取刷卡账户
    const punchAccountId = punchPair.accountId;
    const punchAccount = punchAccountId ? await this.prisma.laborAccount.findUnique({
      where: { id: punchAccountId },
      select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
    }) : null;

    // ✅ 3. 获取员工主劳动力账户
    const mainAccount = await this.getEmployeeMainAccount(punchPair.employee?.id);

    // ✅ 4. 按班段拆分计算工时
    const workHourResults = await this.calculateBySegments(
      startTime,
      endTime,
      punchPair,
      shift,
      punchAccount,
      mainAccount,
      attendanceCodes
    );

    // ✅ 5. 合并相同账户且时间相邻的工时结果
    const mergedResults = this.mergeAdjacentWorkHours(workHourResults);

    // ✅ 6. 保存工时结果
    const savedResults = [];
    for (const result of mergedResults) {
      // 检查是否已存在相同的计算结果
      const existing = await this.prisma.calcResult.findFirst({
        where: {
          employeeNo: result.employeeNo,
          calcDate: result.calcDate,
          shiftId: result.shiftId,
          calculationAttendanceCodeId: result.calculationAttendanceCodeId,
          accountId: result.accountId,
          punchInTime: result.punchInTime,
          punchOutTime: result.punchOutTime,
        },
      });

      if (existing) {
        // 已存在，更新
        await this.prisma.calcResult.update({
          where: { id: existing.id },
          data: {
            actualHours: result.actualHours,
            standardHours: result.standardHours,
            accountName: result.accountName,
            accountPath: result.accountPath,
          },
        });
        savedResults.push({ id: existing.id, ...result });
      } else {
        // 不存在，创建新的
        const created = await this.prisma.calcResult.create({
          data: result,
        });
        savedResults.push({ id: created.id, ...result });
      }
    }

    return savedResults;
  }

  /**
   * 按班段拆分计算工时
   */
  private async calculateBySegments(
    startTime: Date,
    endTime: Date,
    punchPair: any,
    shift: any,
    punchAccount: any,
    mainAccount: any,
    attendanceCodes: any[]
  ): Promise<any[]> {
    const results = [];

    // 如果没有班次信息，直接使用整个打卡时间
    if (!shift || !shift.segments || shift.segments.length === 0) {
      for (const code of attendanceCodes) {
        const workHours = await this.calculateWorkHours(
          startTime,
          endTime,
          punchAccount,
          null, // 无班段账户
          mainAccount,
          code
        );
        if (workHours) {
          results.push(workHours);
        }
      }
      return results;
    }

    // 获取所有工作班段（非休息段）
    const workSegments = shift.segments.filter(s => s.type !== 'REST');

    if (workSegments.length === 0) {
      // 没有工作班段，全部作为一个时间段
      for (const code of attendanceCodes) {
        const workHours = await this.calculateWorkHours(
          startTime,
          endTime,
          punchAccount,
          null,
          mainAccount,
          code
        );
        if (workHours) {
          results.push(workHours);
        }
      }
      return results;
    }

    // 找出第一个班段的开始时间和最后一个班段的结束时间
    const firstSegmentStart = this.parseSegmentTime(punchPair.pairDate, workSegments[0].startDate, workSegments[0].startTime);
    const lastSegmentEnd = this.parseSegmentTime(punchPair.pairDate, workSegments[workSegments.length - 1].endDate, workSegments[workSegments.length - 1].endTime);

    // 计算打卡时间与班段时间的交集
    const overlapStart = startTime > firstSegmentStart ? startTime : firstSegmentStart;
    const overlapEnd = endTime < lastSegmentEnd ? endTime : lastSegmentEnd;

    if (overlapStart >= overlapEnd) {
      // 没有交集，不计算工时
      return [];
    }

    // 遍历班次中的每个班段
    for (const segment of workSegments) {
      // 计算班段的开始和结束时间
      const segmentStartTime = this.parseSegmentTime(punchPair.pairDate, segment.startDate, segment.startTime);
      const segmentEndTime = this.parseSegmentTime(punchPair.pairDate, segment.endDate, segment.endTime);

      // 计算打卡时间与班段时间的交集
      const segOverlapStart = startTime > segmentStartTime ? startTime : segmentStartTime;
      const segOverlapEnd = endTime < segmentEndTime ? endTime : segmentEndTime;

      if (segOverlapStart >= segOverlapEnd) {
        continue; // 没有交集，跳过
      }

      // 获取班段的转移账户
      const segmentAccountId = segment.accountId;
      const segmentAccount = segmentAccountId ? await this.prisma.laborAccount.findUnique({
        where: { id: segmentAccountId },
        select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
      }) : null;

      // 为每个出勤代码计算工时
      for (const code of attendanceCodes) {
        const workHours = await this.calculateWorkHours(
          segOverlapStart,
          segOverlapEnd,
          punchAccount,
          segmentAccount,
          mainAccount,
          code
        );
        if (workHours) {
          results.push(workHours);
        }
      }
    }

    return results;
  }

  /**
   * 计算工时并合并账户
   *
   * 逻辑说明：
   * 1. 只用原始刷卡账户（punchAccount）去匹配出勤代码
   * 2. 匹配成功后，才合并账户生成最终的劳动力账户
   * 3. 确保出勤代码的匹配基于原始刷卡账户，而不是合并后的账户
   */
  private async calculateWorkHours(
    startTime: Date,
    endTime: Date,
    punchAccount: any,
    segmentAccount: any,
    mainAccount: any,
    code: any
  ): Promise<any | null> {
    // ✅ 关键修复：只用原始刷卡账户去匹配出勤代码
    // 如果有刷卡账户，用刷卡账户匹配
    if (punchAccount) {
      if (!this.isAccountMatch(punchAccount, code)) {
        return null;
      }
    } else if (mainAccount) {
      // 如果没有刷卡账户，用主账户匹配
      if (!this.isAccountMatch(mainAccount, code)) {
        return null;
      }
    } else {
      // 既没有刷卡账户也没有主账户，不计算
      return null;
    }

    // ✅ 匹配成功后，合并账户生成最终的劳动力账户
    // 优先级：刷卡账户 > 班段转移账户 > 主账户
    const mergedAccount = this.mergeAccounts(punchAccount, segmentAccount, mainAccount);

    if (!mergedAccount) {
      return null;
    }

    // 计算工时
    const workMinutes = differenceInMinutes(endTime, startTime);
    const workHours = workMinutes / 60;

    // 计算标准工时（使用班次标准工时）
    const standardHours = workHours; // 简化处理

    return {
      employeeNo: code.employeeNo || 'UNKNOWN',
      calcDate: new Date(),
      shiftId: code.shiftId,
      shiftName: code.shiftName,
      calculationAttendanceCodeId: code.id,
      punchInTime: startTime,
      punchOutTime: endTime,
      standardHours: Math.round(standardHours * 100) / 100,
      actualHours: Math.round(workHours * 100) / 100,
      overtimeHours: 0,
      leaveHours: 0,
      absenceHours: 0,
      accountId: mergedAccount.id,
      accountName: mergedAccount.namePath,
      accountPath: mergedAccount.path,
      status: 'COMPLETED',
    };
  }

  /**
   * 合并多个劳动力账户
   * 优先级：刷卡账户 > 班段转移账户 > 主账户
   */
  private mergeAccounts(...accounts: any[]): any {
    // 过滤掉 null 账户
    const validAccounts = accounts.filter(a => a !== null);
    if (validAccounts.length === 0) return null;
    if (validAccounts.length === 1) return validAccounts[0];

    // 以第一个账户（优先级最高）为基础
    let merged = validAccounts[0];

    // 依次合并其他账户
    for (let i = 1; i < validAccounts.length; i++) {
      merged = this.mergeTwoAccounts(merged, validAccounts[i]);
    }

    return merged;
  }

  /**
   * 合并两个账户
   */
  private mergeTwoAccounts(priorityAccount: any, secondaryAccount: any): any {
    if (!priorityAccount) return secondaryAccount;
    if (!secondaryAccount) return priorityAccount;

    // 解析层级值
    const priorityValues = priorityAccount.hierarchyValues ? JSON.parse(priorityAccount.hierarchyValues) : [];
    const secondaryValues = secondaryAccount.hierarchyValues ? JSON.parse(secondaryAccount.hierarchyValues) : [];

    // 创建合并后的层级值映射表
    const mergedValuesMap = new Map<number, any>();

    // 首先添加次级账户的所有层级值（作为基础）
    secondaryValues.forEach((v: any) => {
      mergedValuesMap.set(v.level, v);
    });

    // 然后用优先级账户的层级值覆盖（只覆盖有值的层级）
    priorityValues.forEach((v: any) => {
      if (v.selectedValue) {
        mergedValuesMap.set(v.level, v);
      }
    });

    // 转换回数组并排序
    const mergedValues = Array.from(mergedValuesMap.values()).sort((a, b) => a.level - b.level);

    // 计算合并后的层级数
    const maxLevel = Math.max(
      priorityValues.length > 0 ? priorityValues[priorityValues.length - 1].level : 0,
      secondaryValues.length > 0 ? secondaryValues[secondaryValues.length - 1].level : 0
    );

    return {
      id: priorityAccount.id,
      namePath: this.buildNamePath(mergedValues),
      path: this.buildPath(mergedValues),
      level: maxLevel,
      hierarchyValues: JSON.stringify(mergedValues),
    };
  }

  /**
   * 检查账户是否匹配出勤代码的层级要求
   */
  private isAccountMatch(account: any, code: any): boolean {
    // 解析账户层级
    const accountLevels = JSON.parse(code.accountLevels || '[]');
    if (accountLevels.length === 0) return true;

    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    // 检查配置的每个层级是否都有值
    for (const sortValue of accountLevels) {
      const level = sortValue + 1;
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      if (!levelConfig || !levelConfig.selectedValue) {
        return false;
      }
    }

    return true;
  }

  /**
   * 解析班段时间
   */
  private parseSegmentTime(baseDate: Date, startDate: string, timeStr: string): Date {
    const result = new Date(baseDate);
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (startDate === '+0') {
      result.setHours(hours, minutes, 0, 0);
    } else if (startDate === '+1') {
      result.setDate(result.getDate() + 1);
      result.setHours(hours, minutes, 0, 0);
    }

    return result;
  }

  /**
   * 合并相同账户且时间相邻的工时结果
   */
  private mergeAdjacentWorkHours(workHourResults: any[]): any[] {
    if (!workHourResults || workHourResults.length === 0) {
      return [];
    }

    // 按开始时间排序
    const sortedResults = [...workHourResults].sort((a, b) =>
      new Date(a.punchInTime).getTime() - new Date(b.punchInTime).getTime()
    );

    const mergedResults: any[] = [];
    let currentGroup = [sortedResults[0]];

    for (let i = 1; i < sortedResults.length; i++) {
      const current = sortedResults[i];
      const previous = currentGroup[currentGroup.length - 1];

      const currentTime = new Date(current.punchInTime).getTime();
      const previousEndTime = new Date(previous.punchOutTime).getTime();

      // 检查是否可以合并
      const sameAccount = previous.accountName === current.accountName;
      const adjacentTime = currentTime === previousEndTime;

      if (sameAccount && adjacentTime) {
        currentGroup.push(current);
      } else {
        if (currentGroup.length > 0) {
          mergedResults.push(this.mergeWorkHourGroup(currentGroup));
        }
        currentGroup = [current];
      }
    }

    // 处理最后一组
    if (currentGroup.length > 0) {
      mergedResults.push(this.mergeWorkHourGroup(currentGroup));
    }

    return mergedResults;
  }

  /**
   * 将一组工时结果合并为一条
   */
  private mergeWorkHourGroup(group: any[]): any {
    if (group.length === 0) return null;
    if (group.length === 1) return group[0];

    const first = group[0];
    const last = group[group.length - 1];

    // 合并工时
    const totalActualHours = group.reduce((sum, item) => sum + (item.actualHours || 0), 0);
    const totalStandardHours = group.reduce((sum, item) => sum + (item.standardHours || 0), 0);

    return {
      ...first,
      punchInTime: first.punchInTime,
      punchOutTime: last.punchOutTime,
      actualHours: Math.round(totalActualHours * 100) / 100,
      standardHours: Math.round(totalStandardHours * 100) / 100,
    };
  }

  /**
   * 获取员工的主劳动力账户
   */
  private async getEmployeeMainAccount(employeeId: number) {
    if (!employeeId) return null;

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
        mappingType: 'FIELD_ A02',
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
   */
  private parsePathSegment(segment: string): any {
    if (!segment || segment === '-') {
      return { name: '-', isEmpty: true };
    }
    return { name: segment, isEmpty: false };
  }

  /**
   * 根据层级值构建namePath
   */
  private buildNamePath(hierarchyValues: any[]): string {
    return hierarchyValues
      .map(v => {
        if (!v.selectedValue) return '-';
        if (v.selectedValueLabel) return v.selectedValueLabel;
        if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
          return v.selectedValue.name || '-';
        }
        return String(v.selectedValue);
      })
      .join('/');
  }

  /**
   * 根据层级值构建path（只使用code）
   */
  private buildPath(hierarchyValues: any[]): string {
    return hierarchyValues
      .map(v => {
        if (!v.selectedValue) return '-';
        if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
          return v.selectedValue.code || '-';
        }
        return String(v.selectedValue);
      })
      .join('/');
  }
}
