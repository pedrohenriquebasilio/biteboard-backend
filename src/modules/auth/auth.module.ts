import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') ?? 'change-me-in-env';

        const expiresInConfig = configService.get<number | string>(
          'JWT_EXPIRES_IN',
        );

        let expiresIn: string | number | undefined = '1d';
        if (typeof expiresInConfig === 'number') {
          expiresIn = expiresInConfig;
        } else if (
          typeof expiresInConfig === 'string' &&
          expiresInConfig.trim().length > 0
        ) {
          expiresIn = expiresInConfig;
        }

        return {
          secret,
          signOptions: {
            expiresIn: expiresIn as any, // 👈 resolve o erro TS2322
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [JwtModule],
})
export class AuthModule {}
