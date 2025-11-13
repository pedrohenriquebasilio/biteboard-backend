import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsDateString,
  Min,
  Max,
  IsOptional,
} from 'class-validator';
import { DiscountType } from '@prisma/client';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  discount: number;

  @IsEnum(DiscountType)
  discountType: DiscountType;

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;
}
