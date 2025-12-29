export class WebhookPayloadDto {
  event?: string;
  instance?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
      senderPn?: string;
    };
    pushName?: string;
    status?: string;
    message?: unknown;
    messageType?: string;
    messageTimestamp?: number;
    instanceId?: string;
    source?: string;
    sender?: string;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  server_url?: string;
  apikey?: string;
  headers?: Record<string, string>;
  params?: Record<string, string>;
  query?: Record<string, string>;
  webhookUrl?: string;
  executionMode?: string;
}

