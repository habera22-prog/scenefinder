import { IsISO8601, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRescheduleRequestDto {
  @IsOptional()
  @IsISO8601()
  newShootDatetime?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  newLocation?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
