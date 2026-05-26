import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import {
  QueryAttendanceDashboardDto,
  PunchDataItem,
  ScheduleDataItem,
  WorkHourResultItem,
  AttendanceDashboardSummary,
  AttendanceDashboardAllData,
} from './dto/query-attendance-dashboard.dto';

@Injectable()
export class AttendanceDashboardService {
  private readonly logger = new Logger(AttendanceDashboardService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 格式化日期为 YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取打卡数据
   */
  async getPunchData(query: QueryAttendanceDashboardDto): Promise<PunchDataItem[]> {
    const { employeeNo, startDate, endDate } = query;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    this.logger.log(`查询打卡数据: employeeNo=${employeeNo}, startDate=${startDate}, endDate=${endDate}`);

    // 验证员工是否存在
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { id: true, name: true, employeeNo: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 查询打卡配对数据
    const punchPairs = await this.prisma.attendancePunchPair.findMany({
      where: {
        employeeNo,
        punchDate: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { punchDate: 'asc' },
    });

    this.logger.log(`找到 ${punchPairs.length} 条打卡记录`);

    // 转换为响应格式
    return punchPairs.map((pair) => ({
      date: this.formatDate(pair.punchDate),
      punchDate: pair.punchDate,
      ruleId: pair.ruleId,
      ruleType: pair.ruleType,
      ruleName: pair.ruleName,
      workStartPunchTime: pair.workStartPunchTime,
      workEndPunchTime: pair.workEndPunchTime,
      workStartPunches: pair.workStartPunches ? JSON.parse(pair.workStartPunches) : [],
      workEndPunches: pair.workEndPunches ? JSON.parse(pair.workEndPunches) : [],
      shiftId: pair.workStartShiftId || pair.workEndShiftId,
      shiftName: pair.workStartShiftName || pair.workEndShiftName,
      accountId: pair.accountId,
      isContinuousShift: pair.isContinuousShift,
    }));
  }

  /**
   * 获取出勤结果数据
   */
  async getWorkHourResults(query: QueryAttendanceDashboardDto): Promise<WorkHourResultItem[]> {
    const { employeeNo, startDate, endDate } = query;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    this.logger.log(`查询工时结果: employeeNo=${employeeNo}, startDate=${startDate}, endDate=${endDate}`);

    // 查询工时结果
    const workHourResults = await this.prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate: {
          gte: start,
          lte: end,
        },
        definitionAttendanceCode: {
          showInAttendanceCard: true,
        },
      },
      include: {
        definitionAttendanceCode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { calcDate: 'asc' },
    });

    this.logger.log(`找到 ${workHourResults.length} 条工时结果`);

    // 按劳动力账户和出勤代码汇总工时
    const summaryMap = new Map<string, {
      accountId: number;
      accountName: string;
      attendanceCodeId: number;
      attendanceCodeStr: string;
      attendanceCodeName: string;
      totalHours: number;
      totalAmount: number;
    }>();

    workHourResults.forEach((result) => {
      const accountName = result.accountName || '未分配';
      const attendanceCodeStr = result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类';
      const key = `${accountName}|${attendanceCodeStr}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          accountId: result.accountId || 0,
          accountName,
          attendanceCodeId: result.definitionAttendanceCodeId || 0,
          attendanceCodeStr,
          attendanceCodeName: result.definitionAttendanceCode?.name || result.definitionAttendanceCodeStr || '未分类',
          totalHours: 0,
          totalAmount: 0,
        });
      }

      const summary = summaryMap.get(key)!;
      summary.totalHours += result.workHours || 0;
      summary.totalAmount += result.amount || 0;
    });

    // 转换为数组并按账户名称、出勤代码排序
    const results = Array.from(summaryMap.values()).sort((a, b) => {
      if (a.accountName !== b.accountName) {
        return a.accountName.localeCompare(b.accountName, 'zh-CN');
      }
      return a.attendanceCodeName.localeCompare(b.attendanceCodeName, 'zh-CN');
    });

    return results.map(item => ({
      accountName: item.accountName,
      attendanceCodeName: item.attendanceCodeName,
      totalHours: Math.round(item.totalHours * 100) / 100,
      totalAmount: Math.round(item.totalAmount * 100) / 100,
    }));
  }

  /**
   * 获取工时明细数据（按账户和出勤代码分组的明细）
   */
  async getWorkHourDetails(query: QueryAttendanceDashboardDto & { accountName: string; attendanceCodeName: string }) {
    const { employeeNo, startDate, endDate, accountName, attendanceCodeName } = query;
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    this.logger.log(`查询工时明细: employeeNo=${employeeNo}, accountName=${accountName}, attendanceCodeName=${attendanceCodeName}`);

    // 查询符合条件的工时结果明细
    const workHourDetails = await this.prisma.workHourResult.findMany({
      where: {
        employeeNo,
        calcDate: {
          gte: start,
          lte: end,
        },
        accountName: accountName,
        definitionAttendanceCode: {
          name: attendanceCodeName,
          showInAttendanceCard: true,
        },
      },
      include: {
        definitionAttendanceCode: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { calcDate: 'asc' },
    });

    this.logger.log(`找到 ${workHourDetails.length} 条工时明细`);

    // 转换为响应格式
    return workHourDetails.map((detail) => ({
      date: this.formatDate(detail.calcDate),
      calcDate: detail.calcDate,
      accountName: detail.accountName,
      attendanceCodeName: detail.definitionAttendanceCode?.name || detail.definitionAttendanceCodeStr,
      startTime: detail.startTime,
      endTime: detail.endTime,
      workHours: detail.workHours,
      amount: detail.amount || 0,
      shiftName: detail.shiftName,
    }));
  }

  /**
   * 获取排班数据
   */
  async getSchedules(query: QueryAttendanceDashboardDto): Promise<ScheduleDataItem[]> {
    const { employeeNo, startDate, endDate } = query;

    // 先获取员工ID
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { id: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    this.logger.log(`查询排班数据: employeeNo=${employeeNo}, startDate=${startDate}, endDate=${endDate}`);

    // 查询排班数据
    const schedules = await this.prisma.schedule.findMany({
      where: {
        employeeId: employee.id,
        scheduleDate: {
          gte: start,
          lte: end,
        },
      },
      include: {
        shift: {
          select: {
            id: true,
            name: true,
            code: true,
            type: true,
            standardHours: true,
          },
        },
      },
      orderBy: { scheduleDate: 'asc' },
    });

    this.logger.log(`找到 ${schedules.length} 条排班记录`);

    // 转换为响应格式
    return schedules.map((schedule) => ({
      date: this.formatDate(schedule.scheduleDate),
      scheduleDate: schedule.scheduleDate,
      shiftId: schedule.shiftId,
      shiftName: schedule.shift.name,
      adjustedStart: schedule.adjustedStart,
      adjustedEnd: schedule.adjustedEnd,
      status: schedule.status,
    }));
  }

  /**
   * 获取汇总数据
   */
  async getSummary(query: QueryAttendanceDashboardDto): Promise<AttendanceDashboardSummary> {
    const { employeeNo, startDate, endDate } = query;

    this.logger.log(`计算汇总数据: employeeNo=${employeeNo}, startDate=${startDate}, endDate=${endDate}`);

    // 获取员工信息
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNo },
      select: { name: true, employeeNo: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 获取工时结果数据
    const workHourResults = await this.getWorkHourResults(query);

    // 计算总天数和总工时
    const totalDays = workHourResults.length;
    const totalWorkHours = workHourResults.reduce((sum, item) => sum + item.workHours, 0);

    // 按出勤代码汇总
    const codeMap = new Map<number | undefined, any>();
    workHourResults.forEach((item) => {
      const key = item.definitionAttendanceCodeId;
      if (!codeMap.has(key)) {
        codeMap.set(key, {
          attendanceCodeId: item.definitionAttendanceCodeId,
          attendanceCodeStr: item.definitionAttendanceCodeStr || '未分类',
          totalHours: 0,
          days: new Set<number>(),
        });
      }
      const summary = codeMap.get(key);
      summary.totalHours += item.workHours;
      summary.days.add(item.date);
    });

    // 按账户汇总
    const accountMap = new Map<number | undefined, any>();
    workHourResults.forEach((item) => {
      const key = item.accountId;
      if (!accountMap.has(key)) {
        accountMap.set(key, {
          accountId: item.accountId,
          accountName: item.accountName || '未分配',
          totalHours: 0,
          days: new Set<number>(),
        });
      }
      const summary = accountMap.get(key);
      summary.totalHours += item.workHours;
      summary.days.add(item.date);
    });

    const summaryData: AttendanceDashboardSummary = {
      employeeNo: employee.employeeNo,
      employeeName: employee.name,
      startDate,
      endDate,
      totalDays,
      totalWorkHours: Math.round(totalWorkHours * 100) / 100,
      byAttendanceCode: Array.from(codeMap.values()).map((item) => ({
        attendanceCodeId: item.attendanceCodeId,
        attendanceCodeStr: item.attendanceCodeStr,
        totalHours: Math.round(item.totalHours * 100) / 100,
        days: item.days.size,
      })),
      byAccount: Array.from(accountMap.values()).map((item) => ({
        accountId: item.accountId,
        accountName: item.accountName,
        totalHours: Math.round(item.totalHours * 100) / 100,
        days: item.days.size,
      })),
    };

    this.logger.log(`汇总完成: totalDays=${totalDays}, totalWorkHours=${summaryData.totalWorkHours}`);

    return summaryData;
  }

  /**
   * 获取所有数据（一次性返回）
   */
  async getAllData(query: QueryAttendanceDashboardDto): Promise<AttendanceDashboardAllData> {
    this.logger.log(`获取所有数据: employeeNo=${query.employeeNo}, startDate=${query.startDate}, endDate=${query.endDate}`);

    const [punchData, workHourResults, schedules, summary] = await Promise.all([
      this.getPunchData(query),
      this.getWorkHourResults(query),
      this.getSchedules(query),
      this.getSummary(query),
    ]);

    return {
      punchData,
      workHourResults,
      schedules,
      summary,
    };
  }
}
