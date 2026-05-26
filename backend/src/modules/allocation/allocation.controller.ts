import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AllocationService } from './allocation.service';
import { AllocationScopeService } from './allocation-scope.service';

@ApiTags('Allocation - 间接工时分摊')
@Controller('allocation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AllocationController {
  constructor(
    private allocationService: AllocationService,
    private allocationScopeService: AllocationScopeService,
  ) {}

  // ============ 产品管理 ============

  @Get('products')
  @ApiOperation({ summary: '获取产品列表' })
  async getProducts(@Query() query: any) {
    return this.allocationService.getProducts(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: '获取产品详情' })
  async getProduct(@Param('id') id: string) {
    return this.allocationService.getProduct(+id);
  }

  @Post('products')
  @ApiOperation({ summary: '创建产品' })
  async createProduct(@Body() dto: any) {
    return this.allocationService.createProduct(dto);
  }

  @Put('products/:id')
  @ApiOperation({ summary: '更新产品' })
  async updateProduct(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProduct(+id, dto);
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '删除产品' })
  async deleteProduct(@Param('id') id: string) {
    return this.allocationService.deleteProduct(+id);
  }

  @Get('products/:productId/standard-hours')
  @ApiOperation({ summary: '获取产品标准工时列表' })
  async getProductStandardHours(@Param('productId') productId: string) {
    return this.allocationService.getProductStandardHours(+productId);
  }

  @Post('products/:productId/standard-hours')
  @ApiOperation({ summary: '创建产品标准工时' })
  async createProductStandardHours(@Param('productId') productId: string, @Body() dto: any) {
    return this.allocationService.createProductStandardHours(+productId, dto);
  }

  @Put('standard-hours/:id')
  @ApiOperation({ summary: '更新产品标准工时' })
  async updateProductStandardHours(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProductStandardHours(+id, dto);
  }

  @Delete('standard-hours/:id')
  @ApiOperation({ summary: '删除产品标准工时' })
  async deleteProductStandardHours(@Param('id') id: string) {
    return this.allocationService.deleteProductStandardHours(+id);
  }

  // ============ 产品层级标准工时配置 ============

  @Get('products/:productId/standard-hour-by-levels')
  @ApiOperation({ summary: '获取产品层级标准工时配置列表' })
  async getProductStandardHourByLevels(@Param('productId') productId: string) {
    return this.allocationService.getProductStandardHourByLevels(+productId);
  }

  @Get('standard-hour-by-levels')
  @ApiOperation({ summary: '获取所有产品层级标准工时配置' })
  async getAllProductStandardHourByLevels(@Query() query: any) {
    return this.allocationService.getAllProductStandardHourByLevels(query);
  }

  @Post('standard-hour-by-levels')
  @ApiOperation({ summary: '创建产品层级标准工时配置' })
  async createProductStandardHourByLevel(@Body() dto: any) {
    return this.allocationService.createProductStandardHourByLevel(dto);
  }

  @Put('standard-hour-by-levels/:id')
  @ApiOperation({ summary: '更新产品层级标准工时配置' })
  async updateProductStandardHourByLevel(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProductStandardHourByLevel(+id, dto);
  }

  @Delete('standard-hour-by-levels/:id')
  @ApiOperation({ summary: '删除产品层级标准工时配置' })
  async deleteProductStandardHourByLevel(@Param('id') id: string) {
    return this.allocationService.deleteProductStandardHourByLevel(+id);
  }

  // ============ 产品工序管理 ============

  @Get('products/:productId/processes')
  @ApiOperation({ summary: '获取产品工序列表' })
  async getProductProcesses(@Param('productId') productId: string) {
    return this.allocationService.getProductProcesses(+productId);
  }

  @Post('products/:productId/processes')
  @ApiOperation({ summary: '添加工序到产品' })
  async addProcessToProduct(@Param('productId') productId: string, @Body() dto: any) {
    return this.allocationService.addProcessToProduct(+productId, dto);
  }

  @Delete('products/:productId/processes/:processId')
  @ApiOperation({ summary: '从产品移除工序' })
  async removeProcessFromProduct(@Param('productId') productId: string, @Param('processId') processId: string) {
    return this.allocationService.removeProcessFromProduct(+productId, +processId);
  }

  @Put('product-processes/:id')
  @ApiOperation({ summary: '更新产品工序关联' })
  async updateProductProcess(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProductProcess(+id, dto);
  }

  // ============ 通用配置管理 ============

  @Get('general-config')
  @ApiOperation({ summary: '获取通用配置' })
  async getGeneralConfig() {
    return this.allocationService.getGeneralConfig();
  }

  @Put('general-config')
  @ApiOperation({ summary: '更新通用配置' })
  async updateGeneralConfig(@Body() dto: any) {
    return this.allocationService.updateGeneralConfig(dto);
  }

  // ============ 产线管理 ============

  @Get('production-lines')
  @ApiOperation({ summary: '获取产线列表' })
  async getProductionLines(@Query() query: any) {
    return this.allocationService.getProductionLines(query);
  }

  @Get('production-lines/:id')
  @ApiOperation({ summary: '获取产线详情' })
  async getProductionLine(@Param('id') id: string) {
    return this.allocationService.getProductionLine(+id);
  }

  @Post('production-lines')
  @ApiOperation({ summary: '创建产线' })
  async createProductionLine(@Body() dto: any) {
    return this.allocationService.createProductionLine(dto);
  }

  @Put('production-lines/:id')
  @ApiOperation({ summary: '更新产线' })
  async updateProductionLine(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProductionLine(+id, dto);
  }

  @Delete('production-lines/:id')
  @ApiOperation({ summary: '删除产线' })
  async deleteProductionLine(@Param('id') id: string) {
    return this.allocationService.deleteProductionLine(+id);
  }

  // ============ 产线班次管理 ============

  @Get('line-shifts')
  @ApiOperation({ summary: '获取产线班次列表' })
  async getLineShifts(@Query() query: any) {
    return this.allocationService.getLineShifts(query);
  }

  @Post('line-shifts')
  @ApiOperation({ summary: '创建产线班次' })
  async createLineShift(@Body() dto: any) {
    return this.allocationService.createLineShift(dto);
  }

  @Put('line-shifts/:id')
  @ApiOperation({ summary: '更新产线班次' })
  async updateLineShift(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateLineShift(+id, dto);
  }

  @Delete('line-shifts/:id')
  @ApiOperation({ summary: '删除产线班次' })
  async deleteLineShift(@Param('id') id: string) {
    return this.allocationService.deleteLineShift(+id);
  }

  // ============ 产量记录管理 ============

  @Get('production-records')
  @ApiOperation({ summary: '获取产量记录列表' })
  async getProductionRecords(@Query() query: any) {
    return this.allocationService.getProductionRecords(query);
  }

  @Get('production-records/:id')
  @ApiOperation({ summary: '获取产量记录详情' })
  async getProductionRecord(@Param('id') id: string) {
    return this.allocationService.getProductionRecord(+id);
  }

  @Post('production-records')
  @ApiOperation({ summary: '创建产量记录' })
  async createProductionRecord(@Body() dto: any) {
    return this.allocationService.createProductionRecord(dto);
  }

  @Put('production-records/:id')
  @ApiOperation({ summary: '更新产量记录' })
  async updateProductionRecord(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateProductionRecord(+id, dto);
  }

  @Delete('production-records/:id')
  @ApiOperation({ summary: '删除产量记录' })
  async deleteProductionRecord(@Param('id') id: string) {
    return this.allocationService.deleteProductionRecord(+id);
  }

  @Post('production-records/batch')
  @ApiOperation({ summary: '批量导入产量记录' })
  async batchImportProductionRecords(@Body() dto: any) {
    return this.allocationService.batchImportProductionRecords(dto);
  }

  // ============ 个人产量记录管理 ============

  @Get('personal-production-records')
  @ApiOperation({ summary: '获取个人产量记录列表' })
  async getPersonalProductionRecords(@Query() query: any) {
    return this.allocationService.getPersonalProductionRecords(query);
  }

  @Get('personal-production-records/:id')
  @ApiOperation({ summary: '获取个人产量记录详情' })
  async getPersonalProductionRecord(@Param('id') id: string) {
    return this.allocationService.getPersonalProductionRecord(+id);
  }

  @Post('personal-production-records')
  @ApiOperation({ summary: '创建个人产量记录' })
  async createPersonalProductionRecord(@Body() dto: any) {
    return this.allocationService.createPersonalProductionRecord(dto);
  }

  @Put('personal-production-records/:id')
  @ApiOperation({ summary: '更新个人产量记录' })
  async updatePersonalProductionRecord(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updatePersonalProductionRecord(+id, dto);
  }

  @Delete('personal-production-records/:id')
  @ApiOperation({ summary: '删除个人产量记录' })
  async deletePersonalProductionRecord(@Param('id') id: string) {
    return this.allocationService.deletePersonalProductionRecord(+id);
  }

  // ============ 分摊配置管理 ============

  @Get('configs')
  @ApiOperation({ summary: '获取分摊配置列表' })
  async getAllocationConfigs(@Query() query: any) {
    return this.allocationService.getAllocationConfigs(query);
  }

  @Get('configs/:id')
  @ApiOperation({ summary: '获取分摊配置详情' })
  async getAllocationConfig(@Param('id') id: string) {
    return this.allocationService.getAllocationConfig(+id);
  }

  @Post('configs')
  @ApiOperation({ summary: '创建分摊配置' })
  async createAllocationConfig(@Body() dto: any) {
    return this.allocationService.createAllocationConfig(dto);
  }

  @Put('configs/:id')
  @ApiOperation({ summary: '更新分摊配置' })
  async updateAllocationConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.updateAllocationConfig(+id, dto);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: '删除分摊配置' })
  async deleteAllocationConfig(@Param('id') id: string) {
    return this.allocationService.deleteAllocationConfig(+id);
  }

  @Post('configs/:id/activate')
  @ApiOperation({ summary: '启用分摊配置' })
  async activateAllocationConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.activateAllocationConfig(+id, dto);
  }

  @Post('configs/:id/copy')
  @ApiOperation({ summary: '复制分摊配置' })
  async copyAllocationConfig(@Param('id') id: string, @Body() dto: any) {
    return this.allocationService.copyAllocationConfig(+id, dto);
  }

  // ============ 分摊计算 ============

  @Post('calculate')
  @ApiOperation({ summary: '执行分摊计算' })
  async calculateAllocation(@Body() dto: any) {
    return this.allocationService.calculateAllocation(dto);
  }

  @Get('calculate/progress/:batchNo')
  @ApiOperation({ summary: '查询计算进度' })
  async getCalculationProgress(@Param('batchNo') batchNo: string) {
    return this.allocationService.getCalculationProgress(batchNo);
  }

  // ============ 分摊结果查询 ============

  @Get('results')
  @ApiOperation({ summary: '查询分摊结果' })
  async getAllocationResults(@Query() query: any) {
    return this.allocationService.getAllocationResults(query);
  }

  @Get('results/summary')
  @ApiOperation({ summary: '查询分摊结果汇总' })
  async getAllocationResultsSummary(@Query() query: any) {
    return this.allocationService.getAllocationResultsSummary(query);
  }

  // ============ 配置辅助接口 ============

  @Get('configs/:id/archive')
  @ApiOperation({ summary: '归档分摊配置' })
  async archiveAllocationConfig(@Param('id') id: string) {
    return this.allocationService.archiveAllocationConfig(+id);
  }

  @Get('attendance-codes')
  @ApiOperation({ summary: '获取可用的出勤代码列表（用于配置间接工时）' })
  async getAttendanceCodesForAllocation() {
    return this.allocationService.getAttendanceCodesForAllocation();
  }

  // ============ 分摊范围匹配接口 ============

  @Get('scope/extract-level')
  @ApiOperation({ summary: '从账户名称中提取指定层级的值' })
  async extractLevelFromAccountName(
    @Query('accountName') accountName: string,
    @Query('level') level: string,
  ) {
    const levelNum = parseInt(level, 10);
    return {
      accountName,
      level: levelNum,
      value: this.allocationScopeService.extractLevelFromAccountName(accountName, levelNum),
    };
  }

  @Get('scope/extract-multiple-levels')
  @ApiOperation({ summary: '批量从账户名称中提取多个层级的值' })
  async extractMultipleLevelsFromAccountName(
    @Query('accountName') accountName: string,
    @Query('levels') levels: string,
  ) {
    const levelNums = levels.split(',').map(l => parseInt(l.trim(), 10));
    return {
      accountName,
      levels: levelNums,
      values: this.allocationScopeService.extractMultipleLevelsFromAccountName(accountName, levelNums),
    };
  }

  @Get('scope/hierarchy')
  @ApiOperation({ summary: '获取账户名称的完整层级信息' })
  async getAccountNameHierarchy(@Query('accountName') accountName: string) {
    return this.allocationScopeService.getAccountNameHierarchy(accountName);
  }

  @Get('scope/match-line-shifts')
  @ApiOperation({ summary: '在开线计划表中匹配指定层级的数据' })
  async matchLineShiftsByLevel(
    @Query('level') level: string,
    @Query('levelValue') levelValue: string,
    @Query('scheduleDate') scheduleDate?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
  ) {
    const levelNum = parseInt(level, 10);
    const queryOptions: any = {};

    if (scheduleDate) {
      queryOptions.scheduleDate = new Date(scheduleDate);
    }

    if (shiftId) {
      queryOptions.shiftId = parseInt(shiftId, 10);
    }

    if (status) {
      queryOptions.status = status;
    }

    return this.allocationScopeService.matchLineShiftsByLevel(levelNum, levelValue, queryOptions);
  }

  @Get('scope/extract-wh1001')
  @ApiOperation({ summary: '从开线计划记录中解析 WH1001 配置的层级值' })
  async extractWH1001LevelFromLineShift(
    @Query('lineShiftId') lineShiftId: string,
    @Query('targetLevel') targetLevel?: string,
  ) {
    const lineShiftIdNum = parseInt(lineShiftId, 10);
    const targetLevelNum = targetLevel ? parseInt(targetLevel, 10) : undefined;

    return {
      lineShiftId: lineShiftIdNum,
      targetLevel: targetLevelNum,
      value: await this.allocationScopeService.extractWH1001LevelFromLineShift(
        lineShiftIdNum,
        targetLevelNum,
      ),
    };
  }

  @Get('scope/participating')
  @ApiOperation({ summary: '检查开线计划记录是否应该参与分摊' })
  async shouldParticipateInAllocation(@Query('lineShiftId') lineShiftId: string) {
    const lineShiftIdNum = parseInt(lineShiftId, 10);
    return {
      lineShiftId: lineShiftIdNum,
      participate: await this.allocationScopeService.shouldParticipateInAllocation(lineShiftIdNum),
    };
  }

  @Get('scope/match')
  @ApiOperation({ summary: '完整的分摊范围匹配流程' })
  async matchAllocationScope(
    @Query('sourceAccountName') sourceAccountName: string,
    @Query('allocationScopeLevel') allocationScopeLevel: string,
    @Query('scheduleDate') scheduleDate?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
    @Query('wh1001TargetLevel') wh1001TargetLevel?: string,
  ) {
    const allocationScopeLevelNum = parseInt(allocationScopeLevel, 10);
    const queryOptions: any = {};

    if (scheduleDate) {
      queryOptions.scheduleDate = new Date(scheduleDate);
    }

    if (shiftId) {
      queryOptions.shiftId = parseInt(shiftId, 10);
    }

    if (status) {
      queryOptions.status = status;
    }

    const wh1001TargetLevelNum = wh1001TargetLevel ? parseInt(wh1001TargetLevel, 10) : undefined;

    return this.allocationScopeService.matchAllocationScope(
      sourceAccountName,
      allocationScopeLevelNum,
      queryOptions,
      wh1001TargetLevelNum,
    );
  }

  @Get('scope/match-by-config')
  @ApiOperation({ summary: '根据分摊范围配置获取匹配的开线计划记录' })
  async matchByAllocationScopeConfig(
    @Query('allocationScopeId') allocationScopeId: string,
    @Query('sourceAccountName') sourceAccountName: string,
    @Query('scheduleDate') scheduleDate?: string,
    @Query('shiftId') shiftId?: string,
    @Query('status') status?: string,
  ) {
    const allocationScopeIdNum = parseInt(allocationScopeId, 10);
    const queryOptions: any = {};

    if (scheduleDate) {
      queryOptions.scheduleDate = new Date(scheduleDate);
    }

    if (shiftId) {
      queryOptions.shiftId = parseInt(shiftId, 10);
    }

    if (status) {
      queryOptions.status = status;
    }

    return this.allocationScopeService.matchByAllocationScopeConfig(
      allocationScopeIdNum,
      sourceAccountName,
      queryOptions,
    );
  }

  @Get('scope/hierarchy-levels')
  @ApiOperation({ summary: '获取账户层级配置列表' })
  async getHierarchyLevels() {
    return this.allocationScopeService.getHierarchyLevels();
  }

  @Get('scope/org-type-by-level')
  @ApiOperation({ summary: '根据层级获取对应的组织类型' })
  async getOrgTypeByLevel(@Query('level') level: string) {
    const levelNum = parseInt(level, 10);
    return {
      level: levelNum,
      orgType: await this.allocationScopeService.getOrgTypeByLevel(levelNum),
    };
  }
}
