import { Module } from '@nestjs/common';
import { WebhookGatewayService } from './webhook-gateway.service';
import { WebhookGatewayController } from './webhook-gateway.controller';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [CustomersModule],
  controllers: [WebhookGatewayController],
  providers: [WebhookGatewayService],
  exports: [WebhookGatewayService],
})
export class WebhookGatewayModule {}

