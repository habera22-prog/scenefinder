import {
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  photographerId: string;

  @IsOptional()
  @IsUUID()
  packageId?: string;

  @IsUUID()
  shootCategoryId: string;

  @IsOptional()
  @IsUUID()
  captureModeId?: string;

  @IsString()
  shootDatetime: string;

  @IsString()
  @MinLength(1)
  location: string;

  @IsInt()
  @Min(1)
  headcount: number;

  @IsString()
  @MinLength(1)
  purpose: string;

  @IsOptional()
  @IsObject()
  requiredScenes?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  taxInvoiceRequired?: boolean;
}
