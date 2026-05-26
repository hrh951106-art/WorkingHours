import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { AmountCalculateService } from './amount-calculate.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Amount')
@Controller('amount')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class AmountPolicyController {
  constructor(
    private prisma: PrismaService,
    private amountCalculateService: AmountCalculateService,
  ) {}

  @Get('policies')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取金额规则列表' })
  async getPolicies(@Query() query: any) {
    const { page = 1, pageSize = 10, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.amountPolicy.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.amountPolicy.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  @Get('policies/:id')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取金额规则详情' })
  async getPolicy(@Param('id') id: string) {
    return this.prisma.amountPolicy.findUnique({
      where: { id: +id },
    });
  }

  @Get('policies/new-code')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '生成新的金额规则编码' })
  async generatePolicyCode() {
    try {
      console.log('开始生成金额规则编码...');
      // 获取所有现有的金额规则编码（暂时不过滤deletedAt）
      const existingPolicies = await this.prisma.amountPolicy.findMany({
        select: { code: true },
      });
      const existingCodes = existingPolicies.map((p) => p.code);
      console.log('现有编码:', existingCodes);

      // 生成新的序号编码
      let newCode = 'AP001';
      let counter = 1;
      while (existingCodes.includes(newCode)) {
        counter++;
        newCode = `AP${String(counter).padStart(3, '0')}`;
      }

      console.log('生成的新编码:', newCode);
      return { code: newCode };
    } catch (error) {
      console.error('生成金额规则编码失败:', error);
      throw error;
    }
  }

  @Post('policies')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建金额规则' })
  async createPolicy(@Body() dto: any, @Req() req: any) {
    try {
      const user = req.user;
      console.log('创建金额规则 - 接收数据:', dto);

      if (!user || !user.id) {
        throw new Error('用户信息无效，请重新登录');
      }

      const data = {
        ...dto,
        attendanceCodes: JSON.stringify(dto.attendanceCodes || []),
        createdById: user.id,
        createdByName: user.username || user.name || 'Unknown',
      };

      console.log('创建金额规则 - 最终数据:', data);

      const result = await this.prisma.amountPolicy.create({
        data,
      });

      console.log('创建金额规则 - 创建结果:', result);
      return result;
    } catch (error) {
      console.error('创建金额规则失败:', error);
      throw error;
    }
  }

  @Put('policies/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新金额规则' })
  async updatePolicy(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const user = req.user;
    const { attendanceCodes, ...updateData } = dto;

    const data: any = {
      ...updateData,
      updatedById: user.id,
      updatedByName: user.username,
    };

    if (attendanceCodes !== undefined) {
      data.attendanceCodes = JSON.stringify(attendanceCodes);
    }

    return this.prisma.amountPolicy.update({
      where: { id: +id },
      data,
    });
  }

  @Delete('policies/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除金额规则' })
  async deletePolicy(@Param('id') id: string) {
    // 软删除
    return this.prisma.amountPolicy.update({
      where: { id: +id },
      data: { deletedAt: new Date() },
    });
  }

  // ============ 金额规则组相关接口 ============

  @Get('policy-groups')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取金额规则组列表' })
  async getPolicyGroups(@Query() query: any) {
    const { page = 1, pageSize = 10, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = { deletedAt: null };
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.amountPolicyGroup.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.amountPolicyGroup.count({ where }),
    ]);

    // 解析 JSON 字段
    const parsedItems = items.map((item) => ({
      ...item,
      policyIds: JSON.parse(item.policyIds || '[]'),
      policies: JSON.parse(item.policies || '[]'),
    }));

    return {
      items: parsedItems,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  @Get('policy-groups/:id')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取金额规则组详情' })
  async getPolicyGroup(@Param('id') id: string) {
    const group = await this.prisma.amountPolicyGroup.findUnique({
      where: { id: +id },
    });

    if (!group) return null;

    return {
      ...group,
      policyIds: JSON.parse(group.policyIds || '[]'),
      policies: JSON.parse(group.policies || '[]'),
    };
  }

  @Get('policy-groups/new-code')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '生成新的金额规则组编码' })
  async generatePolicyGroupCode() {
    try {
      console.log('开始生成金额规则组编码...');
      // 获取所有现有的金额规则组编码（暂时不过滤deletedAt）
      const existingGroups = await this.prisma.amountPolicyGroup.findMany({
        select: { code: true },
      });
      const existingCodes = existingGroups.map((g) => g.code);
      console.log('现有编码:', existingCodes);

      // 生成新的序号编码
      let newCode = 'APG001';
      let counter = 1;
      while (existingCodes.includes(newCode)) {
        counter++;
        newCode = `APG${String(counter).padStart(3, '0')}`;
      }

      console.log('生成的新编码:', newCode);
      return { code: newCode };
    } catch (error) {
      console.error('生成金额规则组编码失败:', error);
      throw error;
    }
  }

  @Post('policy-groups')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建金额规则组' })
  async createPolicyGroup(@Body() dto: any, @Req() req: any) {
    try {
      const user = req.user;
      console.log('创建金额规则组 - 接收数据:', dto);
      console.log('创建金额规则组 - 当前用户:', user);

      if (!user || !user.id) {
        throw new Error('用户信息无效，请重新登录');
      }

      const { policyIds, ...rest } = dto;

      const data = {
        ...rest,
        policyIds: JSON.stringify(policyIds || []),
        policies: '[]', // 添加此字段
        createdById: user.id,
        createdByName: user.username || user.name || 'Unknown',
      };

      console.log('创建金额规则组 - 最终数据:', data);

      const result = await this.prisma.amountPolicyGroup.create({
        data,
      });

      console.log('创建金额规则组 - 创建结果:', result);
      return result;
    } catch (error) {
      console.error('创建金额规则组失败:', error);
      throw error;
    }
  }

  @Put('policy-groups/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新金额规则组' })
  async updatePolicyGroup(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    const user = req.user;
    const { policyIds, ...rest } = dto;

    const data: any = {
      ...rest,
      updatedById: user.id,
      updatedByName: user.username,
    };

    if (policyIds !== undefined) {
      data.policyIds = JSON.stringify(policyIds);
    }

    return this.prisma.amountPolicyGroup.update({
      where: { id: +id },
      data,
    });
  }

  @Delete('policy-groups/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除金额规则组' })
  async deletePolicyGroup(@Param('id') id: string) {
    // 软删除
    return this.prisma.amountPolicyGroup.update({
      where: { id: +id },
      data: { deletedAt: new Date() },
    });
  }

  // ============ 员工金额系数相关接口 ============

  @Get('employee-coefficients')
  @RequirePermissions('hr:employee:view')
  @ApiOperation({ summary: '获取员工金额系数列表' })
  async getEmployeeCoefficients(@Query() query: any) {
    const { page = 1, pageSize = 10, employeeId, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (employeeId) {
      // 通过 employeeId 获取 employeeNo
      const employee = await this.prisma.employee.findUnique({
        where: { id: +employeeId },
        select: { employeeNo: true },
      });
      if (employee) {
        where.employeeNo = employee.employeeNo;
      }
    }
    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.employeeCoefficient.findMany({
        where,
        skip,
        take: +pageSize,
        orderBy: { effectiveDate: 'desc' },
      }),
      this.prisma.employeeCoefficient.count({ where }),
    ]);

    return {
      items,
      total,
      page: +page,
      pageSize: +pageSize,
      totalPages: Math.ceil(total / +pageSize),
    };
  }

  @Get('employee-coefficients/:id')
  @RequirePermissions('hr:employee:view')
  @ApiOperation({ summary: '获取员工金额系数详情' })
  async getEmployeeCoefficient(@Param('id') id: string) {
    return this.prisma.employeeCoefficient.findUnique({
      where: { id: +id },
    });
  }

  @Post('employee-coefficients')
  @RequirePermissions('hr:employee:edit')
  @ApiOperation({ summary: '创建员工金额系数' })
  async createEmployeeCoefficient(@Body() dto: any, @Req() req: any) {
    try {
      const user = req.user;
      console.log('创建员工金额系数 - 接收数据:', dto);

      if (!user || !user.id) {
        throw new Error('用户信息无效，请重新登录');
      }

      // 通过 employeeId 获取 employeeNo 和 employeeName
      const employee = await this.prisma.employee.findUnique({
        where: { id: +dto.employeeId },
        select: { employeeNo: true, name: true },
      });

      if (!employee) {
        throw new Error('员工不存在');
      }

      const data = {
        employeeNo: employee.employeeNo,
        employeeName: employee.name,
        coefficientType: dto.coefficientType || 'DEFAULT',
        coefficient: dto.coefficient,
        effectiveDate: new Date(dto.effectiveDate),
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : null,
        description: dto.description || dto.reason || '',
        status: dto.status || 'ACTIVE',
        createdById: user.id,
        createdByName: user.username || user.name || 'Unknown',
      };

      console.log('创建员工金额系数 - 最终数据:', data);

      const result = await this.prisma.employeeCoefficient.create({
        data,
      });

      console.log('创建员工金额系数 - 创建结果:', result);
      return result;
    } catch (error) {
      console.error('创建员工金额系数失败:', error);
      throw error;
    }
  }

  @Put('employee-coefficients/:id')
  @RequirePermissions('hr:employee:edit')
  @ApiOperation({ summary: '更新员工金额系数' })
  async updateEmployeeCoefficient(@Param('id') id: string, @Body() dto: any, @Req() req: any) {
    console.log('🔧 更新员工金额系数 - 接收数据:', dto);
    const user = req.user;

    if (!user || !user.id) {
      throw new Error('用户信息无效，请重新登录');
    }

    const { employeeId, effectiveDate, expiryDate, coefficient, reason, description, ...rest } = dto;

    const data: any = {
      ...rest,
      updatedById: user.id,
      updatedByName: user.username || user.name || 'Unknown',
    };

    // 处理系数值
    if (coefficient !== undefined) {
      data.coefficient = coefficient;
    }

    // 处理生效日期
    if (effectiveDate !== undefined) {
      data.effectiveDate = new Date(effectiveDate);
    }

    // 处理失效日期
    if (expiryDate !== undefined) {
      data.expiryDate = expiryDate ? new Date(expiryDate) : null;
    }

    // 处理原因/描述
    if (reason !== undefined) {
      data.description = reason;
    } else if (description !== undefined) {
      data.description = description;
    }

    console.log('🔧 更新员工金额系数 - 最终数据:', data);

    const result = await this.prisma.employeeCoefficient.update({
      where: { id: +id },
      data,
    });

    console.log('🔧 更新员工金额系数 - 更新结果:', result);
    return result;
  }

  @Delete('employee-coefficients/:id')
  @RequirePermissions('hr:employee:edit')
  @ApiOperation({ summary: '删除员工金额系数' })
  async deleteEmployeeCoefficient(@Param('id') id: string) {
    // 硬删除
    return this.prisma.employeeCoefficient.delete({
      where: { id: +id },
    });
  }
}
