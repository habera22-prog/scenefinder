import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

const OTP_TTL_SECONDS = 180;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(private readonly redis: RedisService) {}

  private key(phone: string) {
    return `otp:${phone}`;
  }

  async issue(phone: string): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(this.key(phone), code, 'EX', OTP_TTL_SECONDS);
    // SMS 벤더 연동 전까지 임시로 로그 출력 (PRD 7-2 "인증 방식" 미결정 항목)
    this.logger.log(`[OTP] ${phone} -> ${code} (유효 ${OTP_TTL_SECONDS}초)`);
  }

  async verify(phone: string, code: string): Promise<boolean> {
    const stored = await this.redis.get(this.key(phone));
    if (!stored || stored !== code) return false;
    await this.redis.del(this.key(phone));
    return true;
  }
}
