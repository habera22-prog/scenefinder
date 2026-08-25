import { IsInt, IsOptional, Min } from 'class-validator';

export class CreateQuoteDto {
  @IsInt()
  @Min(0)
  totalAmount: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  depositAmount?: number;

  // 예약에 연결된 상품이 없는 맞춤 견적일 때만 필수 — 시간당 최저가 검증에 사용
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMin?: number;
}
