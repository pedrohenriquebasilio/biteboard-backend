
export class EvolutionWebhookKeyDto {
  remoteJid: string;
  fromMe: boolean;
  id: string;
}

export class EvolutionWebhookMessageDto {
  conversation?: string;
}

export class EvolutionWebhookDto {
  key: EvolutionWebhookKeyDto;
  message: EvolutionWebhookMessageDto;
  pushName: string;
}