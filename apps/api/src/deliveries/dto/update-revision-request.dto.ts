import { IsIn } from 'class-validator';

const REVISION_STATUSES = ['requested', 'in_progress', 'done'] as const;

export class UpdateRevisionRequestDto {
  @IsIn(REVISION_STATUSES)
  status: (typeof REVISION_STATUSES)[number];
}
