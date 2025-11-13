import { IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { DiscountType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class PromotionFilterDto {
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  active?: boolean;

  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  validNow?: boolean;
}
