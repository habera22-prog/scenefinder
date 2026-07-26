import { IsInt, IsISO8601, IsOptional, IsString, Min, MinLength } from 'class-validator';

// 금액(totalAmount/depositAmount/balanceAmount)과 status는 의도적으로 제외됨 —
// 관리자가 직접 바꾸면 이미 계산된 결제·정산 데이터와 어긋날 수 있음.
// 취소·환불은 /bookings/:id/cancel, 상태 전이는 각 도메인 API를 통해서만 이뤄져야 함.
export class UpdateBookingDto {
  @IsOptional()
  @IsISO8601()
  shootDatetime?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  headcount?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  purpose?: string;
}
