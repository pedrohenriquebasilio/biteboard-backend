import { IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum RevenuePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
}

export class RevenueQueryDto {
  @IsEnum(RevenuePeriod)
  period: RevenuePeriod;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}