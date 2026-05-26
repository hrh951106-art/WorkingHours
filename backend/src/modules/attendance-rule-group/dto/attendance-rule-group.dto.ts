import { IsArray, IsBoolean, IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateAttendanceRuleGroupDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  attendanceCodeIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  amountPolicyIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  amountPolicyGroupIds?: number[];

  @IsOptional()
  @IsNumber()
  attendancePunchRuleId?: number;

  @IsOptional()
  @IsNumber()
  leanPunchRuleId?: number;
}

export class UpdateAttendanceRuleGroupDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  attendanceCodeIds?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  amountPolicyIds?: number[];

  @IsOptional()
  @IsNumber()
  attendancePunchRuleId?: number;

  @IsOptional()
  @IsNumber()
  leanPunchRuleId?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

export class QueryAttendanceRuleGroupDto {
  @IsOptional()
  code?: string;

  @IsOptional()
  name?: string;

  @IsOptional()
  status?: string;

  @IsOptional()
  isDefault?: string;

  @IsOptional()
  page?: number;

  @IsOptional()
  pageSize?: number;
}

export class GrantRuleGroupToEmployeesDto {
  @IsNumber()
  ruleGroupId: number;

  @IsArray()
  @IsNumber({}, { each: true })
  employeeIds: number[];

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateEmployeeRuleGroupDto {
  @IsNumber()
  ruleGroupId: number;

  @IsDateString()
  effectiveDate: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
