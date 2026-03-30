import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class EmployeeInfoTabService {
  constructor(private prisma: PrismaService) {}

  async getTabs() {
    const tabs = await this.prisma.employeeInfoTab.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sort: 'asc' },
      include: {
        groups: {
          orderBy: { sort: 'asc' },
          include: {
            fields: {
              orderBy: { sort: 'asc' },
            },
          },
        },
        fields: {
          where: { groupId: null },
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

    // 为每个字段添加 type 信息（返回所有页签和分组，用于配置页面）
    return tabs.map((tab) => {
      // 处理分组内的字段
      const groupsWithFields = tab.groups.map((group) => ({
        ...group,
        fields: group.fields.map((field) => this.enrichFieldWithType(field, customFields)),
      }));

      // 处理未分组的字段
      const ungroupedFields = tab.fields.map((field) => this.enrichFieldWithType(field, customFields));

      return {
        ...tab,
        groups: groupsWithFields,
        fields: ungroupedFields,
      };
    });
  }

  async getTabsForDisplay() {
    const tabs = await this.prisma.employeeInfoTab.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { sort: 'asc' },
      include: {
        groups: {
          where: { status: 'ACTIVE' },
          orderBy: { sort: 'asc' },
          include: {
            fields: {
              orderBy: { sort: 'asc' },
            },
          },
        },
        fields: {
          where: { groupId: null },
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

    // 为每个字段添加 type 信息，并过滤掉没有启用分组的页签（用于员工详情/新增页面）
    return tabs
      .filter((tab) => {
        // 检查页签是否有启用的分组，或有未分组的字段
        const hasActiveGroupsWithFields = tab.groups.some((group) => group.fields && group.fields.length > 0);
        const hasUngroupedFields = tab.fields && tab.fields.length > 0;
        return hasActiveGroupsWithFields || hasUngroupedFields;
      })
      .map((tab) => {
        // 只保留有字段的启用分组
        const activeGroupsWithFields = tab.groups.filter((group) => group.fields && group.fields.length > 0);

        // 处理分组内的字段
        const groupsWithFields = activeGroupsWithFields.map((group) => ({
          ...group,
          fields: group.fields.map((field) => this.enrichFieldWithType(field, customFields)),
        }));

        // 处理未分组的字段
        const ungroupedFields = tab.fields.map((field) => this.enrichFieldWithType(field, customFields));

        return {
          ...tab,
          groups: groupsWithFields,
          fields: ungroupedFields,
        };
      });
  }

  private enrichFieldWithType(field: any, customFields: any[]) {
    if (field.fieldType === 'CUSTOM') {
      const customField = customFields.find((cf) => cf.code === field.fieldCode);
      return {
        ...field,
        type: customField?.type || 'TEXT',
        dataSource: customField?.dataSource || null,
      };
    }
    return field;
  }

  async getTab(id: number) {
    const tab = await this.prisma.employeeInfoTab.findUnique({
      where: { id },
      include: {
        groups: {
          orderBy: { sort: 'asc' },
          include: {
            fields: {
              orderBy: { sort: 'asc' },
            },
          },
        },
        fields: {
          where: { groupId: null },
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!tab) {
      throw new NotFoundException('页签不存在');
    }

    // 获取所有自定义字段
    const customFields = await this.prisma.customField.findMany();

    // 处理分组内的字段
    const groupsWithFields = tab.groups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => this.enrichFieldWithType(field, customFields)),
    }));

    // 处理未分组的字段
    const ungroupedFields = tab.fields.map((field) => this.enrichFieldWithType(field, customFields));

    return {
      ...tab,
      groups: groupsWithFields,
      fields: ungroupedFields,
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

  // ========== 分组相关方法 ==========

  async getGroups(tabId: number) {
    const groups = await this.prisma.employeeInfoTabGroup.findMany({
      where: {
        tabId,
      },
      orderBy: { sort: 'asc' },
      include: {
        fields: {
          orderBy: { sort: 'asc' },
        },
      },
    });

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

    return groups.map((group) => ({
      ...group,
      fields: group.fields.map((field) => this.enrichFieldWithType(field, customFields)),
    }));
  }

  async createGroup(tabId: number, dto: any) {
    const { code, name, description, sort = 0, collapsed = false, status = 'ACTIVE' } = dto;

    // 检查页签是否存在
    const tab = await this.prisma.employeeInfoTab.findUnique({
      where: { id: tabId },
    });

    if (!tab) {
      throw new NotFoundException('页签不存在');
    }

    return this.prisma.employeeInfoTabGroup.create({
      data: {
        tabId,
        code,
        name,
        description,
        sort,
        collapsed,
        status,
      },
    });
  }

  async updateGroup(groupId: number, dto: any) {
    const existing = await this.prisma.employeeInfoTabGroup.findUnique({
      where: { id: groupId },
    });

    if (!existing) {
      throw new NotFoundException('分组不存在');
    }

    return this.prisma.employeeInfoTabGroup.update({
      where: { id: groupId },
      data: dto,
    });
  }

  async deleteGroup(groupId: number) {
    const group = await this.prisma.employeeInfoTabGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('分组不存在');
    }

    if (group.isSystem) {
      throw new Error('系统内置分组不能删除');
    }

    // 将该分组下的所有字段的 groupId 设为 null
    await this.prisma.employeeInfoTabField.updateMany({
      where: { groupId },
      data: { groupId: null },
    });

    return this.prisma.employeeInfoTabGroup.delete({
      where: { id: groupId },
    });
  }

  async toggleGroupCollapsed(groupId: number) {
    const group = await this.prisma.employeeInfoTabGroup.findUnique({
      where: { id: groupId },
    });

    if (!group) {
      throw new NotFoundException('分组不存在');
    }

    return this.prisma.employeeInfoTabGroup.update({
      where: { id: groupId },
      data: { collapsed: !group.collapsed },
    });
  }

  async reorderGroups(tabId: number, groups: any[]) {
    const updates = groups.map((group) =>
      this.prisma.employeeInfoTabGroup.update({
        where: { id: group.id },
        data: { sort: group.sort },
      })
    );

    await this.prisma.$transaction(updates);

    return { success: true };
  }

  // ========== 字段相关方法 ==========

  async addFieldToTab(tabId: number, dto: any) {
    const { fieldCode, fieldName, fieldType, isRequired = false, sort = 0, groupId = null } = dto;

    // 字段必须添加到分组中
    if (!groupId) {
      throw new Error('字段必须添加到分组中，请选择分组');
    }

    // 获取目标页签和分组信息
    const tab = await this.prisma.employeeInfoTab.findUnique({
      where: { id: tabId },
    });

    if (!tab) {
      throw new NotFoundException('页签不存在');
    }

    const group = await this.prisma.employeeInfoTabGroup.findUnique({
      where: { id: groupId },
    });

    if (!group || group.tabId !== tabId) {
      throw new NotFoundException('分组不存在或不属于该页签');
    }

    // 系统字段验证：只能添加到基本信息或工作信息页签
    if (fieldType === 'SYSTEM') {
      const allowedTabCodes = ['basic_info', 'work_info'];
      if (!allowedTabCodes.includes(tab.code)) {
        throw new BadRequestException(
          `系统字段只能添加到基本信息或工作信息页签，不能添加到${tab.name}页签`
        );
      }
    }

    // 自定义字段验证：可以添加到基本信息、工作信息页签，以及自定义页签
    // 但不能添加到其他系统页签（学历信息、工作经历、家庭信息等）
    if (fieldType === 'CUSTOM') {
      const allowedSystemTabCodes = ['basic_info', 'work_info'];
      // 如果是系统页签，只允许 basic_info 和 work_info
      if (tab.isSystem && !allowedSystemTabCodes.includes(tab.code)) {
        throw new BadRequestException(
          `自定义字段不能添加到系统页签（${tab.name}），只能添加到基本信息、工作信息或自定义页签`
        );
      }
    }

    return this.prisma.employeeInfoTabField.create({
      data: {
        tabId,
        groupId,
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
    if (!id) {
      throw new Error('字段 ID 不能为空');
    }

    const existing = await this.prisma.employeeInfoTabField.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('字段不存在');
    }

    // 只允许更新这些字段
    const allowedFields = {
      isRequired: dto.isRequired,
      isHidden: dto.isHidden,
      sort: dto.sort,
    };

    // 过滤掉 undefined 的字段
    const updateData = Object.fromEntries(
      Object.entries(allowedFields).filter(([_, value]) => value !== undefined)
    );

    return this.prisma.employeeInfoTabField.update({
      where: { id },
      data: updateData,
    });
  }

  async moveFieldToGroup(fieldId: number, groupId: number | null) {
    // 获取字段信息
    const field = await this.prisma.employeeInfoTabField.findUnique({
      where: { id: fieldId },
      include: { tab: true },
    });

    if (!field) {
      throw new NotFoundException('字段不存在');
    }

    // 如果没有目标分组，表示移到页签根级别（没有分组），允许操作
    if (groupId === null) {
      return this.prisma.employeeInfoTabField.update({
        where: { id: fieldId },
        data: { groupId },
      });
    }

    // 获取目标分组信息
    const targetGroup = await this.prisma.employeeInfoTabGroup.findUnique({
      where: { id: groupId },
      include: { tab: true },
    });

    if (!targetGroup) {
      throw new NotFoundException('目标分组不存在');
    }

    // 系统字段验证：只能移动到基本信息或工作信息页签
    if (field.fieldType === 'SYSTEM') {
      const allowedTabCodes = ['basic_info', 'work_info'];
      if (!allowedTabCodes.includes(targetGroup.tab.code)) {
        throw new BadRequestException(
          `系统字段只能移动到基本信息或工作信息页签，不能移动到${targetGroup.tab.name}页签`
        );
      }
    }

    // 自定义字段验证：可以移动到基本信息、工作信息页签，以及自定义页签
    // 但不能移动到其他系统页签（学历信息、工作经历、家庭信息等）
    if (field.fieldType === 'CUSTOM') {
      const allowedSystemTabCodes = ['basic_info', 'work_info'];
      // 如果是系统页签，只允许 basic_info 和 work_info
      if (targetGroup.tab.isSystem && !allowedSystemTabCodes.includes(targetGroup.tab.code)) {
        throw new BadRequestException(
          `自定义字段不能移动到系统页签（${targetGroup.tab.name}），只能移动到基本信息、工作信息或自定义页签`
        );
      }
    }

    return this.prisma.employeeInfoTabField.update({
      where: { id: fieldId },
      data: { groupId },
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
