import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  Query,
  Redirect,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { KakaoSignupDto } from './dto/kakao-signup.dto';
import { KakaoTicketDto } from './dto/kakao-ticket.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto) {
    return this.authService.signup(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('phone-verify')
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Get('kakao')
  kakaoLogin(@Query('role') preferredRole?: string) {
    return this.authService.kakaoAuthorizationUrl(preferredRole);
  }

  @Get('kakao/callback')
  @Redirect()
  async kakaoCallback(
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') providerError?: string,
  ): Promise<{ url: string; statusCode: number }> {
    try {
      return {
        url: await this.authService.handleKakaoCallback(
          code,
          state,
          providerError,
        ),
        statusCode: 302,
      };
    } catch {
      this.logger.warn('카카오 로그인 콜백 처리에 실패했습니다.');
      return { url: this.authService.kakaoFailureRedirect(), statusCode: 302 };
    }
  }

  @Post('kakao/complete')
  @HttpCode(HttpStatus.OK)
  completeKakaoLogin(@Body() dto: KakaoTicketDto) {
    return this.authService.completeKakaoLogin(dto.ticket);
  }

  @Post('kakao/signup')
  @HttpCode(HttpStatus.OK)
  signupWithKakao(@Body() dto: KakaoSignupDto) {
    return this.authService.signupWithKakao(dto);
  }

  @Post('kakao/link')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  linkKakaoAccount(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: KakaoTicketDto,
  ) {
    return this.authService.linkKakaoAccount(dto.ticket, user.userId);
  }
}
