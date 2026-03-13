import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSystemConfigDto {
  @ApiProperty({ description: '配置键' })
  @IsString()
  configKey: string;

  @ApiProperty({ description: '配置值' })
  @IsString()
  configValue: string;

  @ApiProperty({ description: '配置分类' })
  @IsString()
  category: string;

  @ApiProperty({ description: '配置描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateSystemConfigDto {
  @ApiProperty({ description: '配置值', required: false })
  @IsOptional()
  @IsString()
  configValue?: string;

  @ApiProperty({ description: '配置描述', required: false })
  @IsOptional()
  @IsString()
  description?: string;
}

export class SystemConfigQueryDto {
  @ApiProperty({ description: '配置分类', required: false })
  @IsOptional()
  @IsString()
  category?: string;
}
