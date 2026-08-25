import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateCorporateInquiryDto {
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

  @IsOptional()
  @IsString()
  shootDate?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  captureModeCode?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedDurationMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  expectedHeadcount?: number;

  @IsOptional()
  @IsString()
  deliverableUsage?: string;

  @IsOptional()
  @IsString()
  budgetRange?: string;

  @IsOptional()
  @IsBoolean()
  taxInvoiceRequired?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
