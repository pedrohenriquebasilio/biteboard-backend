import { Module } from '@nestjs/common';
import { OrdersModule } from './modules/orders/orders.module';
import { MenuModule } from './modules/menu/menu.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { CustomersModule } from './modules/customers/customers.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { AuthModule } from './modules/auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { FinancialModule } from './modules/financial/financial.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    OrdersModule,
    MenuModule,
    PromotionsModule,
    CustomersModule,
    RealtimeModule,
    AuthModule,
    DashboardModule,
    FinancialModule,
    ConversationsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
