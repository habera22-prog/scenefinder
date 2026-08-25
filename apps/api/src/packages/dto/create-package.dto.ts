import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePackageDto {
  @IsString()
  @MinLength(1)
  title: string;

  @IsString()
  @MinLength(1)
  category: string;

  @IsOptional()
  @IsString()
  captureModeCode?: string;

  @IsInt()
  @Min(1)
  durationMin: number;

  @IsInt()
  @Min(0)
  basePrice: number;

  @IsInt()
  @Min(0)
  includedPhotos: number;

  @IsOptional()
  @IsString()
  retouchScope?: string;

  @IsBoolean()
  rawIncluded: boolean;

  @IsInt()
  @Min(0)
  deliveryDays: number;

  @IsOptional()
  @IsObject()
  options?: Record<string, unknown>;
}
