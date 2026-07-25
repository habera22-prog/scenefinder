import { IsIn, IsString, MinLength } from 'class-validator';

const CLIENT_MESSAGE_TYPES = ['text', 'image', 'file', 'location'] as const;

export class SendMessageDto {
  @IsIn(CLIENT_MESSAGE_TYPES)
  type: (typeof CLIENT_MESSAGE_TYPES)[number];

  @IsString()
  @MinLength(1)
  content: string;
}
