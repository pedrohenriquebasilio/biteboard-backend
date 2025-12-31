import { Module } from '@nestjs/common';
import { WebhookGatewayService } from './webhook-gateway.service';
import { WebhookGatewayController } from './webhook-gateway.controller';
import { CustomersModule } from '../customers/customers.module';
import { ConversationsModule } from '../conversations/conversations.module';

@Module({
  imports: [CustomersModule, ConversationsModule],
  controllers: [WebhookGatewayController],
  providers: [WebhookGatewayService],
  exports: [WebhookGatewayService],
})
export class WebhookGatewayModule {}

