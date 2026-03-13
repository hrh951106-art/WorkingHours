import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class CalculateEngine {
  constructor(private prisma: PrismaService) {}

  /**
   * 计算单个员工某日的工时
   */
  async calculateDaily(employeeNo: string, calcDate: Date) {
    // 1. 获取排班信息
    const schedule = await this.prisma.schedule.findFirst({
      where: {
        employee: {
          employeeNo,
        },
        scheduleDate: {
          gte: new Date(calcDate.setHours(0, 0, 0, 0)),
          lt: new Date(calcDate.setHours(23, 59, 59, 999)),
        },
      },
      include: {
        employee: true,
        shift: {
          include: {
            segments: {
              orderBy: { startTime: 'asc' },
            },
          },
        },
      },
    });

    if (!schedule) {
      throw new Error(`员工 ${employeeNo} 在 ${calcDate.toISOString().split('T')[0]} 无排班信息`);
    }

    const shift = schedule.shift;

    // 2. 计算标准工时
    const standardHours = this.calculateStandardHours(shift);

    // 3. 获取打卡记录
    const punchRecords = await this.getPunchRecords(employeeNo, calcDate);

    // 4. 计算考勤工时
    const actualHours = this.calculateActualHours(punchRecords, shift);

    // 5. 计算加班工时
    const overtimeHours = Math.max(0, actualHours - standardHours);

    // 6. 计算缺勤工时
    const absenceHours = Math.max(0, standardHours - actualHours);

    // 7. 计算各子账户工时
    const accountHours = await this.calculateAccountHours(
      employeeNo,
      calcDate,
      shift,
      punchRecords,
    );

    // 8. 检测异常
    const exceptions = this.detectExceptions(
      punchRecords,
      shift,
      standardHours,
      actualHours,
      calcDate,
    );

    return {
      employeeNo,
      calcDate,
      shiftId: shift.id,
      shiftName: shift.name,
      punchInTime: this.getPunchInTime(punchRecords),
      punchOutTime: this.getPunchOutTime(punchRecords),
      standardHours: Math.round(standardHours * 100) / 100,
      actualHours: Math.round(actualHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      leaveHours: 0,
      absenceHours: Math.round(absenceHours * 100) / 100,
      accountHours: JSON.stringify(accountHours),
      exceptions: JSON.stringify(exceptions),
      status: 'PENDING',
    };
  }

  /**
   * 计算标准工时（班次工时 - 休息时间）
   */
  private calculateStandardHours(shift: any): number {
    const standardHours = shift.standardHours || 0;
    const breakHours = shift.breakHours || 0;
    return standardHours - breakHours;
  }

  /**
   * 计算考勤工时（基于打卡记录）
   */
  private calculateActualHours(punchRecords: any[], shift: any): number {
    if (!punchRecords || punchRecords.length === 0) {
      return 0;
    }

    // 获取最早签到和最晚签退
    const punchIn = this.getPunchInTime(punchRecords);
    const punchOut = this.getPunchOutTime(punchRecords);

    if (!punchIn || !punchOut) {
      return 0;
    }

    // 计算实际工作时间（分钟）
    const diffMs = punchOut.getTime() - punchIn.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    // 转换为小时
    return Math.round(diffMinutes) / 60;
  }

  /**
   * 获取签到时间（取当天最早的打卡记录）
   */
  private getPunchInTime(punchRecords: any[]): Date | null {
    if (!punchRecords || punchRecords.length === 0) return null;

    const inRecords = punchRecords.filter((r) => r.punchType === 'IN');
    if (inRecords.length === 0) return null;

    return new Date(Math.min(...inRecords.map((r) => new Date(r.punchTime).getTime())));
  }

  /**
   * 获取签退时间（取当天最晚的打卡记录）
   */
  private getPunchOutTime(punchRecords: any[]): Date | null {
    if (!punchRecords || punchRecords.length === 0) return null;

    const outRecords = punchRecords.filter((r) => r.punchType === 'OUT');
    if (outRecords.length === 0) return null;

    return new Date(Math.max(...outRecords.map((r) => new Date(r.punchTime).getTime())));
  }

  /**
   * 获取打卡记录
   */
  private async getPunchRecords(employeeNo: string, calcDate: Date) {
    const dayStart = new Date(calcDate);
    dayStart.setHours(0, 0, 0, 0);

    const dayEnd = new Date(calcDate);
    dayEnd.setHours(23, 59, 59, 999);

    // 获取当天和次日（跨天）的打卡记录
    const nextDay = new Date(calcDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const records = await this.prisma.punchRecord.findMany({
      where: {
        employeeNo,
        punchTime: {
          gte: dayStart,
          lt: nextDay,
        },
      },
      orderBy: { punchTime: 'asc' },
    });

    return records;
  }

  /**
   * 计算各子账户工时
   */
  private async calculateAccountHours(
    employeeNo: string,
    calcDate: Date,
    shift: any,
    punchRecords: any[],
  ): Promise<Array<{ accountId: number; accountName: string; hours: number }>> {
    const accountHoursMap = new Map<number, number>();

    // 遍历班段，计算每个账户的工时
    for (const segment of shift.segments) {
      if (segment.type === 'REST') continue; // 跳过休息段

      let segmentStartTime: Date;
      let segmentEndTime: Date;

      // 计算班段的开始和结束时间
      if (segment.startDate === '+0') {
        segmentStartTime = new Date(calcDate);
        const [hours, minutes] = segment.startTime.split(':').map(Number);
        segmentStartTime.setHours(hours, minutes, 0, 0);
      } else {
        // 跨天情况
        segmentStartTime = new Date(calcDate);
        segmentStartTime.setDate(segmentStartTime.getDate() + 1);
        const [hours, minutes] = segment.startTime.split(':').map(Number);
        segmentStartTime.setHours(hours, minutes, 0, 0);
      }

      if (segment.endDate === '+0') {
        segmentEndTime = new Date(calcDate);
        const [hours, minutes] = segment.endTime.split(':').map(Number);
        segmentEndTime.setHours(hours, minutes, 0, 0);
      } else {
        segmentEndTime = new Date(calcDate);
        segmentEndTime.setDate(segmentEndTime.getDate() + 1);
        const [hours, minutes] = segment.endTime.split(':').map(Number);
        segmentEndTime.setHours(hours, minutes, 0, 0);
      }

      // 计算该班段的工时
      const segmentHours =
        (segmentEndTime.getTime() - segmentStartTime.getTime()) / (1000 * 60 * 60);

      // 如果该班段绑定了账户，累加到对应账户
      if (segment.accountId) {
        const currentHours = accountHoursMap.get(segment.accountId) || 0;
        accountHoursMap.set(segment.accountId, currentHours + segmentHours);
      }
    }

    // 转换为数组格式
    const accountIds = Array.from(accountHoursMap.keys());
    if (accountIds.length === 0) {
      return [];
    }

    const accounts = await this.prisma.laborAccount.findMany({
      where: {
        id: { in: accountIds },
      },
      select: {
        id: true,
        name: true,
        namePath: true,
      },
    });

    return accounts.map((account) => ({
      accountId: account.id,
      accountName: account.namePath || account.name,
      hours: Math.round(accountHoursMap.get(account.id)! * 100) / 100,
    }));
  }

  /**
   * 检测异常
   */
  private detectExceptions(
    punchRecords: any[],
    shift: any,
    standardHours: number,
    actualHours: number,
    calcDate: Date,
  ): any[] {
    const exceptions = [];

    // 1. 缺卡检测
    if (!punchRecords || punchRecords.length === 0) {
      exceptions.push({
        type: 'NO_PUNCH',
        message: '无打卡记录',
        level: 'ERROR',
      });
      return exceptions;
    }

    const punchIn = this.getPunchInTime(punchRecords);
    const punchOut = this.getPunchOutTime(punchRecords);

    if (!punchIn) {
      exceptions.push({
        type: 'MISSING_IN',
        message: '缺少上班打卡',
        level: 'WARNING',
      });
    }

    if (!punchOut) {
      exceptions.push({
        type: 'MISSING_OUT',
        message: '缺少下班打卡',
        level: 'WARNING',
      });
    }

    // 2. 迟到早退检测
    if (punchIn && punchOut && shift.segments.length > 0) {
      const firstSegment = shift.segments[0];
      const lastSegment = shift.segments[shift.segments.length - 1];

      if (firstSegment.type === 'NORMAL') {
        const [startHours, startMinutes] = firstSegment.startTime.split(':').map(Number);
        const scheduledStart = new Date(calcDate);
        scheduledStart.setHours(startHours, startMinutes, 0, 0);

        if (punchIn > scheduledStart) {
          const lateMinutes = (punchIn.getTime() - scheduledStart.getTime()) / (1000 * 60);
          exceptions.push({
            type: 'LATE',
            message: `迟到 ${Math.round(lateMinutes)} 分钟`,
            level: 'INFO',
          });
        }
      }

      if (lastSegment.type === 'NORMAL') {
        const [endHours, endMinutes] = lastSegment.endTime.split(':').map(Number);
        const scheduledEnd = new Date(calcDate);
        scheduledEnd.setHours(endHours, endMinutes, 0, 0);

        if (punchOut < scheduledEnd) {
          const earlyMinutes = (scheduledEnd.getTime() - punchOut.getTime()) / (1000 * 60);
          exceptions.push({
            type: 'EARLY',
            message: `早退 ${Math.round(earlyMinutes)} 分钟`,
            level: 'INFO',
          });
        }
      }
    }

    return exceptions;
  }
}
