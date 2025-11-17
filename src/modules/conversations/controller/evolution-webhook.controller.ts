import { Body, Controller, Post } from '@nestjs/common';
import { ConversationsService } from '../service/conversations.service';
import { EvolutionWebhookDto } from '../dto/evolution-webhook.dto';
@Controller('webhook')
export class EvolutionWebhookController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('evolution')
  handleEvolutionWebhook(@Body() webhookData: EvolutionWebhookDto) {
    console.log('Webhook recebido:', {
      from: webhookData.pushName,
      jid: webhookData.key.remoteJid,
      message: webhookData.message.conversation,
      id: webhookData.key.id,
    });

    return this.conversationsService.handleWebhook(webhookData);
  }
}
