import { IsIn, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

const CATEGORIES = [
  'general',
  'payment',
  'booking_change',
  'cancellation_refund',
  'photographer_report',
  'delivery_dispute',
  'photo_deletion',
  'privacy',
  'partnership',
  'other',
] as const;

export class CreateTicketDto {
  @IsIn(CATEGORIES)
  category: (typeof CATEGORIES)[number];

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsUUID()
  bookingId?: string;
}
