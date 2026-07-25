import { IsIn } from 'class-validator';

const DISPUTE_TYPES = ['quality', 'noshow', 'delay', 'other'] as const;

export class CreateDisputeDto {
  @IsIn(DISPUTE_TYPES)
  type: (typeof DISPUTE_TYPES)[number];
}
