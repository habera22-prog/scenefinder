import { IsInt, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreatePortfolioDto {
  @IsUUID()
  categoryId: string;

  @IsString()
  @MinLength(1)
  imageUrl: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
