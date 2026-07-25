import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsInt()
  @Min(1)
  @Max(5)
  ratingOverall: number;

  @IsInt()
  @Min(1)
  @Max(5)
  ratingKindness: number;

  @IsInt()
  @Min(1)
  @Max(5)
  ratingPunctual: number;

  @IsInt()
  @Min(1)
  @Max(5)
  ratingCommunication: number;

  @IsInt()
  @Min(1)
  @Max(5)
  ratingSpeed: number;

  @IsBoolean()
  willReuse: boolean;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  content?: string;
}
