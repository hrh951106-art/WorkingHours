import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendanceRuleGroupService {
  constructor(private prisma: PrismaService) {}

  /**
   * 获取考勤规则组列表
   */
  async findAll(query: any) {
    const { code, name, status, isDefault, page = 1, pageSize = 10 } = query;

    const skip = (page - 1) * pageSize;

    const where: any = {
      deletedAt: null,
    };
    if (code) where.code = { contains: code, mode: 'insensitive' };
    if (name) where.name = { contains: name, mode: 'insensitive' };
    if (status) where.status = status;
    if (isDefault !== undefined) where.isDefault = isDefault === 'true';

    const [items, total] = await Promise.all([
      this.prisma.attendanceRuleGroup.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        include: {
          details: true,
        },
      }),
      this.prisma.attendanceRuleGroup.count({ where }),
    ]);

    // 解析details中的JSON数组
    const parsedItems = items.map((item) => ({
      ...item,
      details: item.details.map((detail: any) => ({
        ...detail,
        attendanceCodeIds: JSON.parse(detail.attendanceCodeIds || '[]'),
        amountPolicyIds: JSON.parse(detail.amountPolicyIds || '[]'),
      })),
    }));

    return {
      items: parsedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  /**
   * 获取考勤规则组详情
   */
  async findOne(id: number) {
    const ruleGroup = await this.prisma.attendanceRuleGroup.findUnique({
      where: { id },
      include: {
        details: true,
      },
    });

    if (!ruleGroup) {
      throw new NotFoundException('考勤规则组不存在');
    }

    return {
      ...ruleGroup,
      details: ruleGroup.details.map((detail: any) => ({
        ...detail,
        attendanceCodeIds: JSON.parse(detail.attendanceCodeIds || '[]'),
        amountPolicyIds: JSON.parse(detail.amountPolicyIds || '[]'),
      })),
    };
  }

  /**
   * 生成新的考勤规则组编码
   */
  async generateCode() {
    const existingCodes = await this.prisma.attendanceRuleGroup.findMany({
      select: { code: true },
      where: { deletedAt: null },
    });
    const codes = existingCodes.map((c) => c.code);
    const { StringUtils } = require('../../common/utils');
    return {
      code: StringUtils.generateSequentialCode('ARG', codes),
    };
  }

  /**
   * 创建考勤规则组
   */
  async create(data: {
    code?: string;
    name: string;
    description?: string;
    isDefault?: boolean;
    attendanceCodeIds?: number[];
    amountPolicyIds?: number[];
    amountPolicyGroupIds?: number[];
    attendancePunchRuleId?: number;
    leanPunchRuleId?: number;
    createdById: number;
    createdByName: string;
  }) {
    const {
      code: originalCode,
      name,
      description,
      isDefault,
      attendanceCodeIds: originalAttendanceCodeIds,
      amountPolicyIds: rawAmountPolicyIds,
      amountPolicyGroupIds,
      attendancePunchRuleId,
      leanPunchRuleId,
      createdById,
      createdByName,
    } = data;

    // 处理最终的金额政策ID列表
    let amountPolicyIds = rawAmountPolicyIds;

    // 如果提供了 amountPolicyGroupIds，获取这些组中的所有金额政策ID
    if (amountPolicyGroupIds && amountPolicyGroupIds.length > 0) {
      const policyGroups = await this.prisma.amountPolicyGroup.findMany({
        where: { id: { in: amountPolicyGroupIds } },
      });

      const groupPolicyIds = policyGroups.flatMap((group) => {
        try {
          return JSON.parse(group.policyIds || '[]');
        } catch {
          return [];
        }
      });

      // 合并 amountPolicyIds 和从组中提取的 IDs
      amountPolicyIds = [...new Set([...(rawAmountPolicyIds || []), ...groupPolicyIds])];
    }

    // 确保数组不为 undefined
    const attendanceCodeIds = originalAttendanceCodeIds || [];
    let code = originalCode;
    amountPolicyIds = amountPolicyIds || [];

    // 如果没有提供code，自动生成序号编码
    if (!code) {
      const existingCodes = await this.prisma.attendanceRuleGroup.findMany({
        select: { code: true },
      });
      const codes = existingCodes.map((c) => c.code);
      const { StringUtils } = require('../../common/utils');
      code = StringUtils.generateSequentialCode('ARG', codes);
    }

    // 如果设置为默认规则组，需要取消其他默认规则组
    if (isDefault) {
      await this.prisma.attendanceRuleGroup.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // 使用事务创建规则组和明细
    return this.prisma.$transaction(async (tx) => {
      // 创建规则组
      const ruleGroup = await tx.attendanceRuleGroup.create({
        data: {
          code,
          name,
          description,
          isDefault: isDefault || false,
          status: 'ACTIVE',
          createdById,
          createdByName,
        },
      });

      // 创建规则组明细
      await tx.attendanceRuleGroupDetail.create({
        data: {
          ruleGroup: {
            connect: { id: ruleGroup.id },
          },
          ruleName: name,
          attendancePunchRuleId,
          leanPunchRuleId,
          attendanceCodeIds: JSON.stringify(attendanceCodeIds),
          amountPolicyIds: JSON.stringify(amountPolicyIds),
        },
      });

      return ruleGroup;
    });
  }

  /**
   * 更新考勤规则组
   */
  async update(
    id: number,
    data: {
      name?: string;
      description?: string;
      isDefault?: boolean;
      attendanceCodeIds?: number[];
      amountPolicyIds?: number[];
      amountPolicyGroupIds?: number[];
      attendancePunchRuleId?: number;
      leanPunchRuleId?: number;
      status?: string;
    },
  ) {
    console.log('🔧 Service 层开始更新考勤规则组:');
    console.log('  id:', id);
    console.log('  接收到的 data:', JSON.stringify(data, null, 2));

    const existing = await this.prisma.attendanceRuleGroup.findUnique({
      where: { id },
      include: { details: true },
    });

    if (!existing) {
      console.error('❌ 考勤规则组不存在:', id);
      throw new NotFoundException('考勤规则组不存在');
    }

    console.log('✅ 找到现有规则组:', existing.name);
    console.log('  现有明细数量:', existing.details?.length || 0);

    const {
      isDefault,
      attendanceCodeIds,
      amountPolicyIds: rawAmountPolicyIds,
      amountPolicyGroupIds,
      attendancePunchRuleId,
      leanPunchRuleId,
      ...rest
    } = data;

    console.log('📋 解构后的字段:');
    console.log('  isDefault:', isDefault);
    console.log('  attendanceCodeIds:', attendanceCodeIds);
    console.log('  rawAmountPolicyIds:', rawAmountPolicyIds);
    console.log('  amountPolicyGroupIds:', amountPolicyGroupIds);
    console.log('  attendancePunchRuleId:', attendancePunchRuleId);
    console.log('  leanPunchRuleId:', leanPunchRuleId);
    console.log('  rest:', rest);

    // 处理最终的金额政策ID列表
    let finalAmountPolicyIds = rawAmountPolicyIds;

    // 如果提供了 amountPolicyGroupIds，获取这些组中的所有金额政策ID
    if (amountPolicyGroupIds && amountPolicyGroupIds.length > 0) {
      const policyGroups = await this.prisma.amountPolicyGroup.findMany({
        where: { id: { in: amountPolicyGroupIds } },
      });

      const groupPolicyIds = policyGroups.flatMap((group) => {
        try {
          return JSON.parse(group.policyIds || '[]');
        } catch {
          return [];
        }
      });

      // 合并 amountPolicyIds 和从组中提取的 IDs
      finalAmountPolicyIds = [...new Set([...(rawAmountPolicyIds || []), ...groupPolicyIds])];
      console.log('  合并后的 finalAmountPolicyIds:', finalAmountPolicyIds);
    }

    // 如果设置为默认规则组，需要取消其他默认规则组
    if (isDefault) {
      await this.prisma.attendanceRuleGroup.updateMany({
        where: { id: { not: id }, isDefault: true },
        data: { isDefault: false },
      });
    }

    // 使用事务更新规则组和明细
    return this.prisma.$transaction(async (tx) => {
      // 更新规则组基本信息
      const updated = await tx.attendanceRuleGroup.update({
        where: { id },
        data: rest,
      });

      // 如果有明细相关字段更新，更新明细
      if (
        attendanceCodeIds ||
        finalAmountPolicyIds ||
        attendancePunchRuleId !== undefined ||
        leanPunchRuleId !== undefined
      ) {
        // 先删除旧明细
        await tx.attendanceRuleGroupDetail.deleteMany({
          where: { ruleGroupId: id },
        });

        // 创建新明细
        await tx.attendanceRuleGroupDetail.create({
          data: {
            ruleGroup: {
              connect: { id: id },
            },
            ruleName: existing.name,
            attendancePunchRuleId:
              attendancePunchRuleId !== undefined
                ? attendancePunchRuleId
                : existing.details[0]?.attendancePunchRuleId,
            leanPunchRuleId:
              leanPunchRuleId !== undefined
                ? leanPunchRuleId
                : existing.details[0]?.leanPunchRuleId,
            attendanceCodeIds: JSON.stringify(
              attendanceCodeIds || JSON.parse(existing.details[0]?.attendanceCodeIds || '[]'),
            ),
            amountPolicyIds: JSON.stringify(
              finalAmountPolicyIds || JSON.parse(existing.details[0]?.amountPolicyIds || '[]'),
            ),
          },
        });
      }

      return updated;
    });
  }

  /**
   * 删除考勤规则组（软删除）
   */
  async remove(id: number) {
    return this.prisma.attendanceRuleGroup.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        status: 'INACTIVE',
      },
    });
  }

  /**
   * 批量授予员工考勤规则组
   */
  async grantToEmployees(data: {
    ruleGroupId: number;
    employeeIds: number[];
    effectiveDate: string;
    expiryDate?: string;
    reason?: string;
    createdById?: number;
    createdByName?: string;
  }) {
    const {
      ruleGroupId,
      employeeIds,
      effectiveDate,
      expiryDate,
      reason,
      createdById,
      createdByName,
    } = data;

    // 验证规则组是否存在
    const ruleGroup = await this.prisma.attendanceRuleGroup.findUnique({
      where: { id: ruleGroupId, deletedAt: null },
    });

    if (!ruleGroup) {
      throw new NotFoundException('考勤规则组不存在');
    }

    // 获取员工信息
    const employees = await this.prisma.employee.findMany({
      where: { id: { in: employeeIds } },
    });

    if (employees.length === 0) {
      throw new NotFoundException('未找到任何员工');
    }

    // 使用事务授予规则组
    return this.prisma.$transaction(async (tx) => {
      // 将这些员工的其他当前规则组设置为非当前
      await tx.employeeAttendanceRuleGroup.updateMany({
        where: {
          employeeNo: { in: employees.map((e) => e.employeeNo) },
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          // 同时也设置失效日期为effectiveDate的前一天
          expiryDate: new Date(new Date(effectiveDate).getTime() - 86400000),
        },
      });

      // 为每个员工创建新的规则组关联
      const created = await Promise.all(
        employees.map((emp) =>
          tx.employeeAttendanceRuleGroup.create({
            data: {
              employeeNo: emp.employeeNo,
              employeeName: emp.name,
              ruleGroupId,
              ruleGroupName: ruleGroup.name,
              effectiveDate: new Date(effectiveDate),
              expiryDate: expiryDate ? new Date(expiryDate) : null,
              isCurrent: true,
            },
          }),
        ),
      );

      return {
        successCount: created.length,
        totalCount: employeeIds.length,
      };
    });
  }

  /**
   * 获取员工的考勤规则组历史
   */
  async getEmployeeRuleGroups(employeeId: number, query: any) {
    const { page = 1, pageSize = 10, status } = query;
    const skip = (page - 1) * pageSize;

    // 首先通过 employeeId 获取员工的 employeeNo
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { employeeNo: true },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    const where: any = { employeeNo: employee.employeeNo };
    if (status) where.isCurrent = status === 'true';

    const [items, total] = await Promise.all([
      this.prisma.employeeAttendanceRuleGroup.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { effectiveDate: 'desc' },
        include: {
          ruleGroup: {
            include: {
              details: true,
            },
          },
        },
      }),
      this.prisma.employeeAttendanceRuleGroup.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  /**
   * 更新员工考勤规则组
   */
  async updateEmployeeRuleGroup(
    employeeId: number,
    data: {
      ruleGroupId: number;
      effectiveDate: string;
      expiryDate?: string;
      reason?: string;
    },
  ) {
    const { ruleGroupId, effectiveDate, expiryDate, reason } = data;

    // 验证规则组是否存在
    const ruleGroup = await this.prisma.attendanceRuleGroup.findUnique({
      where: { id: ruleGroupId, deletedAt: null },
    });

    if (!ruleGroup) {
      throw new NotFoundException('考勤规则组不存在');
    }

    // 验证员工是否存在
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      throw new NotFoundException('员工不存在');
    }

    // 使用事务更新员工规则组
    return this.prisma.$transaction(async (tx) => {
      // 将该员工的其他当前规则组设置为非当前
      await tx.employeeAttendanceRuleGroup.updateMany({
        where: {
          employeeNo: employee.employeeNo,
          isCurrent: true,
        },
        data: {
          isCurrent: false,
          expiryDate: new Date(new Date(effectiveDate).getTime() - 86400000),
        },
      });

      // 使用 upsert 创建或更新规则组关联
      const updated = await tx.employeeAttendanceRuleGroup.upsert({
        where: {
          employeeNo_ruleGroupId_effectiveDate: {
            employeeNo: employee.employeeNo,
            ruleGroupId,
            effectiveDate: new Date(effectiveDate),
          },
        },
        update: {
          employeeName: employee.name,
          ruleGroupName: ruleGroup.name,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isCurrent: true,
        },
        create: {
          employeeNo: employee.employeeNo,
          employeeName: employee.name,
          ruleGroupId,
          ruleGroupName: ruleGroup.name,
          effectiveDate: new Date(effectiveDate),
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          isCurrent: true,
        },
      });

      return updated;
    });
  }

  /**
   * 删除员工考勤规则组记录
   */
  async removeEmployeeRuleGroup(id: number) {
    // 先查找记录
    const record = await this.prisma.employeeAttendanceRuleGroup.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException('员工考勤规则组记录不存在');
    }

    // 如果删除的是当前规则组，需要检查
    if (record.isCurrent) {
      throw new Error('不能删除当前生效的规则组，请先编辑或授予其他规则组');
    }

    // 删除记录
    await this.prisma.employeeAttendanceRuleGroup.delete({
      where: { id },
    });

    return { message: '删除成功' };
  }

  /**
   * 获取当前有效的考勤规则组
   */
  async getActiveRuleGroup(employeeId: number, targetDate?: Date) {
    const date = targetDate || new Date();

    // Get employee's employeeNo first
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { employeeNo: true },
    });

    if (!employee) {
      return null;
    }

    const activeGroup = await this.prisma.employeeAttendanceRuleGroup.findFirst({
      where: {
        employeeNo: employee.employeeNo,
        isCurrent: true,
        effectiveDate: { lte: date },
        OR: [{ expiryDate: null }, { expiryDate: { gt: date } }],
      },
      include: {
        ruleGroup: {
          include: {
            details: true,
          },
        },
      },
      orderBy: {
        effectiveDate: 'desc',
      },
    });

    if (!activeGroup) {
      // 如果没有明确的当前规则组，尝试获取默认规则组
      const defaultRuleGroup = await this.prisma.attendanceRuleGroup.findFirst({
        where: {
          isDefault: true,
          status: 'ACTIVE',
          deletedAt: null,
        },
        include: {
          details: true,
        },
      });

      if (!defaultRuleGroup) {
        return null;
      }

      return {
        ruleGroup: defaultRuleGroup,
        isDefault: true,
      };
    }

    return activeGroup;
  }
}
