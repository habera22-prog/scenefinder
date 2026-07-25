import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { containsPii } from './pii-detector';

type BasicBooking = {
  id: string;
  customerId: string;
  photographerId: string;
};

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async listMessages(bookingId: string, userId: string) {
    await this.getBookingAndAssertParticipant(bookingId, userId);
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { bookingId },
    });
    if (!chatRoom) {
      throw new NotFoundException('소통방을 찾을 수 없습니다.');
    }
    return this.prisma.message.findMany({
      where: { chatRoomId: chatRoom.id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(bookingId: string, userId: string, dto: SendMessageDto) {
    await this.getBookingAndAssertParticipant(bookingId, userId);
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { bookingId },
    });
    if (!chatRoom) {
      throw new NotFoundException('소통방을 찾을 수 없습니다.');
    }

    const piiFlag = dto.type === 'text' && containsPii(dto.content);

    return this.prisma.message.create({
      data: {
        chatRoomId: chatRoom.id,
        senderId: userId,
        type: dto.type,
        content: dto.content,
        piiFlag,
      },
    });
  }

  async getContact(bookingId: string, userId: string) {
    const booking = await this.getBookingAndAssertParticipant(
      bookingId,
      userId,
    );
    const chatRoom = await this.prisma.chatRoom.findUnique({
      where: { bookingId },
    });
    if (!chatRoom?.contactDisclosed) {
      throw new ForbiddenException(
        '예약금 결제 완료 후에만 연락처가 공개됩니다.',
      );
    }

    const [customer, photographer] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: booking.customerId } }),
      this.prisma.photographer.findUnique({
        where: { id: booking.photographerId },
        include: { user: true },
      }),
    ]);

    return {
      customer: {
        name: customer?.name,
        phone: customer?.phone,
        email: customer?.email,
      },
      photographer: {
        name: photographer?.user.name,
        phone: photographer?.user.phone,
        email: photographer?.user.email,
        businessName: photographer?.businessName,
      },
    };
  }

  private async getBookingAndAssertParticipant(
    bookingId: string,
    userId: string,
  ): Promise<BasicBooking> {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException('예약을 찾을 수 없습니다.');
    }
    if (booking.customerId === userId) return booking;
    const photographer = await this.prisma.photographer.findUnique({
      where: { id: booking.photographerId },
    });
    if (photographer?.userId === userId) return booking;
    throw new ForbiddenException('예약 당사자만 접근할 수 있습니다.');
  }
}
