import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateIf } from 'class-validator';
import { IsString, IsNotEmpty, IsOptional, IsInt, IsEmail, IsDateString, IsEnum } from 'class-validator';

export class CreateEmployeeDto {
  @ApiProperty({ description: '员工号' })
  @IsString()
  @IsNotEmpty()
  employeeNo: string;

  @ApiProperty({ description: '姓名' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '性别', enum: ['MALE', 'FEMALE'] })
  @IsEnum(['MALE', 'FEMALE'])
  gender: 'MALE' | 'FEMALE';

  @ApiProperty({ description: '身份证号', required: false })
  @IsOptional()
  @IsString()
  idCard?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '所属组织ID' })
  @IsInt()
  @IsNotEmpty()
  orgId: number;

  @ApiProperty({ description: '入职日期' })
  @IsDateString()
  entryDate: string;

  @ApiProperty({ description: '自定义字段', required: false })
  @IsOptional()
  customFields?: any;
}

export class UpdateEmployeeDto {
  @ApiProperty({ description: '姓名', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: '性别', required: false })
  @IsOptional()
  @IsEnum(['MALE', 'FEMALE'])
  gender?: 'MALE' | 'FEMALE';

  @ApiProperty({ description: '身份证号', required: false })
  @IsOptional()
  @IsString()
  idCard?: string;

  @ApiProperty({ description: '手机号', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: '邮箱', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: '所属组织ID', required: false })
  @IsOptional()
  @IsInt()
  orgId?: number;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @IsEnum(['ACTIVE', 'RESIGNED'])
  status?: 'ACTIVE' | 'RESIGNED';

  @ApiProperty({ description: '自定义字段', required: false })
  @IsOptional()
  customFields?: any;
}

export class EmployeeQueryDto {
  @ApiProperty({ description: '页码', required: false, default: 1 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ description: '每页数量', required: false, default: 10 })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  pageSize?: number;

  @ApiProperty({ description: '搜索关键词（按工号或姓名搜索）', required: false })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ description: '搜索关键词（前端参数名）', required: false })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({ description: '组织ID', required: false })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  orgId?: number;

  @ApiProperty({ description: '状态', required: false })
  @IsOptional()
  @ValidateIf((o) => o.status !== '' && o.status !== undefined && o.status !== null)
  @IsEnum(['ACTIVE', 'RESIGNED'], {
    message: 'status must be one of the following values: ACTIVE, RESIGNED'
  })
  status?: 'ACTIVE' | 'RESIGNED';
}
