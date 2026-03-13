import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';
import { PairingService } from '../punch/pairing.service';
import { DataScopeService } from '../../common/filters/data-scope.filter';

@Injectable()
export class ShiftService {
  constructor(
    private prisma: PrismaService,
    private pairingService: PairingService,
    private dataScopeService: DataScopeService,
  ) {}

  async getShifts() {
    return this.prisma.shift.findMany({
      where: { status: 'ACTIVE' },
      include: {
        segments: {
          include: {
            account: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getShift(id: number) {
    const shift = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        segments: {
          include: {
            account: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!shift) {
      throw new NotFoundException('班次不存在');
    }

    return shift;
  }

  async createShift(dto: any) {
    const { segments, ...shiftData } = dto;

    // 计算标准工时和休息时长
    let standardHours = 0;
    let breakHours = 0;

    segments?.forEach((seg: any) => {
      if (seg.type === 'NORMAL' || seg.type === 'TRANSFER') {
        standardHours += seg.duration || 0;
      } else if (seg.type === 'REST') {
        breakHours += seg.duration || 0;
      }
    });

    // 保留2位小数
    standardHours = Math.round(standardHours * 100) / 100;
    breakHours = Math.round(breakHours * 100) / 100;

    return this.prisma.$transaction(async (tx) => {
      // 创建班次
      const shift = await tx.shift.create({
        data: {
          ...shiftData,
          code: shiftData.code || StringUtils.generateCode('SHIFT'),
          standardHours,
          breakHours,
        },
      });

      // 创建班段
      if (segments && segments.length > 0) {
        await tx.shiftSegment.createMany({
          data: segments.map((seg: any) => ({
            shiftId: shift.id,
            type: seg.type,
            startDate: seg.startDate,
            startTime: seg.startTime,
            endDate: seg.endDate,
            endTime: seg.endTime,
            duration: seg.duration,
            accountId: seg.accountId || null,
          })),
        });
      }

      return this.getShift(shift.id);
    });
  }

  async updateShift(id: number, dto: any) {
    const existing = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        schedules: {
          select: {
            id: true,
            employee: {
              select: {
                employeeNo: true,
              },
            },
            scheduleDate: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('班次不存在');
    }

    const { segments, ...shiftData } = dto;

    // 计算标准工时和休息时长
    let standardHours = 0;
    let breakHours = 0;

    segments?.forEach((seg: any) => {
      if (seg.type === 'NORMAL' || seg.type === 'TRANSFER') {
        standardHours += seg.duration || 0;
      } else if (seg.type === 'REST') {
        breakHours += seg.duration || 0;
      }
    });

    // 保留2位小数
    standardHours = Math.round(standardHours * 100) / 100;
    breakHours = Math.round(breakHours * 100) / 100;

    const result = await this.prisma.$transaction(async (tx) => {
      // 更新班次基本信息
      await tx.shift.update({
        where: { id },
        data: {
          ...shiftData,
          standardHours,
          breakHours,
        },
      });

      // 删除旧的班段
      await tx.shiftSegment.deleteMany({
        where: { shiftId: id },
      });

      // 创建新的班段
      if (segments && segments.length > 0) {
        await tx.shiftSegment.createMany({
          data: segments.map((seg: any) => ({
            shiftId: id,
            type: seg.type,
            startDate: seg.startDate,
            startTime: seg.startTime,
            endDate: seg.endDate,
            endTime: seg.endTime,
            duration: seg.duration,
            accountId: seg.accountId || null,
          })),
        });
      }

      return this.getShift(id);
    });

    // 异步触发重新摆卡（不阻塞响应）
    // 为所有使用该班次的排班触发摆卡
    if (existing.schedules && existing.schedules.length > 0) {
      for (const schedule of existing.schedules) {
        this.pairingService
          .pairPunches(schedule.employee.employeeNo, schedule.scheduleDate)
          .catch((error) => {
            console.error(
              `员工 ${schedule.employee.employeeNo} 日期 ${schedule.scheduleDate.toISOString()} 摆卡失败:`,
              error
            );
          });
      }
    }

    return result;
  }

  async deleteShift(id: number) {
    const existing = await this.prisma.shift.findUnique({
      where: { id },
      include: {
        schedules: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('班次不存在');
    }

    // 检查是否有关联的排班
    if (existing.schedules.length > 0) {
      throw new BadRequestException('该班次已关联排班，无法删除');
    }

    await this.prisma.shift.update({
      where: { id },
      data: { status: 'INACTIVE' },
    });

    return { message: '删除成功' };
  }

  async getSchedules(query: any, user?: any) {
    const { page = 1, pageSize = 10, employeeId, startDate, endDate } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (employeeId) where.employeeId = +employeeId;
    if (startDate || endDate) {
      where.scheduleDate = {};
      if (startDate) where.scheduleDate.gte = new Date(startDate);
      if (endDate) where.scheduleDate.lte = new Date(endDate);
    }

    // 应用数据权限过滤
    if (user && user.username !== 'admin') {
      const dataScopeFilter = await this.dataScopeService.getScheduleFilter(user, user.orgId);
      // 需要先将employeeNo转换为employeeId
      if (dataScopeFilter.employeeNo) {
        const employees = await this.prisma.employee.findMany({
          where: { employeeNo: dataScopeFilter.employeeNo.in || dataScopeFilter.employeeNo },
          select: { id: true },
        });
        where.employeeId = { in: employees.map(e => e.id) };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.schedule.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          employee: true,
          shift: true,
        },
        orderBy: { scheduleDate: 'desc' },
      }),
      this.prisma.schedule.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getScheduleCalendar(query: any) {
    const { startDate, endDate, employeeId, orgId, search } = query;

    const where: any = {};

    // 如果指定了员工ID，只查询该员工
    if (employeeId) {
      where.employeeId = +employeeId;
    }

    // 日期范围过滤
    if (startDate || endDate) {
      where.scheduleDate = {};
      if (startDate) where.scheduleDate.gte = new Date(startDate);
      if (endDate) where.scheduleDate.lte = new Date(endDate);
    }

    // 查询符合条件的排班
    const schedules = await this.prisma.schedule.findMany({
      where,
      include: {
        employee: {
          include: {
            org: true,
          },
        },
        shift: {
          include: {
            segments: true,
          },
        },
      },
      orderBy: { scheduleDate: 'asc' },
    });

    // 合并班段覆盖信息
    const schedulesWithOverrides = schedules.map((schedule: any) => {
      let segments = schedule.shift.segments || [];

      // 如果有班段覆盖信息，则合并
      if (schedule.adjustedSegments) {
        try {
          const overrides = JSON.parse(schedule.adjustedSegments);
          segments = segments.map((seg: any) => {
            const override = overrides.find((o: any) => o.id === seg.id);
            return override ? { ...seg, ...override } : seg;
          });
        } catch (e) {
          console.error('Failed to parse adjustedSegments:', e);
        }
      }

      return {
        ...schedule,
        segments,
      };
    });

    // 如果有组织过滤或搜索，在返回前过滤
    let filteredSchedules = schedulesWithOverrides;

    if (orgId) {
      filteredSchedules = filteredSchedules.filter((s: any) => s.employee?.orgId === +orgId);
    }

    if (search) {
      filteredSchedules = filteredSchedules.filter((s: any) =>
        s.employee?.name?.includes(search) ||
        s.employee?.employeeNo?.includes(search)
      );
    }

    return filteredSchedules;
  }

  async createSchedule(dto: any) {
    return this.prisma.schedule.create({
      data: dto,
    });
  }

  async batchCreateSchedules(dto: any) {
    const { schedules } = dto;

    // 支持两种格式：
    // 1. 直接传递schedules数组：{ schedules: [{ employeeId, shiftId, scheduleDate }, ...] }
    // 2. 传递employeeIds和单个日期：{ employeeIds, shiftId, startDate }

    let scheduleData = schedules;

    if (!scheduleData && dto.employeeIds) {
      // 兼容旧格式
      scheduleData = dto.employeeIds.map((employeeId: number) => ({
        employeeId,
        shiftId: dto.shiftId,
        scheduleDate: new Date(dto.startDate),
      }));
    }

    if (!scheduleData || scheduleData.length === 0) {
      throw new BadRequestException('请提供排班数据');
    }

    // 批量创建排班
    const result = await this.prisma.$transaction(async (tx) => {
      const results = [];

      for (const item of scheduleData) {
        // 检查该员工在该日期是否已有排班
        const existing = await tx.schedule.findFirst({
          where: {
            employeeId: item.employeeId,
            scheduleDate: new Date(item.scheduleDate),
            status: { not: 'CANCELLED' },
          },
        });

        if (existing) {
          // 如果已存在，则更新
          const updated = await tx.schedule.update({
            where: { id: existing.id },
            data: {
              shiftId: item.shiftId,
              status: 'ACTIVE',
              pushStatus: 'PENDING',
            },
            include: {
              employee: true,
              shift: true,
            },
          });
          results.push(updated);
        } else {
          // 如果不存在，则创建
          const created = await tx.schedule.create({
            data: {
              employeeId: item.employeeId,
              shiftId: item.shiftId,
              scheduleDate: new Date(item.scheduleDate),
              status: 'ACTIVE',
              pushStatus: 'PENDING',
            },
            include: {
              employee: true,
              shift: true,
            },
          });
          results.push(created);
        }
      }

      return {
        message: `成功处理${results.length}条排班`,
        count: results.length,
        schedules: results,
      };
    });

    // 异步触发摆卡（不阻塞响应）
    // 为所有创建/更新的排班触发摆卡
    for (const schedule of result.schedules) {
      this.pairingService
        .pairPunches(schedule.employee.employeeNo, schedule.scheduleDate)
        .catch((error) => {
          console.error(
            `员工 ${schedule.employee.employeeNo} 日期 ${schedule.scheduleDate.toISOString()} 摆卡失败:`,
            error
          );
        });
    }

    return result;
  }

  async updateSchedule(id: number, dto: any) {
    const { adjustedSegments, ...otherData } = dto;

    // 如果提供了adjustedSegments，则从中提取开始和结束时间，并保存班段覆盖信息
    let updateData = otherData;

    if (adjustedSegments && adjustedSegments.length > 0) {
      // 获取排班记录以获取日期
      const schedule = await this.prisma.schedule.findUnique({
        where: { id },
      });

      if (!schedule) {
        throw new Error('排班记录不存在');
      }

      const firstSegment = adjustedSegments[0];
      const lastSegment = adjustedSegments[adjustedSegments.length - 1];

      // 将时间字符串（HH:mm）与日期组合成完整的 DateTime
      const scheduleDate = schedule.scheduleDate;
      const [startHour, startMinute] = firstSegment.startTime.split(':').map(Number);
      const [endHour, endMinute] = lastSegment.endTime.split(':').map(Number);

      const adjustedStart = new Date(scheduleDate);
      adjustedStart.setHours(startHour, startMinute, 0, 0);

      const adjustedEnd = new Date(scheduleDate);
      adjustedEnd.setHours(endHour, endMinute, 0, 0);

      // 构建班段覆盖数据，只保存需要覆盖的字段（如 accountId）
      const segmentOverrides = adjustedSegments.map((seg: any) => ({
        id: seg.id,
        accountId: seg.accountId,
      }));

      updateData = {
        ...otherData,
        adjustedStart,
        adjustedEnd,
        adjustedSegments: JSON.stringify(segmentOverrides),
      };
    }

    return this.prisma.schedule.update({
      where: { id },
      data: updateData,
    });
  }

  async cancelSchedule(id: number, body: any) {
    await this.prisma.schedule.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelReason: body.reason,
      },
    });
    return { message: '取消成功' };
  }

  async deleteSchedule(id: number) {
    await this.prisma.schedule.delete({
      where: { id },
    });
    return { message: '删除成功' };
  }

  async getTransfers(query: any) {
    const { page = 1, pageSize = 10, scheduleId } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (scheduleId) where.scheduleId = +scheduleId;

    const [items, total] = await Promise.all([
      this.prisma.accountTransfer.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          schedule: true,
          account: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.accountTransfer.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async createTransfer(dto: any) {
    return this.prisma.accountTransfer.create({
      data: dto,
    });
  }
}
