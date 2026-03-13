import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AttendanceCodeService } from './attendance-code.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('calculate/attendance-codes')
@UseGuards(JwtAuthGuard)
export class AttendanceCodeController {
  constructor(private attendanceCodeService: AttendanceCodeService) {}

  @Get()
  async getAttendanceCodes() {
    return this.attendanceCodeService.getAttendanceCodes();
  }

  @Get(':id')
  async getAttendanceCode(@Param('id') id: string) {
    return this.attendanceCodeService.getAttendanceCode(+id);
  }

  @Post()
  async createAttendanceCode(@Body() dto: any) {
    return this.attendanceCodeService.createAttendanceCode(dto);
  }

  @Put(':id')
  async updateAttendanceCode(@Param('id') id: string, @Body() dto: any) {
    return this.attendanceCodeService.updateAttendanceCode(+id, dto);
  }

  @Delete(':id')
  async deleteAttendanceCode(@Param('id') id: string) {
    return this.attendanceCodeService.deleteAttendanceCode(+id);
  }

  @Post(':pairId/calculate')
  async calculateFromPunchPair(@Param('pairId') pairId: string) {
    return this.attendanceCodeService.calculateFromPunchPair(+pairId);
  }
}
