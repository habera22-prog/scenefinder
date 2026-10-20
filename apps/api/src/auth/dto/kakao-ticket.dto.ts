import { IsString, MaxLength, MinLength } from 'class-validator';

export class KakaoTicketDto {
  @IsString()
  @MinLength(32)
  @MaxLength(128)
  ticket: string;
}
