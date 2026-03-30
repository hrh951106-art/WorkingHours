import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ShiftPropertyDefinitionService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取所有班次属性定义
   */
  async findAll() {
    return this.prisma.shiftPropertyDefinition.findMany({
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 获取启用的班次属性定义
   */
  async findActive() {
    return this.prisma.shiftPropertyDefinition.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sortOrder: 'asc' },
    });
  }

  /**
   * 根据ID获取属性定义
   */
  async findOne(id: number) {
    const definition = await this.prisma.shiftPropertyDefinition.findUnique({
      where: { id },
    });

    if (!definition) {
      throw new NotFoundException('属性定义不存在');
    }

    return definition;
  }

  /**
   * 创建属性定义
   */
  async create(dto: any) {
    // 检查 propertyKey 是否已存在
    const existing = await this.prisma.shiftPropertyDefinition.findUnique({
      where: { propertyKey: dto.propertyKey },
    });

    if (existing) {
      throw new BadRequestException('属性键已存在');
    }

    return this.prisma.shiftPropertyDefinition.create({
      data: {
        propertyKey: dto.propertyKey,
        name: dto.name,
        description: dto.description,
        valueType: dto.valueType || 'TEXT',
        options: dto.options,
        sortOrder: dto.sortOrder || 0,
        status: dto.status || 'ACTIVE',
      },
    });
  }

  /**
   * 更新属性定义
   */
  async update(id: number, dto: any) {
    const existing = await this.findOne(id);

    // 如果修改了 propertyKey，检查是否冲突
    if (dto.propertyKey && dto.propertyKey !== existing.propertyKey) {
      const conflict = await this.prisma.shiftPropertyDefinition.findUnique({
        where: { propertyKey: dto.propertyKey },
      });

      if (conflict) {
        throw new BadRequestException('属性键已存在');
      }
    }

    return this.prisma.shiftPropertyDefinition.update({
      where: { id },
      data: {
        ...(dto.propertyKey && { propertyKey: dto.propertyKey }),
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.valueType && { valueType: dto.valueType }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.status && { status: dto.status }),
      },
    });
  }

  /**
   * 删除属性定义
   */
  async delete(id: number) {
    const existing = await this.findOne(id);

    // 检查是否有班次使用了这个属性
    const usageCount = await this.prisma.shiftProperty.count({
      where: { propertyKey: existing.propertyKey },
    });

    if (usageCount > 0) {
      throw new BadRequestException(`该属性正在被 ${usageCount} 个班次使用，无法删除`);
    }

    await this.prisma.shiftPropertyDefinition.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }
}
