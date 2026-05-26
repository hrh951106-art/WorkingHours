import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';
import { differenceInMinutes } from 'date-fns';
import { AmountCalculateService } from '../amount/amount-calculate.service';

@Injectable()
export class AttendanceCodeService {
  constructor(
    private prisma: PrismaService,
    private amountCalculateService: AmountCalculateService,
  ) {}

  async getAttendanceCodes() {
    return this.prisma.attendanceCode.findMany({
      orderBy: { priority: 'asc' },
    });
  }

  async getAttendanceCode(id: number) {
    const code = await this.prisma.attendanceCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException('出勤代码不存在');
    }

    return code;
  }

  async createAttendanceCode(dto: any) {
    const { accountLevels, ...rest } = dto;

    // 验证参数
    if (rest.includeOutside && rest.onlyOutside) {
      throw new BadRequestException('包含班外时数和仅计算班外时数不能同时开启');
    }

    // 处理accountLevels：如果是字符串则直接使用，如果是数组则序列化
    let accountLevelsStr = '[]';
    if (accountLevels) {
      if (typeof accountLevels === 'string') {
        accountLevelsStr = accountLevels;
      } else {
        accountLevelsStr = JSON.stringify(accountLevels);
      }
    }

    return this.prisma.attendanceCode.create({
      data: {
        ...rest,
        code: rest.code || StringUtils.generateCode('AC'),
        accountLevels: accountLevelsStr,
      },
    });
  }

  async updateAttendanceCode(id: number, dto: any) {
    const existing = await this.prisma.attendanceCode.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('出勤代码不存在');
    }

    const { accountLevels, ...rest } = dto;

    // 验证参数
    if (rest.includeOutside && rest.onlyOutside) {
      throw new BadRequestException('包含班外时数和仅计算班外时数不能同时开启');
    }

    // 处理accountLevels：如果是字符串则直接使用，如果是数组则序列化
    let accountLevelsData = undefined;
    if (accountLevels !== undefined) {
      if (typeof accountLevels === 'string') {
        accountLevelsData = accountLevels;
      } else {
        accountLevelsData = JSON.stringify(accountLevels);
      }
    }

    return this.prisma.attendanceCode.update({
      where: { id },
      data: {
        ...rest,
        ...(accountLevelsData !== undefined && { accountLevels: accountLevelsData }),
      },
    });
  }

  async deleteAttendanceCode(id: number) {
    await this.prisma.attendanceCode.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  /**
  /**
   * ��据摆卡结果计算工时并保存到数据库（增强版：包含班段交叉比对和三账户合并）
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

    // ✅ 4. 获取排班信息中的班段转移配置
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        employeeId: punchPair.employee?.id,
        scheduleDate: {
          gte: new Date(new Date(punchPair.pairDate).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(punchPair.pairDate).setHours(23, 59, 59, 999)),
        },
      },
    });

    // 解析排班中的班段转移账户配置
    const segmentTransferMap = new Map<number, number>();
    if (schedule?.adjustedSegments) {
      try {
        const adjustedSegments = JSON.parse(schedule.adjustedSegments);
        adjustedSegments.forEach((seg: any) => {
          if (seg.id && seg.accountId) {
            segmentTransferMap.set(seg.id, seg.accountId);
          }
        });
        console.log(`从排班中解析到 ${segmentTransferMap.size} 个班段转移配置`);
      } catch (error) {
        console.warn(`解析排班adjustedSegments失败: ${error.message}`);
      }
    }

    // ✅ 5. 按班段拆分计算工时（交叉比对打卡时间与班段时间）
    const workHourResults = await this.calculateBySegments(
      startTime,
      endTime,
      punchPair,
      shift,
      punchAccount,
      mainAccount,
      attendanceCodes,
      segmentTransferMap  // ✅ 传递班段转移账户映射表
    );

    // ✅ 5. 合并相同账户且时间相邻的工时结果
    const mergedResults = this.mergeAdjacentWorkHours(workHourResults);

    // ✅ 6. 计算金额并保存工时结果
    const savedResults = [];
    for (const result of mergedResults) {
      // ✅ 计算金额
      let amount = 0;
      try {
        // 获取出勤代码配置
        const attendanceCode = await this.prisma.calculationAttendanceCode.findUnique({
          where: { id: result.calculationAttendanceCodeId },
        });

        if (attendanceCode && attendanceCode.calculateHours) {
          // 调用金额计算服务
          // ✅ 优先使用 namePath（中文名称路径）进行金额规则匹配，因为金额规则通常使用中文名称配置
          amount = await this.amountCalculateService.calculateAmountByNo({
            employeeNo: result.employeeNo,
            workHours: result.actualHours,
            attendanceCode: attendanceCode.code,
            accountPath: result.accountName || result.accountPath,  // 优先使用 namePath
            calcDate: new Date(result.calcDate),
          });
        }
      } catch (error) {
        console.error(`计算金额失败: employeeNo=${result.employeeNo}, calcDate=${result.calcDate}, error=${error.message}`);
        amount = 0;
      }

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
            amount: amount,
          },
        });
        savedResults.push({ id: existing.id, ...result, amount });
      } else {
        // 不存在，创建新的
        const created = await this.prisma.calcResult.create({
          data: {
            ...result,
            amount: amount,
          },
        });
        savedResults.push({ id: created.id, ...result, amount });
      }
    }

    // ✅ 自动推送到 WorkHourResult 表
    if (savedResults.length > 0) {
      try {
        const calcResultIds = savedResults.map(r => r.id);
        console.log(`[AttendanceCodeService] 准备推送 ${calcResultIds.length} 条精益工时结果到 WorkHourResult 表`);

        // 获取 WorkHourPushService
        const { WorkHourPushService } = await import('./work-hour-push.service');
        const workHourPushService = new WorkHourPushService(this.prisma, this.amountCalculateService);

        const pushResult = await workHourPushService.pushWorkHourResults(calcResultIds);
        console.log(`[AttendanceCodeService] 精益工时推送完成 - 成功: ${pushResult.success}, 失败: ${pushResult.failed}, 删除旧数据: ${pushResult.deleted}`);
      } catch (error) {
        console.error('[AttendanceCodeService] 推送精益工时结果失败:', error);
        // 不影响主流程，记录错误即可
      }
    }

    return savedResults;
  }

  /**
   * 为特定的出勤代码计算工时
   */
  private async calculateHoursForCode(punchPair: any, shift: any, code: any) {
    const inTime = punchPair.inPunchTime ? new Date(punchPair.inPunchTime) : null;
    const outTime = punchPair.outPunchTime ? new Date(punchPair.outPunchTime) : null;

    if (!inTime || !outTime) {
      // 单卡摆卡，不计算工时
      return {
        actualHours: 0,
        standardHours: 0,
      };
    }

    // 解析账户层级
    const accountLevels = JSON.parse(code.accountLevels || '[]');

    // 检查账户是否匹配
    if (accountLevels.length > 0 && punchPair.accountId) {
      const account = await this.prisma.laborAccount.findUnique({
        where: { id: punchPair.accountId },
        select: {
          id: true,
          level: true,
          path: true,
          hierarchyValues: true,
          namePath: true,
        },
      });

      if (account && !this.isAccountMatch(account, accountLevels)) {
        // 账户不匹配，不计算工时
        console.log(`账户不匹配: punchPairId=${punchPair.id}, accountId=${account.id}, accountName=${account.namePath}, code=${code.name}, accountLevels=${accountLevels.join(',')}`);
        return {
          actualHours: 0,
          standardHours: 0,
        };
      }
    }

    // 计算班次时间（传入排班日期作为基准）
    const shiftTime = this.calculateShiftTime(shift, punchPair.pairDate);

    // 计算工时
    let actualHours = 0;
    let standardHours = 0;

    // 修正后的时间（用于显示）
    let adjustedInTime = inTime;
    let adjustedOutTime = outTime;

    if (code.onlyOutside) {
      // 仅计算班外时数，需要修正时间为班外时间段
      actualHours = this.calculateOutsideHours(inTime, outTime, shiftTime.start, shiftTime.end);

      // 修正显示时间为班外时间段
      // 判断有哪些班外时间段
      const hasBeforeShift = inTime < shiftTime.start;
      const hasAfterShift = outTime > shiftTime.end;

      if (hasBeforeShift && hasAfterShift) {
        // 同时有班前和班后时间
        // 计算班前工时和班后工时
        const beforeHours = (shiftTime.start.getTime() - inTime.getTime()) / (1000 * 60 * 60);
        const afterHours = (outTime.getTime() - shiftTime.end.getTime()) / (1000 * 60 * 60);

        if (beforeHours >= afterHours) {
          // 优先显示班前时间
          adjustedInTime = inTime;
          adjustedOutTime = shiftTime.start;
        } else {
          // 优先显示班后时间
          adjustedInTime = shiftTime.end;
          adjustedOutTime = outTime;
        }
      } else if (hasBeforeShift) {
        // 只有班前时间：打卡开始 ~ 班次开始
        adjustedInTime = inTime;
        adjustedOutTime = shiftTime.start;
      } else if (hasAfterShift) {
        // 只有班后时间：班次结束 ~ 打卡结束
        adjustedInTime = shiftTime.end;
        adjustedOutTime = outTime;
      } else {
        // 没有班外时间，不应该计算到这里（actualHours应该是0）
        adjustedInTime = inTime;
        adjustedOutTime = outTime;
      }
    } else if (code.includeOutside) {
      // 包含班外时数，直接计算打卡时间差，不修正时间
      actualHours = (outTime.getTime() - inTime.getTime()) / (1000 * 60 * 60);
      // adjustedInTime 和 adjustedOutTime 保持原始打卡时间
    } else {
      // 不包含班外时数，取与班次时间的交集，并修正时间
      actualHours = this.calculateIntersectionHours(
        inTime,
        outTime,
        shiftTime.start,
        shiftTime.end
      );

      // 修正显示时间：
      // 如果打卡开始时间在班次开始前，开始时间应该取班次开始
      if (inTime < shiftTime.start) {
        adjustedInTime = shiftTime.start;
      }
      // 如果打卡结束时间在班次结束后，结束时间应该取班次结束
      if (outTime > shiftTime.end) {
        adjustedOutTime = shiftTime.end;
      }
      // 如果打卡时间完全在班次内，保持原始时间
    }

    // 扣用餐时间
    if (code.deductMeal && shift.breakHours > 0) {
      // 如果实际工时大于班次标准工时，扣除用餐时间
      if (actualHours > shift.standardHours) {
        actualHours -= shift.breakHours;
      }
    }

    // 保留2位小数
    actualHours = Math.round(actualHours * 100) / 100;
    standardHours = shift.standardHours;

    // 转换单位
    if (code.unit === 'MINUTES') {
      actualHours = Math.round(actualHours * 60);
      standardHours = Math.round(standardHours * 60);
    }

    return {
      actualHours,
      standardHours,
      adjustedInTime,
      adjustedOutTime,
    };
  }

  /**
   * 计算班次时间（开始和结束时间）
   */
  private calculateShiftTime(shift: any, baseDate?: Date) {
    if (!shift.segments || shift.segments.length === 0) {
      return { start: null, end: null };
    }

    const firstSegment = shift.segments[0];
    const lastSegment = shift.segments[shift.segments.length - 1];

    // 使用传入的基准日期，如果没有则使用当前日期
    const today = baseDate ? new Date(baseDate) : new Date();
    today.setHours(0, 0, 0, 0);

    const start = new Date(today);
    const [startHours, startMinutes] = firstSegment.startTime.split(':').map(Number);
    start.setHours(startHours, startMinutes, 0, 0);

    const end = new Date(today);
    const [endHours, endMinutes] = lastSegment.endTime.split(':').map(Number);
    end.setHours(endHours, endMinutes, 0, 0);

    return { start, end };
  }

  /**
   * 计算班外时数
   */
  private calculateOutsideHours(inTime: Date, outTime: Date, shiftStart: Date, shiftEnd: Date) {
    let outsideHours = 0;

    // 班前时间
    if (inTime < shiftStart) {
      const endBeforeShift = outTime < shiftStart ? outTime : shiftStart;
      outsideHours += (endBeforeShift.getTime() - inTime.getTime()) / (1000 * 60 * 60);
    }

    // 班后时间
    if (outTime > shiftEnd) {
      const startAfterShift = inTime > shiftEnd ? inTime : shiftEnd;
      outsideHours += (outTime.getTime() - startAfterShift.getTime()) / (1000 * 60 * 60);
    }

    return outsideHours;
  }

  /**
   * 计算与班次时间的交集
   */
  private calculateIntersectionHours(inTime: Date, outTime: Date, shiftStart: Date, shiftEnd: Date) {
    // 取时间范围的交集
    const effectiveStart = inTime > shiftStart ? inTime : shiftStart;
    const effectiveEnd = outTime < shiftEnd ? outTime : shiftEnd;

    if (effectiveStart >= effectiveEnd) {
      // 没有交集
      return 0;
    }

    return (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60);
  }

  /**
   * 检查账户是否匹配
   * accountLevels 存储的是层级配置的 sort 值，需要转换为 level 值进行比较
   * sort 值与 level 的对应关系：sort + 1 = level
   * 例如：sort=0(工厂) → level=1, sort=1(车间) → level=2
   *
   * 匹配规则：
   * 1. 配置了哪些层级，这些层级都必须有值
   * 2. 账户的组织层级应该等于配置中的最大组织层级
   *    - 工厂工时[0,6]：只匹配组织层级=1的账户（只到工厂）
   *    - 车间工时[0,1,6]：只匹配组织层级=2的账户（只到车间）
   *    - 线体工时[0,1,2,6]：只匹配组织层级=3的账户（只到线体）
   */
  private isAccountMatch(account: any, accountLevels: any[]): boolean {
    // 解析 hierarchyValues，这是一个 JSON 数组，包含所有层级的配置
    const hierarchyValues = account.hierarchyValues ? JSON.parse(account.hierarchyValues) : [];

    // 找出账户的组织层级（连续的ORG类型层级）
    let accountOrgLevel = 0;
    for (const hv of hierarchyValues) {
      // ✅ 只检查组织层级（ORG/ORG_TYPE）
      // 遇到非组织层级时跳过，不影响组织层级的判断
      if (hv.mappingType !== 'ORG' && hv.mappingType !== 'ORG_TYPE') {
        continue; // 跳过非组织层级（如FIELD_A02工序）
      }

      // 检查组织层级是否有值
      if (hv.selectedValue) {
        accountOrgLevel = hv.level;
      } else {
        // 遇到组织层级但没有值，停止
        break;
      }
    }

    // 找出配置中的组织层级（连续的level<=3的层级）
    const configOrgLevels = accountLevels.map(s => s + 1).filter(l => l <= 3);
    const maxConfigOrgLevel = configOrgLevels.length > 0 ? Math.max(...configOrgLevels) : 0;

    // 检查配置的每个层级是否都有值
    for (const sortValue of accountLevels) {
      const level = sortValue + 1; // sort 转换为 level（从1开始）

      // 在 hierarchyValues 数组中找到对应的层级配置
      const levelConfig = hierarchyValues.find((hv: any) => hv.level === level);

      // 如果找不到层级配置，或者 selectedValue 为空，则不匹配
      if (!levelConfig || !levelConfig.selectedValue) {
        return false;
      }
    }

    // 检查账户的组织层级是否等于配置的最大组织层级
    if (maxConfigOrgLevel > 0 && accountOrgLevel !== maxConfigOrgLevel) {
      console.log(`账户不匹配: accountId=${account.id}, accountOrgLevel=${accountOrgLevel}, maxConfigOrgLevel=${maxConfigOrgLevel}`);
      return false;
    }

    return true;
  }

  /**
   * 获取员工的主劳动力账户（层级最高的账户）
   */
  private async getEmployeeMainAccount(employeeId: number) {
    if (!employeeId) return null;

    const targetDate = new Date();

    // 通过EmployeeLaborAccount关联表查询
    const accountLinks = await this.prisma.employeeLaborAccount.findMany({
      where: {
        employeeId,
        effectiveDate: { lte: targetDate },
        OR: [
          { expiryDate: null },
          { expiryDate: { gt: targetDate } },
        ],
      },
      include: {
        account: true,
      },
      orderBy: { effectiveDate: 'desc' },
      take: 1,
    });

    if (accountLinks.length === 0) return null;

    const account = accountLinks[0].account;
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
   * 合并两个劳动力账户（优先级：punchAccount > mainAccount）
   */
  private mergeAccounts(punchAccount: any, mainAccount: any): any {
    if (!punchAccount && !mainAccount) return null;
    if (!mainAccount) return punchAccount;
    if (!punchAccount) return mainAccount;

    // 解析层级值
    const punchValues = punchAccount.hierarchyValues ? JSON.parse(punchAccount.hierarchyValues) : [];
    const mainValues = mainAccount.hierarchyValues ? JSON.parse(mainAccount.hierarchyValues) : [];

    // 创建合并后的层级值映射表
    const mergedValuesMap = new Map<number, any>();

    // 首先添加主账户的所有层级值（作为基础）
    mainValues.forEach((v: any) => {
      mergedValuesMap.set(v.level, v);
    });

    // 然后用刷卡账户的层级值覆盖（只覆盖有值的层级）
    punchValues.forEach((v: any) => {
      if (v.selectedValue) {
        mergedValuesMap.set(v.level, v);
      }
    });

    // 转换回数组并排序
    const mergedValues = Array.from(mergedValuesMap.values()).sort((a, b) => a.level - b.level);

    // 计算合并后的层级数
    const maxLevel = Math.max(
      punchValues.length > 0 ? punchValues[punchValues.length - 1].level : 0,
      mainValues.length > 0 ? mainValues[mainValues.length - 1].level : 0
    );

    // 构建namePath和path
    const namePath = this.buildNamePath(mergedValues);
    const path = this.buildPath(mergedValues);

    return {
      id: punchAccount.id,
      namePath: namePath,
      path: path,
      level: maxLevel,
      hierarchyValues: JSON.stringify(mergedValues),
    };
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

  /**
   * 按班段拆分计算工时（交叉比对打卡时间与班段时间）
   */
  private async calculateBySegments(
    startTime: Date,
    endTime: Date,
    punchPair: any,
    shift: any,
    punchAccount: any,
    mainAccount: any,
    attendanceCodes: any[],
    segmentTransferMap: Map<number, number> = new Map()  // ✅ 新增：班段转移账户映射表
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
          code,
          punchPair
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
          code,
          punchPair
        );
        if (workHours) {
          results.push(workHours);
        }
      }
      return results;
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

      // ✅ 获取班段的转移账户（优先使用排班配置的转移账户）
      let segmentAccount = null;

      // 1. 优先从排班配置的 adjustedSegments 中获取转移账户
      if (segmentTransferMap.has(segment.id)) {
        const transferAccountId = segmentTransferMap.get(segment.id);
        segmentAccount = await this.prisma.laborAccount.findUnique({
          where: { id: transferAccountId },
          select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
        });
        console.log(`班段 ${segment.id} 使用排班配置的转移账户: ${transferAccountId}`);
      }
      // 2. 如果排班没有配置，使用班次默认的转移账户
      else if (segment.accountId) {
        segmentAccount = await this.prisma.laborAccount.findUnique({
          where: { id: segment.accountId },
          select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
        });
        console.log(`班段 ${segment.id} 使用班次默认的转移账户: ${segment.accountId}`);
      }

      // 为每个出勤代码计算工时
      for (const code of attendanceCodes) {
        const workHours = await this.calculateWorkHours(
          segOverlapStart,
          segOverlapEnd,
          punchAccount,
          segmentAccount,
          mainAccount,
          code,
          punchPair
        );
        if (workHours) {
          results.push(workHours);
        }
      }
    }

    return results;
  }

  /**
   * 计算工时并合并账户（三个账户：刷卡账户 > 班段转移账户 > 主账户）
   */
  private async calculateWorkHours(
    startTime: Date,
    endTime: Date,
    punchAccount: any,
    segmentAccount: any,
    mainAccount: any,
    code: any,
    punchPair: any
  ): Promise<any | null> {
    // ✅ 关键修复：只用原始刷卡账户去匹配出勤代码
    // 如果有刷卡账户，用刷卡账户匹配
    if (punchAccount) {
      const accountLevels = JSON.parse(code.accountLevels || '[]');
      console.log(`[精益��时计算] 摆卡ID ${punchPair.id}: 用摆卡账户匹配 ${code.name}, 要求层级 ${JSON.stringify(accountLevels)}`);
      if (!this.isAccountMatch(punchAccount, accountLevels)) {
        console.log(`[精益工时计算] 摆卡账户不匹配 ${code.name}`);
        return null;
      }
      console.log(`[精益工时计算] 摆卡账户匹配 ${code.name} ✓`);
    } else if (mainAccount) {
      // 如果没有刷卡账户，用主账���匹配
      const accountLevels = JSON.parse(code.accountLevels || '[]');
      console.log(`[精益工时计算] 摆卡ID ${punchPair.id}: 用主账户匹配 ${code.name}, 要求层级 ${JSON.stringify(accountLevels)}`);
      if (!this.isAccountMatch(mainAccount, accountLevels)) {
        console.log(`[精益工时计算] 主账户不匹配 ${code.name}`);
        return null;
      }
      console.log(`[精益工时计算] 主账户匹配 ${code.name} ✓`);
    } else {
      // 既没有刷卡账户也没有主账户，不计算
      return null;
    }

    // ✅ 匹配成功后，合并账户生成最终的劳动力账户
    // 优先级：刷卡账户 > 班段转移账户 > 主账户
    const mergedAccount = this.mergeThreeAccounts(punchAccount, segmentAccount, mainAccount);

    if (!mergedAccount) {
      return null;
    }

    // 计算工时
    const workMinutes = this.differenceInMinutes(endTime, startTime);
    const workHours = workMinutes / 60;

    // 计算标准工时（使用班次标准工时）
    const standardHours = workHours; // 简化处理

    return {
      employeeNo: punchPair.employeeNo,
      calcDate: punchPair.pairDate,
      shiftId: punchPair.shiftId,
      shiftName: punchPair.shiftName,
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
   * 合并三个劳动力账户（优先级：punchAccount > segmentAccount > mainAccount）
   */
  private mergeThreeAccounts(punchAccount: any, segmentAccount: any, mainAccount: any): any {
    // 过滤掉 null 账户
    const validAccounts = [punchAccount, segmentAccount, mainAccount].filter(a => a !== null);
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
   * 合并两个账户（逐层级按优先级合并）
   */
  private mergeTwoAccounts(priorityAccount: any, secondaryAccount: any): any {
    if (!priorityAccount) return secondaryAccount;
    if (!secondaryAccount) return priorityAccount;

    // 解析层级值（添加防御性检查，确保是数组）
    let priorityValues: any[] = [];
    let secondaryValues: any[] = [];

    try {
      if (priorityAccount.hierarchyValues) {
        const parsed = JSON.parse(priorityAccount.hierarchyValues);
        priorityValues = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('[合并账户] 解析优先级账户层级值失败:', error);
      priorityValues = [];
    }

    try {
      if (secondaryAccount.hierarchyValues) {
        const parsed = JSON.parse(secondaryAccount.hierarchyValues);
        secondaryValues = Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.warn('[合并账户] 解析次级账户层级值失败:', error);
      secondaryValues = [];
    }

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

      // 检查是否可以合并：
      // 1. 账户相同（accountName 相同）
      // 2. 时间相邻（当前开始时间 = 前一个结束时间）
      // 3. 出勤代码相同
      const sameAccount = previous.accountName === current.accountName;
      const adjacentTime = currentTime === previousEndTime;
      const sameCode = previous.calculationAttendanceCodeId === current.calculationAttendanceCodeId;

      if (sameAccount && adjacentTime && sameCode) {
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
   * 计算两个日期之间的分钟数
   */
  private differenceInMinutes(endTime: Date, startTime: Date): number {
    return Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
  }
}
