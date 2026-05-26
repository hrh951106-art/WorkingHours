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
import { DefinitionAttendanceCodeService } from './definition-attendance-code.service';

@Controller('allocation/definition-attendance-codes')
@UseGuards(JwtAuthGuard)
export class DefinitionAttendanceCodeController {
  constructor(
    private readonly definitionAttendanceCodeService: DefinitionAttendanceCodeService,
  ) {}

  /**
   * 查询定义出勤代码列表
   */
  @Get()
  async findAll(@Query() query: any) {
    return this.definitionAttendanceCodeService.findAll({
      page: query.page ? parseInt(query.page) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize) : undefined,
      code: query.code,
      name: query.name,
      type: query.type,
      status: query.status,
      calcAttendanceCode: query.calcAttendanceCode,
    });
  }

  /**
   * 获取所有启用的定义出勤代码（用于下拉选择）
   */
  @Get('active')
  async getActiveCodes() {
    return this.definitionAttendanceCodeService.getActiveCodes();
  }

  /**
   * 查询定义出勤代码详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.definitionAttendanceCodeService.findOne(parseInt(id));
  }

  /**
   * 创建定义出勤代码
   */
  @Post()
  async create(@Body() data: any) {
    return this.definitionAttendanceCodeService.create(data);
  }

  /**
   * 更新定义出勤代码
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: any) {
    return this.definitionAttendanceCodeService.update(parseInt(id), data);
  }

  /**
   * 删除定义出勤代码
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.definitionAttendanceCodeService.remove(parseInt(id));
  }

  /**
   * 根据代码查询定义出勤代码
   */
  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    return this.definitionAttendanceCodeService.findByCode(code);
  }

  /**
   * 根据计算出勤代码查找对应的定义出勤代码
   */
  @Get('calc-code/:calcCode')
  async findByCalcAttendanceCode(@Param('calcCode') calcCode: string) {
    return this.definitionAttendanceCodeService.findByCalcAttendanceCode(calcCode);
  }

  /**
   * 批量获取代码映射关系
   */
  @Post('mapping')
  async getCodeMapping(@Body() body: { calcCodes: string[] }) {
    return this.definitionAttendanceCodeService.getCodeMapping(body.calcCodes);
  }
}
