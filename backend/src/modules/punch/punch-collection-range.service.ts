import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

/**
 * 收卡范围接口
 */
export interface CollectionRange {
  startTime: Date;
  endTime: Date;
  source: 'SCHEDULED' | 'PREVIOUS_DAY' | 'NEXT_DAY' | 'FULL_DAY' | 'COMBINED';
}

/**
 * 收卡范围计算服务
 * 处理有排班和未排班日期的收卡范围计算
 */
@Injectable()
export class PunchCollectionRangeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 计算指定日期和员工的收卡范围
   * @param employeeNo 员工工号
   * @param targetDate 目标日期
   * @param beforeShiftMins 班次前范围（分钟）
   * @param afterShiftMins 班次后范围（分钟）
   * @returns 收卡范围
   */
  async calculateCollectionRange(
    employeeNo: string,
    targetDate: Date,
    beforeShiftMins: number = 120,
    afterShiftMins: number = 120,
  ): Promise<CollectionRange> {
    // 获取目标日期的排班信息
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    const schedule = await this.prisma.schedule.findFirst({
      where: {
        employee: {
          employeeNo,
        },
        scheduleDate: {
          gte: dayStart,
          lte: dayEnd,
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

    // 情况1：有排班日期，使用班次的收卡范围
    if (schedule && schedule.shift) {
      return this.calculateScheduledRange(schedule, beforeShiftMins, afterShiftMins);
    }

    // 情况2：未排班日期，查找前后排班日期
    const previousSchedule = await this.findNearestSchedule(employeeNo, targetDate, 'PREVIOUS');
    const nextSchedule = await this.findNearestSchedule(employeeNo, targetDate, 'NEXT');

    // 情况2.1：前后都有排班，使用前后排班的收卡范围
    if (previousSchedule && nextSchedule) {
      return this.calculateCombinedRange(
        previousSchedule,
        nextSchedule,
        beforeShiftMins,
        afterShiftMins,
        targetDate,
      );
    }

    // 情况2.2：只有前一天有排班
    if (previousSchedule) {
      return this.calculatePreviousDayRange(previousSchedule, afterShiftMins, targetDate);
    }

    // 情况2.3：只有后一天有排班
    if (nextSchedule) {
      return this.calculateNextDayRange(nextSchedule, beforeShiftMins, targetDate);
    }

    // 情况2.4：前后都无排班，使用全天范围
    return this.calculateFullDayRange(targetDate);
  }

  /**
   * 计算有排班日期的收卡范围
   * 收卡范围 = [排班开始时间 - 开始早范围, 排班结束时间 + 结束晚范围]
   */
  private calculateScheduledRange(
    schedule: any,
    beforeShiftMins: number,
    afterShiftMins: number,
  ): CollectionRange {
    const shift = schedule.shift;
    const scheduleDate = new Date(schedule.scheduleDate);

    if (!shift.segments || shift.segments.length === 0) {
      // 如果没有班次段，使用全天范围
      return this.calculateFullDayRange(scheduleDate);
    }

    const firstSegment = shift.segments[0];
    const lastSegment = shift.segments[shift.segments.length - 1];

    // 计算班次开始时间
    let shiftStart = new Date(scheduleDate);
    if (firstSegment.startDate === '+0') {
      const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
      shiftStart.setHours(hours, minutes, 0, 0);
    } else {
      shiftStart.setDate(shiftStart.getDate() + 1);
      const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
      shiftStart.setHours(hours, minutes, 0, 0);
    }

    // 计算班次结束时间
    let shiftEnd = new Date(scheduleDate);
    if (lastSegment.endDate === '+0') {
      const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
      shiftEnd.setHours(hours, minutes, 0, 0);
    } else {
      shiftEnd.setDate(shiftEnd.getDate() + 1);
      const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
      shiftEnd.setHours(hours, minutes, 0, 0);
    }

    // 应用收卡范围
    const rangeStart = new Date(shiftStart.getTime() - beforeShiftMins * 60 * 1000);
    const rangeEnd = new Date(shiftEnd.getTime() + afterShiftMins * 60 * 1000);

    return {
      startTime: rangeStart,
      endTime: rangeEnd,
      source: 'SCHEDULED',
    };
  }

  /**
   * 计��前后都有排班时的收卡范围（优化版）
   * 只有当前一天的班后延伸到未排班日期，才压缩收卡开始时间
   * 只有当后一天的班前延伸到未排班日期，才压缩收卡结束时间
   * 否则使用全天范围
   */
  private calculateCombinedRange(
    previousSchedule: any,
    nextSchedule: any,
    beforeShiftMins: number,
    afterShiftMins: number,
    targetDate: Date,
  ): CollectionRange {
    // 计算未排班日期的开始和结束时间
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    const targetDayEnd = new Date(targetDate);
    targetDayEnd.setHours(23, 59, 59, 999);

    // 1. 计算前一天班次结束时间 + afterShiftMins
    const prevShift = previousSchedule.shift;
    const prevScheduleDate = new Date(previousSchedule.scheduleDate);
    let prevShiftEnd = new Date(prevScheduleDate);

    if (prevShift.segments && prevShift.segments.length > 0) {
      const lastSegment = prevShift.segments[prevShift.segments.length - 1];
      if (lastSegment.endDate === '+0') {
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        prevShiftEnd.setHours(hours, minutes, 0, 0);
      } else {
        prevShiftEnd.setDate(prevShiftEnd.getDate() + 1);
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        prevShiftEnd.setHours(hours, minutes, 0, 0);
      }
    }

    // 前一天班次结束时间 + afterShiftMins
    const previousExtendEnd = new Date(prevShiftEnd.getTime() + afterShiftMins * 60 * 1000);

    // 2. 判断前一天班后延伸是否到了未排班日期
    let rangeStart: Date;
    if (previousExtendEnd >= targetDayStart && previousExtendEnd <= targetDayEnd) {
      // 延伸时间在未排班日期内，收卡从延伸时间开始
      rangeStart = previousExtendEnd;
    } else {
      // 延伸时间不在未排班日期内，收卡从0点开始
      rangeStart = new Date(targetDayStart);
    }

    // 3. 计算后一天班次开始时间 - beforeShiftMins
    const nextShift = nextSchedule.shift;
    const nextScheduleDate = new Date(nextSchedule.scheduleDate);
    let nextShiftStart = new Date(nextScheduleDate);

    if (nextShift.segments && nextShift.segments.length > 0) {
      const firstSegment = nextShift.segments[0];
      if (firstSegment.startDate === '+0') {
        const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
        nextShiftStart.setHours(hours, minutes, 0, 0);
      } else {
        nextShiftStart.setDate(nextShiftStart.getDate() + 1);
        const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
        nextShiftStart.setHours(hours, minutes, 0, 0);
      }
    }

    // 后一天班次开始时间 - beforeShiftMins
    const nextExtendStart = new Date(nextShiftStart.getTime() - beforeShiftMins * 60 * 1000);

    // 4. 判断后一天班前延伸是否到了未排班日期
    let rangeEnd: Date;
    if (nextExtendStart >= targetDayStart && nextExtendStart <= targetDayEnd) {
      // 延伸时间在未排班日期内，收到延伸时间结束
      rangeEnd = nextExtendStart;
    } else {
      // 延伸时间不在未排班日期内，收到23:59:59结束
      rangeEnd = new Date(targetDayEnd);
    }

    return {
      startTime: rangeStart,
      endTime: rangeEnd,
      source: 'COMBINED',
    };
  }

  /**
   * 计算只有前一天有排班时的收卡范围（优化版）
   * 只有当前一天的班后延伸到未排班日期，才压缩收卡开始时间
   * 否则从0点开始
   */
  private calculatePreviousDayRange(
    previousSchedule: any,
    afterShiftMins: number,
    targetDate: Date,
  ): CollectionRange {
    // 计算未排班日期的开始和结束时间
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    const targetDayEnd = new Date(targetDate);
    targetDayEnd.setHours(23, 59, 59, 999);

    // 1. 计算前一天班次结束时间 + afterShiftMins
    const prevShift = previousSchedule.shift;
    const prevScheduleDate = new Date(previousSchedule.scheduleDate);
    let prevShiftEnd = new Date(prevScheduleDate);

    if (prevShift.segments && prevShift.segments.length > 0) {
      const lastSegment = prevShift.segments[prevShift.segments.length - 1];
      if (lastSegment.endDate === '+0') {
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        prevShiftEnd.setHours(hours, minutes, 0, 0);
      } else {
        prevShiftEnd.setDate(prevShiftEnd.getDate() + 1);
        const [hours, minutes] = lastSegment.endTime.split(':').map(Number);
        prevShiftEnd.setHours(hours, minutes, 0, 0);
      }
    }

    // 前一天班次结束时间 + afterShiftMins
    const previousExtendEnd = new Date(prevShiftEnd.getTime() + afterShiftMins * 60 * 1000);

    // 2. 判断前一天班后延伸是否到了未排班日期
    let rangeStart: Date;
    if (previousExtendEnd >= targetDayStart && previousExtendEnd <= targetDayEnd) {
      // 延伸时间在未排班日期内，收卡从延伸时间开始
      rangeStart = previousExtendEnd;
    } else {
      // 延伸时间不在未排班日期内，收卡从0点开始
      rangeStart = new Date(targetDayStart);
    }

    // 3. 收卡结束时间为当天23:59:59
    const rangeEnd = new Date(targetDayEnd);

    return {
      startTime: rangeStart,
      endTime: rangeEnd,
      source: 'PREVIOUS_DAY',
    };
  }

  /**
   * 计算只有后一天有排班时的收卡范围（优化版）
   * 只有当后一天的班前延伸到未排班日期，才压缩收卡结束时间
   * 否则到23:59:59结束
   */
  private calculateNextDayRange(
    nextSchedule: any,
    beforeShiftMins: number,
    targetDate: Date,
  ): CollectionRange {
    // 计算未排班日期的开始和结束时间
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    const targetDayEnd = new Date(targetDate);
    targetDayEnd.setHours(23, 59, 59, 999);

    // 1. 计算后一天班次开始时间 - beforeShiftMins
    const nextShift = nextSchedule.shift;
    const nextScheduleDate = new Date(nextSchedule.scheduleDate);
    let nextShiftStart = new Date(nextScheduleDate);

    if (nextShift.segments && nextShift.segments.length > 0) {
      const firstSegment = nextShift.segments[0];
      if (firstSegment.startDate === '+0') {
        const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
        nextShiftStart.setHours(hours, minutes, 0, 0);
      } else {
        nextShiftStart.setDate(nextShiftStart.getDate() + 1);
        const [hours, minutes] = firstSegment.startTime.split(':').map(Number);
        nextShiftStart.setHours(hours, minutes, 0, 0);
      }
    }

    // 后一天班次开始时间 - beforeShiftMins
    const nextExtendStart = new Date(nextShiftStart.getTime() - beforeShiftMins * 60 * 1000);

    // 2. 判断后一天班前延伸是否到了未排班日期
    let rangeEnd: Date;
    if (nextExtendStart >= targetDayStart && nextExtendStart <= targetDayEnd) {
      // 延伸时间在未排班日期内，收到延伸时间结束
      rangeEnd = nextExtendStart;
    } else {
      // 延伸时间不在未排班日期内，收到23:59:59结束
      rangeEnd = new Date(targetDayEnd);
    }

    // 3. 收卡开始时间为当天00:00:00
    const rangeStart = new Date(targetDayStart);

    return {
      startTime: rangeStart,
      endTime: rangeEnd,
      source: 'NEXT_DAY',
    };
  }

  /**
   * 计算全天收卡范围
   * 00:00 ～ 23:59
   */
  private calculateFullDayRange(targetDate: Date): CollectionRange {
    const rangeStart = new Date(targetDate);
    rangeStart.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(targetDate);
    rangeEnd.setHours(23, 59, 59, 999);

    return {
      startTime: rangeStart,
      endTime: rangeEnd,
      source: 'FULL_DAY',
    };
  }

  /**
   * 查找最近的排班日期
   * @param employeeNo 员工工号
   * @param targetDate 目标日期
   * @param direction 查找方向 'PREVIOUS' | 'NEXT'
   * @returns 排班信息
   */
  private async findNearestSchedule(
    employeeNo: string,
    targetDate: Date,
    direction: 'PREVIOUS' | 'NEXT',
  ): Promise<any | null> {
    const targetDayStart = new Date(targetDate);
    targetDayStart.setHours(0, 0, 0, 0);

    const targetDayEnd = new Date(targetDate);
    targetDayEnd.setHours(23, 59, 59, 999);

    const where: any = {
      employee: {
        employeeNo,
      },
    };

    if (direction === 'PREVIOUS') {
      // 查找之前的排班
      where.scheduleDate = {
        lt: targetDayStart,
      };
    } else {
      // 查找之后的排班
      where.scheduleDate = {
        gt: targetDayEnd,
      };
    }

    const schedule = await this.prisma.schedule.findFirst({
      where,
      include: {
        shift: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
      orderBy: {
        scheduleDate: direction === 'PREVIOUS' ? 'desc' : 'asc',
      },
    });

    return schedule;
  }

  /**
   * 检查两个收卡范围是否交叉
   * @param range1 收卡范围1
   * @param range2 收卡范围2
   * @returns 是否交叉
   */
  checkRangesOverlap(range1: CollectionRange, range2: CollectionRange): boolean {
    return range1.startTime <= range2.endTime && range2.startTime <= range1.endTime;
  }

  /**
   * 获取交叉范围的中间时间点
   * @param range1 收卡范围1
   * @param range2 收卡范围2
   * @returns 中间时间点
   */
  getOverlapMidpoint(range1: CollectionRange, range2: CollectionRange): Date | null {
    if (!this.checkRangesOverlap(range1, range2)) {
      return null;
    }

    const overlapStart = new Date(
      Math.max(range1.startTime.getTime(), range2.startTime.getTime()),
    );
    const overlapEnd = new Date(
      Math.min(range1.endTime.getTime(), range2.endTime.getTime()),
    );

    const midpoint = new Date((overlapStart.getTime() + overlapEnd.getTime()) / 2);
    return midpoint;
  }

  /**
   * 根据时间点归属打卡记录到收卡范围
   * @param punchRecords 打卡记录
   * @param ranges 收卡范围列表
   * @param midpoint 中间时间点
   * @returns 归属后的打卡记录 Map<rangeIndex, records>
   */
  assignPunchesToRanges(
    punchRecords: any[],
    ranges: CollectionRange[],
    midpoint: Date,
  ): Map<number, any[]> {
    const assignment = new Map<number, any[]>();

    for (const record of punchRecords) {
      const punchTime = new Date(record.punchTime);

      // 根据中间时间点决定归属
      if (punchTime < midpoint) {
        // 归属到前一个范围
        if (!assignment.has(0)) {
          assignment.set(0, []);
        }
        assignment.get(0)!.push(record);
      } else {
        // 归属到后一个范围
        if (!assignment.has(1)) {
          assignment.set(1, []);
        }
        assignment.get(1)!.push(record);
      }
    }

    return assignment;
  }
}
