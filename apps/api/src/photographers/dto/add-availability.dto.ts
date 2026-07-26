import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class AddAvailabilityDto {
  @IsISO8601()
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
