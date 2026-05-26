import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { StringUtils } from '../../common/utils';

@Injectable()
export class AttendanceCodeDefinitionService {
  constructor(private prisma: PrismaService) {}

  async getAttendanceCodeDefinitions() {
    return this.prisma.definitionAttendanceCode.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async getAttendanceCodeDefinition(id: number) {
    const code = await this.prisma.definitionAttendanceCode.findUnique({
      where: { id },
    });

    if (!code) {
      throw new NotFoundException('出勤代码定义不存在');
    }

    return code;
  }

  async createAttendanceCodeDefinition(dto: any) {
    return this.prisma.$transaction(async (tx) => {
      // 创建出勤代码定义
      const code = await tx.definitionAttendanceCode.create({
        data: {
          code: dto.code || StringUtils.generateCode('ACD'),
          name: dto.name,
          type: dto.type || 'LEAN_HOURS',
          unit: dto.unit || 'HOURS',
          calcAttendanceCode: dto.calcAttendanceCode || null,
          showInDetailPage: dto.showInDetailPage ?? false,
          showInAttendanceCard: dto.showInAttendanceCard ?? false,
          calculateHours: dto.calculateHours ?? true,
          color: dto.color || '#1890ff',
          priority: dto.priority ?? 0,
          status: dto.status || 'ACTIVE',
          description: dto.description || null,
          // 考勤工时专用配置
          deductMealTime: dto.deductMealTime ?? false,
        },
      });

      // 如果选择了映射的计算代码，同步更新 CalculationAttendanceCode 表
      if (dto.calcAttendanceCode) {
        // 查找对应的计算代码
        const calcCode = await tx.calculationAttendanceCode.findFirst({
          where: { code: dto.calcAttendanceCode },
        });

        if (calcCode) {
          // 更新 CalculationAttendanceCode 的关联字段
          await tx.calculationAttendanceCode.update({
            where: { id: calcCode.id },
            data: {
              definitionAttendanceCodeId: code.id,
              definitionAttendanceCodeStr: code.code,
            },
          });
        }
      }

      return code;
    });
  }

  async updateAttendanceCodeDefinition(id: number, dto: any) {
    const existing = await this.prisma.definitionAttendanceCode.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('出勤代码定义不存在');
    }

    return this.prisma.$transaction(async (tx) => {
      // 更新出勤代码定义
      const code = await tx.definitionAttendanceCode.update({
        where: { id },
        data: {
          code: dto.code,
          name: dto.name,
          type: dto.type,
          unit: dto.unit,
          calcAttendanceCode: dto.calcAttendanceCode,
          showInDetailPage: dto.showInDetailPage,
          showInAttendanceCard: dto.showInAttendanceCard,
          calculateHours: dto.calculateHours,
          color: dto.color,
          priority: dto.priority,
          status: dto.status,
          description: dto.description,
          // 考勤工时专用配置
          deductMealTime: dto.deductMealTime ?? false,
        },
      });

      // 处理映射计算代码的变更
      const oldCalcCode = existing.calcAttendanceCode;
      const newCalcCode = dto.calcAttendanceCode;

      // 清除旧关联
      if (oldCalcCode && oldCalcCode !== newCalcCode) {
        const oldCalc = await tx.calculationAttendanceCode.findFirst({
          where: { code: oldCalcCode },
        });

        if (oldCalc && oldCalc.definitionAttendanceCodeId === id) {
          await tx.calculationAttendanceCode.update({
            where: { id: oldCalc.id },
            data: {
              definitionAttendanceCodeId: null,
              definitionAttendanceCodeStr: null,
            },
          });
        }
      }

      // 建立新关联
      if (newCalcCode && newCalcCode !== oldCalcCode) {
        const newCalc = await tx.calculationAttendanceCode.findFirst({
          where: { code: newCalcCode },
        });

        if (newCalc) {
          await tx.calculationAttendanceCode.update({
            where: { id: newCalc.id },
            data: {
              definitionAttendanceCodeId: id,
              definitionAttendanceCodeStr: code.code,
            },
          });
        }
      }

      return code;
    });
  }

  async deleteAttendanceCodeDefinition(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // 查找关联的计算代码
      const definitionCode = await tx.definitionAttendanceCode.findUnique({
        where: { id },
      });

      if (!definitionCode) {
        throw new NotFoundException('出勤代码定义不存在');
      }

      // 清除 CalculationAttendanceCode 中的关联
      await tx.calculationAttendanceCode.updateMany({
        where: {
          definitionAttendanceCodeId: id,
        },
        data: {
          definitionAttendanceCodeId: null,
          definitionAttendanceCodeStr: null,
        },
      });

      // 删除出勤代码定义
      await tx.definitionAttendanceCode.delete({
        where: { id },
      });

      return { message: '删除成功' };
    });
  }
}
