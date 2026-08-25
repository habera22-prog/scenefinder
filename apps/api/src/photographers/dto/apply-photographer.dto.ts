import { ArrayNotEmpty, IsArray, IsString, MinLength } from 'class-validator';

export class ApplyPhotographerDto {
  @IsString()
  @MinLength(10)
  businessRegNo: string;

  @IsString()
  @MinLength(1)
  businessName: string;

  @IsString()
  @MinLength(1)
  representativeName: string;

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
