import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsInt()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmount?: number;
}
