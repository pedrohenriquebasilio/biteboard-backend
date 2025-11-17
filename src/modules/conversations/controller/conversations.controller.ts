import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { ConversationQueryDto } from '../dto/conversation-query.dto';
import { ConversationsService } from '../service/conversations.service';
import { MessagesQueryDto } from '../dto/messages-query.dto';
import { CreateMessageDto } from '../dto/create-message.dto';

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

  @Post(':phone/messages')
  sendMessage(
    @Param('phone') phone: string,
    @Body() createMessageDto: CreateMessageDto,
  ) {
    return this.conversationsService.createAndSendMessage(
      phone,
      createMessageDto,
    );
  }
}
