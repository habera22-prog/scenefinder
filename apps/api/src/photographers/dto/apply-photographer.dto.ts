import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class ApplyPhotographerDto {
  @IsIn(['business', 'freelancer'])
  photographerType: 'business' | 'freelancer';

  // BUSINESS만 필수 — FREELANCER는 사업자등록번호 없이 지원
  @ValidateIf((o) => o.photographerType === 'business')
  @IsString()
  @MinLength(10)
  businessRegNo?: string;

  @ValidateIf((o) => o.photographerType === 'business')
  @IsString()
  @MinLength(1)
  businessName?: string;

  @ValidateIf((o) => o.photographerType === 'business')
  @IsString()
  @MinLength(1)
  representativeName?: string;

  @IsString()
  @MinLength(1)
  settlementAccount: string;

  @IsString()
  @MinLength(1)
  settlementAccountHolder: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  activeRegions: string[];

  @IsArray()
  @IsString({ each: true })
  moodTags: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  categories: string[];

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  captureCapabilities: string[];
}
