import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class DefinitionAttendanceCodeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查询定义出勤代码列表
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    code?: string;
    name?: string;
    type?: string;
    status?: string;
    calcAttendanceCode?: string;
  }) {
    const { page = 1, pageSize = 10, code, name, type, status, calcAttendanceCode } = params;

    const where: any = {};

    if (code) {
      where.code = { contains: code };
    }

    if (name) {
      where.name = { contains: name };
    }

    if (type) {
      where.type = type;
    }

    if (status) {
      where.status = status;
    }

    if (calcAttendanceCode) {
      where.calcAttendanceCode = calcAttendanceCode;
    }

    const [total, data] = await Promise.all([
      this.prisma.definitionAttendanceCode.count({ where }),
      this.prisma.definitionAttendanceCode.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { priority: 'asc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 查询定义出勤代码详情
   */
  async findOne(id: number) {
    const code = await this.prisma.definitionAttendanceCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException(`定义出勤代码 ID ${id} 不存在`);
    }

    return code;
  }

  /**
   * 创建定义出勤代码
   */
  async create(data: {
    code: string;
    name: string;
    type?: string;
    unit?: string;
    calculateHours?: boolean;
    showInDetailPage?: boolean;
    showInAttendanceCard?: boolean;
    priority?: number;
    color?: string;
    status?: string;
    calcAttendanceCode?: string;
    description?: string;
  }) {
    // 检查代码是否已存在
    const existing = await this.prisma.definitionAttendanceCode.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(`出勤代码 ${data.code} 已存在`);
    }

    // 如果指定了 calcAttendanceCode，检查它是否存在
    if (data.calcAttendanceCode) {
      const calcCode = await this.prisma.calculationAttendanceCode.findUnique({
        where: { code: data.calcAttendanceCode },
      });

      if (!calcCode) {
        throw new BadRequestException(`计算出勤代码 ${data.calcAttendanceCode} 不存在`);
      }
    }

    const code = await this.prisma.definitionAttendanceCode.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type || 'LEAN_HOURS',
        unit: data.unit || 'HOURS',
        priority: data.priority ?? 0,
        color: data.color || '#1890ff',
        status: data.status || 'ACTIVE',
        calcAttendanceCode: data.calcAttendanceCode,
        description: data.description,
      },
    });

    return code;
  }

  /**
   * 更新定义出勤代码
   */
  async update(
    id: number,
    data: {
      code?: string;
      name?: string;
      type?: string;
      unit?: string;
      calculateHours?: boolean;
      showInDetailPage?: boolean;
      showInAttendanceCard?: boolean;
      priority?: number;
      color?: string;
      status?: string;
      calcAttendanceCode?: string;
      description?: string;
    },
  ) {
    // 检查代码是否存在
    await this.findOne(id);

    // 如果要更新代码，检查新代码是否已被使用
    if (data.code) {
      const existing = await this.prisma.definitionAttendanceCode.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`出勤代码 ${data.code} 已被使用`);
      }
    }

    // 如果指定了 calcAttendanceCode，检查它是否存在
    if (data.calcAttendanceCode) {
      const calcCode = await this.prisma.calculationAttendanceCode.findUnique({
        where: { code: data.calcAttendanceCode },
      });

      if (!calcCode) {
        throw new BadRequestException(`计算出勤代码 ${data.calcAttendanceCode} 不存在`);
      }
    }

    const code = await this.prisma.definitionAttendanceCode.update({
      where: { id },
      data,
    });

    return code;
  }

  /**
   * 删除定义出勤代码
   */
  async remove(id: number) {
    // 检查代码是否存在
    await this.findOne(id);

    // 检查是否有关联的工时结果
    const workHourResultsCount = await this.prisma.workHourResult.count({
      where: { definitionAttendanceCodeId: id },
    });

    // 检查是否有关联的分摊工时
    const allocationWorkHoursCount = await this.prisma.allocationWorkHour.count({
      where: { definitionAttendanceCodeId: id },
    });

    if (workHourResultsCount > 0 || allocationWorkHoursCount > 0) {
      throw new BadRequestException(
        `该出勤代码已被 ${workHourResultsCount} 条工时结果和 ${allocationWorkHoursCount} 条分摊工时使用，无法删除`,
      );
    }

    await this.prisma.definitionAttendanceCode.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 获取所有启用的定义出勤代码（用于下拉选择）
   */
  async getActiveCodes() {
    const codes = await this.prisma.definitionAttendanceCode.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        color: true,
        calcAttendanceCode: true,
      },
    });

    return codes;
  }

  /**
   * 根据计算出勤代码查找对应的定义出勤代码
   */
  async findByCalcAttendanceCode(calcCode: string) {
    const definitionCode = await this.prisma.definitionAttendanceCode.findFirst({
      where: { calcAttendanceCode: calcCode },
    });

    return definitionCode;
  }

  /**
   * 根据代码查询定义出勤代码
   */
  async findByCode(code: string) {
    const attendanceCode = await this.prisma.definitionAttendanceCode.findUnique({
      where: { code },
    });

    if (!attendanceCode) {
      throw new NotFoundException(`定义出勤代码 ${code} 不存在`);
    }

    return attendanceCode;
  }

  /**
   * 批量查询定义出勤代码的映射关系
   */
  async getCodeMapping(calcCodes: string[]) {
    const definitionCodes = await this.prisma.definitionAttendanceCode.findMany({
      where: {
        calcAttendanceCode: { in: calcCodes },
        status: 'ACTIVE',
      },
      select: {
        id: true,
        code: true,
        name: true,
        calcAttendanceCode: true,
      },
    });

    // 返回映射关系 Map<calcCode, definitionCode>
    const mapping = new Map<string, { id: number; code: string; name: string }>();
    definitionCodes.forEach((dc) => {
      if (dc.calcAttendanceCode) {
        mapping.set(dc.calcAttendanceCode, {
          id: dc.id,
          code: dc.code,
          name: dc.name,
        });
      }
    });

    return mapping;
  }
}
