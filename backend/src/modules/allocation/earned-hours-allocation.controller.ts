import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AllocationService } from './allocation.service';
import { EarnedHoursAllocationService } from './earned-hours-allocation.service';
import { PrismaService } from '../../database/prisma.service';

@ApiTags('Allocation - 挣得工时分摊')
@Controller('earned-hours-allocation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EarnedHoursAllocationController {
  constructor(
    private allocationService: AllocationService,
    private earnedHoursService: EarnedHoursAllocationService,
    private prisma: PrismaService,
  ) {}

  // ============ 挣得工时分摊配置管理 ============

  @Get('configs')
  @ApiOperation({ summary: '获取挣得工时分摊配置列表' })
  async getEarnedHoursConfigs(@Query() query: any) {
    return this.allocationService.getEarnedHoursConfigs(query);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: '获取挣得工时分摊配置详情' })
  async getEarnedHoursConfig(@Param('id') id: string) {
    return this.allocationService.getEarnedHoursConfig(+id);
  }

  @Post('configs')
  @ApiOperation({ summary: '创建挣得工时分摊配置' })
  async createEarnedHoursConfig(@Body() dto: any) {
    return this.allocationService.createEarnedHoursConfig(dto);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: '更新挣得工时分摊配置' })
  async updateEarnedHoursConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateEarnedHoursConfig(+id, dto);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: '删除挣得工时分摊配置' })
  async deleteEarnedHoursConfig(@Param('id') id: string) {
    return this.allocationService.deleteEarnedHoursConfig(+id);
  }

  @Post('configs/:id/activate')
  @ApiOperation({ summary: '启用挣得工时分摊配置' })
  async activateEarnedHoursConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.activateEarnedHoursConfig(+id, dto);
  }

  @Post('configs/:id/deactivate')
  @ApiOperation({ summary: '停用挣得工时分摊配置' })
  async deactivateEarnedHoursConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.deactivateEarnedHoursConfig(+id, dto);
  }

  @Post('configs/:id/copy')
  @ApiOperation({ summary: '复制挣得工时分摊配置' })
  async copyEarnedHoursConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.copyEarnedHoursConfig(+id, dto);
  }

  // ============ 挣得工时分摊规则管理 ============

  @Get('rules')
  @ApiOperation({ summary: '获取挣得工时分摊规则列表' })
  async getEarnedHoursRules(@Query() query: any) {
    return this.allocationService.getEarnedHoursRules(query);
  }

  @Get('rules/:id')
  @ApiOperation({ summary: '获取挣得工时分摊规则详情' })
  async getEarnedHoursRule(@Param('id') id: string) {
    return this.allocationService.getEarnedHoursRule(+id);
  }

  @Post('rules')
  @ApiOperation({ summary: '创建挣得工时分摊规则' })
  async createEarnedHoursRule(@Body() dto: any) {
    return this.allocationService.createEarnedHoursRule(dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: '更新挣得工时分摊规则' })
  async updateEarnedHoursRule(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateEarnedHoursRule(+id, dto);
  }

  @Delete('rules/:id')
  @ApiOperation({ summary: '删除挣得工时分摊规则' })
  async deleteEarnedHoursRule(@Param('id') id: string) {
    return this.allocationService.deleteEarnedHoursRule(+id);
  }

  // ============ 挣得工时分摊目标管理 ============

  @Get('rules/:ruleId/targets')
  @ApiOperation({ summary: '获取挣得工时分摊规则目标列表' })
  async getEarnedHoursRuleTargets(@Param('ruleId') ruleId: string) {
    return this.allocationService.getEarnedHoursRuleTargets(+ruleId);
  }

  @Post('targets')
  @ApiOperation({ summary: '创建挣得工时分摊目标' })
  async createEarnedHoursRuleTarget(@Body() dto: any) {
    return this.allocationService.createEarnedHoursRuleTarget(dto);
  }

  @Put('targets/:id')
  @ApiOperation({ summary: '更新挣得工时分摊目标' })
  async updateEarnedHoursRuleTarget(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateEarnedHoursRuleTarget(+id, dto);
  }

  @Delete('targets/:id')
  @ApiOperation({ summary: '删除挣得工时分摊目标' })
  async deleteEarnedHoursRuleTarget(@Param('id') id: string) {
    return this.allocationService.deleteEarnedHoursRuleTarget(+id);
  }

  // ============ 挣得工时分摊计算 ============

  @Post('calculate')
  @ApiOperation({ summary: '执行挣得工时分摊计算' })
  async calculateEarnedHoursAllocation(@Body() dto: any) {
    return this.earnedHoursService.executeEarnedHoursAllocation(dto);
  }

  @Get('calculate/progress/:batchNo')
  @ApiOperation({ summary: '查询挣得工时分摊计算进度' })
  async getEarnedHoursCalculationProgress(@Param('batchNo') batchNo: string) {
    return this.allocationService.getEarnedHoursCalculationProgress(batchNo);
  }

  // ============ 挣得工时分摊结果查询 ============

  @Get('results')
  @ApiOperation({ summary: '查询挣得工时分摊结果' })
  async getEarnedHoursResults(@Query() query: any) {
    return this.earnedHoursService.getEarnedHoursResults(query);
  }

  @Get('results/summary')
  @ApiOperation({ summary: '查询挣得工时分摊结果汇总' })
  async getEarnedHoursResultsSummary(@Query() query: any) {
    return this.earnedHoursService.getEarnedHoursResultsSummary(query);
  }

  // ============ ���时计算挣得工时报表 ============

  @Get('report/unified')
  @ApiOperation({ summary: '统一挣得工时报表（包含团队分摊和个人挣得）' })
  async getUnifiedEarnedHoursReport(@Query() query: any) {
    const { startDate, endDate, employeeNo, orgId, productId } = query;

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const where: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };

    if (employeeNo) where.employeeNo = employeeNo;
    if (orgId) where.orgId = Number(orgId);
    if (productId) where.productId = Number(productId);

    // 查询个人产量记录
    const personalRecords = await this.prisma.personalProductionRecord.findMany({
      where,
      orderBy: { recordDate: 'desc' },
    });

    // 查询团队分摊结果（从EarnedHoursAllocationResult表）
    const allocationWhere: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };

    if (employeeNo) allocationWhere.sourceEmployeeNo = employeeNo;

    const allocationResults = await this.prisma.earnedHoursAllocationResult.findMany({
      where: allocationWhere,
      orderBy: { recordDate: 'desc' },
    });

    // 查询团队产量数据（用于获取产品信息）
    const teamProductionWhere: any = {
      recordDate: { gte: start, lte: end },
      deletedAt: null,
    };

    // 获取涉及的所有组织账户
    const orgIds = [...new Set(allocationResults.map((ar) => ar.sourceAccountId).filter(Boolean))];

    if (orgIds.length > 0) {
      teamProductionWhere.orgId = { in: orgIds };
    } else if (orgId) {
      teamProductionWhere.orgId = Number(orgId);
    }

    const teamProductionRecords = await this.prisma.productionRecord.findMany({
      where: teamProductionWhere,
      orderBy: { recordDate: 'desc' },
    });

    // 查询产品标准配置（用于获取标准信息）
    const productIds = [
      ...new Set(teamProductionRecords.map((pr) => pr.productId).filter(Boolean)),
    ];
    const productStandards = await this.prisma.productStandardHourByLevel.findMany({
      where: {
        productId: { in: productIds },
        status: 'ACTIVE',
      },
      orderBy: { createdAt: 'desc' },
    });

    // 构建产品标准映射（productId -> 标准信息），使用最新创建的配置
    const productStandardMap = new Map<number, any>();
    productStandards.forEach((ps) => {
      // 只保留每个产品的第一个（最新创建的）配置
      if (!productStandardMap.has(ps.productId)) {
        productStandardMap.set(ps.productId, {
          quantity: ps.quantity,
          standardHours: ps.standardHours,
          unit: ps.unit,
        });
      }
    });

    // 构建团队产量映射（日期+组织 -> 产品信息）
    const teamProductionMap = new Map<string, any>();
    teamProductionRecords.forEach((pr) => {
      const key = `${pr.recordDate.getTime()}_${pr.orgId}`;
      // 只保存第一条记录的产品信息（假设同一组织同一天的产品相同）
      if (!teamProductionMap.has(key)) {
        const standardInfo = productStandardMap.get(pr.productId);
        teamProductionMap.set(key, {
          productId: pr.productId,
          productCode: pr.productCode,
          productName: pr.productName,
          actualQty: pr.actualQty,
          standardQuantity: standardInfo?.quantity || 100,
          standardHours: standardInfo?.standardHours || 0,
          standardUnit: standardInfo?.unit || '件',
        });
      }
    });

    // 获取分摊配置的考勤代码信息
    const configIds = [...new Set(allocationResults.map((ar) => ar.configId))];
    const configs = await this.prisma.earnedHoursAllocationConfig.findMany({
      where: { id: { in: configIds } },
      select: { id: true, sourceConfig: true },
    });

    // 构建配置映射
    const configMap = new Map<number, any>();
    configs.forEach((config) => {
      try {
        const sourceConfig =
          typeof config.sourceConfig === 'string'
            ? JSON.parse(config.sourceConfig)
            : config.sourceConfig;
        configMap.set(config.id, {
          attendanceCodes: sourceConfig.attendanceCodes || [],
        });
      } catch (e) {
        configMap.set(config.id, { attendanceCodes: [] });
      }
    });

    // 查询考勤代码名称
    const allAttendanceCodes = new Set<string>();
    configs.forEach((config) => {
      const cfg = configMap.get(config.id);
      if (cfg?.attendanceCodes) {
        cfg.attendanceCodes.forEach((code: string) => allAttendanceCodes.add(code));
      }
    });

    const attendanceCodes = await this.prisma.definitionAttendanceCode.findMany({
      where: { code: { in: Array.from(allAttendanceCodes) } },
      select: { code: true, name: true },
    });

    const attendanceCodeMap = new Map<string, string>();
    attendanceCodes.forEach((ac) => {
      attendanceCodeMap.set(ac.code, ac.name);
    });

    // 构建个人产量映射（同一个人同一天相同账户的记录会合并）
    const personalMap = new Map<string, any>();
    personalRecords.forEach((r) => {
      const key = `${r.employeeNo}_${r.orgId}_${new Date(r.recordDate).getTime()}`;

      const existing = personalMap.get(key);
      if (existing) {
        // 合并记录：累加产量和挣得工时
        existing.actualQty += r.actualQty;
        existing.earnedHours += r.earnedHours;
      } else {
        // 新记录
        personalMap.set(key, r);
      }
    });

    // 构建分摊工时映射（包含单位信息、账户信息和考勤代码，key包含employeeNo、orgId和recordDate）
    const allocationMap = new Map<
      string,
      {
        hours: number;
        unit: string;
        orgId: number;
        orgName: string;
        employeeName: string;
        attendanceCodeNames: string[];
      }
    >();
    allocationResults.forEach((ar) => {
      const key = `${ar.sourceEmployeeNo}_${ar.sourceAccountId}_${ar.recordDate.getTime()}`;
      const config = configMap.get(ar.configId);
      const attendanceCodeNames =
        config?.attendanceCodes
          ?.map((code: string) => attendanceCodeMap.get(code) || code)
          .join(', ') || '';

      const current = allocationMap.get(key) || {
        hours: 0,
        unit: ar.unit || '小时',
        orgId: ar.sourceAccountId || 0,
        orgName: ar.sourceAccountName || '',
        employeeName: ar.sourceEmployeeName || '',
        attendanceCodeNames: '',
      };
      allocationMap.set(key, {
        hours: current.hours + (ar.allocatedHours || 0),
        unit: ar.unit || '小时',
        orgId: current.orgId,
        orgName: current.orgName,
        employeeName: current.employeeName,
        attendanceCodeNames: current.attendanceCodeNames || attendanceCodeNames,
      });
    });

    // 收集所有唯一键
    const allKeys = new Set([...personalMap.keys(), ...allocationMap.keys()]);

    // 组合结果
    const results = Array.from(allKeys).map((key, i) => {
      const keyParts = key.split('_');
      const empNo = keyParts[0];
      const orgId = keyParts[1] ? Number(keyParts[1]) : null;
      const recordDate = new Date(Number(keyParts[2]));

      const personalRecord = personalMap.get(key);
      const teamAllocation = allocationMap.get(key) || {
        hours: 0,
        unit: '小时',
        orgId: 0,
        orgName: '',
        employeeName: '',
      };
      const personalHours = personalRecord?.earnedHours || 0;
      const hasPersonalProduction = personalRecord && personalRecord.actualQty > 0;

      // 获取团队产量的产品信息
      const teamProductionKey = `${recordDate.getTime()}_${teamAllocation.orgId}`;
      const teamProduction = teamProductionMap.get(teamProductionKey);

      // 计算团队挣得（团队产量 / 标准数量 * 标准工时）
      let teamProductionEarned = 0;
      if (
        teamProduction &&
        teamProduction.actualQty > 0 &&
        teamProduction.standardQuantity > 0 &&
        teamProduction.standardHours > 0
      ) {
        teamProductionEarned =
          (teamProduction.actualQty / teamProduction.standardQuantity) *
          teamProduction.standardHours;
      }

      return {
        id: i + 1,
        recordDate: recordDate,
        employeeNo: empNo,
        employeeName: personalRecord?.employeeName || teamAllocation.employeeName || '',
        orgId: personalRecord?.orgId || teamAllocation.orgId || null,
        orgName: personalRecord?.orgName || teamAllocation.orgName || '',
        productId: hasPersonalProduction
          ? personalRecord?.productId || null
          : teamProduction?.productId || null,
        productCode: hasPersonalProduction
          ? personalRecord?.productCode || ''
          : teamProduction?.productCode || '',
        productName: hasPersonalProduction
          ? personalRecord?.productName || ''
          : teamProduction?.productName || '',
        actualQty: personalRecord?.actualQty || 0,
        standardQuantity: hasPersonalProduction ? 1 : teamProduction?.standardQuantity || 100,
        standardHours: hasPersonalProduction
          ? personalRecord?.standardHours || 0
          : teamProduction?.standardHours || 0,
        standardUnit: hasPersonalProduction ? '件' : teamProduction?.standardUnit || '件',
        accountPath: personalRecord?.orgName || teamAllocation.orgName || '',
        // 团队产量相关
        teamProductionQty: teamProduction?.actualQty || 0,
        teamProductionEarned: teamProductionEarned,
        teamProductionUnit: teamProduction?.standardUnit || '件',
        // 团队分摊
        teamAllocatedHours: teamAllocation.hours,
        teamAllocatedUnit: teamAllocation.unit,
        hasPersonalProduction: hasPersonalProduction,
        personalEarnedHours: personalHours,
        personalEarnedUnit: personalRecord?.unit || '小时',
        totalEarnedHours: teamAllocation.hours + personalHours,
      };
    });

    // 按日期和员工排序
    results.sort((a, b) => {
      const dateCompare = new Date(b.recordDate).getTime() - new Date(a.recordDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.employeeNo.localeCompare(b.employeeNo);
    });

    const summary = {
      totalRecords: results.length,
      totalQty: results.reduce((s, r) => s + (r.actualQty || 0), 0),
      totalTeamAllocatedHours: results.reduce((s, r) => s + (r.teamAllocatedHours || 0), 0),
      totalPersonalEarnedHours: results.reduce((s, r) => s + (r.personalEarnedHours || 0), 0),
      totalEarnedHours: results.reduce((s, r) => s + (r.totalEarnedHours || 0), 0),
    };

    return {
      items: results,
      summary,
    };
  }

  @Get('report/team-production')
  @ApiOperation({ summary: '团队产量挣得工时报表' })
  async getTeamProductionEarnedHours(@Query() query: any) {
    return this.earnedHoursService.getTeamProductionEarnedHours(query);
  }

  @Get('report/personal-production')
  @ApiOperation({ summary: '个人产量挣得工时报表' })
  async getPersonalProductionEarnedHours(@Query() query: any) {
    return this.earnedHoursService.getPersonalProductionEarnedHours(query);
  }

  // ============ 配置辅助接口 ============

  @Get('configs/:id/archive')
  @ApiOperation({ summary: '归档挣得工时分摊配置' })
  async archiveEarnedHoursConfig(@Param('id') id: string) {
    return this.allocationService.archiveEarnedHoursConfig(+id);
  }
}
