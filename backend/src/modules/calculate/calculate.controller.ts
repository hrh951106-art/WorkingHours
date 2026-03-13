import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { CalculateService } from './calculate.service';

@ApiTags('Calculate')
@Controller('calculate')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CalculateController {
  constructor(private calculateService: CalculateService) {}

  @Get('punch-rules')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取打卡规则' })
  async getPunchRules() {
    return this.calculateService.getPunchRules();
  }

  @Post('punch-rules')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建打卡规则' })
  async createPunchRule(@Body() dto: any) {
    return this.calculateService.createPunchRule(dto);
  }

  @Put('punch-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新打卡规则' })
  async updatePunchRule(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.updatePunchRule(+id, dto);
  }

  @Delete('punch-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除打卡规则' })
  async deletePunchRule(@Param('id') id: string) {
    return this.calculateService.deletePunchRule(+id);
  }

  @Get('calc-rules')
  @RequirePermissions('calculate:rule:view')
  @ApiOperation({ summary: '获取计算规则' })
  async getCalcRules() {
    return this.calculateService.getCalcRules();
  }

  @Post('calc-rules')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '创建计算规则' })
  async createCalcRule(@Body() dto: any) {
    return this.calculateService.createCalcRule(dto);
  }

  @Put('calc-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '更新计算规则' })
  async updateCalcRule(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.updateCalcRule(+id, dto);
  }

  @Delete('calc-rules/:id')
  @RequirePermissions('calculate:rule:edit')
  @ApiOperation({ summary: '删除计算规则' })
  async deleteCalcRule(@Param('id') id: string) {
    return this.calculateService.deleteCalcRule(+id);
  }

  @Post('calculate')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '触发计算' })
  async calculate(@Body() dto: any) {
    return this.calculateService.calculate(dto);
  }

  @Post('calculate/batch')
  @RequirePermissions('calculate:calculate')
  @ApiOperation({ summary: '批量重算' })
  async batchCalculate(@Body() dto: any) {
    return this.calculateService.batchCalculate(dto);
  }

  @Get('results')
  @RequirePermissions('calculate:result:view')
  @ApiOperation({ summary: '获取计算结果' })
  async getResults(@Query() query: any, @Req() req: any) {
    return this.calculateService.getResults(query, req.user);
  }

  @Get('results/:id')
  @RequirePermissions('calculate:result:view')
  @ApiOperation({ summary: '获取结果详情' })
  async getResult(@Param('id') id: string) {
    return this.calculateService.getResult(+id);
  }

  @Put('results/:id/correct')
  @RequirePermissions('calculate:result:correct')
  @ApiOperation({ summary: '修正结果' })
  async correctResult(@Param('id') id: string, @Body() dto: any) {
    return this.calculateService.correctResult(+id, dto);
  }
}
