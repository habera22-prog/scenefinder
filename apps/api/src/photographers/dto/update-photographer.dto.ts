import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdatePhotographerDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  businessName?: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  activeRegions?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  moodTags?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  captureCapabilities?: string[];

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  settlementAccount?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  settlementAccountHolder?: string;
}
