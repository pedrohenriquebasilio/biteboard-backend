import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
  IsOptional,
} from 'class-validator';

export class CreatePromotionDto {
  @IsString()
  @IsNotEmpty()
  menuItemId: string;

  @IsNumber()
  @Min(0)
  priceCurrent: number; // Novo valor com desconto

  @IsDateString()
  validFrom: string;

  @IsDateString()
  validUntil: string;
}
