import { IsBoolean } from 'class-validator';

export class TogglePromotionDto {
  @IsBoolean()
  active: boolean;
}