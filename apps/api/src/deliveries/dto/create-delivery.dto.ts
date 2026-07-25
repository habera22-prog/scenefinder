import { ArrayMinSize, IsArray, IsOptional, IsString } from 'class-validator';

export class CreateDeliveryDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photoUrls: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  representativePhotoUrls?: string[];
}
