import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AttendanceRuleGroupService } from './attendance-rule-group.service';
import {
  CreateAttendanceRuleGroupDto,
  UpdateAttendanceRuleGroupDto,
  QueryAttendanceRuleGroupDto,
  GrantRuleGroupToEmployeesDto,
  UpdateEmployeeRuleGroupDto,
} from './dto/attendance-rule-group.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('attendance-rule-groups')
@UseGuards(JwtAuthGuard)
export class AttendanceRuleGroupController {
  constructor(private readonly attendanceRuleGroupService: AttendanceRuleGroupService) {}

  /**
   * 获取考勤规则组列表
   */
  @Get()
  async findAll(@Query() query: QueryAttendanceRuleGroupDto) {
    return this.attendanceRuleGroupService.findAll(query);
  }

  /**
   * 生成新的考勤规则组编码
   */
  @Get('new-code')
  async generateCode() {
    return this.attendanceRuleGroupService.generateCode();
  }

  /**
   * 获取考勤规则组详情
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.attendanceRuleGroupService.findOne(+id);
  }

  /**
   * 创建考勤规则组
   */
  @Post()
  async create(@Body() data: CreateAttendanceRuleGroupDto, @Request() req) {
    return this.attendanceRuleGroupService.create({
      ...data,
      createdById: req.user?.userId || 1,
      createdByName: req.user?.username || 'admin',
    });
  }

  /**
   * 更新考勤规则组
   */
  @Put(':id')
  async update(@Param('id') id: string, @Body() data: UpdateAttendanceRuleGroupDto) {
    console.log('📥 收到更新考勤规则组请求:');
    console.log('  URL参数 id:', id, '类型:', typeof id);
    console.log('  请求体 data:', JSON.stringify(data, null, 2));
    console.log('  data的所有键:', Object.keys(data));
    try {
      const result = await this.attendanceRuleGroupService.update(+id, data);
      console.log('✅ 更新考勤规则组成功:', result);
      return result;
    } catch (error) {
      console.error('❌ 更新考勤规则组失败:', error);
      throw error;
    }
  }

  /**
   * 删除考勤规则组（软删除）
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.attendanceRuleGroupService.remove(+id);
  }

  /**
   * 批量授予员工考勤规则组
   */
  @Post('grant-to-employees')
  async grantToEmployees(@Body() data: GrantRuleGroupToEmployeesDto, @Request() req) {
    return this.attendanceRuleGroupService.grantToEmployees({
      ...data,
      createdById: req.user.userId,
      createdByName: req.user.username,
    });
  }

  /**
   * 获取员工的考勤规则组历史
   */
  @Get('employee-groups/:employeeId')
  async getEmployeeRuleGroups(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query() query: any,
  ) {
    return this.attendanceRuleGroupService.getEmployeeRuleGroups(employeeId, query);
  }

  /**
   * 更新员工考勤规则组
   */
  @Put('employee-groups/:employeeId')
  async updateEmployeeRuleGroup(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Body() data: UpdateEmployeeRuleGroupDto,
  ) {
    console.log('📥 收到更新员工考勤规则组请求:');
    console.log('  URL参数 employeeId:', employeeId, '类型:', typeof employeeId);
    console.log('  请求体 data:', JSON.stringify(data, null, 2));
    console.log('  data的所有键:', Object.keys(data));
    return this.attendanceRuleGroupService.updateEmployeeRuleGroup(employeeId, data);
  }

  /**
   * 获取当前有效的考勤规则组
   */
  @Get('active/:employeeId')
  async getActiveRuleGroup(
    @Param('employeeId', ParseIntPipe) employeeId: number,
    @Query('targetDate') targetDate?: string,
  ) {
    const date = targetDate ? new Date(targetDate) : undefined;
    return this.attendanceRuleGroupService.getActiveRuleGroup(employeeId, date);
  }

  /**
   * 删除员工考勤规则组记录
   */
  @Delete('employee-groups/:id')
  async removeEmployeeRuleGroup(@Param('id', ParseIntPipe) id: number) {
    return this.attendanceRuleGroupService.removeEmployeeRuleGroup(id);
  }
}
