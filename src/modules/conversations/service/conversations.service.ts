import { Injectable, NotFoundException } from '@nestjs/common';
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
}

@Injectable()
export class ConversationsService {
  private restaurantId = 'default';

  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
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

  async handleWebhook(payload: unknown) {
    const normalizedMessages = this.extractIncomingMessages(payload);

    if (normalizedMessages.length === 0) {
      return {
        success: true,
        processed: 0,
        skipped: true,
        reason: 'Payload sem mensagens processáveis',
      };
    }

    const processedIds: string[] = [];

    for (const incoming of normalizedMessages) {
      const conversation = await this.ensureConversation(
        incoming.phone,
        incoming.customerName,
      );

      if (incoming.messageId) {
        const existing = await this.prisma.message.findUnique({
          where: { whatsappMessageId: incoming.messageId },
        });

        if (existing) {
          continue;
        }
      }

      const createdMessage = await this.prisma.message.create({
        data: {
          conversationId: conversation.id,
          text: incoming.text,
          sender: 'customer',
          status: 'received',
          messageType: incoming.messageType || 'text',
          whatsappMessageId: incoming.messageId ?? null,
          timestamp: incoming.timestamp,
        },
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
        id: createdMessage.id,
        text: createdMessage.text,
        sender: createdMessage.sender,
        status: createdMessage.status,
        messageType: createdMessage.messageType,
        timestamp: createdMessage.timestamp,
        whatsappMessageId: createdMessage.whatsappMessageId,
        conversation: {
          id: conversation.customerPhone,
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

  private extractIncomingMessages(
    payload: unknown,
  ): NormalizedIncomingMessage[] {
    const items = Array.isArray(payload) ? payload : [payload];
    const records = items
      .map((item) => (this.isRecord(item) ? item : null))
      .filter((item): item is JsonRecord => item !== null);

    const messages: NormalizedIncomingMessage[] = [];

    for (const record of records) {
      const normalized = this.extractMessageFromRecord(record);
      if (normalized) {
        messages.push(normalized);
      }
    }

    return messages;
  }

  private extractMessageFromRecord(
    record: JsonRecord,
  ): NormalizedIncomingMessage | null {
    const dataRecord = this.getRecord(record.data) ?? record;
    const messageEntries = this.extractMessageEntries(dataRecord);
    const primaryEntry =
      messageEntries.length > 0 ? messageEntries[0] : dataRecord;

    const keyRecord =
      this.getRecord(primaryEntry.key) ?? this.getRecord(dataRecord.key);

    if (keyRecord) {
      const fromMe = this.getBoolean(keyRecord, 'fromMe');
      if (fromMe) {
        return null;
      }
    }

    const remoteJid =
      this.getString(primaryEntry, 'sender') ??
      (keyRecord ? this.getString(keyRecord, 'remoteJid') : undefined) ??
      this.getString(dataRecord, 'sender') ??
      this.getNestedString(dataRecord, ['info', 'remoteJid']) ??
      this.getString(record, 'sender');

    const phone = remoteJid ? this.normalizePhone(remoteJid) : undefined;

    if (!phone) {
      return null;
    }

    const customerName =
      this.getString(primaryEntry, 'pushName') ??
      this.getString(dataRecord, 'pushName') ??
      this.getString(record, 'pushName');

    const messageId =
      (keyRecord ? this.getString(keyRecord, 'id') : undefined) ??
      this.getString(primaryEntry, 'id') ??
      this.getString(dataRecord, 'id') ??
      this.getNestedString(primaryEntry, ['info', 'id']);

    const messageRecord =
      this.getRecord(primaryEntry.message) ??
      this.getRecord(dataRecord.message);

    const text = messageRecord
      ? this.extractTextFromMessageRecord(messageRecord)
      : undefined;

    const messageType =
      this.getString(primaryEntry, 'messageType') ??
      this.getString(dataRecord, 'messageType') ??
      (messageRecord ? this.getString(messageRecord, 'type') : undefined) ??
      'text';

    const timestampValue =
      this.getNumber(primaryEntry, 'messageTimestamp') ??
      this.getNumber(dataRecord, 'messageTimestamp') ??
      this.getNumber(record, 'messageTimestamp');

    return {
      phone,
      text: text ?? '[Mensagem recebida]',
      messageId: messageId || undefined,
      customerName,
      messageType,
      timestamp: this.buildDate(timestampValue),
    };
  }

  private extractMessageEntries(record: JsonRecord): JsonRecord[] {
    const messagesValue = record.messages;
    if (!messagesValue || !Array.isArray(messagesValue)) {
      return [];
    }

    return messagesValue
      .map((entry) => (this.isRecord(entry) ? entry : null))
      .filter((entry): entry is JsonRecord => entry !== null);
  }

  private extractTextFromMessageRecord(
    messageRecord: JsonRecord,
  ): string | undefined {
    const conversation = this.getString(messageRecord, 'conversation');
    if (conversation) {
      return conversation;
    }

    const extended = this.getRecord(messageRecord.extendedTextMessage);
    if (extended) {
      const text = this.getString(extended, 'text');
      if (text) {
        return text;
      }
    }

    const image = this.getRecord(messageRecord.imageMessage);
    if (image) {
      const caption = this.getString(image, 'caption');
      if (caption) {
        return caption;
      }
    }

    const document = this.getRecord(messageRecord.documentMessage);
    if (document) {
      const caption = this.getString(document, 'caption');
      if (caption) {
        return caption;
      }
    }

    const interactive = this.getRecord(
      messageRecord.interactiveResponseMessage,
    );
    if (interactive) {
      const body = this.getRecord(interactive.body);
      if (body) {
        const text = this.getString(body, 'text');
        if (text) {
          return text;
        }
      }
    }

    const buttonsResponseMessage = this.getRecord(
      messageRecord.buttonsResponseMessage,
    );
    if (buttonsResponseMessage) {
      const selectedDisplayText = this.getString(
        buttonsResponseMessage,
        'selectedDisplayText',
      );
      if (selectedDisplayText) {
        return selectedDisplayText;
      }
    }

    return undefined;
  }

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
    if (!raw) {
      return undefined;
    }

    const withoutDomain = raw.includes('@') ? raw.split('@')[0] : raw;

    const digits = withoutDomain.replace(/\D/g, '');
    if (!digits) {
      return undefined;
    }

    if (withoutDomain.startsWith('+')) {
      return `+${digits}`;
    }

    return digits.startsWith('+') ? digits : `+${digits}`;
  }

  private buildDate(value: number | undefined): Date {
    if (typeof value === 'number' && Number.isFinite(value)) {
      if (value > 1e12) {
        return new Date(value);
      }

      return new Date(value * 1000);
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
    if (!record) {
      return undefined;
    }

    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }

    return undefined;
  }

  private getNumber(
    record: JsonRecord | undefined,
    key: string,
  ): number | undefined {
    if (!record) {
      return undefined;
    }

    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private getBoolean(record: JsonRecord, key: string): boolean {
    const value = record[key];
    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'string') {
      return value === 'true';
    }

    if (typeof value === 'number') {
      return value === 1;
    }

    return false;
  }

  private getNestedString(
    record: JsonRecord | undefined,
    path: (string | number)[],
  ): string | undefined {
    if (!record) {
      return undefined;
    }

    const value = this.getNestedValue(record, path);
    return typeof value === 'string' && value.trim().length > 0
      ? value
      : undefined;
  }

  private getNestedValue(
    source: JsonRecord,
    path: (string | number)[],
  ): unknown {
    let current: unknown = source;

    for (const segment of path) {
      if (typeof segment === 'number') {
        if (!Array.isArray(current) || current.length <= segment) {
          return undefined;
        }
        current = current[segment];
      } else {
        if (!this.isRecord(current)) {
          return undefined;
        }
        current = current[segment];
      }
    }

    return current;
  }
}
