import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/decorators/current-user.decorator';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@UseGuards(JwtAuthGuard)
@Controller('bookings/:bookingId')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  list(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.listMessages(bookingId, user.userId);
  }

  @Post('messages')
  send(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(bookingId, user.userId, dto);
  }

  @Get('contact')
  contact(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.chatService.getContact(bookingId, user.userId);
  }
}
