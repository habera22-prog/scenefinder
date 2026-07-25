import { IsBoolean, IsIn, IsOptional } from 'class-validator';

const CONSENT_TYPES = [
  'portfolio_full',
  'portfolio_partial',
  'portfolio_face_hidden',
  'portfolio_none',
] as const;

export class SetConsentDto {
  @IsIn(CONSENT_TYPES)
  type: (typeof CONSENT_TYPES)[number];

  @IsBoolean()
  minorIncluded: boolean;

  @IsOptional()
  @IsBoolean()
  guardianConsentGiven?: boolean;
}
