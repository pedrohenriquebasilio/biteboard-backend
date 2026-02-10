import { IsString, IsNotEmpty, Matches, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conterx 10 ou 11 dígitos' })
  phone: string;

  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isPromotions: boolean = false;
}
