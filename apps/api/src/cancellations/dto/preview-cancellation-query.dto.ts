import { IsIn } from 'class-validator';

export class PreviewCancellationQueryDto {
  @IsIn(['customer', 'photographer'])
  initiatedBy: 'customer' | 'photographer';
}
