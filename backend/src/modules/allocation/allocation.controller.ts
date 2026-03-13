import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AllocationService } from './allocation.service';

@ApiTags('Allocation - 间接工时分摊')
@Controller('allocation')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AllocationController {
  constructor(private allocationService: AllocationService) {}

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
}
