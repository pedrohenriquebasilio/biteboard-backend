import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Restaurant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existingRestaurant = await this.prisma.restaurant.findUnique({
      where: { email: dto.email },
    });

    if (existingRestaurant) {
      throw new BadRequestException('E-mail já está em uso');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const restaurant = await this.prisma.restaurant.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        phone: dto.phone ?? null,
      },
    });

    return this.buildAuthResponse(restaurant);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { email: dto.email },
    });

    if (!restaurant) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      restaurant.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.buildAuthResponse(restaurant);
  }

  private async buildAuthResponse(
    restaurant: Restaurant,
  ): Promise<AuthResponseDto> {
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') ?? '1d';

    const payload = {
      sub: restaurant.id,
      restaurantId: restaurant.id,
      email: restaurant.email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn,
      restaurant: this.sanitizeRestaurant(restaurant),
    };
  }

  private sanitizeRestaurant(restaurant: Restaurant) {
    return {
      id: restaurant.id,
      name: restaurant.name,
      email: restaurant.email,
      phone: restaurant.phone,
      createdAt: restaurant.createdAt,
    };
  }
}
