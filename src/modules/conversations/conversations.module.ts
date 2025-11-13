import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeModule } from '../realtime/realtime.module';
import { ConversationsController } from './controller/conversations.controller';
import { ConversationsService } from './service/conversations.service';
import { EvolutionWebhookController } from './controller/evolution-webhook.controller';

@Module({
  imports: [ConfigModule, RealtimeModule],
  controllers: [ConversationsController, EvolutionWebhookController],
  providers: [ConversationsService, PrismaService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
