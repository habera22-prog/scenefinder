import { IsString, MaxLength, MinLength } from 'class-validator';
import { KakaoTicketDto } from './kakao-ticket.dto';
import { SignupDto } from './signup.dto';

export class KakaoSignupDto extends SignupDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  ticket: KakaoTicketDto['ticket'];
}
