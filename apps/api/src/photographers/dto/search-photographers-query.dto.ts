import { IsOptional, IsString } from 'class-validator';

export class SearchPhotographersQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  region?: string;

  @IsOptional()
  @IsString()
  captureMode?: string;
}
