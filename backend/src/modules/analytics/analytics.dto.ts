import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AnalyticsFilterDto {
  @Type(() => Number) @IsInt() @Min(2000) @Max(2200) year!: number;
  @IsOptional() @IsIn(['PROJECT', 'OPERATIONAL_TASK']) kind?: 'PROJECT' | 'OPERATIONAL_TASK';
  @IsOptional() @IsUUID() department_id?: string;
  @IsOptional() @IsUUID() manager_id?: string;
}

export class QuarterlyAnalyticsFilterDto extends AnalyticsFilterDto {
  @IsIn(['Q1', 'Q2', 'Q3', 'Q4']) quarter!: 'Q1' | 'Q2' | 'Q3' | 'Q4';
}
