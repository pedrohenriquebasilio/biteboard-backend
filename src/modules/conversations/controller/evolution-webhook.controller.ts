import { Body, Controller, Post } from '@nestjs/common';
import { ConversationsService } from '../service/conversations.service';

@Controller('webhook')
export class EvolutionWebhookController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post('evolution')
  handleEvolutionWebhook(@Body() webhookData: any) {
    console.log('webhookData', webhookData);
    return this.conversationsService.handleWebhook(webhookData);
  }
}
