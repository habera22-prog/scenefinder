import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

@Injectable()
export class SupportService {
  constructor(private readonly prisma: PrismaService) {}

  create(userId: string, dto: CreateTicketDto, isEmergency: boolean) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        category: dto.category,
        content: dto.content,
        bookingId: dto.bookingId,
        isEmergency,
      },
    });
  }

  listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
