import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { Prisma } from '@scenefinder/database';
import type { User } from '@scenefinder/database';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { OtpService } from './otp.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { KakaoSignupDto } from './dto/kakao-signup.dto';

const KAKAO_STATE_TTL_SECONDS = 600;
const KAKAO_TICKET_TTL_SECONDS = 600;

interface KakaoTicket {
  kakaoUserId: string;
  name: string;
  email: string | null;
  preferredRole: 'customer' | 'photographer' | null;
}

interface KakaoUserInfo {
  id: number | string;
  kakao_account?: {
    email?: string;
    name?: string;
    profile?: { nickname?: string };
  };
  properties?: { nickname?: string };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly otp: OtpService,
    private readonly jwt: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existing) {
      throw new ConflictException(
        '이미 가입된 이메일 또는 휴대전화번호입니다.',
      );
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
      throw new BadRequestException(
        '인증번호가 올바르지 않거나 만료되었습니다.',
      );
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

  async kakaoAuthorizationUrl(preferredRole?: string) {
    const { restApiKey, redirectUri } = this.getKakaoConfig();
    const state = randomBytes(32).toString('hex');
    const role =
      preferredRole === 'customer' || preferredRole === 'photographer'
        ? preferredRole
        : 'none';
    await this.redis.set(
      `kakao:state:${state}`,
      role,
      'EX',
      KAKAO_STATE_TTL_SECONDS,
    );

    const authorizeUrl = new URL('https://kauth.kakao.com/oauth/authorize');
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('client_id', restApiKey);
    authorizeUrl.searchParams.set('redirect_uri', redirectUri);
    authorizeUrl.searchParams.set('state', state);

    return { authorizationUrl: authorizeUrl.toString() };
  }

  async handleKakaoCallback(
    code?: string,
    state?: string,
    providerError?: string,
  ): Promise<string> {
    if (!state)
      throw new BadRequestException('카카오 로그인 상태가 올바르지 않습니다.');

    const stateValue = await this.redis.getdel(`kakao:state:${state}`);
    if (!stateValue) {
      throw new BadRequestException(
        '카카오 로그인 요청이 만료되었거나 올바르지 않습니다.',
      );
    }

    if (providerError) {
      return this.frontendRedirect('/login?error=kakao_cancelled');
    }
    if (!code) throw new BadRequestException('카카오 인증 코드가 없습니다.');

    const kakaoUser = await this.fetchKakaoUser(code);
    const ticket = randomBytes(32).toString('hex');
    const ticketData: KakaoTicket = {
      kakaoUserId: String(kakaoUser.id),
      name:
        kakaoUser.kakao_account?.name ??
        kakaoUser.kakao_account?.profile?.nickname ??
        kakaoUser.properties?.nickname ??
        '',
      email: kakaoUser.kakao_account?.email ?? null,
      preferredRole:
        stateValue === 'customer' || stateValue === 'photographer'
          ? stateValue
          : null,
    };

    await this.redis.set(
      `kakao:ticket:${ticket}`,
      JSON.stringify(ticketData),
      'EX',
      KAKAO_TICKET_TTL_SECONDS,
    );

    const callbackUrl = new URL('/auth/kakao/callback', this.frontendBaseUrl());
    callbackUrl.hash = new URLSearchParams({ ticket }).toString();
    return callbackUrl.toString();
  }

  kakaoFailureRedirect() {
    return this.frontendRedirect('/login?error=kakao_failed');
  }

  async completeKakaoLogin(ticket: string) {
    const kakaoTicket = await this.readKakaoTicket(ticket);
    const linkedAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'kakao',
          providerUserId: kakaoTicket.kakaoUserId,
        },
      },
      include: { user: true },
    });

    if (!linkedAccount) {
      return {
        requiresSignup: true as const,
        ticket,
        profile: {
          name: kakaoTicket.name,
          email: kakaoTicket.email,
          role: kakaoTicket.preferredRole,
        },
      };
    }

    const consumedTicket = await this.redis.getdel(`kakao:ticket:${ticket}`);
    if (!consumedTicket) {
      throw new BadRequestException(
        '카카오 로그인 요청이 만료되었습니다. 다시 시도해주세요.',
      );
    }
    if (linkedAccount.user.status !== 'active') {
      throw new UnauthorizedException('이용이 제한된 계정입니다.');
    }

    return {
      requiresSignup: false as const,
      accessToken: this.jwt.sign({
        sub: linkedAccount.user.id,
        role: linkedAccount.user.role,
      }),
      user: linkedAccount.user,
    };
  }

  async signupWithKakao(dto: KakaoSignupDto) {
    const kakaoTicket = await this.readKakaoTicket(dto.ticket);
    const linkedAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'kakao',
          providerUserId: kakaoTicket.kakaoUserId,
        },
      },
    });
    if (linkedAccount) {
      throw new ConflictException('이미 다른 계정에 연결된 카카오 계정입니다.');
    }

    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone: dto.phone }] },
    });
    if (existingUser) {
      throw new ConflictException(
        '이미 가입된 이메일 또는 휴대전화번호입니다. 기존 계정으로 로그인해 카카오 계정을 연결해주세요.',
      );
    }

    let user: User;
    try {
      user = await this.prisma.$transaction(async (tx) => {
        const createdUser = await tx.user.create({
          data: {
            role: dto.role,
            name: dto.name,
            email: dto.email,
            phone: dto.phone,
            status: 'active',
          },
        });
        await tx.socialAccount.create({
          data: {
            userId: createdUser.id,
            provider: 'kakao',
            providerUserId: kakaoTicket.kakaoUserId,
          },
        });
        return createdUser;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '이미 등록된 계정 정보입니다. 기존 계정으로 로그인해 카카오 계정을 연결해주세요.',
        );
      }
      throw error;
    }

    await this.redis.getdel(`kakao:ticket:${dto.ticket}`);
    await this.otp.issue(dto.phone);
    return { userId: user.id, message: '인증번호가 발송되었습니다.' };
  }

  async linkKakaoAccount(ticket: string, userId: string) {
    const kakaoTicket = await this.readKakaoTicket(ticket);
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('로그인한 계정을 확인할 수 없습니다.');
    }

    const existingAccount = await this.prisma.socialAccount.findUnique({
      where: {
        provider_providerUserId: {
          provider: 'kakao',
          providerUserId: kakaoTicket.kakaoUserId,
        },
      },
    });
    if (existingAccount) {
      if (existingAccount.userId === userId) {
        await this.redis.getdel(`kakao:ticket:${ticket}`);
        return { message: '카카오 계정이 이미 연결되어 있습니다.' };
      }
      throw new ConflictException('이미 다른 계정에 연결된 카카오 계정입니다.');
    }

    try {
      await this.prisma.socialAccount.create({
        data: {
          userId,
          provider: 'kakao',
          providerUserId: kakaoTicket.kakaoUserId,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          '이 계정에는 이미 카카오 계정이 연결되어 있습니다.',
        );
      }
      throw error;
    }

    await this.redis.getdel(`kakao:ticket:${ticket}`);
    return { message: '카카오 계정이 연결되었습니다.' };
  }

  private async fetchKakaoUser(code: string): Promise<KakaoUserInfo> {
    const { restApiKey, clientSecret, redirectUri } = this.getKakaoConfig();
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: restApiKey,
      redirect_uri: redirectUri,
      code,
      client_secret: clientSecret,
    });

    const tokenResponse = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8',
      },
      body: tokenBody,
    });
    if (!tokenResponse.ok) {
      this.logger.warn(`카카오 토큰 교환 실패 (${tokenResponse.status})`);
      throw new BadRequestException(
        '카카오 인증을 완료하지 못했습니다. 다시 시도해주세요.',
      );
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      throw new BadRequestException('카카오 인증 토큰을 받지 못했습니다.');
    }

    const userResponse = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userResponse.ok) {
      this.logger.warn(`카카오 사용자 정보 조회 실패 (${userResponse.status})`);
      throw new BadRequestException(
        '카카오 사용자 정보를 확인하지 못했습니다.',
      );
    }

    const kakaoUser = (await userResponse.json()) as KakaoUserInfo;
    if (kakaoUser.id === undefined || kakaoUser.id === null) {
      throw new BadRequestException('카카오 사용자 식별자가 없습니다.');
    }
    return kakaoUser;
  }

  private async readKakaoTicket(ticket: string): Promise<KakaoTicket> {
    const value = await this.redis.get(`kakao:ticket:${ticket}`);
    if (!value) {
      throw new BadRequestException(
        '카카오 로그인 요청이 만료되었습니다. 다시 시도해주세요.',
      );
    }
    try {
      return JSON.parse(value) as KakaoTicket;
    } catch {
      await this.redis.getdel(`kakao:ticket:${ticket}`);
      throw new BadRequestException('카카오 로그인 요청을 확인할 수 없습니다.');
    }
  }

  private getKakaoConfig() {
    const restApiKey = this.config.get<string>('KAKAO_REST_API_KEY');
    const clientSecret = this.config.get<string>('KAKAO_CLIENT_SECRET');
    const redirectUri = this.config.get<string>('KAKAO_REDIRECT_URI');
    if (!restApiKey || !clientSecret || !redirectUri) {
      throw new ServiceUnavailableException(
        '카카오 로그인이 아직 설정되지 않았습니다.',
      );
    }
    return { restApiKey, clientSecret, redirectUri };
  }

  private frontendBaseUrl() {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
  }

  private frontendRedirect(path: string) {
    return new URL(
      path,
      `${this.frontendBaseUrl().replace(/\/$/, '')}/`,
    ).toString();
  }
}
