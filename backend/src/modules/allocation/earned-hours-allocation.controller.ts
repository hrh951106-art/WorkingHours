import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AllocationService } from './allocation.service';
import { EarnedHoursAllocationService } from './earned-hours-allocation.service';

@ApiTags('Allocation - 挣得工时分摊')
@Controller('earned-hours-allocation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class EarnedHoursAllocationController {
  constructor(
    private allocationService: AllocationService,
    private earnedHoursService: EarnedHoursAllocationService,
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

  // ============ 配置辅助接口 ============

  @Get('configs/:id/archive')
  @ApiOperation({ summary: '归档挣得工时分摊配置' })
  async archiveEarnedHoursConfig(@Param('id') id: string) {
    return this.allocationService.archiveEarnedHoursConfig(+id);
  }
}
