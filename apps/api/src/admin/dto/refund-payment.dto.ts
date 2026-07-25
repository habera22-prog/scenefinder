import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsInt()
  @Min(1)
  amount: number;

  @IsOptional()
  @IsString()
  reason?: string;
}
