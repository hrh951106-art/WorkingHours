import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  startOfDay,
  endOfDay,
  differenceInMinutes,
  addMinutes,
  isBefore,
  isAfter,
  isEqual,
} from 'date-fns';
import { AttendanceRuleGroupHelper } from '../attendance-rule-group/attendance-rule-group-helper.service';
import { AccountMergeService } from './account-merge.service';

interface AttendancePunchResult {
  employeeNo: string;
  punchDate: Date;
  ruleId: number;
  ruleType: string;
  ruleName: string;
  workStartPunches: Array<{
    id: number;
    punchTime: Date;
    shiftId?: number;
    shiftName?: string;
  }>;
  workEndPunches: Array<{
    id: number;
    punchTime: Date;
    shiftId?: number;
    shiftName?: string;
  }>;
  isContinuousShift: boolean;
  accountId?: number;
}

@Injectable()
export class AttendancePunchService {
  private readonly logger = new Logger(AttendancePunchService.name);

  constructor(
    private prisma: PrismaService,
    private attendanceRuleGroupHelper: AttendanceRuleGroupHelper,
    private accountMergeService: AccountMergeService,
  ) {}

  /**
   * 执行考勤打卡收卡
   * @param employeeNos 员工编号列表
   * @param punchDate 收卡日期
   */
  async collectAttendancePunch(employeeNos: string[], punchDate: Date) {
    const results = [];

    for (const employeeNo of employeeNos) {
      const result = await this.collectEmployeeAttendancePunch(employeeNo, punchDate);
      if (result) {
        results.push(result);
      }
    }

    return results;
  }

  /**
   * 批量考勤打卡收卡（日期范围）
   * @param employeeNos 员工编号列表
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  async collectAttendancePunchBatch(employeeNos: string[], startDate: Date, endDate: Date) {
    const results = {
      successCount: 0,
      failCount: 0,
      results: [] as any[],
      errors: [] as any[],
    };

    // 生成日期范围内的所有日期
    const dates: Date[] = [];
    const currentDate = startDate;
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // 为每个员工、每一天执行收卡
    for (const employeeNo of employeeNos) {
      for (const date of dates) {
        try {
          const result = await this.collectEmployeeAttendancePunch(employeeNo, date);
          if (result) {
            results.successCount++;
            results.results.push({
              employeeNo,
              date: date.toISOString().split('T')[0],
              result,
            });
          } else {
            results.failCount++;
            results.errors.push({
              employeeNo,
              date: date.toISOString().split('T')[0],
              message: '未生成收卡结果',
            });
          }
        } catch (error) {
          results.failCount++;
          results.errors.push({
            employeeNo,
            date: date.toISOString().split('T')[0],
            message: error.message,
          });
        }
      }
    }

    return results;
  }

  /**
   * 收集单个员工的考勤打卡
   */
  async collectEmployeeAttendancePunch(employeeNo: string, punchDate: Date) {
    // 1. 获取员工信息和考勤卡号
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      include: {
        laborAccounts: {
          where: {
            status: 'ACTIVE',
            OR: [{ expiryDate: null }, { expiryDate: { gte: punchDate } }],
          },
          orderBy: {
            isPrimary: 'desc',
          },
        },
      },
    });

    if (!employee || !employee.laborAccounts || employee.laborAccounts.length === 0) {
      console.log(`员工 ${employeeNo} 没有考勤卡号，跳过收卡`);
      return null;
    }

    // 使用第一个考勤卡号
    const accountId = employee.laborAccounts[0].accountId;

    // 2. 获取打卡规则
    const rule = await this.getMatchingPunchRule(employeeNo, punchDate);
    if (!rule) {
      console.log(`员工 ${employeeNo} 在 ${punchDate} 没有匹配的打卡规则`);
      return null;
    }

    // 3. 获取员工当天的所有打卡记录（并进行账户合并）
    const dayStart = startOfDay(punchDate);
    const dayEnd = endOfDay(punchDate);

    const punchRecords = await this.getPunchRecordsForEmployee(employeeNo, dayStart, dayEnd);

    // 4. 获取员工当天的排班信息
    let schedules = await this.getSchedulesForEmployee(employeeNo, dayStart, dayEnd);

    // 5. 检查所有段（包括REST）是否连续
    // ✅ 统一的连续性判断逻辑：后一段的开始和前一段的结束的间隔是否超出1分钟
    const allSegmentsContinuous = this.checkAllSegmentsContinuous(schedules);

    // 6. 根据连续性决定是否拆分
    if (!allSegmentsContinuous) {
      // 不连续：需要拆分为多个虚拟班次
      schedules = this.expandMultiSegmentShifts(schedules);
    }
    // 如果连续，不拆分，保持原始班次（包含所有段）

    // 7. 根据是否有排班进行收卡
    if (schedules && schedules.length > 0) {
      // ✅ 有排班：为每个班次分别收卡并保存
      const scheduledConfig = JSON.parse(rule.scheduledConfig);

      // 先删除所有旧的收卡结果（只删除一次）
      await this.prisma.attendancePunchPair.deleteMany({
        where: {
          employeeNo: employeeNo,
          punchDate: punchDate,
        },
      });

      if (allSegmentsContinuous && schedules.length > 0) {
        // 连续班次：只收首尾两笔卡，保存1条记录
        const result = await this.collectContinuousShiftsPunch(
          employeeNo,
          punchDate,
          rule,
          schedules,
          punchRecords,
          scheduledConfig,
          accountId,
        );
        // ✅ 只有当有打卡数据时才保存记录
        if (result.workStartPunches.length > 0 || result.workEndPunches.length > 0) {
          await this.saveAttendancePunchResultWithoutDelete(result);
        }
        return result;
      } else {
        // ✅ 不连续班次：使用全局配对逻辑，收集所有班次的所有打卡进行智能配对
        const result = await this.collectDiscreteShiftsPunch(
          employeeNo,
          punchDate,
          rule,
          schedules,
          punchRecords,
          scheduledConfig,
          accountId,
        );

        // ✅ 将每个配对保存为独立的记录
        if (result.workStartPunches.length > 0 || result.workEndPunches.length > 0) {
          // 遍历每个配对，保存为独立记录
          for (let i = 0; i < result.workStartPunches.length; i++) {
            const pairResult = {
              employeeNo: result.employeeNo,
              punchDate: result.punchDate,
              ruleId: result.ruleId,
              ruleType: result.ruleType,
              ruleName: result.ruleName,
              isContinuousShift: result.isContinuousShift,
              accountId: result.accountId,
              // 每对配对的单独打卡
              workStartPunches: [result.workStartPunches[i]],
              workEndPunches: [result.workEndPunches[i]],
            };
            await this.saveAttendancePunchResultWithoutDelete(pairResult);
          }
        }

        return result;
      }
    } else {
      // 未排班：按未排班逻辑收卡
      const result = await this.collectUnscheduledPunch(
        employeeNo,
        punchDate,
        rule,
        punchRecords,
        accountId,
      );
      // ✅ 只有当有打卡数据时才保存记录
      if (result.workStartPunches.length > 0 || result.workEndPunches.length > 0) {
        await this.saveAttendancePunchResult(result);
      }
      return result;
    }
  }

  /**
   * 获取匹配的打卡规则
   * 考勤打卡收卡使用考勤打卡规则（ATTENDANCE_PAIRING类型）
   */
  private async getMatchingPunchRule(employeeNo: string, punchDate: Date) {
    // 从考勤规则组获取考勤打卡规则
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { id: true },
    });

    if (!employee) {
      console.log(`员工 ${employeeNo} 不存在，跳过考勤打卡收卡`);
      return null;
    }

    const ruleGroup = await this.attendanceRuleGroupHelper.getActiveRuleGroupForDate(
      employeeNo,
      punchDate,
    );

    if (!ruleGroup) {
      console.log(
        `员工 ${employeeNo} 在 ${punchDate.toISOString()} 未配置考勤规则组，跳过考勤打卡收卡`,
      );
      return null;
    }

    // ✅ 获取规则组中配置的考勤打卡规则ID（不是精益打卡规则）
    const attendancePunchRuleId =
      this.attendanceRuleGroupHelper.getAttendancePunchRuleId(ruleGroup);

    if (!attendancePunchRuleId) {
      console.log(
        `员工 ${employeeNo} 在 ${punchDate.toISOString()} 的考勤规则组 ${ruleGroup.name} 未配置考勤打卡规则，跳过考勤打卡收卡`,
      );
      return null;
    }

    console.log(
      `员工 ${employeeNo} 在 ${punchDate.toISOString()} 使用考勤规则组的考勤打卡规则: ${ruleGroup.name} (规则ID: ${attendancePunchRuleId})`,
    );

    // 获取考勤打卡规则
    const attendanceRule = await this.prisma.punchRule.findUnique({
      where: { id: attendancePunchRuleId, status: 'ACTIVE' },
    });

    if (!attendanceRule) {
      console.warn(`考勤规则组配置的考勤打卡规则 ${attendancePunchRuleId} 不存在或已停用`);
      return null;
    }

    return attendanceRule;
  }

  /**
   * 获取员工的打卡记录，并进行账户合并
   */
  private async getPunchRecordsForEmployee(employeeNo: string, startTime: Date, endTime: Date) {
    const punchRecords = await this.prisma.punchRecord.findMany({
      where: {
        employeeNo,
        punchTime: {
          gte: startTime,
          lte: endTime,
        },
      },
      orderBy: {
        punchTime: 'asc',
      },
    });

    // 对每条打卡记录进行账户合并（打卡账户 + 设备账户）
    const mergedRecords = [];
    for (const record of punchRecords) {
      // 获取打卡记录的账户路径
      let punchAccountPath = null;
      if (record.accountId) {
        const account = await this.prisma.laborAccount.findUnique({
          where: { id: record.accountId },
          select: { namePath: true },
        });
        punchAccountPath = account?.namePath || null;
      }

      // 合并账户（打卡账户优先级 > 设备账户）
      const mergedPath = await this.accountMergeService.mergeAccounts(
        punchAccountPath,
        record.deviceId,
        record.punchTime,
      );

      // 查找或创建合并后的账户
      let mergedAccountId = null;
      if (mergedPath && mergedPath.trim() !== '') {
        const mergedAccount = await this.findOrCreateAccountByPath(mergedPath);
        mergedAccountId = mergedAccount.id;
      }

      this.logger.debug(
        `打卡记录 ID=${record.id}, 时间=${record.punchTime.toISOString()}, ` +
          `打卡账户=${punchAccountPath}, 设备ID=${record.deviceId}, ` +
          `合并后账户=${mergedPath}, 合并后账户ID=${mergedAccountId}`,
      );

      mergedRecords.push({
        ...record,
        mergedAccountId,
        mergedAccountPath: mergedPath,
      });
    }

    return mergedRecords;
  }

  /**
   * 根据路径查找或创建账户
   */
  private async findOrCreateAccountByPath(path: string): Promise<any> {
    // 先尝试查找已存在的账户
    const existing = await this.prisma.laborAccount.findFirst({
      where: {
        accountPath: path,
      },
    });

    if (existing) {
      this.logger.debug(`找到已存在的账户: path=${path}, id=${existing.id}`);
      return existing;
    }

    // 如果不存在，创建新账户
    this.logger.debug(`创建新账户: path=${path}`);
    const pathParts = path.split('/').filter(Boolean);

    return this.prisma.laborAccount.create({
      data: {
        code: `AUTO_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        name: pathParts[pathParts.length - 1] || 'Auto',
        type: 'SUB',
        usageType: 'PUNCH',
        level: pathParts.length,
        path: path,
        accountPath: path,
        namePath: path,
        status: 'ACTIVE',
      },
    });
  }

  /**
   * 获取员工的排班信息
   */
  private async getSchedulesForEmployee(employeeNo: string, startTime: Date, endTime: Date) {
    // 首先获取员工ID
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { id: true },
    });

    if (!employee) {
      return [];
    }

    const schedules = await this.prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        status: 'ACTIVE',
        scheduleDate: {
          gte: startTime,
          lte: endTime,
        },
      },
      include: {
        shift: {
          include: {
            segments: true,
          },
        },
      },
      orderBy: {
        scheduleDate: 'asc',
      },
    });

    // 为每个排班计算实际的开始和结束时间
    return schedules.map((schedule) => {
      let workStartTime: Date;
      let workEndTime: Date;

      // 优先使用调整后的时间
      if (schedule.adjustedStart && schedule.adjustedEnd) {
        workStartTime = schedule.adjustedStart;
        workEndTime = schedule.adjustedEnd;
      } else {
        // 否则从班次段中计算（使用NORMAL类型的段）
        const workSegments = schedule.shift.segments.filter((seg) => seg.type === 'NORMAL');
        if (workSegments.length > 0) {
          const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
          workStartTime = new Date(`${dateStr}T${workSegments[0].startTime}`);
          const lastSegment = workSegments[workSegments.length - 1];
          workEndTime = new Date(`${dateStr}T${lastSegment.endTime}`);
        } else {
          // 如果没有工作段，使用���班日期的起止时间
          workStartTime = new Date(schedule.scheduleDate);
          workEndTime = new Date(schedule.scheduleDate);
        }
      }

      return {
        ...schedule,
        workStartTime,
        workEndTime,
      };
    });
  }

  /**
   * 将多段班次拆分为多个虚拟班次（每段一个）
   * 这样每个班次段都会生成一条独立的考勤摆卡记录
   */
  private expandMultiSegmentShifts(schedules: any[]): any[] {
    const expanded: any[] = [];

    for (const schedule of schedules) {
      if (!schedule.shift || !schedule.shift.segments || schedule.shift.segments.length <= 1) {
        // 单段班次或没有段，直接添加
        expanded.push(schedule);
        continue;
      }

      // 多段班次：为每个NORMAL类型的段创建一个虚拟班次
      const normalSegments = schedule.shift.segments.filter((seg: any) => seg.type === 'NORMAL');

      if (normalSegments.length <= 1) {
        // 只有一个NORMAL段，直接使用原班次
        expanded.push(schedule);
        continue;
      }

      // 为每个段创建一个虚拟班次
      for (const segment of normalSegments) {
        const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
        const segmentStart = new Date(`${dateStr}T${segment.startTime}`);
        const segmentEnd = new Date(`${dateStr}T${segment.endTime}`);

        expanded.push({
          ...schedule,
          workStartTime: segmentStart,
          workEndTime: segmentEnd,
          segment: segment, // 保存段信息
        });
      }
    }

    return expanded;
  }

  /**
   * 检查所有段（包括REST）是否连续
   *
   * 规则：相邻段之间的间隔不超过1分钟，认为连续
   * - 例如：段1 08:00~12:00，段2 12:00~13:30(REST)，段3 13:30~17:30
   * - 段1结束12:00 = 段2开始12:00 → 间隔0分钟 ✓ 连续
   * - 段2结束13:30 = 段3开始13:30 → 间隔0分钟 ✓ 连续
   * - 结论：所有段连续，当作1个班处理，只收首尾两笔卡
   */
  private checkAllSegmentsContinuous(schedules: any[]): boolean {
    if (schedules.length === 0) return false;

    for (const schedule of schedules) {
      if (!schedule.shift || !schedule.shift.segments || schedule.shift.segments.length <= 1) {
        // 单段或没有段，跳过
        continue;
      }

      const segments = schedule.shift.segments;
      for (let i = 0; i < segments.length - 1; i++) {
        const currentEnd = segments[i].endTime;
        const nextStart = segments[i + 1].startTime;

        // 计算间隔（分钟）
        const [currentEndHour, currentEndMinute] = currentEnd.split(':').map(Number);
        const [nextStartHour, nextStartMinute] = nextStart.split(':').map(Number);
        const currentEndTotalMinutes = currentEndHour * 60 + currentEndMinute;
        const nextStartTotalMinutes = nextStartHour * 60 + nextStartMinute;
        const gap = nextStartTotalMinutes - currentEndTotalMinutes;

        // 如果间隔超过1分钟，认为不连续
        if (gap > 1 || gap < -1) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 连续班次收卡：只收首尾两笔
   */
  private async collectContinuousShiftsPunch(
    employeeNo: string,
    punchDate: Date,
    rule: any,
    schedules: any[],
    punchRecords: any[],
    config: any,
    accountId: number,
  ): Promise<AttendancePunchResult> {
    const firstShift = schedules[0];
    const lastShift = schedules[schedules.length - 1];

    // ✅ 如果班次有多个段（包括REST），需要计算完整的时间范围
    // 确保包含所有段（从第一段开始到最后一段结束）
    if (firstShift.shift && firstShift.shift.segments && firstShift.shift.segments.length > 1) {
      const segments = firstShift.shift.segments;

      // 计算第一段的开始时间
      const firstSegment = segments[0];
      const [firstStartHour, firstStartMinute] = firstSegment.startTime.split(':').map(Number);
      const firstShiftStart = new Date(firstShift.scheduleDate);
      firstShiftStart.setHours(firstStartHour, firstStartMinute, 0, 0);
      firstShift.workStartTime = firstShiftStart;

      // 计算最后一段的结束时间
      const lastSegment = segments[segments.length - 1];
      const [lastEndHour, lastEndMinute] = lastSegment.endTime.split(':').map(Number);
      const lastShiftEnd = new Date(firstShift.scheduleDate);
      lastShiftEnd.setHours(lastEndHour, lastEndMinute, 0, 0);
      firstShift.workEndTime = lastShiftEnd; // 使用 firstShift 作为完整的时间范围
    }

    // 上班卡：第一班次的上班卡
    const workStartPunches = await this.collectWorkStartPunch(
      firstShift,
      punchRecords,
      config.workStart,
      config.punchInterval,
    );

    // 下班卡：最后班次的下班卡（如果只有一个班次，就是 firstShift）
    const targetShift = schedules.length === 1 ? firstShift : lastShift;
    const workEndPunches = await this.collectWorkEndPunch(
      targetShift,
      punchRecords,
      config.workEnd,
      config.punchInterval,
    );

    return {
      employeeNo,
      punchDate,
      ruleId: rule.id,
      ruleType: 'scheduled',
      ruleName: rule.name,
      workStartPunches,
      workEndPunches,
      isContinuousShift: true,
      accountId,
    };
  }

  /**
   * 单个班次收卡
   */
  private async collectSingleShiftPunch(
    employeeNo: string,
    punchDate: Date,
    rule: any,
    schedules: any[],
    punchRecords: any[],
    config: any,
    accountId: number,
    previousWorkEndTime?: Date,
  ): Promise<AttendancePunchResult> {
    const schedule = schedules[0]; // 单个班次

    // 上班卡
    let allWorkStartPunches = await this.collectWorkStartPunch(
      schedule,
      punchRecords,
      config.workStart,
      config.punchInterval,
    );

    // ✅ 如果有前一个班次的下班卡时间，检查是否有时间交叉
    if (previousWorkEndTime && allWorkStartPunches.length > 0) {
      const workStartTime = allWorkStartPunches[0].punchTime;
      if (workStartTime < previousWorkEndTime) {
        // 上班卡时间早于前一个班次的下班卡时间，认为缺上班卡
        console.log(
          `[collectSingleShiftPunch] 时间交叉检测: 上班卡${workStartTime.toISOString()} < 前一班次下班卡${previousWorkEndTime.toISOString()}，认为缺上班卡`,
        );
        allWorkStartPunches = [];
      }
    }

    // 下班卡
    const allWorkEndPunches = await this.collectWorkEndPunch(
      schedule,
      punchRecords,
      config.workEnd,
      config.punchInterval,
    );

    // ✅ 智能配对逻辑：处理同一时间不同设备的打卡
    const pairedStartPunches: any[] = [];
    const pairedEndPunches: any[] = [];
    const paired = new Set<number>();

    console.log(
      `[collectSingleShiftPunch] 收集到 ${allWorkStartPunches.length} 个上班卡, ${allWorkEndPunches.length} 个下班卡`,
    );

    // 对每个上班卡，查找最近的下班卡进行配对
    for (let i = 0; i < allWorkStartPunches.length; i++) {
      const startPunch = allWorkStartPunches[i];
      let bestEndPunch = null;
      let bestEndIndex = -1;
      let minTimeDiff = Infinity;

      // 查找最近的且未被配对的下班卡
      for (let j = 0; j < allWorkEndPunches.length; j++) {
        if (paired.has(j)) continue;

        const endPunch = allWorkEndPunches[j];
        const timeDiff = endPunch.punchTime.getTime() - startPunch.punchTime.getTime();

        // 下班卡时间必须晚于上班卡
        if (timeDiff > 0 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestEndPunch = endPunch;
          bestEndIndex = j;
        }
      }

      if (bestEndPunch) {
        pairedStartPunches.push(startPunch);
        pairedEndPunches.push(bestEndPunch);
        paired.add(bestEndIndex);
        console.log(
          `配对: IN(${startPunch.id}) ${startPunch.punchTime.toISOString().substring(11, 19)} + OUT(${bestEndPunch.id}) ${bestEndPunch.punchTime.toISOString().substring(11, 19)}`,
        );
      } else {
        // 没有找到配对的下班卡，作为缺卡处理
        pairedStartPunches.push(startPunch);
        pairedEndPunches.push(null);
        console.log(
          `缺下班卡: IN(${startPunch.id}) ${startPunch.punchTime.toISOString().substring(11, 19)}`,
        );
      }
    }

    // 处理未被配对的下班卡（缺上班卡）
    for (let j = 0; j < allWorkEndPunches.length; j++) {
      if (!paired.has(j)) {
        pairedStartPunches.push(null);
        pairedEndPunches.push(allWorkEndPunches[j]);
        console.log(
          `缺上班卡: OUT(${allWorkEndPunches[j].id}) ${allWorkEndPunches[j].punchTime.toISOString().substring(11, 19)}`,
        );
      }
    }

    console.log(
      `[collectSingleShiftPunch] 最终配对结果: ${pairedStartPunches.length} 对 (包含缺卡)`,
    );

    return {
      employeeNo,
      punchDate,
      ruleId: rule.id,
      ruleType: 'scheduled',
      ruleName: rule.name,
      workStartPunches: pairedStartPunches,
      workEndPunches: pairedEndPunches,
      isContinuousShift: false,
      accountId,
    };
  }

  /**
   * 不连续班次收卡：每个班次都收卡，并进行智能配对
   */
  private async collectDiscreteShiftsPunch(
    employeeNo: string,
    punchDate: Date,
    rule: any,
    schedules: any[],
    punchRecords: any[],
    config: any,
    accountId: number,
  ): Promise<AttendancePunchResult> {
    const allWorkStartPunchesMap = new Map<number, any>(); // ✅ 使用Map去重，key为punchId
    const allWorkEndPunchesMap = new Map<number, any>();

    for (const schedule of schedules) {
      // 上班卡
      const workStartPunches = await this.collectWorkStartPunch(
        schedule,
        punchRecords,
        config.workStart,
        config.punchInterval,
      );
      // ✅ 使用Map去重，避免同一打卡被多个班次收集
      workStartPunches.forEach((p) => allWorkStartPunchesMap.set(p.id, p));

      // 下班卡
      const workEndPunches = await this.collectWorkEndPunch(
        schedule,
        punchRecords,
        config.workEnd,
        config.punchInterval,
      );
      // ✅ 使用Map去重，避免同一打卡被多个班次收集
      workEndPunches.forEach((p) => allWorkEndPunchesMap.set(p.id, p));
    }

    // ✅ 转换为数组并按时间排序
    const allWorkStartPunches = Array.from(allWorkStartPunchesMap.values()).sort(
      (a, b) => a.punchTime.getTime() - b.punchTime.getTime(),
    );
    const allWorkEndPunches = Array.from(allWorkEndPunchesMap.values()).sort(
      (a, b) => a.punchTime.getTime() - b.punchTime.getTime(),
    );

    // ✅ 新增：对收集到的所有上下班卡进行智能配对
    const pairedStartPunches: any[] = [];
    const pairedEndPunches: any[] = [];
    const paired = new Set<number>();

    console.log(
      `[collectDiscreteShiftsPunch] 收集到 ${allWorkStartPunches.length} 个上班卡, ${allWorkEndPunches.length} 个下班卡`,
    );

    // 对每个上班卡，查找最近的下班卡进行配对
    for (let i = 0; i < allWorkStartPunches.length; i++) {
      const startPunch = allWorkStartPunches[i];
      let bestEndPunch = null;
      let bestEndIndex = -1;
      let minTimeDiff = Infinity;

      // 查找最近的且未被配对的下班卡
      for (let j = 0; j < allWorkEndPunches.length; j++) {
        if (paired.has(j)) continue;

        const endPunch = allWorkEndPunches[j];
        const timeDiff = endPunch.punchTime.getTime() - startPunch.punchTime.getTime();

        // 下班卡时间必须晚于上班卡
        if (timeDiff > 0 && timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          bestEndPunch = endPunch;
          bestEndIndex = j;
        }
      }

      if (bestEndPunch) {
        pairedStartPunches.push(startPunch);
        pairedEndPunches.push(bestEndPunch);
        paired.add(bestEndIndex);
        console.log(
          `配对: IN(${startPunch.id}) ${startPunch.punchTime.toISOString().substring(11, 19)} + OUT(${bestEndPunch.id}) ${bestEndPunch.punchTime.toISOString().substring(11, 19)}`,
        );
      } else {
        // 没有找到配对的下班卡，作为缺卡处理
        pairedStartPunches.push(startPunch);
        pairedEndPunches.push(null);
        console.log(
          `缺下班卡: IN(${startPunch.id}) ${startPunch.punchTime.toISOString().substring(11, 19)}`,
        );
      }
    }

    // 处理未被配对的下班卡（缺上班卡）
    for (let j = 0; j < allWorkEndPunches.length; j++) {
      if (!paired.has(j)) {
        pairedStartPunches.push(null);
        pairedEndPunches.push(allWorkEndPunches[j]);
        console.log(
          `缺上班卡: OUT(${allWorkEndPunches[j].id}) ${allWorkEndPunches[j].punchTime.toISOString().substring(11, 19)}`,
        );
      }
    }

    // 不过滤null值，保留缺卡记录
    // pairedStartPunches 和 pairedEndPunches 长度相同，null表示缺卡
    console.log(
      `[collectDiscreteShiftsPunch] 最终配对结果: ${pairedStartPunches.length} 对 (包含缺卡)`,
    );

    return {
      employeeNo,
      punchDate,
      ruleId: rule.id,
      ruleType: 'scheduled',
      ruleName: rule.name,
      workStartPunches: pairedStartPunches,
      workEndPunches: pairedEndPunches,
      isContinuousShift: false,
      accountId,
    };
  }

  /**
   * 收集上班卡 - 修改为返回所有符合条件的打卡并进行配对
   */
  private async collectWorkStartPunch(
    schedule: any,
    punchRecords: any[],
    config: any,
    punchInterval: number,
  ) {
    const shiftStart = schedule.workStartTime;

    // 计算收卡时间范围
    const earlyStart = addMinutes(shiftStart, -config.earlyRange);
    const lateEnd = addMinutes(shiftStart, config.lateRange);

    console.log(
      `[collectWorkStartPunch] Shift start: ${shiftStart.toISOString().substring(11, 19)}, Range: ${earlyStart.toISOString().substring(11, 19)} - ${lateEnd.toISOString().substring(11, 19)}`,
    );

    // ✅ 修复：使用>=和<=以包含边界时间
    const rangePunches = punchRecords.filter((punch) => {
      return punch.punchTime >= earlyStart && punch.punchTime <= lateEnd;
    });

    console.log(
      `[collectWorkStartPunch] Punches in range: ${rangePunches.length}/${punchRecords.length}`,
    );

    if (rangePunches.length === 0) {
      return [];
    }

    // ✅ 新逻辑：返回所有IN类型的打卡（或按时间范围的所有打卡），不进行过滤
    // 考勤打卡看打卡类型（IN/OUT），收集所有IN卡
    const inPunches = rangePunches.filter((p) => p.punchType === 'IN');

    console.log(`[collectWorkStartPunch] IN punches in range: ${inPunches.length}`);

    // 如果没有IN卡，则返回所有打卡（兼容逻辑）
    if (inPunches.length === 0) {
      const filteredPunches = this.filterByPunchInterval(rangePunches, punchInterval, 'first');
      const selectedPunch = this.selectPunchByCountType(
        filteredPunches,
        config.countType,
        config.count,
      );
      return selectedPunch ? [selectedPunch] : [];
    }

    // 按打卡间隔过滤IN卡
    const filteredInPunches = this.filterByPunchInterval(inPunches, punchInterval, 'first');

    console.log(`[collectWorkStartPunch] Filtered IN punches: ${filteredInPunches.length}`);

    // 返回所有符合间隔条件的IN卡
    return filteredInPunches;
  }

  /**
   * 收集下班卡 - 修改为返回所有符合条件的打卡
   */
  private async collectWorkEndPunch(
    schedule: any,
    punchRecords: any[],
    config: any,
    punchInterval: number,
  ) {
    const shiftEnd = schedule.workEndTime;

    // 计算收卡时间范围
    const earlyStart = addMinutes(shiftEnd, -config.earlyRange);
    const lateEnd = addMinutes(shiftEnd, config.lateRange);

    console.log(
      `[collectWorkEndPunch] Shift end: ${shiftEnd.toISOString().substring(11, 19)}, Range: ${earlyStart.toISOString().substring(11, 19)} - ${lateEnd.toISOString().substring(11, 19)}`,
    );

    // ✅ 修复：使用>=和<=以包含边界时间
    const rangePunches = punchRecords.filter((punch) => {
      return punch.punchTime >= earlyStart && punch.punchTime <= lateEnd;
    });

    console.log(
      `[collectWorkEndPunch] Punches in range: ${rangePunches.length}/${punchRecords.length}`,
    );

    if (rangePunches.length === 0) {
      return [];
    }

    // ✅ 新逻辑：返回所有OUT类型的打卡
    const outPunches = rangePunches.filter((p) => p.punchType === 'OUT');

    console.log(`[collectWorkEndPunch] OUT punches in range: ${outPunches.length}`);

    // 如果没有OUT卡，则返回所有打卡（兼容逻辑）
    if (outPunches.length === 0) {
      const filteredPunches = this.filterByPunchInterval(rangePunches, punchInterval, 'last');
      const selectedPunch = this.selectPunchByCountType(
        filteredPunches,
        config.countType,
        config.count,
      );
      return selectedPunch ? [selectedPunch] : [];
    }

    // 按打卡间隔过滤OUT卡
    const filteredOutPunches = this.filterByPunchInterval(outPunches, punchInterval, 'last');

    console.log(`[collectWorkEndPunch] Filtered OUT punches: ${filteredOutPunches.length}`);

    // 返回所有符合间隔条件的OUT卡
    return filteredOutPunches;
  }

  /**
   * 根据打卡间隔过滤
   * @param punches 打卡记录列表（已按时间排序）
   * @param interval 间隔分钟数
   * @param keep 'first' 保留最早的，'last' 保留最晚的
   */
  private filterByPunchInterval(punches: any[], interval: number, keep: 'first' | 'last') {
    if (interval === 0 || punches.length === 0) {
      return punches;
    }

    const filtered: any[] = [];
    let lastKeepTime: Date | null = null;

    // 倒序遍历，从最后一笔开始
    for (let i = punches.length - 1; i >= 0; i--) {
      const punch = punches[i];

      if (!lastKeepTime) {
        // 第一笔（最后一笔）肯定保留
        filtered.push(punch);
        lastKeepTime = punch.punchTime;
      } else {
        // 计算与上次保留卡的时间差
        const diff = differenceInMinutes(lastKeepTime, punch.punchTime);
        if (diff >= interval) {
          filtered.push(punch);
          lastKeepTime = punch.punchTime;
        }
      }
    }

    // 反转回来
    filtered.reverse();

    return filtered;
  }

  /**
   * 根据笔数规则选择打卡
   */
  private selectPunchByCountType(punches: any[], countType: string, customCount?: number) {
    if (punches.length === 0) return null;

    switch (countType) {
      case 'FIRST':
        return punches[0];
      case 'LAST':
        return punches[punches.length - 1];
      case 'CUSTOM':
        const index = Math.min(customCount || 1, punches.length) - 1;
        return punches[index];
      default:
        return punches[0];
    }
  }

  /**
   * 未排班场景的收卡逻辑
   *
   * 规则：
   * 1. 若前后一天有排班：
   *    - 上班卡范围：前一天的班次结束时间 + 班次后未排班���始（分钟）之后，到后一天班次开始 - 班次前未排班结束（分钟）之间
   *    - 下班卡范围：上班卡时间 + 1 到 上班卡时间 + 班次前未排班结束（分钟）之间
   * 2. 若前后一天都没有排班：
   *    - 上班卡范围：[00:00, 23:59] 之间
   *    - 下班卡范围：[上班卡实际摆卡 + 1，上班卡实际摆卡 + 班次前未排班结束（分钟）] 之间
   * 3. 是否需要摆卡由 requirePunch 参数控制
   */
  private async collectUnscheduledPunch(
    employeeNo: string,
    punchDate: Date,
    rule: any,
    punchRecords: any[],
    accountId: number,
  ): Promise<AttendancePunchResult> {
    const unscheduledConfig = JSON.parse(rule.unscheduledConfig);

    // 检查是否需要打卡
    if (!unscheduledConfig.requirePunch) {
      console.log(`员工 ${employeeNo} 在 ${punchDate.toISOString()} 未开启需要打卡，跳过考勤摆卡`);
      return {
        employeeNo,
        punchDate,
        ruleId: rule.id,
        ruleType: 'unscheduled',
        ruleName: rule.name,
        workStartPunches: [],
        workEndPunches: [],
        isContinuousShift: false,
        accountId,
      };
    }

    // 获取员工ID
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { id: true },
    });

    if (!employee) {
      return {
        employeeNo,
        punchDate,
        ruleId: rule.id,
        ruleType: 'unscheduled',
        ruleName: rule.name,
        workStartPunches: [],
        workEndPunches: [],
        isContinuousShift: false,
        accountId,
      };
    }

    // 检查前一天和后一天是否有排班
    const prevDay = addMinutes(punchDate, -24 * 60);
    const nextDay = addMinutes(punchDate, 24 * 60);

    const prevSchedule = await this.getEmployeeScheduleForDate(employee.id, prevDay);
    const nextSchedule = await this.getEmployeeScheduleForDate(employee.id, nextDay);

    const hasPrevSchedule = prevSchedule !== null;
    const hasNextSchedule = nextSchedule !== null;

    console.log(
      `员工 ${employeeNo} 在 ${punchDate.toISOString()}: 前一天有排班=${hasPrevSchedule}, 后一天有排班=${hasNextSchedule}`,
    );

    let workStartPunches: any[];
    let workEndPunches: any[];

    if (hasPrevSchedule && hasNextSchedule) {
      // 情况1：前后一天都有排班
      console.log('使用前后有排班的逻辑');
      const result = await this.collectUnscheduledWithSurroundingSchedules(
        prevSchedule,
        nextSchedule,
        punchDate,
        punchRecords,
        unscheduledConfig,
      );
      workStartPunches = result.workStartPunches;
      workEndPunches = result.workEndPunches;
    } else {
      // 情况2：前后一天都没有排班（或只有一边有排班）
      console.log('使用全天范围逻辑');
      const result = await this.collectUnscheduledFullDay(
        punchDate,
        punchRecords,
        unscheduledConfig,
      );
      workStartPunches = result.workStartPunches;
      workEndPunches = result.workEndPunches;
    }

    return {
      employeeNo,
      punchDate,
      ruleId: rule.id,
      ruleType: 'unscheduled',
      ruleName: rule.name,
      workStartPunches,
      workEndPunches,
      isContinuousShift: false,
      accountId,
    };
  }

  /**
   * 获取员工在指定日期的排班信息
   */
  private async getEmployeeScheduleForDate(employeeId: number, date: Date) {
    const schedules = await this.getSchedulesForEmployee('', startOfDay(date), endOfDay(date));

    // 过滤出该员工的排班
    return schedules.find((s: any) => s.employee?.id === employeeId) || null;
  }

  /**
   * 未排班 - 前后都有排班的情况
   */
  private async collectUnscheduledWithSurroundingSchedules(
    prevSchedule: any,
    nextSchedule: any,
    punchDate: Date,
    punchRecords: any[],
    config: any,
  ) {
    // 获取前一天的班次结束时间
    const prevShiftEnd = this.getScheduleEndTime(prevSchedule);
    // 获取后一天的班次开始时间
    const nextShiftStart = this.getScheduleStartTime(nextSchedule);

    // 上班卡范围：前一天班次结束 + 班次后未排班开始（分钟）之后，到后一天班次开始 - 班次前未排班结束（分钟）之间
    const startAfter = addMinutes(prevShiftEnd, config.work.startAfterShiftMins);
    const endBefore = addMinutes(nextShiftStart, -config.work.endBeforeShiftMins);

    console.log(`未排班上班卡收卡范围: ${startAfter.toISOString()} - ${endBefore.toISOString()}`);

    // 收集上班卡
    const workStartPunches = this.collectPunchesInRange(
      punchRecords,
      startAfter,
      endBefore,
      'first',
      config.punchInterval,
    );

    // 下班卡范围：上班卡时间 + 1 到 上班卡时间 + 班次前未排班结束（分钟）之间
    let workEndPunches: any[] = [];
    if (workStartPunches.length > 0) {
      const actualWorkStart = workStartPunches[0].punchTime;
      const workEndStart = addMinutes(actualWorkStart, 1);
      const workEndEnd = addMinutes(actualWorkStart, config.off.endBeforeShiftMins);

      console.log(
        `未排班下班卡收卡范围: ${workEndStart.toISOString()} - ${workEndEnd.toISOString()}`,
      );

      workEndPunches = this.collectPunchesInRange(
        punchRecords,
        workEndStart,
        workEndEnd,
        'last',
        config.punchInterval,
      );
    }

    return { workStartPunches, workEndPunches };
  }

  /**
   * 未排班 - 前后都没有排班的情况（全天范围）
   */
  private async collectUnscheduledFullDay(punchDate: Date, punchRecords: any[], config: any) {
    const dayStart = startOfDay(punchDate);
    const dayEnd = endOfDay(punchDate);

    console.log(`未排班上班卡收卡范围: 全天 ${dayStart.toISOString()} - ${dayEnd.toISOString()}`);
    console.log(`原始打卡记录数: ${punchRecords.length}`);

    // 过滤出当天所有打卡并按时间排序
    const dayPunches = punchRecords
      .filter((punch) => punch.punchTime >= dayStart && punch.punchTime <= dayEnd)
      .sort((a, b) => a.punchTime.getTime() - b.punchTime.getTime());

    console.log(`当天打卡记录数: ${dayPunches.length}`);

    if (dayPunches.length === 0) {
      return { workStartPunches: [], workEndPunches: [] };
    }

    // 简化配对逻辑：按顺序配对 IN 和 OUT
    const allWorkStartPunches: any[] = [];
    const allWorkEndPunches: any[] = [];
    const paired = new Set<number>();

    for (let i = 0; i < dayPunches.length; i++) {
      if (paired.has(i)) continue;

      const currentPunch = dayPunches[i];
      const punchType = currentPunch.punchType || 'IN';

      if (punchType === 'IN') {
        // 查找最近的未配对 OUT
        let pairedPunch = null;
        for (let j = i + 1; j < dayPunches.length; j++) {
          if (!paired.has(j) && dayPunches[j].punchType === 'OUT') {
            pairedPunch = dayPunches[j];
            paired.add(j);
            break;
          }
        }

        allWorkStartPunches.push(currentPunch);
        allWorkEndPunches.push(pairedPunch);

        if (pairedPunch) {
          console.log(
            `配对: IN(${currentPunch.id}) ${currentPunch.punchTime.toISOString().substring(11, 19)} + OUT(${pairedPunch.id}) ${pairedPunch.punchTime.toISOString().substring(11, 19)}`,
          );
        } else {
          console.log(
            `缺卡: IN(${currentPunch.id}) ${currentPunch.punchTime.toISOString().substring(11, 19)} 无对应OUT卡`,
          );
        }
      } else {
        // OUT 卡，如果还没配对，说明缺上班卡
        allWorkStartPunches.push(null);
        allWorkEndPunches.push(currentPunch);
        console.log(
          `缺卡: OUT(${currentPunch.id}) ${currentPunch.punchTime.toISOString().substring(11, 19)} 无对应IN卡`,
        );
      }
    }

    // 过滤掉 null 值
    const filteredStart = allWorkStartPunches.filter((p) => p !== null);
    const filteredEnd = allWorkEndPunches.filter((p) => p !== null);

    console.log(`最终配对结果: ${filteredStart.length} 对`);

    return { workStartPunches: filteredStart, workEndPunches: filteredEnd };
  }

  /**
   * 获取排班的结束时间
   */
  private getScheduleEndTime(schedule: any): Date {
    if (!schedule) {
      throw new Error('排班信息不能为空');
    }

    // 如果有调整后的结束时间，使用调整后的时间
    if (schedule.adjustedEnd) {
      return schedule.adjustedEnd;
    }

    // 否则从班次段中计算
    if (!schedule.shift || !schedule.shift.segments || schedule.shift.segments.length === 0) {
      throw new Error('班次信息不完整');
    }

    const normalSegments = schedule.shift.segments.filter((seg: any) => seg.type === 'NORMAL');
    if (normalSegments.length === 0) {
      throw new Error('没有找到工作时段');
    }

    const lastSegment = normalSegments[normalSegments.length - 1];
    const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
    return new Date(`${dateStr}T${lastSegment.endTime}`);
  }

  /**
   * 获取排班的开始时间
   */
  private getScheduleStartTime(schedule: any): Date {
    if (!schedule) {
      throw new Error('排班信息不能为空');
    }

    // 如果有调整后的开始时间，使用调整后的时间
    if (schedule.adjustedStart) {
      return schedule.adjustedStart;
    }

    // 否则从班次段中计算
    if (!schedule.shift || !schedule.shift.segments || schedule.shift.segments.length === 0) {
      throw new Error('班次信息不完整');
    }

    const normalSegments = schedule.shift.segments.filter((seg: any) => seg.type === 'NORMAL');
    if (normalSegments.length === 0) {
      throw new Error('没有找到工作时段');
    }

    const firstSegment = normalSegments[0];
    const dateStr = schedule.scheduleDate.toISOString().split('T')[0];
    return new Date(`${dateStr}T${firstSegment.startTime}`);
  }

  /**
   * 在指定时间范围内收集打卡
   */
  private collectPunchesInRange(
    punchRecords: any[],
    startTime: Date,
    endTime: Date,
    countType: 'first' | 'last',
    punchInterval: number,
  ): any[] {
    // 使用 >= 和 <= 以包含边界时间
    const rangePunches = punchRecords.filter((punch) => {
      return punch.punchTime >= startTime && punch.punchTime <= endTime;
    });

    if (rangePunches.length === 0) {
      return [];
    }

    // 根据打卡间隔过滤
    const filteredPunches = this.filterByPunchInterval(rangePunches, punchInterval, countType);

    // 根据笔数规则选择
    const selectedPunch = this.selectPunchByCountType(filteredPunches, countType);

    return selectedPunch ? [selectedPunch] : [];
  }

  /**
   * 保存收卡结果
   */
  private async saveAttendancePunchResult(result: AttendancePunchResult) {
    // 先删除已有的收卡结果
    await this.prisma.attendancePunchPair.deleteMany({
      where: {
        employeeNo: result.employeeNo,
        punchDate: result.punchDate,
      },
    });

    // 保存新的收卡结果
    await this.prisma.attendancePunchPair.create({
      data: {
        employeeNo: result.employeeNo,
        punchDate: result.punchDate,
        ruleId: result.ruleId,
        ruleType: result.ruleType,
        ruleName: result.ruleName,
        isContinuousShift: result.isContinuousShift,
        accountId: result.accountId,
        // 主卡位 - ✅ 修复：使用正确的属性名（id不是punchId）
        workStartPunchTime:
          result.workStartPunches.length > 0 ? result.workStartPunches[0].punchTime : null,
        workStartShiftId:
          result.workStartPunches.length > 0 ? result.workStartPunches[0].shiftId : null,
        workStartShiftName:
          result.workStartPunches.length > 0 ? result.workStartPunches[0].shiftName : null,
        workEndPunchTime:
          result.workEndPunches.length > 0 ? result.workEndPunches[0].punchTime : null,
        workEndShiftId: result.workEndPunches.length > 0 ? result.workEndPunches[0].shiftId : null,
        workEndShiftName:
          result.workEndPunches.length > 0 ? result.workEndPunches[0].shiftName : null,
        // 多班次信息
        workStartPunches:
          result.workStartPunches.length > 0 ? JSON.stringify(result.workStartPunches) : null,
        workEndPunches:
          result.workEndPunches.length > 0 ? JSON.stringify(result.workEndPunches) : null,
      },
    });
  }

  /**
   * 保存考勤收卡结果（不删除旧记录）
   */
  private async saveAttendancePunchResultWithoutDelete(result: AttendancePunchResult) {
    // 过滤出有效的上班卡和下班卡（排除null值）
    const validStartPunches = result.workStartPunches.filter((p) => p !== null);
    const validEndPunches = result.workEndPunches.filter((p) => p !== null);

    // 直接保存新的收卡结果，不删除旧记录
    await this.prisma.attendancePunchPair.create({
      data: {
        employeeNo: result.employeeNo,
        punchDate: result.punchDate,
        ruleId: result.ruleId,
        ruleType: result.ruleType,
        ruleName: result.ruleName,
        isContinuousShift: result.isContinuousShift,
        accountId: result.accountId,
        // 主卡位 - ✅ 修复：使用有效的打卡（排除null）
        workStartPunchTime: validStartPunches.length > 0 ? validStartPunches[0].punchTime : null,
        workStartShiftId: validStartPunches.length > 0 ? validStartPunches[0].shiftId : null,
        workStartShiftName: validStartPunches.length > 0 ? validStartPunches[0].shiftName : null,
        workEndPunchTime: validEndPunches.length > 0 ? validEndPunches[0].punchTime : null,
        workEndShiftId: validEndPunches.length > 0 ? validEndPunches[0].shiftId : null,
        workEndShiftName: validEndPunches.length > 0 ? validEndPunches[0].shiftName : null,
        // 多班次信息 - 保留原始数组（包含null表示缺卡）
        workStartPunches:
          result.workStartPunches.length > 0 ? JSON.stringify(result.workStartPunches) : null,
        workEndPunches:
          result.workEndPunches.length > 0 ? JSON.stringify(result.workEndPunches) : null,
      },
    });
  }

  /**
   * 查询考勤打卡收卡结果
   */
  async getAttendancePunchResults(query: any) {
    const { employeeNo, startDate, endDate, page = 1, pageSize = 20 } = query;

    // 转换为数字类型
    const pageNum = +page || 1;
    const pageSizeNum = +pageSize || 20;

    const where: any = {};

    if (employeeNo) {
      where.employeeNo = employeeNo;
    }

    if (startDate || endDate) {
      where.punchDate = {};
      if (startDate) {
        where.punchDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.punchDate.lte = new Date(endDate);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.attendancePunchPair.count({ where }),
      this.prisma.attendancePunchPair.findMany({
        where,
        orderBy: {
          punchDate: 'desc',
        },
        skip: (pageNum - 1) * pageSizeNum,
        take: pageSizeNum,
      }),
    ]);

    // 为每个结果加载account数据
    const itemsWithAccount = await Promise.all(
      items.map(async (item) => {
        if (!item.accountId) {
          return { ...item, account: null };
        }
        const account = await this.prisma.laborAccount.findUnique({
          where: { id: item.accountId },
          select: {
            id: true,
            code: true,
            name: true,
            path: true,
            namePath: true,
          },
        });
        return { ...item, account };
      }),
    );

    return {
      total,
      items: itemsWithAccount,
      page: pageNum,
      pageSize: pageSizeNum,
    };
  }

  /**
   * 获取收卡结果详情
   */
  async getAttendancePunchDetail(id: number) {
    const result = await this.prisma.attendancePunchPair.findUnique({
      where: { id },
    });

    if (!result) {
      return null;
    }

    // 解析JSON字段
    return {
      ...result,
      workStartPunches: result.workStartPunches ? JSON.parse(result.workStartPunches) : [],
      workEndPunches: result.workEndPunches ? JSON.parse(result.workEndPunches) : [],
    };
  }
}
