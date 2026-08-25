import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateInquiryStatusDto {
  @IsIn(['received', 'reviewing', 'matched', 'closed'])
  status: 'received' | 'reviewing' | 'matched' | 'closed';

  @IsOptional()
  @IsString()
  adminMemo?: string;
}
