import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCouponDto {
  @IsString()
  @Matches(/^[A-Z0-9_-]+$/, {
    message: 'code는 영문 대문자/숫자/하이픈/언더스코어만 사용할 수 있습니다.',
  })
  code: string;

  @IsString()
  @MinLength(1)
  name: string;

  @IsIn(['fixed', 'percent'])
  discountType: 'fixed' | 'percent';

  @IsInt()
  @Min(1)
  discountValue: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxDiscountAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  minOrderAmount?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxRedemptions?: number;

  @IsOptional()
  @IsISO8601()
  expiresAt?: string;
}
