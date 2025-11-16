import { Controller, Get, Param, Query } from '@nestjs/common';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { ConversationsService } from '../service/conversations.service';
import { MessagesQueryDto } from '../dto/messages-query.dto';

@Controller('conversations')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  findAll(@Query() query: ConversationQueryDto) {
    return this.conversationsService.findAll(query);
  }

  @Get(':phone/messages')
  getMessages(@Param('phone') phone: string, @Query() query: MessagesQueryDto) {
    return this.conversationsService.getMessagesByPhone(phone, query);
  }
}
