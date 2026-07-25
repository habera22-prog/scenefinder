import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }
    return user;
  }

  update(id: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id }, data: dto });
  }

  withdraw(id: string) {
    // 이용약관 제7조 — 탈퇴 후에도 채권채무 관계는 존속하므로 하드 삭제하지 않음
    return this.prisma.user.update({
      where: { id },
      data: { status: 'withdrawn' },
    });
  }
}
