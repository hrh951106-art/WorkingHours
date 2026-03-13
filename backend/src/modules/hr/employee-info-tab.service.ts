import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeeInfoTabService {
  constructor(private prisma: PrismaService) {}

  async getTabs() {
    const tabs = await this.prisma.employeeInfoTab.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sort: 'asc' },
      include: {
        fields: {
          orderBy: { sort: 'asc' },
        },
      },
    });

    // 获取所有自定义字段（包含 dataSource 信息）
    const customFields = await this.prisma.customField.findMany({
      include: {
        dataSource: {
          include: {
            options: {
              where: { isActive: true },
              orderBy: { sort: 'asc' },
            },
          },
        },
      },
    });

    // 为每个字段添加 type 信息
    return tabs.map((tab) => ({
      ...tab,
      fields: tab.fields.map((field) => {
        if (field.fieldType === 'CUSTOM') {
          const customField = customFields.find((cf) => cf.code === field.fieldCode);
          return {
            ...field,
            type: customField?.type || 'TEXT',
            dataSource: customField?.dataSource || null,
          };
        }
        return field;
      }),
    }));
  }

  async getTab(id: number) {
    const tab = await this.prisma.employeeInfoTab.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!tab) {
      throw new NotFoundException('页签不存在');
    }

    // 获取所有自定义字段
    const customFields = await this.prisma.customField.findMany();

    // 为每个字段添加 type 信息
    return {
      ...tab,
      fields: tab.fields.map((field) => {
        if (field.fieldType === 'CUSTOM') {
          const customField = customFields.find((cf) => cf.code === field.fieldCode);
          return {
            ...field,
            type: customField?.type || 'TEXT',
          };
        }
        return field;
      }),
    };
  }

  async createTab(dto: any) {
    const { code, name, description, isSystem = false, sort = 0, status = 'ACTIVE' } = dto;

    return this.prisma.employeeInfoTab.create({
      data: {
        code,
        name,
        description,
        isSystem,
        sort,
        status,
      },
    });
  }

  async updateTab(id: number, dto: any) {
    const existing = await this.prisma.employeeInfoTab.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('页签不存在');
    }

    // 系统内置页签不能修改code和isSystem
    if (existing.isSystem) {
      delete dto.code;
      delete dto.isSystem;
    }

    return this.prisma.employeeInfoTab.update({
      where: { id },
      data: dto,
    });
  }

  async deleteTab(id: number) {
    const existing = await this.prisma.employeeInfoTab.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('页签不存在');
    }

    if (existing.isSystem) {
      throw new Error('系统内置页签不能删除');
    }

    return this.prisma.employeeInfoTab.delete({
      where: { id },
    });
  }

  async addFieldToTab(tabId: number, dto: any) {
    const { fieldCode, fieldName, fieldType, isRequired = false, sort = 0 } = dto;

    return this.prisma.employeeInfoTabField.create({
      data: {
        tabId,
        fieldCode,
        fieldName,
        fieldType,
        isRequired,
        sort,
      },
    });
  }

  async removeFieldFromTab(tabId: number, id: number) {
    return this.prisma.employeeInfoTabField.delete({
      where: { id },
    });
  }

  async updateFieldInTab(tabId: number, id: number, dto: any) {
    const existing = await this.prisma.employeeInfoTabField.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('字段不存在');
    }

    return this.prisma.employeeInfoTabField.update({
      where: { id },
      data: dto,
    });
  }

  async reorderFields(tabId: number, fields: any[]) {
    // 使用事务批量更新排序
    const updates = fields.map((field) =>
      this.prisma.employeeInfoTabField.update({
        where: { id: field.id },
        data: { sort: field.sort },
      })
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }
}
