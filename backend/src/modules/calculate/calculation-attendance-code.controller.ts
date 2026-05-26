import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CalculationAttendanceCodeService } from './calculation-attendance-code.service';

@Controller('calculate/calculation-attendance-codes')
@UseGuards(JwtAuthGuard)
export class CalculationAttendanceCodeController {
  constructor(
    private readonly calculationAttendanceCodeService: CalculationAttendanceCodeService,
  ) {}

  /**
   * 查询计算出勤代码列表
   */
  @Get()
  async findAll(@Query() query: any) {
    return this.calculationAttendanceCodeService.findAll({
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
      code: query.code,
      name: query.name,
      type: query.type,
      status: query.status,
    });
  }

  /**
   * 获取所有启用的计算出勤代码（用于下拉选择）
   */
  @Get('active')
  async getActiveCodes() {
    return this.calculationAttendanceCodeService.getActiveCodes();
  }

  /**
   * 生成新的计算出勤代码编码
   */
  @Get('new-code')
  async generateCode() {
    return this.calculationAttendanceCodeService.generateCode();
  }

  /**
   * 查询计算出勤代码详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.calculationAttendanceCodeService.findOne(parseInt(id));
  }

  /**
   * 创建计算出勤代码
   */
  @Post()
  async create(@Body() data: any) {
    return this.calculationAttendanceCodeService.create(data);
  }

  /**
   * 更新计算出勤代码
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.calculationAttendanceCodeService.update(parseInt(id), data);
  }

  /**
   * 删除计算出勤代码
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.calculationAttendanceCodeService.remove(parseInt(id));
  }

  /**
   * 根据代码查询计算出勤代码
   */
  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.calculationAttendanceCodeService.findByCode(code);
  }
}
