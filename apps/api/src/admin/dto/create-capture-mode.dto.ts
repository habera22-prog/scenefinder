import { IsInt, IsOptional, IsString, Matches, Min, MinLength } from 'class-validator';

export class CreateCaptureModeDto {
  @IsString()
  @Matches(/^[a-z0-9_]+$/, {
    message: 'code는 영문 소문자/숫자/언더스코어만 사용할 수 있습니다.',
  })
  code: string;

  @IsString()
  @MinLength(1)
  label: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
