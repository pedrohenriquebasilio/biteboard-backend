import { IsString, IsNotEmpty, Matches, IsBoolean } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @Matches(/^\d{10,11}$/, { message: 'Telefone deve conterx 10 ou 11 dígitos' })
  phone: string;

  @IsBoolean()
  isPromotions: boolean = false;
}
