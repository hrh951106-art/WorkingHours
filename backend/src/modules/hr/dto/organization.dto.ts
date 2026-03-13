import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsDateString } from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ description: '组织编码' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: '组织名称' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '父组织ID', required: false })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ description: '组织类型' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({ description: '负责人ID', required: false })
  @IsOptional()
  @IsInt()
  leaderId?: number;

  @ApiProperty({ description: '负责人姓名', required: false })
  @IsOptional()
  @IsString()
  leaderName?: string;

  @ApiProperty({ description: '生效日期' })
  @IsDateString()
  effectiveDate: string;
}

export class UpdateOrganizationDto {
  @ApiProperty({ description: '组织名称', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '父组织ID', required: false })
  @IsOptional()
  @IsInt()
  parentId?: number;

  @ApiProperty({ description: '组织类型', required: false })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ description: '负责人ID', required: false })
  @IsOptional()
  @IsInt()
  leaderId?: number;

  @ApiProperty({ description: '负责人姓名', required: false })
  @IsOptional()
  @IsString()
  leaderName?: string;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE';
}
