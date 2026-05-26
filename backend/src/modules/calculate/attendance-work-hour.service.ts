import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { differenceInMinutes, format } from 'date-fns';
import { AttendanceRuleGroupHelper } from '../attendance-rule-group/attendance-rule-group-helper.service';
import { WorkHourPushService } from './work-hour-push.service';
import { AmountCalculateService } from '../amount/amount-calculate.service';

/**
 * 考勤工时计算服务
 * 根据考勤打卡收卡结果计算工时
 */
@Injectable()
export class AttendanceWorkHourService {
  private readonly logger = new Logger(AttendanceWorkHourService.name);

  constructor(
    private prisma: PrismaService,
    private attendanceRuleGroupHelper: AttendanceRuleGroupHelper,
    private workHourPushService: WorkHourPushService, // ✅ 新增：工时推送服务
    private amountCalculateService: AmountCalculateService, // ✅ 新增：金额计算服务
  ) {}

  /**
   * 计算单个员工某日的考勤工时
   * @param employeeNo 员工编号
   * @param calcDate 计算日期
   * @param batchId 批次ID（用于增量更新）
   */
  async calculateDaily(employeeNo: string, calcDate: Date, batchId?: string) {
    this.logger.log(`开始计算员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时`);

    // 0. ✅ 先删除当天该员工的考勤工时数据，避免重算时数据重复
    await this.deleteDailyWorkHourResults(employeeNo, calcDate);
    this.logger.log(`已删除员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的旧考勤工时数据`);

    // 1. 查询考勤打卡收卡结果
    const attendancePunchPairs = await this.getAttendancePunchPairs(employeeNo, calcDate);

    if (!attendancePunchPairs || attendancePunchPairs.length === 0) {
      this.logger.warn(`员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 无考勤打卡收卡结果`);
      return {
        success: false,
        message: '无考勤打卡收卡结果',
        results: [],
      };
    }

    // 2. 为每个打卡收卡结果计算工时（可能返回多个结果，因为按班段拆分）
    const workHourResults = [];

    for (const punchPair of attendancePunchPairs) {
      const results = await this.calculateWorkHourFromPunchPair(punchPair, calcDate, batchId);
      if (results && results.length > 0) {
        workHourResults.push(...results);
      }
    }

    // 2.5. ✅ 合并相同劳动力账户且时间相邻的工时结果
    const mergedResults = this.mergeAdjacentWorkHours(workHourResults);
    if (workHourResults.length !== mergedResults.length) {
      this.logger.log(`合并工时结果: ${workHourResults.length} 条 -> ${mergedResults.length} 条`);
    }

    // 3. 保存或更新工时结果
    const savedResults = await this.saveWorkHourResults(mergedResults, batchId);

    this.logger.log(`员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时计算完成，共 ${savedResults.length} 条记录`);

    // ✅ 自动推送到 WorkHourResult 表
    if (savedResults.length > 0) {
      try {
        const calcResultIds = savedResults.map(r => r.id);
        this.logger.log(`准备推送 ${calcResultIds.length} 条考勤工时结果到 WorkHourResult 表`);
        const pushResult = await this.workHourPushService.pushWorkHourResults(calcResultIds);
        this.logger.log(
          `考勤工时推送完成 - 成功: ${pushResult.success}, 失败: ${pushResult.failed}, 删除旧数据: ${pushResult.deleted}`,
        );
      } catch (error) {
        this.logger.error('推送考勤工时结果失败:', error.stack);
        // 不影响主流程，记录错误即可
      }
    }

    return {
      success: true,
      message: '计算成功',
      results: savedResults,
    };
  }

  /**
   * 合并相同劳动力账户且时间相邻的工时结果
   *
   * 合并规则：
   * 1. 相同劳动力账户（accountName 相同）
   * 2. 时间相邻（前一条的 endTime = 后一条的 startTime）
   * 3. 合并为一条记录：
   *    - startTime = 第一条的 startTime
   *    - endTime = 最后一条的 endTime
   *    - workHours 相加
   *    - amount 相加
   *
   * @param workHourResults 工时结果数组
   * @returns 合并后的工时结果数组
   */
  private mergeAdjacentWorkHours(workHourResults: any[]): any[] {
    if (!workHourResults || workHourResults.length === 0) {
      return [];
    }

    // 按开始时间排序
    const sortedResults = [...workHourResults].sort((a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const mergedResults: any[] = [];
    let currentGroup = [sortedResults[0]];

    for (let i = 1; i < sortedResults.length; i++) {
      const current = sortedResults[i];
      const previous = currentGroup[currentGroup.length - 1];

      const currentTime = new Date(current.startTime).getTime();
      const previousEndTime = new Date(previous.endTime).getTime();

      // 检查是否可以合并：
      // 1. 账户相同（accountName 相同）
      // 2. 时间相邻（当前开始时间 = 前一个结束时间）
      const sameAccount = previous.accountName === current.accountName;
      const adjacentTime = currentTime === previousEndTime;

      if (sameAccount && adjacentTime) {
        // 可以合并，加入当前组
        currentGroup.push(current);
      } else {
        // 不能合并，处理当前组并开始新组
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
    if (group.length === 0) {
      return null;
    }

    if (group.length === 1) {
      return group[0];
    }

    // 按开始时间排序
    group.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const first = group[0];
    const last = group[group.length - 1];

    // 合并工时（不合并金额，金额会在保存时重新计算）
    const totalWorkHours = group.reduce((sum, item) => sum + (item.workHours || 0), 0);

    // 返回合并后的结果
    return {
      ...first,
      startTime: first.startTime,
      endTime: last.endTime,
      workHours: Math.round(totalWorkHours * 100) / 100, // 保留两位小数
      remark: first.remark + (group.length > 1 ? `（合并了${group.length}段相邻工时）` : ''),
    };
  }

  /**
   * 批量计算多个员工某日的考勤工时
   * @param employeeNos 员工编号列表
   * @param calcDate 计算日期
   * @param batchId 批次ID（用于增量更新）
   */
  async calculateBatch(employeeNos: string[], calcDate: Date, batchId?: string) {
    this.logger.log(`开始批量计算 ${employeeNos.length} 个员工在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时`);

    const results = {
      success: true,
      total: employeeNos.length,
      succeeded: 0,
      failed: 0,
      details: [] as any[],
    };

    for (const employeeNo of employeeNos) {
      try {
        const result = await this.calculateDaily(employeeNo, calcDate, batchId);
        if (result.success) {
          results.succeeded++;
          results.details.push({
            employeeNo,
            success: true,
            message: result.message,
            count: result.results.length,
          });
        } else {
          results.failed++;
          results.details.push({
            employeeNo,
            success: false,
            message: result.message,
          });
        }
      } catch (error: any) {
        results.failed++;
        results.details.push({
          employeeNo,
          success: false,
          message: error.message || '计算失败',
        });
        this.logger.error(`计算员工 ${employeeNo} 的考勤工时失败: ${error.message}`, error.stack);
      }
    }

    this.logger.log(`批量计算完成: 成功 ${results.succeeded}/${results.total}, 失败 ${results.failed}/${results.total}`);

    return results;
  }

  /**
   * 删除指定员工、指定日期的考勤工时结果
   * @param employeeNo 员工编号
   * @param calcDate 计算日期
   */
  private async deleteDailyWorkHourResults(employeeNo: string, calcDate: Date) {
    this.logger.debug(`准备删除员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时数据`);

    // 获取所有考勤工时类型的出勤代码
    const attendanceHourCodes = await this.prisma.calculationAttendanceCode.findMany({
      where: { type: 'ATTENDANCE_HOURS' },
      select: { id: true },
    });

    if (attendanceHourCodes.length === 0) {
      this.logger.debug('没有找到考勤工时类型的出勤代码，跳过删除');
      return;
    }

    const attendanceHourCodeIds = attendanceHourCodes.map(c => c.id);

    // 删除符合条件的数据
    const deleteResult = await this.prisma.calcResult.deleteMany({
      where: {
        employeeNo: employeeNo,
        calcDate: new Date(calcDate),
        calculationAttendanceCodeId: {
          in: attendanceHourCodeIds,
        },
      },
    });

    if (deleteResult.count > 0) {
      this.logger.log(`删除了 ${deleteResult.count} 条旧的考勤工时数据`);
    }
  }

  /**
   * 批量计算多个员工在日期范围内的考勤工时
   * @param employeeNos 员工编号列表
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param batchId 批次ID（用于增量更新）
   */
  async calculateByDateRange(
    employeeNos: string[],
    startDate: Date,
    endDate: Date,
    batchId?: string,
  ) {
    console.log('=== calculateByDateRange 开始 ===');
    console.log('接收到的��数:', {
      employeeNos,
      startDate: startDate instanceof Date ? startDate.toISOString() : startDate,
      endDate: endDate instanceof Date ? endDate.toISOString() : endDate,
      batchId,
    });

    // 如果没有指定员工，获取所有员工
    if (!employeeNos || employeeNos.length === 0) {
      console.log('未指定员工，查询所有员工...');
      const allEmployees = await this.prisma.employee.findMany({
        select: { employeeNo: true },
      });
      employeeNos = allEmployees.map(e => e.employeeNo);
      console.log(`查询到 ${employeeNos.length} 个员工`);
    }

    this.logger.log(
      `开始批量计算 ${employeeNos.length} 个员工在 ${format(startDate, 'yyyy-MM-dd')} 到 ${format(endDate, 'yyyy-MM-dd')} 的考勤工时`,
    );

    const results = {
      success: true,
      totalEmployees: employeeNos.length,
      totalDays: 0,
      succeeded: 0,
      failed: 0,
      details: [] as any[],
    };

    // 生成日期范围内的所有日期
    const dates: Date[] = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    results.totalDays = dates.length;

    console.log('将要处理的日期列表:', dates.map(d => format(d, 'yyyy-MM-dd')));

    // 为每个员工、每一天计算考勤工时
    for (const employeeNo of employeeNos) {
      for (const calcDate of dates) {
        console.log(`正在处理员工 ${employeeNo} 日期 ${format(calcDate, 'yyyy-MM-dd')}`);
        try {
          const result = await this.calculateDaily(employeeNo, calcDate, batchId);
          if (result.success) {
            results.succeeded++;
            results.details.push({
              employeeNo,
              date: format(calcDate, 'yyyy-MM-dd'),
              success: true,
              message: result.message,
              count: result.results.length,
            });
          } else {
            results.failed++;
            results.details.push({
              employeeNo,
              date: format(calcDate, 'yyyy-MM-dd'),
              success: false,
              message: result.message,
            });
          }
        } catch (error: any) {
          results.failed++;
          results.details.push({
            employeeNo,
            date: format(calcDate, 'yyyy-MM-dd'),
            success: false,
            message: error.message || '计算失败',
          });
          this.logger.error(
            `计算员工 ${employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤工时失败: ${error.message}`,
            error.stack,
          );
        }
      }
    }

    this.logger.log(
      `批量计算完成: 总计 ${employeeNos.length * dates.length} 次计算, 成功 ${results.succeeded}, 失败 ${results.failed}`,
    );

    console.log('=== calculateByDateRange 完成 ===');
    console.log('���果汇总:', {
      totalEmployees: results.totalEmployees,
      totalDays: results.totalDays,
      succeeded: results.succeeded,
      failed: results.failed,
      details: results.details,
    });

    return results;
  }

  /**
   * 查询考勤打卡收卡结果
   */
  private async getAttendancePunchPairs(employeeNo: string, calcDate: Date) {
    const dayStart = new Date(calcDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(calcDate);
    dayEnd.setHours(23, 59, 59, 999);

    const punchPairs = await this.prisma.attendancePunchPair.findMany({
      where: {
        employeeNo,
        punchDate: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      orderBy: {
        punchDate: 'asc',
      },
    });

    // 手动查询员工信息并附加到每个punchPair上
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: {
        id: true,
        name: true,
      },
    });

    // 将员工信息附加到每个punchPair上
    return punchPairs.map(punchPair => ({
      ...punchPair,
      employee,
    }));
  }

  /**
   * 根据考勤打卡收卡结果计算工时
   */
  private async calculateWorkHourFromPunchPair(
    punchPair: any,
    calcDate: Date,
    batchId?: string
  ): Promise<any[] | null> {
    // 1. 提取打卡时间
    const startTime = punchPair.workStartPunchTime ? new Date(punchPair.workStartPunchTime) : null;
    const endTime = punchPair.workEndPunchTime ? new Date(punchPair.workEndPunchTime) : null;

    if (!startTime || !endTime) {
      this.logger.warn(`打卡收卡记录 ${punchPair.id} 缺少上班或下班打卡时间，跳过计算`);
      return null;
    }

    // 2. 解析上下班打卡的劳动力账户
    const startPunches = JSON.parse(punchPair.workStartPunches || '[]');
    const endPunches = JSON.parse(punchPair.workEndPunches || '[]');

    // 获取上班卡的劳动力账户（优先级最高）
    const punchAccountId = startPunches.length > 0 ? startPunches[0].accountId : null;

    // 3. 获取排班信息
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        employeeId: punchPair.employee?.id,
        scheduleDate: {
          gte: new Date(new Date(calcDate).setHours(0, 0, 0, 0)),
          lt: new Date(new Date(calcDate).setHours(23, 59, 59, 999)),
        },
      },
      include: {
        shift: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    // 4. 解析排班中的班段转移账户配置
    const segmentTransferMap = new Map<number, number>();
    if (schedule?.adjustedSegments) {
      try {
        const adjustedSegments = JSON.parse(schedule.adjustedSegments);
        adjustedSegments.forEach((seg: any) => {
          if (seg.id && seg.accountId) {
            segmentTransferMap.set(seg.id, seg.accountId);
          }
        });
        this.logger.debug(`解析到 ${segmentTransferMap.size} 个班段转移配置`);
      } catch (error) {
        this.logger.warn(`解析排班adjustedSegments失败: ${error.message}`);
      }
    }

    // 5. 获取员工的主劳动力账户（层级最高的账户）
    const employeeMainAccount = await this.getEmployeeMainAccount(punchPair.employee?.id);

    // 6. 按班段拆分计算工时
    const workHourResults = await this.calculateBySegments(
      startTime,
      endTime,
      punchPair,
      calcDate,
      batchId,
      {
        punchAccountId,      // 刷卡数据的劳动力账户
        segmentTransferMap,  // 班段转移账户映射表（segmentId -> accountId）
        employeeMainAccount,   // 主劳动力账户
        shift: schedule?.shift,
      }
    );

    return workHourResults;
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
      orderBy: { level: 'desc' }, // 层级最高的账户
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
    // 不过滤 "-"，保留所有层级（包括 "-" 表示的空值）
    const segments = path.split('/').filter(s => s !== '');

    // 确保至少有7个层级
    while (segments.length < 7) {
      segments.push('-');
    }

    // 构建标准的 hierarchyValues 结构
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
   * "-" 表示存在但为空，返回特殊对象
   * 其他值返回正常的 selectedValue 对象
   */
  private parsePathSegment(segment: string): any {
    if (!segment || segment === '-') {
      // 返回特殊标记，表示该层级存在但为空
      return { name: '-', isEmpty: true };
    }
    return { name: segment, isEmpty: false };
  }

  /**
   * 按班段拆分计算工时
   */
  private async calculateBySegments(
    startTime: Date,
    endTime: Date,
    punchPair: any,
    calcDate: Date,
    batchId: string,
    context: {
      punchAccountId: number;
      segmentTransferMap: Map<number, number>; // 班段转移账户映射表
      employeeMainAccount: any;
      shift: any;
    }
  ): Promise<any[]> {
    const results = [];
    const { shift, punchAccountId, employeeMainAccount } = context;

    // 如果没有班次信息，直接使用打卡时间计算
    if (!shift || !shift.segments || shift.segments.length === 0) {
      const workHours = await this.determineFinalAccountAndCalculate(
        startTime,
        endTime,
        punchAccountId,
        null, // 无班段账户
        employeeMainAccount,
        punchPair,
        calcDate,
        batchId,
        null
      );
      if (workHours) {
        results.push(workHours);
      }
      return results;
    }

    // 获取出勤代码配置，检查是否需要计算班外时数
    const attendanceCodes = await this.prisma.calculationAttendanceCode.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, includeOutside: true },
    });

    // 检查是否有任何出勤代码需要计算班外时数
    const shouldIncludeOutside = attendanceCodes.some(code => code.includeOutside);

    // 获取所有工作班段（非休息段）
    const workSegments = shift.segments.filter(s => s.type !== 'REST');

    if (workSegments.length === 0) {
      // 如果没有工作班段，全部作为班外时间
      if (shouldIncludeOutside) {
        const workHours = await this.determineFinalAccountAndCalculate(
          startTime,
          endTime,
          punchAccountId,
          null, // 班外时间无班段账户
          employeeMainAccount,
          punchPair,
          calcDate,
          batchId,
          null,
          'OUTSIDE'
        );
        if (workHours) {
          results.push(workHours);
        }
      }
      return results;
    }

    // 找出第一个班段的开始时间和最后一个班段的结束时间
    const firstSegmentStart = this.parseSegmentTime(calcDate, workSegments[0].startDate, workSegments[0].startTime);
    const lastSegmentEnd = this.parseSegmentTime(calcDate, workSegments[workSegments.length - 1].endDate, workSegments[workSegments.length - 1].endTime);

    // 计算班外时间（如果配置了包含班外时数）
    if (shouldIncludeOutside) {
      // 班前时间：上班打卡时间早于第一个班段开始时间
      if (startTime < firstSegmentStart) {
        const outsideEnd = endTime < firstSegmentStart ? endTime : firstSegmentStart;
        if (outsideEnd > startTime) {
          const outsideHours = await this.determineFinalAccountAndCalculate(
            startTime,
            outsideEnd,
            punchAccountId,
            null,
            employeeMainAccount,
            punchPair,
            calcDate,
            batchId,
            null,
            'OUTSIDE'
          );
          if (outsideHours) {
            results.push(outsideHours);
          }
        }
      }

      // 班后时间：下班打卡时间晚于最后一个班段结束时间
      if (endTime > lastSegmentEnd) {
        const outsideStart = startTime > lastSegmentEnd ? startTime : lastSegmentEnd;
        if (endTime > outsideStart) {
          const outsideHours = await this.determineFinalAccountAndCalculate(
            outsideStart,
            endTime,
            punchAccountId,
            null,
            employeeMainAccount,
            punchPair,
            calcDate,
            batchId,
            null,
            'OUTSIDE'
          );
          if (outsideHours) {
            results.push(outsideHours);
          }
        }
      }
    }

    // 遍历班次中的每个班段
    for (const segment of workSegments) {
      // 计算班段的开始和结束时间
      const segmentStartTime = this.parseSegmentTime(calcDate, segment.startDate, segment.startTime);
      const segmentEndTime = this.parseSegmentTime(calcDate, segment.endDate, segment.endTime);

      // 计算打卡时间与班段时间的交集
      const overlapStart = startTime > segmentStartTime ? startTime : segmentStartTime;
      const overlapEnd = endTime < segmentEndTime ? endTime : segmentEndTime;

      if (overlapStart >= overlapEnd) {
        continue; // 没有交集，跳过
      }

      // 优先使用排班中配置的转移账户
      let segmentAccountId = segment.accountId;
      if (context.segmentTransferMap.has(segment.id)) {
        const transferAccountId = context.segmentTransferMap.get(segment.id);
        this.logger.debug(`班段 ${segment.id} (${segment.startTime}-${segment.endTime}) 使用转移账户 ${transferAccountId}`);
        segmentAccountId = transferAccountId;
      }

      // 创建带有转移账户的班段对象
      const segmentWithTransfer = {
        ...segment,
        accountId: segmentAccountId,
      };

      // 计算该段工时，并确定最终的劳动力账户
      const workHours = await this.determineFinalAccountAndCalculate(
        overlapStart,
        overlapEnd,
        punchAccountId,
        segmentWithTransfer, // 使用带有转移账户的班段对象
        employeeMainAccount,
        punchPair,
        calcDate,
        batchId,
        segmentWithTransfer,
        'INSIDE'
      );

      if (workHours) {
        results.push(workHours);
      }
    }

    return results;
  }

  /**
   * 解析班段时间
   */
  private parseSegmentTime(baseDate: Date, startDate: string, timeStr: string): Date {
    const result = new Date(baseDate);
    const [hours, minutes] = timeStr.split(':').map(Number);

    if (startDate === '+0') {
      // 当天
      result.setHours(hours, minutes, 0, 0);
    } else if (startDate === '+1') {
      // 次日
      result.setDate(result.getDate() + 1);
      result.setHours(hours, minutes, 0, 0);
    }

    return result;
  }

  /**
   * 确定最终的劳动力账户并计算工时
   *
   * 账户合并优先级（从高到低）：
   * 1. 刷卡账户
   * 2. 转移账户（Transfer Account，即班段配置的账户）
   * 3. 主账户（Main Account，员工的主劳动力账户）
   *
   * 合并策略：按层级逐层合并，优先级高的层级值优先
   * - 如果优先级高的账户在某层级有值，使用该值
   * - 如果优先级高的账户在某层级无值，使用次级账户的值（补充）
   *
   * 示例：
   * - 刷卡账户（Level 1-3）：大华富阳工厂/W1总装车间/W1总装车间L1产线
   * - 主账户（Level 4）：集团总部/.../大桶
   * - 转移账户（Level 5）：焊接
   * - 最终结果：大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶/焊接
   */
  private async determineFinalAccountAndCalculate(
    startTime: Date,
    endTime: Date,
    punchAccountId: number,
    segment: any,
    employeeMainAccount: any,
    punchPair: any,
    calcDate: Date,
    batchId: string,
    segmentInfo?: any,
    segmentType?: string // 'INSIDE' 或 'OUTSIDE'，表示是否在班段内
  ): Promise<any | null> {
    // 1. 获取所有需要合并的账户（按优先级顺序）
    const accountsToMerge: any[] = [];

    // 优先级1：刷卡账户
    if (punchAccountId) {
      const punchAccount = await this.prisma.laborAccount.findUnique({
        where: { id: punchAccountId },
        select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
      });
      if (punchAccount) {
        accountsToMerge.push(punchAccount);
      }
    }

    // 优先级2：转移账户（班段配置的账户）
    const segmentAccountId = segment?.accountId;
    if (segmentAccountId) {
      const segmentAccount = await this.prisma.laborAccount.findUnique({
        where: { id: segmentAccountId },
        select: { id: true, namePath: true, path: true, level: true, hierarchyValues: true },
      });
      if (segmentAccount) {
        accountsToMerge.push(segmentAccount);
      }
    }

    // 优先级3：主账户
    if (employeeMainAccount) {
      accountsToMerge.push(employeeMainAccount);
    }

    // 2. 合并所有账户（按优先级逐层合并）
    let finalAccount = null;
    if (accountsToMerge.length > 0) {
      finalAccount = this.mergeMultipleAccounts(accountsToMerge);
    }

    // 3. 计算工作时长
    const workMinutes = differenceInMinutes(endTime, startTime);
    const workHours = workMinutes / 60;

    // 4. 匹配出勤代码
    const attendanceCode = await this.matchAttendanceCode(punchPair, workHours, calcDate);

    if (!attendanceCode) {
      this.logger.warn(`打卡收卡记录 ${punchPair.id} 未匹配到出勤代码，跳过计算`);
      return null;
    }

    // 5. 如果出勤代码不计算工时，则跳过
    if (!attendanceCode.calculateHours) {
      this.logger.debug(`出勤代码 ${attendanceCode.code} 不计算工时，跳过`);
      return null;
    }

    // 6. 构建工时结果
    return {
      employeeNo: punchPair.employeeNo,
      employeeId: punchPair.employee?.id,
      calcDate: new Date(calcDate),
      shiftId: punchPair.workStartShiftId || punchPair.workEndShiftId,
      shiftName: punchPair.workStartShiftName || punchPair.workEndShiftName,
      startTime: startTime,
      endTime: endTime,
      calculationAttendanceCodeId: attendanceCode.id,
      calculationAttendanceCodeStr: attendanceCode.code,
      workHours: Math.round(workHours * 100) / 100, // 保留两位小数
      accountId: finalAccount?.id,
      accountName: finalAccount?.namePath,
      accountPath: finalAccount?.path,
      source: 1, // 计算推送
      sourceType: 'CALCULATED',
      sourceId: punchPair.id,
      sourceBatchId: batchId,
      status: 'DRAFT',
      remark: `来自考勤打卡收卡记录 #${punchPair.id}` +
              (segmentType ? `，${segmentType === 'OUTSIDE' ? '班外时数' : '班段内时数'}` : '') +
              (segmentInfo ? `，班段：${segmentInfo.type}` : ''),
    };
  }

  /**
   * 合并多个劳动力账户
   *
   * 合并顺序（已按优先级排列）：
   * - accounts[0]: 刷卡账户
   * - accounts[1]: 转移账户
   * - accounts[2]: 主账户
   *
   * 合并策略：逐层比较，优先级高的值优先
   * 如果高优先级账户在某层级有值，使用该值；否则使用次级账户的值
   */
  private mergeMultipleAccounts(accounts: any[]): any {
    if (accounts.length === 0) return null;
    if (accounts.length === 1) return accounts[0];

    // 以第一个账户（刷卡账户，优先级最高）为基础
    let merged = accounts[0];

    // 依次合并其他账户（转移账户、主账户）
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
   *
   * @param priorityAccount 高优先级账户（如：刷卡账户、转移账户）
   * @param secondaryAccount 低优先级账户（如：主账户、次级转移账户）
   * @returns 合并后的账户
   *
   * 示例：
   * - 刷卡账户: 大华富阳工厂/W1总装车间/W1总装车间L1产线 (Level 1-3有值)
   * - 主账户: 集团总部/.../大桶/-/-/- (Level 4有值)
   * - 合并结果: 大华富阳工厂/W1总装车间/W1总装车间L1产线/大桶 (Level 1-3来自刷卡，Level 4来自主账户)
   */
  private mergeAccounts(priorityAccount: any, secondaryAccount: any): any {
    // 解析层级值
    const priorityValues = priorityAccount.hierarchyValues
      ? JSON.parse(priorityAccount.hierarchyValues)
      : [];
    const secondaryValues = secondaryAccount.hierarchyValues
      ? JSON.parse(secondaryAccount.hierarchyValues)
      : [];

    // 创建合并后的层级值映射表
    const mergedValuesMap = new Map<number, any>();

    // 首先添加次级账户的所有层级值（作为基础）
    secondaryValues.forEach((v: any) => {
      mergedValuesMap.set(v.level, v);
    });

    // 然后用优先级账户的层级值覆盖（只覆盖有值的层级）
    // 这样确保：优先级高的层级值优先
    priorityValues.forEach((v: any) => {
      if (v.selectedValue) {
        mergedValuesMap.set(v.level, v);
      }
    });

    // 转换回数组并排序
    const mergedValues = Array.from(mergedValuesMap.values())
      .sort((a, b) => a.level - b.level);

    // 计算合并后的层级数（取最大的层级）
    const maxLevel = Math.max(
      priorityValues.length > 0 ? priorityValues[priorityValues.length - 1].level : 0,
      secondaryValues.length > 0 ? secondaryValues[secondaryValues.length - 1].level : 0
    );

    // 返回合并后的账户信息
    return {
      id: priorityAccount.id, // 使用优先级账户的ID
      namePath: this.buildNamePath(mergedValues),
      path: this.buildPath(mergedValues),
      level: maxLevel,
      hierarchyValues: JSON.stringify(mergedValues),
    };
  }

  /**
   * 根据层级值构建namePath（只使用名称，不使用code）
   * 如果某个层级没有名称，则使用"-"占位，保持层级数量一致
   */
  private buildNamePath(hierarchyValues: any[]): string {
    return hierarchyValues
      .map(v => {
        // 如果selectedValue不存在，返回"-"
        if (!v.selectedValue) {
          return '-';
        }

        // 优先使用显式存储的标签
        if (v.selectedValueLabel) {
          return v.selectedValueLabel;
        }

        // 如果selectedValue是对象，提取name属性（不使用code或value）
        if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
          // 只使用name字段，如果没有name则返回"-"
          if (v.selectedValue.name) {
            return v.selectedValue.name;
          }
          return '-';
        }

        // 如果selectedValue是字符串或其他类型，直接转换
        return String(v.selectedValue);
      })
      .join('/');
  }

  /**
   * 根据层级值构建path（只使用code，确保所有层级都是Code）
   * 如果某个层级没有code，则使用"-"占位，保持层级数量一致
   */
  private buildPath(hierarchyValues: any[]): string {
    return hierarchyValues
      .map(v => {
        // 如��selectedValue不存在，返回"-"
        if (!v.selectedValue) {
          return '-';
        }

        // 如果selectedValue是对象
        if (typeof v.selectedValue === 'object' && v.selectedValue !== null) {
          // 只使用code字段，如果没有code则返回"-"
          if (v.selectedValue.code) {
            return v.selectedValue.code;
          }
          return '-';
        }

        // 如果selectedValue是字符串或其他类型
        return String(v.selectedValue);
      })
      .join('/');
  }

  /**
   * 匹配出勤代码
   * 根据打卡收卡结果、工作时长、排班信息等匹配最合适的出勤代码
   */
  private async matchAttendanceCode(punchPair: any, workHours: number, calcDate: Date): Promise<any | null> {
    // 1. 获取员工在指定日期的考勤规则组
    if (!punchPair.employee?.id) {
      this.logger.warn(
        `打卡收卡记录 ${punchPair.id} 缺少员工信息，无法匹配出勤代码`
      );
      return null;
    }

    const ruleGroup = await this.attendanceRuleGroupHelper.getActiveRuleGroupForDate(
      punchPair.employeeNo,
      calcDate,
    );

    // 如果没有配置考勤规则组，使用默认出勤代码（支持未排班场景）
    if (!ruleGroup) {
      this.logger.debug(
        `员工 ${punchPair.employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 未配置考勤规则组，使用默认出勤代码`
      );

      // 查找默认的出勤工时代码（类型为ATTENDANCE_HOURS，状态为ACTIVE）
      const defaultCode = await this.prisma.calculationAttendanceCode.findFirst({
        where: {
          type: 'ATTENDANCE_HOURS',
          status: 'ACTIVE',
          calculateHours: true,
        },
        orderBy: {
          priority: 'asc',
        },
      });

      if (defaultCode) {
        this.logger.debug(`使用默认出勤代码: ${defaultCode.code} - ${defaultCode.name}`);
        return defaultCode;
      }

      this.logger.warn(`未找到可用的默认出勤代码`);
      return null;
    }

    // 解析考勤规则组中的出勤代码ID
    const attendanceCodeIds = this.attendanceRuleGroupHelper.parseAttendanceCodeIds(ruleGroup);

    if (attendanceCodeIds.length === 0) {
      this.logger.debug(
        `员工 ${punchPair.employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤规则组 ${ruleGroup.name} 未配置出勤代码，跳过考勤工时计算`
      );
      return null;
    }

    this.logger.debug(
      `员工 ${punchPair.employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 使用考勤规则组: ${ruleGroup.name}，包含 ${attendanceCodeIds.length} 个出勤代码`
    );

    // 2. 获取考勤规则组中配置的考勤工时类型出勤代码（类型为 ATTENDANCE_HOURS）
    // 注意：考勤规则组配置的是 CalculationAttendanceCode 的ID
    const attendanceCodes = await this.prisma.calculationAttendanceCode.findMany({
      where: {
        id: { in: attendanceCodeIds },
        type: 'ATTENDANCE_HOURS',
        status: 'ACTIVE',
        calculateHours: true,
      },
      orderBy: [
        { priority: 'asc' },
        { id: 'asc' },
      ],
    });

    if (!attendanceCodes || attendanceCodes.length === 0) {
      this.logger.warn(
        `员工 ${punchPair.employeeNo} 在 ${format(calcDate, 'yyyy-MM-dd')} 的考勤规则组中未找到有效的考勤工时类型出勤代码（类型为 ATTENDANCE_HOURS）`
      );
      return null;
    }

    // 2. 根据规则类型匹配出勤代码
    // 这里需要实现匹配逻辑，可以基于：
    // - 排班类型（有排班/未排班）
    // - 工作时长
    // - 打卡时间段
    // - 其他业务规则

    // 简化版：优先返回第一个出勤代码（正常出勤）
    // 实际业务中需要根据复杂的规则引擎来匹配

    // TODO: 实现完整的匹配规则引擎
    // 1. 如果有排班，根据班次名称、时间段匹配
    // 2. 如果工作时长异常（如过长或过短），匹配到异常出勤代码
    // 3. 如果缺卡，匹配到缺勤出勤代码

    // 检测异常情��
    const hasMissingPunch = !punchPair.workStartPunchTime || !punchPair.workEndPunchTime;
    const hasShift = !!(punchPair.workStartShiftId || punchPair.workEndShiftId);

    // 3.1 缺卡匹配
    if (hasMissingPunch) {
      const absenceCode = attendanceCodes.find(code =>
        code.code.toUpperCase().includes('A04') ||
        code.code.toUpperCase().includes('A004') ||
        code.name.includes('缺勤') ||
        code.name.includes('缺卡')
      );
      if (absenceCode) {
        this.logger.debug(`匹配到缺勤出勤代码: ${absenceCode.code} - ${absenceCode.name}`);
        return absenceCode;
      }
    }

    // 3.2 根据工作时长匹配
    if (workHours < 2 && workHours > 0) {
      const shortHourCode = attendanceCodes.find(code =>
        code.code.toUpperCase().includes('A05') ||
        code.code.toUpperCase().includes('A005') ||
        code.name.includes('短时') ||
        code.name.includes('异常')
      );
      if (shortHourCode) {
        this.logger.debug(`匹配到短时出勤代码: ${shortHourCode.code} - ${shortHourCode.name}`);
        return shortHourCode;
      }
    }

    // 3.3 如果有排班，根据班次名称匹配
    if (hasShift) {
      const shiftName = (punchPair.workStartShiftName || punchPair.workEndShiftName || '').toLowerCase();

      if (shiftName.includes('加班') || shiftName.includes('ot')) {
        const overtimeCode = attendanceCodes.find(code =>
          code.code.toUpperCase().includes('A02') ||
          code.code.toUpperCase().includes('A002') ||
          code.name.includes('加班')
        );
        if (overtimeCode) {
          this.logger.debug(`匹配到加班出勤代码: ${overtimeCode.code} - ${overtimeCode.name}`);
          return overtimeCode;
        }
      }

      if (shiftName.includes('正常') || shiftName.includes('常班')) {
        const normalCode = attendanceCodes.find(code =>
          code.code.toUpperCase().includes('A01') ||
          code.code.toUpperCase().includes('A001') ||
          code.name.includes('正常')
        );
        if (normalCode) {
          this.logger.debug(`匹配到正常出勤代码: ${normalCode.code} - ${normalCode.name}`);
          return normalCode;
        }
      }
    }

    // 3.5 默认匹配：返回优先级最高的出勤代码
    const defaultCode = attendanceCodes[0];
    this.logger.debug(`使用默认出勤代码: ${defaultCode.code} - ${defaultCode.name}`);
    return defaultCode;
  }

  /**
   * 保存或更新工时结果到 CalcResult 表
   */
  /**
   * 保存或更新工时结果到 CalcResult 表
   */
  private async saveWorkHourResults(workHourResults: any[], batchId?: string) {
    // ✅ 工时结果已经在 calculateDaily 中进行了相邻合并（相同账户且时间相邻）
    // 保存时直接使用合并后的结果
    const savedResults = [];

    console.log(`准备保存 ${workHourResults.length} 条工时结果`);

    // 遍历每个工时结果，独立保存
    for (const result of workHourResults) {
      try {
        // ✅ 计算金额（如果出勤代码启用了金额计算）
        let amount = 0;
        if (result.calculationAttendanceCodeId) {
          // 获取计算出勤代码信息
          const attendanceCode = await this.prisma.calculationAttendanceCode.findUnique({
            where: { id: result.calculationAttendanceCodeId },
            select: { code: true, calculateAmount: true, type: true },
          });

          if (attendanceCode && attendanceCode.calculateAmount && attendanceCode.type === 'ATTENDANCE_HOURS') {
            // 对于考勤工时，计算金额
            // 支持多账户计算
            if (result.accountId && result.accountName) {
              amount = await this.amountCalculateService.calculateAmountByNo({
                employeeNo: result.employeeNo,
                workHours: result.workHours,
                attendanceCode: attendanceCode.code,
                accountPath: result.accountName,
                calcDate: result.calcDate,
              });
            } else {
              // 没有账户信息，不计算金额
              amount = 0;
            }
          }
        }

        // 构建 CalcResult 数据对象
        const calcResultData = {
          employeeNo: result.employeeNo,
          calcDate: result.calcDate,
          shiftId: result.shiftId,
          shiftName: result.shiftName,
          calculationAttendanceCodeId: result.calculationAttendanceCodeId,
          punchInTime: result.startTime,
          punchOutTime: result.endTime,
          standardHours: result.workHours,
          actualHours: result.workHours,
          overtimeHours: 0,
          leaveHours: 0,
          absenceHours: 0,
          amount: Math.round(amount * 100) / 100, // ✅ 添加金额字段
          accountHours: '[]',
          exceptions: JSON.stringify({
            source: result.source,
            sourceType: result.sourceType,
            sourceId: result.sourceId,
            sourceBatchId: batchId,
            remark: result.remark,
          }),
          status: result.status === 'DRAFT' ? 'PENDING' : result.status,
          accountId: result.accountId || null,
          accountName: result.accountName || null,
          accountPath: result.accountPath || null, // ✅ 新增：账户路径
        };

        // ✅ 直接创建新记录（已在 calculateDaily 中删除旧数据）
        const created = await this.prisma.calcResult.create({
          data: calcResultData,
        });
        savedResults.push(created);
        this.logger.debug(`创建 CalcResult 记录 ID: ${created.id}, 账户: ${result.accountId}, 时间: ${result.startTime?.toISOString().slice(11, 19)}-${result.endTime?.toISOString().slice(11, 19)}`);
      } catch (error: any) {
        this.logger.error(`保存工时结果到 CalcResult 失败: ${error.message}`, error.stack);
        throw error;
      }
    }

    this.logger.log(`成功保存 ${savedResults.length} 条工时结果到 CalcResult 表`);

    return savedResults;
  }
  /**
   * 合并同一劳动力账户的多个工时结果
   * @param results 需要合并的结果列表（必须属于同一员工、同一日期、同一账户）
   * @returns 合并后的单个结果
   */
  private mergeWorkHourResults(results: any[]): any {
    if (results.length === 0) {
      throw new Error('无法合并空的结果列表');
    }

    if (results.length === 1) {
      return results[0];
    }

    // 找出最早开始时间和最晚结束时间
    let startTime = results[0].startTime;
    let endTime = results[0].endTime;
    let totalWorkHours = 0;

    for (const result of results) {
      if (result.startTime < startTime) {
        startTime = result.startTime;
      }
      if (result.endTime > endTime) {
        endTime = result.endTime;
      }
      totalWorkHours += result.workHours;
    }

    // 合并备注信息
    const remarks = results.map(r => r.remark).filter(r => r);
    const mergedRemark = remarks.length > 0 ? remarks.join('; ') : '';

    // 返回合并后的结果（使用第一个结果的基本信息）
    return {
      ...results[0],
      startTime: startTime,
      endTime: endTime,
      workHours: Math.round(totalWorkHours * 100) / 100, // 保留两位小数
      remark: mergedRemark,
    };
  }

  /**
   * 删除指定批次的工时结果（用于增量更新前清理旧数据）
   * @param batchId 批次ID
   */
  async deleteBatchResults(batchId: string) {
    this.logger.log(`删除批次 ${batchId} 的工时结果`);

    // 由于 CalcResult 表的 exceptions 字段存储了批次ID信息
    // 需要查询所有记录，解析 exceptions 字段，然后删除匹配的记录
    const allResults = await this.prisma.calcResult.findMany({
      where: {
        calculationAttendanceCode: {
          type: 'ATTENDANCE_HOURS',
        },
      },
    });

    const toDelete: number[] = [];
    for (const result of allResults) {
      try {
        const exceptions = JSON.parse(result.exceptions);
        if (exceptions.sourceBatchId === batchId) {
          toDelete.push(result.id);
        }
      } catch (e) {
        // 忽略解析错误
      }
    }

    if (toDelete.length > 0) {
      const deleteResult = await this.prisma.calcResult.deleteMany({
        where: {
          id: { in: toDelete },
        },
      });

      this.logger.log(`已删除 ${deleteResult.count} 条工时结果`);

      return {
        success: true,
        deletedCount: deleteResult.count,
      };
    }

    this.logger.log(`未找到批次 ${batchId} 的工时结果`);

    return {
      success: true,
      deletedCount: 0,
    };
  }

  /**
   * 同步 CalcResult 数据到 WorkHourResult 表
   * 用于工时模块获取考勤工时数据
   * @param employeeNos 员工编号列表（可选，不指定则同步所有员工）
   * @param startDate 开始日期（可选）
   * @param endDate 结束日期（可选）
   */
  async syncToWorkHourResult(employeeNos?: string[], startDate?: Date, endDate?: Date) {
    this.logger.log('开始同步 CalcResult 数据到 WorkHourResult 表');

    // 构建查询条件
    const where: any = {
      calculationAttendanceCode: {
        type: 'ATTENDANCE_HOURS',
      },
    };

    if (employeeNos && employeeNos.length > 0) {
      where.employeeNo = { in: employeeNos };
    }

    if (startDate || endDate) {
      where.calcDate = {};
      if (startDate) {
        where.calcDate.gte = startDate;
      }
      if (endDate) {
        where.calcDate.lte = endDate;
      }
    }

    // 查询需要同步的 CalcResult 记录
    const calcResults = await this.prisma.calcResult.findMany({
      where,
      include: {
        calculationAttendanceCode: true,
        employee: true,
      },
    });

    this.logger.log(`查询到 ${calcResults.length} 条 CalcResult 记录需要同步`);

    let syncedCount = 0;
    let skippedCount = 0;
    const errors: any[] = [];

    for (const calcResult of calcResults) {
      try {
        // 解析 exceptions 字段获取来源信息
        let sourceInfo: any = {};
        try {
          sourceInfo = JSON.parse(calcResult.exceptions);
        } catch (e) {
          // 忽略解析错误，使用默认值
        }

        // 查询员工信息以获取正确的 employeeId
        let employeeId: number | undefined = undefined;
        if (calcResult.employeeNo) {
          const employee = await this.prisma.employee.findUnique({
            where: { employeeNo: calcResult.employeeNo },
            select: { id: true },
          });
          employeeId = employee?.id;
        }

        // 查找对应的 DefinitionAttendanceCode ID
        let definitionAttendanceCodeId: number | undefined = undefined;
        if (calcResult.calculationAttendanceCode?.code) {
          const defCode = await this.prisma.definitionAttendanceCode.findFirst({
            where: {
              code: calcResult.calculationAttendanceCode.code,
              type: 'ATTENDANCE_HOURS',
            },
            select: { id: true },
          });
          definitionAttendanceCodeId = defCode?.id;
        }

        // 构建 WorkHourResult 数据对象
        const workHourResultData: any = {
          employeeNo: calcResult.employeeNo,
          calcDate: calcResult.calcDate,
          shiftId: calcResult.shiftId,
          shiftName: calcResult.shiftName,
          startTime: calcResult.punchInTime,
          endTime: calcResult.punchOutTime,
          calcAttendanceCode: calcResult.calculationAttendanceCode?.code || 'AC_001',
          workHours: calcResult.actualHours,
          source: sourceInfo.source || 1,
          sourceType: sourceInfo.sourceType || 'CALCULATED',
          sourceId: sourceInfo.sourceId,
          sourceBatchId: sourceInfo.sourceBatchId,
          accountId: calcResult.accountId,
          accountName: calcResult.accountName,
          accountPath: calcResult.accountPath, // ✅ 新增：账户路径
          status: calcResult.status === 'PENDING' ? 'DRAFT' : calcResult.status,
          remark: sourceInfo.remark || `从 CalcResult 同步，ID: ${calcResult.id}`,
        };

        // 只有当员工存在时才设置 employeeId
        if (employeeId) {
          workHourResultData.employeeId = employeeId;
        }

        // 只有当找到对应的 DefinitionAttendanceCode 时才设置 ID
        if (definitionAttendanceCodeId) {
          workHourResultData.definitionAttendanceCodeId = definitionAttendanceCodeId;
          workHourResultData.definitionAttendanceCodeStr = calcResult.calculationAttendanceCode?.code;
        }

        // 只有当员工存在时才设置 employeeId
        if (employeeId) {
          workHourResultData.employeeId = employeeId;
        }

        // 检查是否已存在相同来源的记录
        const existing = await this.prisma.workHourResult.findFirst({
          where: {
            employeeNo: workHourResultData.employeeNo,
            calcDate: workHourResultData.calcDate,
            source: workHourResultData.source,
            sourceId: workHourResultData.sourceId,
          },
        });

        if (existing) {
          // 更新现有记录
          await this.prisma.workHourResult.update({
            where: { id: existing.id },
            data: {
              ...workHourResultData,
              id: undefined,
              createdAt: undefined,
              updatedAt: new Date(),
            },
          });
          this.logger.debug(`更新 WorkHourResult 记录，CalcResult ID: ${calcResult.id}`);
        } else {
          // 创建新记录
          await this.prisma.workHourResult.create({
            data: workHourResultData,
          });
          this.logger.debug(`创建 WorkHourResult 记录，CalcResult ID: ${calcResult.id}`);
        }

        syncedCount++;
      } catch (error: any) {
        this.logger.error(`同步 CalcResult ID ${calcResult.id} 失败: ${error.message}`, error.stack);
        errors.push({
          calcResultId: calcResult.id,
          employeeNo: calcResult.employeeNo,
          error: error.message,
        });
        skippedCount++;
      }
    }

    this.logger.log(`同步完成: 成功 ${syncedCount} 条，跳过 ${skippedCount} 条`);

    return {
      success: true,
      syncedCount,
      skippedCount,
      errors,
      message: `同步完成: 成功 ${syncedCount} 条` + (skippedCount > 0 ? `，跳过 ${skippedCount} 条` : ''),
    };
  }

  /**
   * 查询考勤工时结果（从 CalcResult 表获取）
   * 与精益工时结果页签保持相同的列结构
   */
  async getWorkHourResults(query: any, user: any) {
    const {
      employeeNo,
      startDate,
      endDate,
      calcAttendanceCode,
      status,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};

    // ✅ 修改查询方式：使用子查询获取 ATTENDANCE_HOURS 类型的出勤代码ID
    const attendanceHourCodes = await this.prisma.calculationAttendanceCode.findMany({
      where: { type: 'ATTENDANCE_HOURS' },
      select: { id: true },
    });

    const attendanceHourCodeIds = attendanceHourCodes.map(c => c.id);
    console.log('🔍 考勤工时出勤代码IDs:', attendanceHourCodeIds);

    where.calculationAttendanceCodeId = {
      in: attendanceHourCodeIds,
    };

    if (employeeNo) {
      where.employeeNo = employeeNo;
    }

    // 支持单日期或日期范围查询（与精益工时结果保持一致）
    const calcDate = query.calcDate;
    if (calcDate) {
      where.calcDate = new Date(calcDate);
    } else if (startDate || endDate) {
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (!where.calcDate) where.calcDate = {};
        where.calcDate.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (!where.calcDate) where.calcDate = {};
        where.calcDate.lte = end;
      }
    }

    if (status) {
      // 转换状态：DRAFT -> PENDING
      const mappedStatus = status === 'DRAFT' ? 'PENDING' : status;
      where.status = mappedStatus;
    }

    // 如果指定了出勤代码，需要在 calculationAttendanceCode 中过滤
    if (calcAttendanceCode) {
      where.calculationAttendanceCode = {
        type: 'ATTENDANCE_HOURS',
        code: calcAttendanceCode,
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.calcResult.count({ where }),
      this.prisma.calcResult.findMany({
        where,
        include: {
          employee: {
            include: {
              org: true, // 与精益工时结果保持一致，包含组织信息
            },
          },
          calculationAttendanceCode: {
            select: {
              id: true,
              code: true,
              name: true,
              type: true,
            },
          },
        },
        orderBy: {
          calcDate: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: +pageSize,
      }),
    ]);

    // 转换结果格式以与精益工时结果保持一致
    const transformedItems = items.map((item: any) => {
      // 解析 exceptions 字段获取来源信息（用于内部使用，不返回给前端）
      let sourceInfo: any = {};
      try {
        sourceInfo = JSON.parse(item.exceptions);
      } catch (e) {
        // 忽略解析错误
      }

      // 直接返回 CalcResult 的字段，与精益工时结果页签保持一致
      return {
        id: item.id,
        employeeNo: item.employeeNo,
        calcDate: item.calcDate,
        shiftId: item.shiftId,
        shiftName: item.shiftName,
        calculationAttendanceCodeId: item.calculationAttendanceCodeId,
        calculationAttendanceCode: item.calculationAttendanceCode, // 保持与精益工时一致的关系字段
        punchInTime: item.punchInTime,
        punchOutTime: item.punchOutTime,
        standardHours: item.standardHours,
        actualHours: item.actualHours,
        overtimeHours: item.overtimeHours,
        leaveHours: item.leaveHours,
        absenceHours: item.absenceHours,
        accountHours: item.accountHours,
        amount: item.amount, // ✅ 添加金额字段
        exceptions: item.exceptions,
        status: item.status,
        accountId: item.accountId,
        accountName: item.accountName,
        accountPath: item.accountPath, // ✅ 添加账户路径字段
        employee: item.employee, // 包含组织信息
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      };
    });

    return {
      items: transformedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }
}
