import { Body, Controller, Post } from '@nestjs/common';
import { WebhookGatewayService } from './webhook-gateway.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

/**
 * Controller para receber webhooks da Evolution API
 *
 * Este é o ponto de entrada principal para mensagens do WhatsApp.
 * Quando uma mensagem chega:
 * 1. É salva no banco de dados
 * 2. Emite evento WebSocket para o frontend
 * 3. Roteia para webhooks externos baseado na existência do cliente
 */
@Controller('webhook-gateway')
export class WebhookGatewayController {
  constructor(private readonly webhookGatewayService: WebhookGatewayService) {}

  /**
   * Endpoint principal para receber webhooks da Evolution API
   * Aceita tanto objeto único quanto array de webhooks
   */
  @Post()
  handleWebhook(@Body() payload: WebhookPayloadDto | WebhookPayloadDto[]) {
    // Aceita tanto array quanto objeto único
    const payloads = Array.isArray(payload) ? payload : [payload];

    // Processa cada webhook de forma assíncrona (fire and forget)
    payloads.forEach((webhookPayload) => {
      console.log('Webhook recebido:', webhookPayload);
      this.webhookGatewayService.routeWebhook(webhookPayload).catch((error) => {
        // Log de erro já é feito no service, mas podemos adicionar tratamento adicional se necessário
        console.error('Erro ao processar webhook:', error);
      });
    });

    // Retorna imediatamente para garantir resposta rápida
    return {
      status: 'received',
      message: 'Webhook recebido e sendo processado',
      count: payloads.length,
    };
  }
}
