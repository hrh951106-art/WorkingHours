import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SystemService {
  constructor(private prisma: PrismaService) {}

  // ========== 用户管理 ==========

  async getUsers(query: any) {
    const { page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: +pageSize,
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.user.count({ where }),
    ]);

    // 格式化返回数据
    const formattedItems = items.map((user) => ({
      ...user,
      password: undefined, // 不返回密码
      roles: user.userRoles.map((ur) => ur.role),
    }));

    return {
      items: formattedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return {
      ...user,
      password: undefined,
      roles: user.userRoles.map((ur) => ur.role),
    };
  }

  async createUser(dto: any) {
    const { username, password, name, email, roleIds = [], status = 'ACTIVE' } = dto;

    // 检查用户名是否已存在
    const existingUser = await this.prisma.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      throw new BadRequestException('用户名已存在');
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 使用事务创建用户和角色关联
    return this.prisma.$transaction(async (tx) => {
      // 创建用户
      const user = await tx.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          email,
          status,
        },
      });

      // 创建角色关联
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId: number) => ({
            userId: user.id,
            roleId,
          })),
        });
      }

      return this.getUser(user.id);
    });
  }

  async updateUser(id: number, dto: any) {
    const { username, password, name, email, roleIds = [], status } = dto;

    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('用户不存在');
    }

    // 如果修改了用户名，检查新用户名是否已存在
    if (username !== existingUser.username) {
      const duplicateUser = await this.prisma.user.findUnique({
        where: { username },
      });

      if (duplicateUser) {
        throw new BadRequestException('用户名已存在');
      }
    }

    // 准备更新数据
    const updateData: any = {
      username,
      name,
      email,
      status,
    };

    // 如果提供了新密码，则加密
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // 使用事务更新用户和角色关联
    return this.prisma.$transaction(async (tx) => {
      // 更新用户基本信息
      await tx.user.update({
        where: { id },
        data: updateData,
      });

      // 删除旧的角色关联
      await tx.userRole.deleteMany({
        where: { userId: id },
      });

      // 创建新的角色关联
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId: number) => ({
            userId: id,
            roleId,
          })),
        });
      }

      return this.getUser(id);
    });
  }

  async deleteUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    // 删除用户（级联删除角色关联）
    await this.prisma.user.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // ========== 角色管理 ==========

  async getRoles(query: any) {
    const { page = 1, pageSize = 10, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    const orderBy: any = {};
    if (sortBy) {
      orderBy[sortBy] = sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [items, total] = await Promise.all([
      this.prisma.role.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy,
      }),
      this.prisma.role.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  async getRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        dataScopeRules: {
          orderBy: { sort: 'asc' },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 解析JSON字段
    return {
      ...role,
      functionalPermissions: JSON.parse(role.functionalPermissions || '[]'),
      isAllData: role.dataScopeType === 'ALL' || !role.dataScopeRuleGroups,
      dataScopeRuleGroups: role.dataScopeRuleGroups ? JSON.parse(role.dataScopeRuleGroups) : [],
    };
  }

  async createRole(dto: any) {
    const {
      code,
      name,
      description,
      functionalPermissions = [],
      isAllData = true,
      dataScopeRuleGroups = [],
      isDefault = false,
      status = 'ACTIVE'
    } = dto;

    // 检查角色编码是否已存在
    const existingRole = await this.prisma.role.findUnique({
      where: { code },
    });

    if (existingRole) {
      throw new BadRequestException('角色编码已存在');
    }

    // 根据isAllData设置dataScopeType
    const dataScopeType = isAllData ? 'ALL' : 'CUSTOM';

    const role = await this.prisma.role.create({
      data: {
        code,
        name,
        description,
        functionalPermissions: JSON.stringify(functionalPermissions),
        dataScopeType,
        dataScopeRuleGroups: !isAllData && dataScopeRuleGroups.length > 0
          ? JSON.stringify(dataScopeRuleGroups)
          : null,
        isDefault,
        status,
      },
    });

    return this.getRole(role.id);
  }

  async updateRole(id: number, dto: any) {
    const {
      code,
      name,
      description,
      functionalPermissions,
      isAllData,
      dataScopeRuleGroups,
      isDefault,
      status
    } = dto;

    const existingRole = await this.prisma.role.findUnique({
      where: { id },
    });

    if (!existingRole) {
      throw new NotFoundException('角色不存在');
    }

    // 如果修改了角色编码，检查新编码是否已存在
    if (code && code !== existingRole.code) {
      const duplicateRole = await this.prisma.role.findUnique({
        where: { code },
      });

      if (duplicateRole) {
        throw new BadRequestException('角色编码已存在');
      }
    }

    const updateData: any = {
      name,
      description,
      status,
    };

    // 只有在code不为undefined时才更新
    if (code !== undefined) {
      updateData.code = code;
    }

    if (functionalPermissions !== undefined) {
      updateData.functionalPermissions = JSON.stringify(functionalPermissions);
    }

    if (isDefault !== undefined) {
      updateData.isDefault = isDefault;
    }

    // 根据isAllData设置dataScopeType
    if (isAllData !== undefined) {
      updateData.dataScopeType = isAllData ? 'ALL' : 'CUSTOM';
      updateData.dataScopeRuleGroups = isAllData ? null : (
        dataScopeRuleGroups && dataScopeRuleGroups.length > 0
          ? JSON.stringify(dataScopeRuleGroups)
          : null
      );
    } else if (dataScopeRuleGroups !== undefined) {
      updateData.dataScopeRuleGroups = dataScopeRuleGroups && dataScopeRuleGroups.length > 0
        ? JSON.stringify(dataScopeRuleGroups)
        : null;
    }

    await this.prisma.role.update({
      where: { id },
      data: updateData,
    });

    return this.getRole(id);
  }

  async deleteRole(id: number) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        userRoles: true,
      },
    });

    if (!role) {
      throw new NotFoundException('角色不存在');
    }

    // 检查是否有用户使用该角色
    if (role.userRoles.length > 0) {
      throw new BadRequestException('该角色正在被使用，无法删除');
    }

    await this.prisma.role.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  // ========== 工作台统计 ==========

  async getDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 获取在职员工总数
    const totalEmployees = await this.prisma.employee.count({
      where: {
        status: 'ACTIVE',
      },
    });

    // 获取今日排班人数
    const todayScheduled = await this.prisma.schedule.count({
      where: {
        scheduleDate: {
          gte: today,
          lt: tomorrow,
        },
        status: 'ACTIVE',
      },
    });

    // 获取今日出勤人数 (通过PunchPair统计当日有摆卡结果的员工)
    const punchPairs = await this.prisma.punchPair.findMany({
      where: {
        pairDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      select: {
        employeeNo: true,
      },
      distinct: ['employeeNo'],
    });

    const todayAttended = punchPairs.length;

    return {
      totalEmployees,
      todayScheduled,
      todayAttended,
    };
  }
}
