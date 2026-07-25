import { IsString, MinLength } from 'class-validator';

export class CreateConfirmationDto {
  @IsString()
  @MinLength(1)
  field: string;

  @IsString()
  @MinLength(1)
  value: string;
}
