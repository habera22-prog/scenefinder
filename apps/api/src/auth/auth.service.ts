import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException('이미 가입된 이메일 또는 휴대전화번호입니다.');
    }

    const user = await this.prisma.user.create({
      data: {
        role: dto.role,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        status: 'active',
      },
    });

    await this.otp.issue(dto.phone);
    return { userId: user.id, message: '인증번호가 발송되었습니다.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new NotFoundException('가입되지 않은 휴대전화번호입니다.');
    }
    if (user.status !== 'active') {
      throw new UnauthorizedException('이용이 제한된 계정입니다.');
    }

    await this.otp.issue(dto.phone);
    return { message: '인증번호가 발송되었습니다.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const ok = await this.otp.verify(dto.phone, dto.code);
    if (!ok) {
      throw new BadRequestException('인증번호가 올바르지 않거나 만료되었습니다.');
    }

    const user = await this.prisma.user.findFirst({
      where: { phone: dto.phone },
    });
    if (!user) {
      throw new NotFoundException('가입되지 않은 휴대전화번호입니다.');
    }

    const verifiedUser = user.phoneVerifiedAt
      ? user
      : await this.prisma.user.update({
          where: { id: user.id },
          data: { phoneVerifiedAt: new Date() },
        });

    const accessToken = this.jwt.sign({
      sub: verifiedUser.id,
      role: verifiedUser.role,
    });

    return { accessToken, user: verifiedUser };
  }
}
