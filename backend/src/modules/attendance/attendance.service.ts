import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getPersonalView(query: any) {
    const { employeeNo, startDate, endDate } = query;

    const results = await this.prisma.calcResult.findMany({
      where: {
        employeeNo,
        calcDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      orderBy: { calcDate: 'asc' },
    });

    // 计算统计
    const totalStandardHours = results.reduce((sum, r) => sum + r.standardHours, 0);
    const totalActualHours = results.reduce((sum, r) => sum + r.actualHours, 0);
    const totalOvertimeHours = results.reduce((sum, r) => sum + r.overtimeHours, 0);

    return {
      results,
      summary: {
        totalDays: results.length,
        totalStandardHours,
        totalActualHours,
        totalOvertimeHours,
      },
    };
  }

  async getDepartmentView(query: any) {
    const { orgId, startDate, endDate } = query;

    const employees = await this.prisma.employee.findMany({
      where: { orgId: +orgId, status: 'ACTIVE' },
    });

    const employeeNos = employees.map((e) => e.employeeNo);

    const results = await this.prisma.calcResult.findMany({
      where: {
        employeeNo: { in: employeeNos },
        calcDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        employee: true,
      },
    });

    return {
      employees,
      results,
    };
  }

  async getAccountView(query: any) {
    const { accountId, startDate, endDate } = query;

    const results = await this.prisma.calcResult.findMany({
      where: {
        calcDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    // 过滤并聚合账户工时
    const accountHours = results
      .map((r) => {
        const hours = JSON.parse(r.accountHours as any);
        return hours.find((h: any) => h.accountId === +accountId);
      })
      .filter(Boolean);

    const totalHours = accountHours.reduce((sum: number, h: any) => sum + h.hours, 0);

    return {
      accountId,
      totalHours,
      details: accountHours,
    };
  }

  async getDailyReport(query: any) {
    const { date } = query;

    const results = await this.prisma.calcResult.findMany({
      where: { calcDate: new Date(date) },
      include: { employee: true },
    });

    return {
      date,
      totalEmployees: results.length,
      results,
    };
  }

  async getWeeklyReport(query: any) {
    const { startDate, endDate } = query;

    const results = await this.prisma.calcResult.findMany({
      where: {
        calcDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: { employee: true },
    });

    return {
      startDate,
      endDate,
      results,
    };
  }

  async getMonthlyReport(query: any) {
    const { year, month } = query;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const results = await this.prisma.calcResult.findMany({
      where: {
        calcDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { employee: true },
    });

    return {
      year,
      month,
      results,
    };
  }

  async getExceptions(query: any) {
    const { page = 1, pageSize = 10, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      exceptions: {
        not: '[]',
      },
    };

    if (startDate || endDate) {
      where.calcDate = {};
      if (startDate) where.calcDate.gte = new Date(startDate);
      if (endDate) where.calcDate.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.calcResult.findMany({
        where,
        skip,
        take: +pageSize,
        include: { employee: true },
        orderBy: { calcDate: 'desc' },
      }),
      this.prisma.calcResult.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async handleException(id: number, dto: any) {
    // 简化实现
    return { message: '异常已处理' };
  }
}
