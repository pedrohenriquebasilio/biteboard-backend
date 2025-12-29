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
   * Extrai o número de telefone do campo senderPn
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
      // Extrair o senderPn do payload em data.key.senderPn
      let senderPn: string | undefined;

      if (payload.data && typeof payload.data === 'object') {
        const dataObj = payload.data as { key?: { senderPn?: string } };
        if (dataObj.key && typeof dataObj.key === 'object') {
          senderPn = dataObj.key.senderPn;
        }
      }

      if (!senderPn || typeof senderPn !== 'string') {
        this.logger.warn(
          'Campo senderPn não encontrado no payload do webhook (data.key.senderPn)',
          JSON.stringify(payload, null, 2),
        );
        return;
      }

      // Extrair apenas os números do telefone
      const phoneNumber = this.extractPhoneNumber(senderPn);

      if (!phoneNumber) {
        this.logger.warn(
          `Não foi possível extrair número de telefone do senderPn: ${senderPn}`,
        );
        return;
      }

      // Verificação fail-fast: verifica se o cliente existe na base
      const customerExists =
        await this.customersService.existsByPhone(phoneNumber);

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
