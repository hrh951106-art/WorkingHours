import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AttendanceCodeDefinitionService } from './attendance-code-definition.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('calculate/attendance-code-definitions')
@UseGuards(JwtAuthGuard)
export class AttendanceCodeDefinitionController {
  constructor(private attendanceCodeDefinitionService: AttendanceCodeDefinitionService) {}

  @Get()
  async getAttendanceCodeDefinitions() {
    return this.attendanceCodeDefinitionService.getAttendanceCodeDefinitions();
  }

  @Get(':id')
  async getAttendanceCodeDefinition(@Param('id') id: string) {
    return this.attendanceCodeDefinitionService.getAttendanceCodeDefinition(+id);
  }

  @Post()
  async createAttendanceCodeDefinition(@Body() dto: any) {
    return this.attendanceCodeDefinitionService.createAttendanceCodeDefinition(dto);
  }

  @Put(':id')
  async updateAttendanceCodeDefinition(@Param('id') id: string, @Body() dto: any) {
    return this.attendanceCodeDefinitionService.updateAttendanceCodeDefinition(+id, dto);
  }

  @Delete(':id')
  async deleteAttendanceCodeDefinition(@Param('id') id: string) {
    return this.attendanceCodeDefinitionService.deleteAttendanceCodeDefinition(+id);
  }
}
