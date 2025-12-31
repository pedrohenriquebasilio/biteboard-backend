import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from 'src/modules/prisma/prisma.service';
import { RealtimeGateway } from 'src/modules/realtime/realtime.gateway';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { MessagesQueryDto } from '../dto/messages-query.dto';

type JsonRecord = Record<string, unknown>;

interface NormalizedIncomingMessage {
  phone: string;
  text: string;
  timestamp: Date;
  messageId?: string;
  customerName?: string;
  messageType?: string;
  fromMe?: boolean;
}

@Injectable()
export class ConversationsService {
  private restaurantId = 'default';

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private configService: ConfigService,
  ) {}

  async findAll(query: ConversationQueryDto) {
    const page = parseInt(query.page || '1');
    const limit = parseInt(query.limit || '20');
    const skip = (page - 1) * limit;

    const where = {
      restaurantId: this.restaurantId,
      ...(query.status ? { status: query.status } : {}),
    };

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where,
        orderBy: {
          lastMessageTime: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({ where }),
    ]);

    const normalized = conversations.map((conversation) => ({
      id: conversation.customerPhone,
      customerName: conversation.customerName,
      customerPhone: conversation.customerPhone,
      lastMessage: conversation.lastMessage,
      lastMessageTime: conversation.lastMessageTime,
      unreadCount: conversation.unreadCount,
      status: conversation.status,
    }));

    return {
      conversations: normalized,
      total,
      page,
      limit,
    };
  }

  async getMessagesByPhone(phone: string, query: MessagesQueryDto) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new NotFoundException('Telefone inválido');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        restaurantId: this.restaurantId,
        customerPhone: normalizedPhone,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const limit = parseInt(query.limit || '50');
    const timestampFilter: { lt?: Date; gt?: Date } = {};

    if (query.before) {
      timestampFilter.lt = new Date(query.before);
    }

    if (query.after) {
      timestampFilter.gt = new Date(query.after);
    }

    const where = {
      conversationId: conversation.id,
      ...(Object.keys(timestampFilter).length > 0
        ? { timestamp: timestampFilter }
        : {}),
    };

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: {
        timestamp: 'asc',
      },
      take: limit,
    });

    const hasMore = messages.length === limit;

    return {
      conversation: {
        id: conversation.customerPhone,
        customerName: conversation.customerName,
        customerPhone: conversation.customerPhone,
      },
      messages: messages.map((message) => ({
        id: message.id,
        conversationId: conversation.customerPhone,
        text: message.text,
        sender: message.sender,
        status: message.status,
        messageType: message.messageType,
        timestamp: message.timestamp,
        whatsappMessageId: message.whatsappMessageId,
      })),
      hasMore,
    };
  }

  async createAndSendMessage(
    phone: string,
    createMessageDto: {
      conversationId: string;
      text: string;
      messageType?: string;
    },
  ) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new NotFoundException('Telefone inválido');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        restaurantId: this.restaurantId,
        customerPhone: normalizedPhone,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const createdMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        text: createMessageDto.text,
        sender: 'server',
        status: 'sent',
        messageType: createMessageDto.messageType || 'text',
        whatsappMessageId: null,
        timestamp: new Date(),
      },
    });

    console.log('[ConversationsService] Nova mensagem criada (servidor):', {
      id: createdMessage.id,
      text: createdMessage.text,
      sender: createdMessage.sender,
      messageType: createdMessage.messageType,
      status: createdMessage.status,
      timestamp: createdMessage.timestamp,
      conversationId: conversation.customerPhone,
      customerName: conversation.customerName,
    });

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: createdMessage.text,
        lastMessageTime: createdMessage.timestamp,
      },
    });

    this.realtimeGateway.emitNewMessage({
      text: createdMessage.text,
      timestamp: createdMessage.timestamp.toISOString(),
      sender: createdMessage.sender,
      conversation: {
        customerPhone: conversation.customerPhone,
        customerName: conversation.customerName,
      },
    });

    // Enviar para webhook N8N
    await this.sendToN8nWebhook({
      id: createdMessage.id,
      conversationId: conversation.customerPhone,
      text: createdMessage.text,
      sender: createdMessage.sender,
      timestamp: createdMessage.timestamp.toISOString(),
      status: createdMessage.status,
      customerName: conversation.customerName,
    });

    return {
      id: createdMessage.id,
      conversationId: conversation.customerPhone,
      text: createdMessage.text,
      sender: createdMessage.sender,
      timestamp: createdMessage.timestamp.toISOString(),
      status: createdMessage.status,
    };
  }

  async createAndSendMessageWithoutWebhook(
    phone: string,
    createMessageDto: {
      conversationId: string;
      text: string;
      messageType?: string;
    },
  ) {
    const normalizedPhone = this.normalizePhone(phone);
    if (!normalizedPhone) {
      throw new NotFoundException('Telefone inválido');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        restaurantId: this.restaurantId,
        customerPhone: normalizedPhone,
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversa não encontrada');
    }

    const createdMessage = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        text: createMessageDto.text,
        sender: 'server',
        status: 'sent',
        messageType: createMessageDto.messageType || 'text',
        whatsappMessageId: null,
        timestamp: new Date(),
      },
    });

    console.log(
      '[ConversationsService] Nova mensagem criada (servidor, sem webhook):',
      {
        id: createdMessage.id,
        text: createdMessage.text,
        sender: createdMessage.sender,
        messageType: createdMessage.messageType,
        status: createdMessage.status,
        timestamp: createdMessage.timestamp,
        conversationId: conversation.customerPhone,
        customerName: conversation.customerName,
      },
    );

    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: createdMessage.text,
        lastMessageTime: createdMessage.timestamp,
      },
    });

    this.realtimeGateway.emitNewMessage({
      text: createdMessage.text,
      timestamp: createdMessage.timestamp.toISOString(),
      sender: createdMessage.sender,
      conversation: {
        customerPhone: conversation.customerPhone,
        customerName: conversation.customerName,
      },
    });

    return {
      id: createdMessage.id,
      conversationId: conversation.customerPhone,
      text: createdMessage.text,
      sender: createdMessage.sender,
      timestamp: createdMessage.timestamp.toISOString(),
      status: createdMessage.status,
    };
  }

  private async sendToN8nWebhook(messageData: {
    id: string;
    conversationId: string;
    text: string;
    sender: string;
    timestamp: string;
    status: string;
    customerName: string;
    instance?: string;
  }): Promise<void> {
    try {
      const webhookUrl = this.configService.get<string>(
        'WEBHOOK_SEND_MESSAGE_URL',
      );

      if (!webhookUrl) {
        console.warn(
          '[ConversationsService] WEBHOOK_SEND_MESSAGE_URL não configurada',
        );
        return;
      }

      // Adicionar instance se disponível (via variável de ambiente ou passado no messageData)
      const instance =
        messageData.instance ||
        this.configService.get<string>('EVOLUTION_INSTANCE_NAME');

      const payload = {
        ...messageData,
        ...(instance && { instance }),
      };

      await axios.post(webhookUrl, payload);

      console.log('[ConversationsService] Mensagem enviada para N8N webhook:', {
        messageId: messageData.id,
        text: messageData.text,
        timestamp: messageData.timestamp,
        instance: instance || 'não configurado',
      });
    } catch (error) {
      console.error(
        '[ConversationsService] Erro ao enviar para N8N webhook:',
        error instanceof Error ? error.message : 'Erro desconhecido',
      );
    }
  }

  async handleWebhook(payload: unknown) {
    const normalizedMessages = this.extractIncomingMessages(payload);

    if (normalizedMessages.length === 0) {
      return {
        success: true,
        processed: 0,
        skipped: true,
        reason: 'Nenhuma mensagem de entrada processável',
      };
    }

    const processedIds: string[] = [];

    for (const incoming of normalizedMessages) {
      const conversation = await this.ensureConversation(
        incoming.phone,
        incoming.customerName,
      );

      // Evitar duplicatas
      if (incoming.messageId) {
        const existing = await this.prisma.message.findUnique({
          where: { whatsappMessageId: incoming.messageId },
        });
        if (existing) continue;
      }

      const createdMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          text: incoming.text,
          sender: incoming.fromMe ? 'server' : 'customer',
          status: 'received',
          messageType: incoming.messageType || 'text',
          whatsappMessageId: incoming.messageId ?? null,
          timestamp: incoming.timestamp,
        },
      });

      console.log('[ConversationsService] Nova mensagem criada:', {
        id: createdMessage.id,
        text: createdMessage.text,
        sender: createdMessage.sender,
        messageType: createdMessage.messageType,
        status: createdMessage.status,
        timestamp: createdMessage.timestamp,
        conversationId: conversation.customerPhone,
        customerName: conversation.customerName,
      });

      await this.prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastMessage: incoming.text,
          lastMessageTime: incoming.timestamp,
          unreadCount: { increment: 1 },
        },
      });

      this.realtimeGateway.emitNewMessage({
        text: createdMessage.text,
        timestamp: createdMessage.timestamp.toISOString(),
        sender: createdMessage.sender,
        conversation: {
          customerPhone: conversation.customerPhone,
          customerName: conversation.customerName,
        },
      });

      processedIds.push(createdMessage.id);
    }

    return {
      success: true,
      processed: processedIds.length,
    };
  }

  // EXTRAI MENSAGENS DO FORMATO EVOLUTION
  private extractIncomingMessages(
    payload: unknown,
  ): NormalizedIncomingMessage[] {
    if (!this.isRecord(payload)) return [];

    const items = Array.isArray(payload) ? payload : [payload];
    const messages: NormalizedIncomingMessage[] = [];

    for (const item of items) {
      if (!this.isRecord(item)) continue;

      const msg = this.extractFromEvolutionFormat(item);
      if (msg) messages.push(msg);
    }

    return messages;
  }

  // FORMATO ESPECÍFICO DO EVOLUTION
  private extractFromEvolutionFormat(
    record: JsonRecord,
  ): NormalizedIncomingMessage | null {
    const key = this.getRecord(record.key);
    const message = this.getRecord(record.message);
    const pushName = this.getString(record, 'pushName');

    if (!key || !message) return null;

    const fromMe = this.getBoolean(key, 'fromMe');

    // Usar senderPn ao invés de remoteJid para obter o telefone correto
    // senderPn vem no formato: 553182366026@s.whatsapp.net
    // Precisamos extrair apenas a parte antes do @
    const senderPn = this.getString(key, 'senderPn');
    let phone: string | undefined;

    if (senderPn) {
      // Extrair apenas a parte antes do @
      const phonePart = senderPn.split('@')[0];
      phone = this.normalizePhone(phonePart);
    }

    // Fallback para remoteJid se senderPn não estiver disponível (para compatibilidade)
    if (!phone) {
      const rawJid = this.getString(key, 'remoteJid');
      phone = rawJid ? this.normalizePhone(rawJid) : undefined;
    }

    if (!phone) return null;

    const messageId = this.getString(key, 'id');
    const text =
      this.getString(message, 'conversation') || '[Mensagem sem texto]';

    // Tenta extrair timestamp (pode vir em segundos ou milissegundos)
    const timestampSec =
      this.getNumber(record, 'messageTimestamp') ||
      this.getNumber(message, 'messageTimestamp') ||
      this.getNumber(key, 'messageTimestamp');

    return {
      phone,
      text,
      messageId,
      customerName: pushName,
      messageType: 'text',
      timestamp: this.buildDate(timestampSec),
      fromMe,
    };
  }

  // MANTIDOS (usados em outras partes)
  private async ensureConversation(phone: string, name?: string) {
    const existing = await this.prisma.conversation.findFirst({
      where: {
        restaurantId: this.restaurantId,
        customerPhone: phone,
      },
    });

    const normalizedName = name?.trim() ? name.trim() : phone;

    if (existing) {
      if (
        (!existing.customerName ||
          existing.customerName === existing.customerPhone) &&
        normalizedName !== existing.customerName
      ) {
        return this.prisma.conversation.update({
          where: { id: existing.id },
          data: { customerName: normalizedName },
        });
      }
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        restaurantId: this.restaurantId,
        customerName: normalizedName,
        customerPhone: phone,
        status: 'active',
        unreadCount: 0,
      },
    });
  }

  private normalizePhone(raw: string): string | undefined {
    if (!raw) return undefined;
    const withoutDomain = raw.includes('@') ? raw.split('@')[0] : raw;
    const digits = withoutDomain.replace(/\D/g, '');
    if (!digits) return undefined;
    return digits;
  }

  private buildDate(value: number | undefined): Date {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value > 1e12 ? new Date(value) : new Date(value * 1000);
    }
    return new Date();
  }

  private isRecord(input: unknown): input is JsonRecord {
    return typeof input === 'object' && input !== null && !Array.isArray(input);
  }

  private getRecord(value: unknown): JsonRecord | undefined {
    return this.isRecord(value) ? value : undefined;
  }

  private getString(
    record: JsonRecord | undefined,
    key: string,
  ): string | undefined {
    if (!record) return undefined;
    const value = record[key];
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : undefined;
  }

  private getNumber(
    record: JsonRecord | undefined,
    key: string,
  ): number | undefined {
    if (!record) return undefined;
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) return parsed;
    }
    return undefined;
  }

  private getBoolean(record: JsonRecord, key: string): boolean {
    const value = record[key];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return value === 'true';
    if (typeof value === 'number') return value === 1;
    return false;
  }
}
