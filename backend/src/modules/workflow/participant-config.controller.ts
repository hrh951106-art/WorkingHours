import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ParticipantConfigService } from './participant-config.service';
import { CreateParticipantConfigDto, UpdateParticipantConfigDto, UpdateParticipantConfigStatusDto } from './dto/participant-config.dto';

@Controller('workflow/participants')
@UseGuards(JwtAuthGuard)
export class ParticipantConfigController {
  constructor(private readonly participantConfigService: ParticipantConfigService) {}

  @Get()
  findAll() {
    return this.participantConfigService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.participantConfigService.findOne(+id);
  }

  @Post()
  create(@Body() createDto: CreateParticipantConfigDto) {
    return this.participantConfigService.create(createDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateParticipantConfigDto) {
    return this.participantConfigService.update(+id, updateDto);
  }

  @Put(':id/status')
  updateStatus(@Param('id') id: string, @Body() statusDto: UpdateParticipantConfigStatusDto) {
    return this.participantConfigService.updateStatus(+id, statusDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.participantConfigService.remove(+id);
  }
}
