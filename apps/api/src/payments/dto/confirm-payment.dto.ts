import { IsInt, IsString, Min } from 'class-validator';

export class ConfirmPaymentDto {
  @IsString()
  paymentKey: string;

  @IsString()
  orderId: string;

  @IsInt()
  @Min(0)
  amount: number;
}
