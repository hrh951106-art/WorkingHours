import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';

@Injectable()
export class CalculationAttendanceCodeService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查询计算出勤代码列表
   */
  async findAll(params: {
    page?: number;
    pageSize?: number;
    code?: string;
    name?: string;
    type?: string;
    status?: string;
  }) {
    const { page = 1, pageSize = 10, code, name, type, status } = params;

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

    const [total, data] = await Promise.all([
      this.prisma.calculationAttendanceCode.count({ where }),
      this.prisma.calculationAttendanceCode.findMany({
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
   * 查询计算出勤代码详情
   */
  async findOne(id: number) {
    const code = await this.prisma.calculationAttendanceCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException(`计算出勤代码 ID ${id} 不存在`);
    }

    return code;
  }

  /**
   * 创建计算出勤代码
   */
  async create(data: {
    code: string;
    name: string;
    type?: string;
    accountLevels?: string;
    unit?: string;
    deductMeal?: boolean;
    includeOutside?: boolean;
    onlyOutside?: boolean;
    calculateHours?: boolean;
    priority?: number;
    color?: string;
    status?: string;
    description?: string;
  }) {
    // 检查代码是否已存在
    const existing = await this.prisma.calculationAttendanceCode.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new BadRequestException(`出勤代码 ${data.code} 已存在`);
    }

    const code = await this.prisma.calculationAttendanceCode.create({
      data: {
        code: data.code,
        name: data.name,
        type: data.type || 'LEAN_HOURS',
        accountLevels: data.accountLevels || '[]',
        unit: data.unit || 'HOURS',
        deductMeal: data.deductMeal ?? false,
        includeOutside: data.includeOutside ?? false,
        onlyOutside: data.onlyOutside ?? false,
        calculateHours: data.calculateHours ?? true,
        priority: data.priority ?? 0,
        color: data.color || '#1890ff',
        status: data.status || 'ACTIVE',
        description: data.description,
      },
    });

    return code;
  }

  /**
   * 更新计算出勤代码
   */
  async update(id: number, data: {
    code?: string;
    name?: string;
    type?: string;
    accountLevels?: string;
    unit?: string;
    deductMeal?: boolean;
    includeOutside?: boolean;
    onlyOutside?: boolean;
    calculateHours?: boolean;
    priority?: number;
    color?: string;
    status?: string;
    description?: string;
  }) {
    // 检查代码是否存在
    await this.findOne(id);

    // 如果要更新代码，检查新代码是否已被使用
    if (data.code) {
      const existing = await this.prisma.calculationAttendanceCode.findFirst({
        where: {
          code: data.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException(`出勤代码 ${data.code} 已被使用`);
      }
    }

    const code = await this.prisma.calculationAttendanceCode.update({
      where: { id },
      data,
    });

    return code;
  }

  /**
   * 删除计算出勤代码
   */
  async remove(id: number) {
    // 检查代码是否存在
    await this.findOne(id);

    // 检查是否有关联的计算结果
    const calcResultsCount = await this.prisma.calcResult.count({
      where: { calculationAttendanceCodeId: id },
    });

    if (calcResultsCount > 0) {
      throw new BadRequestException(`该出勤代码已被 ${calcResultsCount} 条计算结果使用，无法删除`);
    }

    await this.prisma.calculationAttendanceCode.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 获取所有启用的计算出勤代码（用于下拉选择）
   */
  async getActiveCodes() {
    const codes = await this.prisma.calculationAttendanceCode.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { priority: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        color: true,
        unit: true,
        definitionAttendanceCodeId: true,
        definitionAttendanceCodeStr: true,
      },
    });

    return codes;
  }

  /**
   * 生成新的计算出勤代码编码
   */
  async generateCode() {
    const existingCodes = await this.prisma.calculationAttendanceCode.findMany({
      select: { code: true },
    });
    const codes = existingCodes.map(c => c.code);
    return {
      code: StringUtils.generateSequentialCode('AC', codes),
    };
  }

  /**
   * 根据代码查询计算出勤代码
   */
  async findByCode(code: string) {
    const attendanceCode = await this.prisma.calculationAttendanceCode.findUnique({
      where: { code },
    });

    if (!attendanceCode) {
      throw new NotFoundException(`计算出勤代码 ${code} 不存在`);
    }

    return attendanceCode;
  }
}
