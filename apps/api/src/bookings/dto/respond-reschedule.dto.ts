import { IsBoolean } from 'class-validator';

export class RespondRescheduleDto {
  @IsBoolean()
  approve: boolean;
}
