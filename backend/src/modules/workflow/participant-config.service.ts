import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateParticipantConfigDto, UpdateParticipantConfigDto, UpdateParticipantConfigStatusDto } from './dto/participant-config.dto';

@Injectable()
export class ParticipantConfigService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.participantConfig.findMany({
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  async findOne(id: number) {
    const config = await this.prisma.participantConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new NotFoundException(`参与人配置 ID ${id} 不存在`);
    }

    return config;
  }

  async create(createDto: CreateParticipantConfigDto) {
    // 检查 code 是否已存在
    const existing = await this.prisma.participantConfig.findUnique({
      where: { code: createDto.code },
    });

    if (existing) {
      throw new ConflictException(`配置代码 ${createDto.code} 已存在`);
    }

    return this.prisma.participantConfig.create({
      data: {
        code: createDto.code,
        name: createDto.name,
        type: createDto.type,
        participants: createDto.participants,
        description: createDto.description,
        sortOrder: createDto.sortOrder ?? 0,
        status: createDto.status ?? 'ACTIVE',
      },
    });
  }

  async update(id: number, updateDto: UpdateParticipantConfigDto) {
    // 检查是否存在
    await this.findOne(id);

    return this.prisma.participantConfig.update({
      where: { id },
      data: updateDto,
    });
  }

  async updateStatus(id: number, statusDto: UpdateParticipantConfigStatusDto) {
    await this.findOne(id);

    return this.prisma.participantConfig.update({
      where: { id },
      data: { status: statusDto.status },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.participantConfig.delete({
      where: { id },
    });
  }
}
