import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { CustomersService } from '../customers/customers.service';
import { WebhookPayloadDto } from './dto/webhook-payload.dto';

@Injectable()
export class WebhookGatewayService {
  private readonly logger = new Logger(WebhookGatewayService.name);

  constructor(
    private readonly customersService: CustomersService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Extrai o número de telefone do campo sender
   * Remove tudo após o último número (ex: "553184503630@s.whatsapp.net" -> "553184503630")
   */
  private extractPhoneNumber(sender: string): string {
    // Remove tudo que não é número, mantendo apenas os dígitos
    const phoneNumber = sender.replace(/\D/g, '');
    return phoneNumber;
  }

  /**
   * Método fail-fast para rotear webhooks baseado na existência do cliente
   */
  async routeWebhook(payload: WebhookPayloadDto): Promise<void> {
    try {
      // Extrair o sender do payload - pode estar em body.sender ou body.data.sender
      // Prioridade: body.sender primeiro (formato mais comum no webhook.md)
      const sender = payload.body?.sender || payload.body?.data?.sender;

      if (!sender) {
        this.logger.warn('Campo sender não encontrado no payload do webhook');
        return;
      }

      // Extrair apenas os números do telefone
      const phoneNumber = this.extractPhoneNumber(sender);

      if (!phoneNumber) {
        this.logger.warn(`Não foi possível extrair número de telefone do sender: ${sender}`);
        return;
      }

      // Verificação fail-fast: verifica se o cliente existe na base
      const customerExists = await this.customersService.existsByPhone(phoneNumber);

      // Determinar qual webhook usar baseado na existência do cliente
      const webhookUrl = customerExists.exists
        ? this.configService.get<string>('WEBHOOK_EXISTSCLIENT')
        : this.configService.get<string>('WEBHOOK_NOTEXISTSCLIENT');

      if (!webhookUrl) {
        const envVar = customerExists.exists
          ? 'WEBHOOK_EXISTSCLIENT'
          : 'WEBHOOK_NOTEXISTSCLIENT';
        this.logger.warn(
          `Variável de ambiente ${envVar} não configurada. Webhook não será encaminhado.`,
        );
        return;
      }

      // Enviar o webhook para a URL apropriada
      await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 segundos de timeout
      });

      this.logger.log(
        `Webhook roteado com sucesso para ${customerExists.exists ? 'cliente existente' : 'cliente não existente'}. Telefone: ${phoneNumber}, URL: ${webhookUrl}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao rotear webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}

