import { IsIn, IsOptional } from 'class-validator';

const BOOKING_STATUSES = [
  'inquiry',
  'quoted',
  'held',
  'deposit_paid',
  'confirmed',
  'completed',
  'delivered',
  'closed',
  'cancelled',
  'disputed',
] as const;

export class ListBookingsQueryDto {
  @IsIn(['customer', 'photographer'])
  role: 'customer' | 'photographer';

  @IsOptional()
  @IsIn(BOOKING_STATUSES)
  status?: (typeof BOOKING_STATUSES)[number];
}
