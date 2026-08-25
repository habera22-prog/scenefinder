import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePartnershipInquiryDto {
  @IsString()
  @MinLength(1)
  companyName: string;

  @IsString()
  @MinLength(1)
  contactName: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(1)
  companyType: string;

  @IsOptional()
  @IsString()
  collaborationType?: string;

  @IsString()
  @MinLength(1)
  proposal: string;
}
