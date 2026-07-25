import { IsIn } from 'class-validator';

export class CreateCancellationDto {
  @IsIn(['customer', 'photographer'])
  initiatedBy: 'customer' | 'photographer';
}
